/**
 * Types for client-side chat export parsing and analysis.
 *
 * Ported from shared/importers/models.py
 * All processing happens in the browser - your data never leaves your device.
 */
// Helper functions for computed properties
export function getMessageCount(conv) {
    return conv.messages.length;
}
export function getUserMessageCount(conv) {
    return conv.messages.filter(m => m.role === 'user').length;
}
export function getAssistantMessageCount(conv) {
    return conv.messages.filter(m => m.role === 'assistant').length;
}
export function getTotalWords(conv) {
    return conv.messages.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);
}
export function getExportDateRange(exp) {
    if (exp.conversations.length === 0) {
        return [null, null];
    }
    const dates = exp.conversations.map(c => c.createdAt);
    return [
        new Date(Math.min(...dates.map(d => d.getTime()))),
        new Date(Math.max(...dates.map(d => d.getTime())))
    ];
}
export function getExportTotalMessages(exp) {
    return exp.conversations.reduce((sum, c) => sum + c.messages.length, 0);
}
export function getExportTotalWords(exp) {
    return exp.conversations.reduce((sum, c) => sum + getTotalWords(c), 0);
}
//# sourceMappingURL=types.js.map