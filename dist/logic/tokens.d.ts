/**
 * Token estimation utilities.
 *
 * Uses a simple chars/4 estimation, which is a reasonable approximation
 * for most LLM tokenizers.
 */
/**
 * Estimate token count from character count.
 * Uses ~4 chars per token as a rough average.
 */
export declare function estimateTokens(chars: number): number;
/**
 * Estimate character count from token count.
 */
export declare function estimateChars(tokens: number): number;
/**
 * Format token count for display.
 */
export declare function formatTokens(tokens: number): string;
/**
 * Check if content exceeds a token limit.
 */
export declare function exceedsTokenLimit(content: string, maxTokens: number): boolean;
//# sourceMappingURL=tokens.d.ts.map