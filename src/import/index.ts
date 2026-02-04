/**
 * Chat history import module.
 *
 * Provides parsers and analysis for importing chat exports from
 * ChatGPT, Claude, and Gemini.
 *
 * All processing happens locally - your data never leaves your device.
 */

// Types
export type {
  ExportSource,
  MessageRole,
  ParsedMessage,
  ParsedConversation,
  ParsedExport,
  TopicCluster,
  DetectedDecision,
  UsagePattern,
  DetectedProject,
  ConversationAnalysis,
} from './types.js';

// Parsers
export {
  parseExportFromPath,
  parseExportFromBuffer,
  detectSource,
  parseChatGPT,
  parseClaude,
  parseGemini,
} from './parsers/index.js';

// Analysis
export { analyzeExport } from './analysis.js';
