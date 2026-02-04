/**
 * Gemini export parser.
 *
 * Gemini exports come from Google Takeout as ZIP files containing:
 * - Takeout/Gemini Apps/Conversations/*.json files
 * - Or sometimes Gemini/conversations/*.json
 *
 * The format uses "user" and "model" roles with linear message arrays.
 *
 * 100% client-side - your data never leaves your browser.
 */
import type { ParsedExport } from '../types.js';
/**
 * Detect if files represent a Gemini/Google Takeout export.
 */
export declare function detectGemini(files: Map<string, string>): boolean;
/**
 * Parse Gemini/Takeout export files into unified format.
 */
export declare function parseGemini(files: Map<string, string>): ParsedExport;
//# sourceMappingURL=gemini.d.ts.map