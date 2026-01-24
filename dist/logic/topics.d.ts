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
export declare const TOPIC_KEYWORDS: Record<string, string[]>;
/**
 * Extract topic keywords from text using pattern matching.
 */
export declare function extractTopicsFromText(text: string): string[];
/**
 * Artifact info for topic extraction.
 */
export interface ArtifactInfo {
    title?: string;
    name?: string;
    summary?: string;
    description?: string;
    content?: string;
    tags?: string[];
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
export declare function buildTopicClusters(artifacts: ArtifactInfo[]): Record<string, string[]>;
/**
 * Filter artifacts by topic cluster.
 * Matches against both explicit tags and auto-detected topics.
 */
export declare function filterByTopic(artifacts: ArtifactInfo[], topicCluster: string): ArtifactInfo[];
//# sourceMappingURL=topics.d.ts.map