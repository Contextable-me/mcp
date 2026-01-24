/**
 * Living summary generation for projects.
 *
 * Generates auto-updated summaries that answer:
 * "What is this project about RIGHT NOW?"
 */
/**
 * Project info for summary generation.
 */
export interface ProjectInfo {
    name: string;
    description?: string | null;
}
/**
 * Artifact info for summary generation.
 */
export interface ArtifactInfo {
    title?: string;
    name?: string;
    summary?: string;
    priority?: string;
    updated_at?: string;
    size_chars?: number;
}
/**
 * Recent change entry in living summary.
 */
export interface RecentChange {
    name: string;
    updated: string;
    summary: string;
}
/**
 * Stats about the project.
 */
export interface ProjectStats {
    totalArtifacts: number;
    coreArtifacts: number;
    totalTokens: number;
    changesLast7Days: number;
    changesLast30Days: number;
}
/**
 * Complete living summary of a project.
 */
export interface LivingSummary {
    generated: string;
    currentState: string;
    projectDescription: string | null;
    recentChanges: RecentChange[];
    keyArtifacts: string[];
    activeTopics: string[];
    stats: ProjectStats;
}
/**
 * Generate a living summary of the project's current state.
 *
 * The living summary answers: "What is this project about RIGHT NOW?"
 * It's auto-generated from project metadata and artifact activity.
 *
 * Returns a lightweight summary (~500 tokens) with:
 * - currentState: One-line description of where the project is
 * - recentChanges: Artifacts updated in the last 7 days
 * - keyArtifacts: Core priority artifacts
 * - activeTopics: Most populated topic clusters
 * - stats: Quick metrics
 */
export declare function generateLivingSummary(project: ProjectInfo, artifacts: ArtifactInfo[], topicClusters: Record<string, string[]>): LivingSummary;
//# sourceMappingURL=living-summary.d.ts.map