/**
 * Chat history import module.
 *
 * Provides parsers and analysis for importing chat exports from
 * ChatGPT, Claude, and Gemini.
 *
 * All processing happens locally - your data never leaves your device.
 */
// Parsers
export { parseExportFromPath, parseExportFromBuffer, detectSource, parseChatGPT, parseClaude, parseGemini, } from './parsers/index.js';
// Analysis
export { analyzeExport } from './analysis.js';
//# sourceMappingURL=index.js.map