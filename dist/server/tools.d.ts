/**
 * Tool registration for the MCP server.
 */
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { StorageAdapter } from '../storage/interface.js';
/**
 * Tool definitions for MCP.
 */
export declare const TOOL_DEFINITIONS: ({
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            name: {
                type: string;
                description: string;
            };
            description: {
                type: string;
                description: string;
            };
            tags: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            config: {
                type: string;
                description: string;
            };
            status?: undefined;
            limit?: undefined;
            offset?: undefined;
            project_id?: undefined;
            project_name?: undefined;
            load_content?: undefined;
            max_tokens?: undefined;
            priority_filter?: undefined;
            topic_cluster?: undefined;
            analysis_type?: undefined;
            artifact_type?: undefined;
            content?: undefined;
            summary?: undefined;
            priority?: undefined;
            auto_chunk?: undefined;
            artifact_id?: undefined;
            max_content_length?: undefined;
            version_id?: undefined;
            query?: undefined;
            file_path?: undefined;
            project_names?: undefined;
            create_context_artifacts?: undefined;
            include_decisions?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            status: {
                type: string;
                enum: string[];
                description: string;
            };
            limit: {
                type: string;
                description: string;
            };
            offset: {
                type: string;
                description: string;
            };
            name?: undefined;
            description?: undefined;
            tags?: undefined;
            config?: undefined;
            project_id?: undefined;
            project_name?: undefined;
            load_content?: undefined;
            max_tokens?: undefined;
            priority_filter?: undefined;
            topic_cluster?: undefined;
            analysis_type?: undefined;
            artifact_type?: undefined;
            content?: undefined;
            summary?: undefined;
            priority?: undefined;
            auto_chunk?: undefined;
            artifact_id?: undefined;
            max_content_length?: undefined;
            version_id?: undefined;
            query?: undefined;
            file_path?: undefined;
            project_names?: undefined;
            create_context_artifacts?: undefined;
            include_decisions?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            project_id: {
                type: string;
                description: string;
            };
            project_name: {
                type: string;
                description: string;
            };
            load_content: {
                type: string;
                description: string;
            };
            max_tokens: {
                type: string;
                description: string;
            };
            priority_filter: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            topic_cluster: {
                type: string;
                description: string;
            };
            name?: undefined;
            description?: undefined;
            tags?: undefined;
            config?: undefined;
            status?: undefined;
            limit?: undefined;
            offset?: undefined;
            analysis_type?: undefined;
            artifact_type?: undefined;
            content?: undefined;
            summary?: undefined;
            priority?: undefined;
            auto_chunk?: undefined;
            artifact_id?: undefined;
            max_content_length?: undefined;
            version_id?: undefined;
            query?: undefined;
            file_path?: undefined;
            project_names?: undefined;
            create_context_artifacts?: undefined;
            include_decisions?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            project_id: {
                type: string;
                description: string;
            };
            project_name: {
                type: string;
                description: string;
            };
            analysis_type: {
                type: string;
                enum: string[];
                description: string;
            };
            name?: undefined;
            description?: undefined;
            tags?: undefined;
            config?: undefined;
            status?: undefined;
            limit?: undefined;
            offset?: undefined;
            load_content?: undefined;
            max_tokens?: undefined;
            priority_filter?: undefined;
            topic_cluster?: undefined;
            artifact_type?: undefined;
            content?: undefined;
            summary?: undefined;
            priority?: undefined;
            auto_chunk?: undefined;
            artifact_id?: undefined;
            max_content_length?: undefined;
            version_id?: undefined;
            query?: undefined;
            file_path?: undefined;
            project_names?: undefined;
            create_context_artifacts?: undefined;
            include_decisions?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            project_id: {
                type: string;
                description: string;
            };
            name: {
                type: string;
                description: string;
            };
            artifact_type: {
                type: string;
                enum: string[];
                description: string;
            };
            content: {
                type: string;
                description: string;
            };
            summary: {
                type: string;
                description: string;
            };
            priority: {
                type: string;
                enum: string[];
                description: string;
            };
            description: {
                type: string;
                description: string;
            };
            tags: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            auto_chunk: {
                type: string;
                description: string;
            };
            config?: undefined;
            status?: undefined;
            limit?: undefined;
            offset?: undefined;
            project_name?: undefined;
            load_content?: undefined;
            max_tokens?: undefined;
            priority_filter?: undefined;
            topic_cluster?: undefined;
            analysis_type?: undefined;
            artifact_id?: undefined;
            max_content_length?: undefined;
            version_id?: undefined;
            query?: undefined;
            file_path?: undefined;
            project_names?: undefined;
            create_context_artifacts?: undefined;
            include_decisions?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            project_id: {
                type: string;
                description: string;
            };
            artifact_type: {
                type: string;
                description: string;
                enum?: undefined;
            };
            limit: {
                type: string;
                description: string;
            };
            offset: {
                type: string;
                description: string;
            };
            name?: undefined;
            description?: undefined;
            tags?: undefined;
            config?: undefined;
            status?: undefined;
            project_name?: undefined;
            load_content?: undefined;
            max_tokens?: undefined;
            priority_filter?: undefined;
            topic_cluster?: undefined;
            analysis_type?: undefined;
            content?: undefined;
            summary?: undefined;
            priority?: undefined;
            auto_chunk?: undefined;
            artifact_id?: undefined;
            max_content_length?: undefined;
            version_id?: undefined;
            query?: undefined;
            file_path?: undefined;
            project_names?: undefined;
            create_context_artifacts?: undefined;
            include_decisions?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            artifact_id: {
                type: string;
                description: string;
            };
            max_content_length: {
                type: string;
                description: string;
            };
            name?: undefined;
            description?: undefined;
            tags?: undefined;
            config?: undefined;
            status?: undefined;
            limit?: undefined;
            offset?: undefined;
            project_id?: undefined;
            project_name?: undefined;
            load_content?: undefined;
            max_tokens?: undefined;
            priority_filter?: undefined;
            topic_cluster?: undefined;
            analysis_type?: undefined;
            artifact_type?: undefined;
            content?: undefined;
            summary?: undefined;
            priority?: undefined;
            auto_chunk?: undefined;
            version_id?: undefined;
            query?: undefined;
            file_path?: undefined;
            project_names?: undefined;
            create_context_artifacts?: undefined;
            include_decisions?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            artifact_id: {
                type: string;
                description: string;
            };
            name?: undefined;
            description?: undefined;
            tags?: undefined;
            config?: undefined;
            status?: undefined;
            limit?: undefined;
            offset?: undefined;
            project_id?: undefined;
            project_name?: undefined;
            load_content?: undefined;
            max_tokens?: undefined;
            priority_filter?: undefined;
            topic_cluster?: undefined;
            analysis_type?: undefined;
            artifact_type?: undefined;
            content?: undefined;
            summary?: undefined;
            priority?: undefined;
            auto_chunk?: undefined;
            max_content_length?: undefined;
            version_id?: undefined;
            query?: undefined;
            file_path?: undefined;
            project_names?: undefined;
            create_context_artifacts?: undefined;
            include_decisions?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            project_id: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
            };
            name?: undefined;
            description?: undefined;
            tags?: undefined;
            config?: undefined;
            status?: undefined;
            offset?: undefined;
            project_name?: undefined;
            load_content?: undefined;
            max_tokens?: undefined;
            priority_filter?: undefined;
            topic_cluster?: undefined;
            analysis_type?: undefined;
            artifact_type?: undefined;
            content?: undefined;
            summary?: undefined;
            priority?: undefined;
            auto_chunk?: undefined;
            artifact_id?: undefined;
            max_content_length?: undefined;
            version_id?: undefined;
            query?: undefined;
            file_path?: undefined;
            project_names?: undefined;
            create_context_artifacts?: undefined;
            include_decisions?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            artifact_id: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
            };
            name?: undefined;
            description?: undefined;
            tags?: undefined;
            config?: undefined;
            status?: undefined;
            offset?: undefined;
            project_id?: undefined;
            project_name?: undefined;
            load_content?: undefined;
            max_tokens?: undefined;
            priority_filter?: undefined;
            topic_cluster?: undefined;
            analysis_type?: undefined;
            artifact_type?: undefined;
            content?: undefined;
            summary?: undefined;
            priority?: undefined;
            auto_chunk?: undefined;
            max_content_length?: undefined;
            version_id?: undefined;
            query?: undefined;
            file_path?: undefined;
            project_names?: undefined;
            create_context_artifacts?: undefined;
            include_decisions?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            artifact_id: {
                type: string;
                description: string;
            };
            version_id: {
                type: string;
                description: string;
            };
            name?: undefined;
            description?: undefined;
            tags?: undefined;
            config?: undefined;
            status?: undefined;
            limit?: undefined;
            offset?: undefined;
            project_id?: undefined;
            project_name?: undefined;
            load_content?: undefined;
            max_tokens?: undefined;
            priority_filter?: undefined;
            topic_cluster?: undefined;
            analysis_type?: undefined;
            artifact_type?: undefined;
            content?: undefined;
            summary?: undefined;
            priority?: undefined;
            auto_chunk?: undefined;
            max_content_length?: undefined;
            query?: undefined;
            file_path?: undefined;
            project_names?: undefined;
            create_context_artifacts?: undefined;
            include_decisions?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            query: {
                type: string;
                description: string;
            };
            project_id: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
            };
            name?: undefined;
            description?: undefined;
            tags?: undefined;
            config?: undefined;
            status?: undefined;
            offset?: undefined;
            project_name?: undefined;
            load_content?: undefined;
            max_tokens?: undefined;
            priority_filter?: undefined;
            topic_cluster?: undefined;
            analysis_type?: undefined;
            artifact_type?: undefined;
            content?: undefined;
            summary?: undefined;
            priority?: undefined;
            auto_chunk?: undefined;
            artifact_id?: undefined;
            max_content_length?: undefined;
            version_id?: undefined;
            file_path?: undefined;
            project_names?: undefined;
            create_context_artifacts?: undefined;
            include_decisions?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            file_path: {
                type: string;
                description: string;
            };
            name?: undefined;
            description?: undefined;
            tags?: undefined;
            config?: undefined;
            status?: undefined;
            limit?: undefined;
            offset?: undefined;
            project_id?: undefined;
            project_name?: undefined;
            load_content?: undefined;
            max_tokens?: undefined;
            priority_filter?: undefined;
            topic_cluster?: undefined;
            analysis_type?: undefined;
            artifact_type?: undefined;
            content?: undefined;
            summary?: undefined;
            priority?: undefined;
            auto_chunk?: undefined;
            artifact_id?: undefined;
            max_content_length?: undefined;
            version_id?: undefined;
            query?: undefined;
            project_names?: undefined;
            create_context_artifacts?: undefined;
            include_decisions?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            file_path: {
                type: string;
                description: string;
            };
            project_names: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            create_context_artifacts: {
                type: string;
                description: string;
            };
            include_decisions: {
                type: string;
                description: string;
            };
            name?: undefined;
            description?: undefined;
            tags?: undefined;
            config?: undefined;
            status?: undefined;
            limit?: undefined;
            offset?: undefined;
            project_id?: undefined;
            project_name?: undefined;
            load_content?: undefined;
            max_tokens?: undefined;
            priority_filter?: undefined;
            topic_cluster?: undefined;
            analysis_type?: undefined;
            artifact_type?: undefined;
            content?: undefined;
            summary?: undefined;
            priority?: undefined;
            auto_chunk?: undefined;
            artifact_id?: undefined;
            max_content_length?: undefined;
            version_id?: undefined;
            query?: undefined;
        };
        required: string[];
    };
})[];
/**
 * Register all tools with the MCP server.
 */
export declare function registerTools(server: Server, storage: StorageAdapter): void;
//# sourceMappingURL=tools.d.ts.map