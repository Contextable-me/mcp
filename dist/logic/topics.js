/**
 * Topic extraction and clustering utilities.
 *
 * Extracts topic keywords from artifact content, names, and tags
 * to enable automatic clustering and navigation.
 */
/**
 * Topic keywords for auto-clustering.
 * Each topic maps to keywords that indicate membership.
 */
export const TOPIC_KEYWORDS = {
    security: [
        'security',
        'auth',
        'authentication',
        'authorization',
        'rls',
        'permissions',
        'audit',
        'vulnerability',
        'encryption',
        'password',
        'token',
        'jwt',
        'oauth',
    ],
    api: [
        'api',
        'endpoint',
        'route',
        'rest',
        'graphql',
        'webhook',
        'request',
        'response',
        'http',
    ],
    database: [
        'database',
        'schema',
        'migration',
        'sql',
        'postgres',
        'supabase',
        'table',
        'query',
        'rls',
    ],
    architecture: [
        'architecture',
        'design',
        'system',
        'structure',
        'pattern',
        'component',
        'module',
    ],
    monetization: [
        'monetization',
        'pricing',
        'subscription',
        'stripe',
        'payment',
        'billing',
        'plan',
        'tier',
        'revenue',
    ],
    marketing: [
        'marketing',
        'copy',
        'homepage',
        'landing',
        'positioning',
        'messaging',
        'brand',
    ],
    launch: [
        'launch',
        'checklist',
        'submission',
        'deploy',
        'release',
        'production',
        'go-live',
    ],
    ui: [
        'ui',
        'ux',
        'component',
        'page',
        'layout',
        'design',
        'frontend',
        'react',
        'css',
        'styling',
    ],
    testing: ['test', 'testing', 'spec', 'coverage', 'unit', 'integration', 'e2e'],
    documentation: [
        'docs',
        'documentation',
        'guide',
        'reference',
        'readme',
        'spec',
        'specification',
    ],
    feedback: [
        'feedback',
        'user',
        'dogfooding',
        'issue',
        'bug',
        'request',
        'improvement',
    ],
    mcp: ['mcp', 'tool', 'fastmcp', 'protocol', 'claude', 'chatgpt', 'ai'],
    operations: [
        'deploy',
        'ci',
        'cd',
        'pipeline',
        'railway',
        'vercel',
        'hosting',
        'infrastructure',
    ],
};
/**
 * Extract topic keywords from text using pattern matching.
 */
export function extractTopicsFromText(text) {
    if (!text) {
        return [];
    }
    const textLower = text.toLowerCase();
    const detectedTopics = [];
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
        for (const keyword of keywords) {
            // Match whole words only (with word boundaries)
            const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`);
            if (regex.test(textLower)) {
                detectedTopics.push(topic);
                break; // One match per topic is enough
            }
        }
    }
    return detectedTopics;
}
/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/**
 * Build topic clusters from artifact content, names, and tags.
 *
 * Auto-detects topics from:
 * 1. Explicit tags (highest priority)
 * 2. Artifact names/titles
 * 3. Summaries and descriptions
 * 4. Content (first 500 chars to avoid processing too much)
 *
 * Returns a map of topic names to lists of artifact names.
 */
export function buildTopicClusters(artifacts) {
    const clusters = {};
    for (const artifact of artifacts) {
        const name = artifact.title || artifact.name || 'Untitled';
        const detectedTopics = new Set();
        // 1. Explicit tags (always included)
        const tags = artifact.tags || [];
        for (const tag of tags) {
            if (tag) {
                detectedTopics.add(tag.toLowerCase().trim());
            }
        }
        // 2. Extract from name/title
        const nameTopics = extractTopicsFromText(name);
        for (const topic of nameTopics) {
            detectedTopics.add(topic);
        }
        // 3. Extract from summary
        const summary = artifact.summary || '';
        const summaryTopics = extractTopicsFromText(summary);
        for (const topic of summaryTopics) {
            detectedTopics.add(topic);
        }
        // 4. Extract from description
        const description = artifact.description || '';
        const descTopics = extractTopicsFromText(description);
        for (const topic of descTopics) {
            detectedTopics.add(topic);
        }
        // 5. Extract from content (first 500 chars)
        const content = artifact.content || '';
        if (content) {
            const contentPreview = content.slice(0, 500);
            const contentTopics = extractTopicsFromText(contentPreview);
            for (const topic of contentTopics) {
                detectedTopics.add(topic);
            }
        }
        // Add artifact to each detected topic cluster
        for (const topic of detectedTopics) {
            if (!clusters[topic]) {
                clusters[topic] = [];
            }
            if (!clusters[topic].includes(name)) {
                clusters[topic].push(name);
            }
        }
    }
    // Sort by number of artifacts (most populated clusters first)
    const sortedEntries = Object.entries(clusters).sort(([, a], [, b]) => b.length - a.length);
    return Object.fromEntries(sortedEntries);
}
/**
 * Filter artifacts by topic cluster.
 * Matches against both explicit tags and auto-detected topics.
 */
export function filterByTopic(artifacts, topicCluster) {
    const topicLower = topicCluster.toLowerCase();
    return artifacts.filter((artifact) => {
        // Check explicit tags
        const tags = artifact.tags || [];
        if (tags.some((tag) => tag?.toLowerCase().includes(topicLower))) {
            return true;
        }
        // Check auto-detected topics from name/summary
        const name = artifact.title || artifact.name || '';
        const summary = artifact.summary || '';
        const combinedText = `${name} ${summary}`;
        const detected = extractTopicsFromText(combinedText);
        return detected.includes(topicLower);
    });
}
//# sourceMappingURL=topics.js.map