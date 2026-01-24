/**
 * Time utilities for Contextable MCP server.
 * All timestamps are ISO 8601 format in UTC.
 */
/**
 * Get current timestamp in ISO 8601 format.
 */
export function now() {
    return new Date().toISOString();
}
/**
 * Get current timestamp in SQLite datetime format (YYYY-MM-DD HH:MM:SS).
 */
export function nowSqlite() {
    return new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}
/**
 * Parse an ISO 8601 timestamp to a Date object.
 */
export function parseISO(timestamp) {
    return new Date(timestamp);
}
/**
 * Format a date to YYYY-MM-DD format.
 */
export function formatDate(date) {
    return date.toISOString().split('T')[0] ?? '';
}
/**
 * Get a date N days ago.
 */
export function daysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
}
/**
 * Check if a timestamp is within the last N days.
 */
export function isWithinDays(timestamp, days) {
    const date = parseISO(timestamp);
    const cutoff = daysAgo(days);
    return date >= cutoff;
}
/**
 * Get relative time description (e.g., "2 days ago", "just now").
 */
export function relativeTime(timestamp) {
    const date = parseISO(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            if (diffMinutes < 5)
                return 'just now';
            return `${diffMinutes} minutes ago`;
        }
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }
    if (diffDays === 1)
        return 'yesterday';
    if (diffDays < 7)
        return `${diffDays} days ago`;
    if (diffDays < 30)
        return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
    if (diffDays < 365)
        return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? '' : 's'} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) === 1 ? '' : 's'} ago`;
}
//# sourceMappingURL=time.js.map