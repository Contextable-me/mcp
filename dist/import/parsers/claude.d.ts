/**
 * Claude export parser.
 *
 * Claude exports are ZIP files containing JSON files with conversation data.
 * The structure is simpler than ChatGPT - messages are stored in a linear array.
 *
 * Export structure:
 * - conversations/ directory containing JSON files
 * - Or a single conversations.json file
 * - Messages use "human" and "assistant" roles
 *
 * 100% client-side - your data never leaves your browser.
 */
import type { ParsedExport } from '../types.js';
/**
 * Detect if files represent a Claude export.
 */
export declare function detectClaude(files: Map<string, string>): boolean;
/**
 * Parse Claude export files into unified format.
 */
export declare function parseClaude(files: Map<string, string>): ParsedExport;
//# sourceMappingURL=claude.d.ts.map