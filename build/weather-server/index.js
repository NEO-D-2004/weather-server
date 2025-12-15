#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListResourcesRequestSchema, ListResourceTemplatesRequestSchema, ListToolsRequestSchema, McpError, ReadResourceRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
const API_KEY = process.env.OPENWEATHER_API_KEY; // provided by MCP config
if (!API_KEY) {
    throw new Error('OPENWEATHER_API_KEY environment variable is required');
}
const isValidForecastArgs = (args) => typeof args === 'object' &&
    args !== null &&
    typeof args.city === 'string' &&
    (args.days === undefined || typeof args.days === 'number');
class WeatherServer {
    server;
    axiosInstance;
    cache;
    cacheDuration; // 5 minutes in milliseconds
    constructor() {
        this.server = new Server({
            name: 'example-weather-server',
            version: '0.1.0',
            capabilities: {
                resources: {},
                tools: {},
            },
        });
        this.cache = new Map();
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
        this.axiosInstance = axios.create({
            baseURL: 'http://api.openweathermap.org/data/2.5',
            params: {
                appid: API_KEY,
                units: 'metric',
            },
        });
        this.setupResourceHandlers();
        this.setupToolHandlers();
        // Error handling
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    // MCP Resources represent any kind of UTF-8 encoded data that an MCP server wants to make available to clients, such as database records, API responses, log files, and more. Servers define direct resources with a static URI or dynamic resources with a URI template that follows the format `[protocol]://[host]/[path]`.
    setupResourceHandlers() {
        // For static resources, servers can expose a list of resources:
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
            resources: [
                // This is a poor example since you could use the resource template to get the same information but this demonstrates how to define a static resource
                {
                    uri: 'weather://San Francisco/current', // Unique identifier for San Francisco weather resource
                    name: 'Current weather in San Francisco', // Human-readable name
                    mimeType: 'application/json', // Optional MIME type
                    // Optional description
                    description: 'Real-time weather data for San Francisco including temperature, conditions, humidity, and wind speed',
                },
            ],
        }));
        // For dynamic resources, servers can expose resource templates:
        this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
            resourceTemplates: [
                {
                    uriTemplate: 'weather://{city}/current', // URI template (RFC 6570)
                    name: 'Current weather for a given city', // Human-readable name
                    mimeType: 'application/json', // Optional MIME type
                    description: 'Real-time weather data for a specified city', // Optional description
                },
            ],
        }));
        // ReadResourceRequestSchema is used for both static resources and dynamic resource templates
        this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const match = request.params.uri.match(/^weather:\/\/(.+)\/current$/);
            if (!match) {
                throw new McpError(ErrorCode.InvalidRequest, `Invalid URI format: ${request.params.uri}`);
            }
            const city = decodeURIComponent(match[1]);
            const cacheKey = `current_weather_${city}`;
            const cached = this.cache.get(cacheKey);
            const now = Date.now();
            if (cached && now - cached.timestamp < this.cacheDuration) {
                return {
                    contents: [
                        {
                            uri: request.params.uri,
                            mimeType: 'application/json',
                            text: JSON.stringify(cached.data, null, 2),
                        },
                    ],
                };
            }
            try {
                const response = await this.axiosInstance.get('weather', {
                    params: { q: city },
                });
                const weatherData = {
                    temperature: response.data.main.temp,
                    conditions: response.data.weather[0].description,
                    humidity: response.data.main.humidity,
                    wind_speed: response.data.wind.speed,
                    timestamp: new Date().toISOString(),
                };
                this.cache.set(cacheKey, { data: weatherData, timestamp: now });
                return {
                    contents: [
                        {
                            uri: request.params.uri,
                            mimeType: 'application/json',
                            text: JSON.stringify(weatherData, null, 2),
                        },
                    ],
                };
            }
            catch (error) {
                if (axios.isAxiosError(error)) {
                    throw new McpError(ErrorCode.InternalError, `Weather API error: ${error.response?.data.message ?? error.message}`);
                }
                throw error;
            }
        });
    }
    /* MCP Tools enable servers to expose executable functionality to the system. Through these tools, you can interact with external systems, perform computations, and take actions in the real world.
     * - Like resources, tools are identified by unique names and can include descriptions to guide their usage. However, unlike resources, tools represent dynamic operations that can modify state or interact with external systems.
     * - While resources and tools are similar, you should prefer to create tools over resources when possible as they provide more flexibility.
     */
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'get_forecast', // Unique identifier
                    description: 'Get weather forecast for a city', // Human-readable description
                    inputSchema: {
                        // JSON Schema for parameters
                        type: 'object',
                        properties: {
                            city: {
                                type: 'string',
                                description: 'City name',
                            },
                            days: {
                                type: 'number',
                                description: 'Number of days (1-5)',
                                minimum: 1,
                                maximum: 5,
                            },
                        },
                        required: ['city'], // Array of required property names
                    },
                },
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (request.params.name !== 'get_forecast') {
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
            }
            if (!isValidForecastArgs(request.params.arguments)) {
                throw new McpError(ErrorCode.InvalidParams, 'Invalid forecast arguments');
            }
            const city = request.params.arguments.city;
            const days = Math.min(request.params.arguments.days || 3, 5);
            const cacheKey = `forecast_${city}_${days}`;
            const cached = this.cache.get(cacheKey);
            const now = Date.now();
            if (cached && now - cached.timestamp < this.cacheDuration) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(cached.data, null, 2),
                        },
                    ],
                };
            }
            try {
                const response = await this.axiosInstance.get('forecast', {
                    params: {
                        q: city,
                        cnt: days * 8,
                    },
                });
                this.cache.set(cacheKey, { data: response.data.list, timestamp: now });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(response.data.list, null, 2),
                        },
                    ],
                };
            }
            catch (error) {
                if (axios.isAxiosError(error)) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Weather API error: ${error.response?.data.message ?? error.message}`,
                            },
                        ],
                        isError: true,
                    };
                }
                throw error;
            }
        });
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Weather MCP server running on stdio');
    }
}
const server = new WeatherServer();
server.run().catch(console.error);
//# sourceMappingURL=index.js.map