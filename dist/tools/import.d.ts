/**
 * Chat history import MCP tools.
 *
 * Tools for importing chat exports from ChatGPT, Claude, and Gemini
 * into local Contextable projects.
 *
 * All parsing happens locally - your data never leaves your device.
 */
import type { ToolContext } from './projects.js';
import { type ConversationAnalysis } from '../import/index.js';
/**
 * Analyze a chat export file without importing.
 *
 * Parses the ZIP file and returns analysis including:
 * - Detected topics and patterns
 * - Suggested projects to create
 * - Key decisions found
 * - Statistics about the conversations
 */
export declare function importAnalyze(_ctx: ToolContext, params: {
    file_path: string;
}): Promise<{
    success: boolean;
    message: string;
    analysis?: ConversationAnalysis;
}>;
/**
 * Import selected projects from a chat export.
 *
 * Takes the analysis results and creates the selected projects
 * with their artifacts in the local database.
 */
export declare function importSeed(ctx: ToolContext, params: {
    /** Path to the ZIP file (same as used in import_analyze) */
    file_path: string;
    /** Names of projects to import (from detected_projects in analysis) */
    project_names: string[];
    /** Whether to create context artifacts with conversation summaries */
    create_context_artifacts?: boolean;
    /** Whether to include detected decisions as artifacts */
    include_decisions?: boolean;
}): Promise<{
    success: boolean;
    message: string;
    projects_created?: number;
    artifacts_created?: number;
    project_ids?: string[];
}>;
//# sourceMappingURL=import.d.ts.map