/**
 * Client-side conversation analysis engine.
 *
 * Extracts topics, detects patterns, and identifies potential projects
 * from parsed chat exports. All processing happens in the browser.
 *
 * 100% client-side - your data never leaves your browser.
 */
import type { ParsedExport, ConversationAnalysis } from './types.js';
/**
 * Analyze a parsed export to extract insights.
 * All processing happens in your browser.
 */
export declare function analyzeExport(exp: ParsedExport): ConversationAnalysis;
//# sourceMappingURL=analysis.d.ts.map