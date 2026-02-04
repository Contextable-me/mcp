/**
 * Unified parser entry point with auto-detection.
 *
 * Automatically detects the export source (ChatGPT, Claude, Gemini)
 * and parses using the appropriate parser.
 *
 * Works in both browser (File) and Node.js (Buffer/path) environments.
 */
import type { ParsedExport, ExportSource } from '../types.js';
import { parseChatGPT } from './chatgpt.js';
import { parseClaude } from './claude.js';
import { parseGemini } from './gemini.js';
export { parseChatGPT, parseClaude, parseGemini };
/**
 * Auto-detect which platform the export came from.
 */
export declare function detectSource(files: Map<string, string>): ExportSource | null;
/**
 * Extract all files from a ZIP buffer as a Map of filename -> content.
 */
export declare function extractZipFromBuffer(buffer: Buffer | ArrayBuffer): Promise<Map<string, string>>;
/**
 * Parse an export from a file path.
 *
 * @param filePath - Path to the ZIP file
 * @returns ParsedExport with all conversations
 * @throws Error if the format is not recognized
 */
export declare function parseExportFromPath(filePath: string): Promise<ParsedExport>;
/**
 * Parse an export from a buffer.
 *
 * @param buffer - ZIP file contents as Buffer or ArrayBuffer
 * @returns ParsedExport with all conversations
 * @throws Error if the format is not recognized
 */
export declare function parseExportFromBuffer(buffer: Buffer | ArrayBuffer): Promise<ParsedExport>;
//# sourceMappingURL=index.d.ts.map