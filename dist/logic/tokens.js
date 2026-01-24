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
export function estimateTokens(chars) {
    return Math.floor(chars / 4);
}
/**
 * Estimate character count from token count.
 */
export function estimateChars(tokens) {
    return tokens * 4;
}
/**
 * Format token count for display.
 */
export function formatTokens(tokens) {
    if (tokens >= 1000) {
        return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
}
/**
 * Check if content exceeds a token limit.
 */
export function exceedsTokenLimit(content, maxTokens) {
    return estimateTokens(content.length) > maxTokens;
}
//# sourceMappingURL=tokens.js.map