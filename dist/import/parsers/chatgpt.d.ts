/**
 * ChatGPT export parser.
 *
 * ChatGPT exports are ZIP files containing:
 * - conversations.json: Machine-readable conversation data (tree structure)
 * - chat.html: Human-readable HTML version
 * - Other metadata files (user.json, etc.)
 *
 * The conversations.json uses a tree structure where messages are stored in a
 * "mapping" object with parent-child relationships. We traverse from current_node
 * backwards via parent links to reconstruct the conversation.
 *
 * 100% client-side - your data never leaves your browser.
 */
import type { ParsedExport } from '../types.js';
/**
 * Detect if files represent a ChatGPT export.
 */
export declare function detectChatGPT(files: Map<string, string>): boolean;
/**
 * Parse ChatGPT export files into unified format.
 */
export declare function parseChatGPT(files: Map<string, string>): ParsedExport;
//# sourceMappingURL=chatgpt.d.ts.map