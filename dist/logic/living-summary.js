/**
 * Living summary generation for projects.
 *
 * Generates auto-updated summaries that answer:
 * "What is this project about RIGHT NOW?"
 */
import { estimateTokens } from './tokens.js';
/**
 * Parse ISO date string to Date object.
 */
function parseDate(dateStr) {
    try {
        // Handle both 'Z' suffix and '+00:00' format
        const normalized = dateStr.replace('Z', '+00:00');
        return new Date(normalized);
    }
    catch {
        return null;
    }
}
/**
 * Format date as YYYY-MM-DD.
 */
function formatDate(date) {
    const iso = date.toISOString();
    return iso.split('T')[0] ?? iso.slice(0, 10);
}
/**
 * Format date as "YYYY-MM-DD HH:MM UTC".
 */
function formatDateTime(date) {
    const iso = date.toISOString();
    const parts = iso.split('T');
    const datePart = parts[0] ?? iso.slice(0, 10);
    const timePart = parts[1] ?? '00:00:00.000Z';
    const time = timePart.slice(0, 5); // HH:MM
    return `${datePart} ${time} UTC`;
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
export function generateLivingSummary(project, artifacts, topicClusters) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    // Parse artifact timestamps and categorize
    const recentChanges = [];
    const recentActivity = [];
    const keyArtifacts = [];
    for (const artifact of artifacts) {
        const name = artifact.title || artifact.name || 'Untitled';
        const priority = artifact.priority || 'normal';
        const updatedAtStr = artifact.updated_at;
        // Track core artifacts
        if (priority === 'core') {
            keyArtifacts.push(name);
        }
        // Parse timestamp
        if (updatedAtStr) {
            const updatedAt = parseDate(updatedAtStr);
            if (updatedAt) {
                if (updatedAt > sevenDaysAgo) {
                    recentChanges.push({
                        name,
                        updated: formatDate(updatedAt),
                        summary: (artifact.summary || '').slice(0, 100),
                    });
                }
                else if (updatedAt > thirtyDaysAgo) {
                    recentActivity.push(name);
                }
            }
        }
    }
    // Sort recent changes by date (newest first)
    recentChanges.sort((a, b) => b.updated.localeCompare(a.updated));
    // Get top 5 topic clusters
    const activeTopics = Object.keys(topicClusters).slice(0, 5);
    // Generate current state description
    const projectDesc = project.description || '';
    const artifactCount = artifacts.length;
    let activityStatus;
    if (recentChanges.length > 0) {
        activityStatus = 'actively updated';
    }
    else if (recentActivity.length > 0) {
        activityStatus = 'recently active';
    }
    else {
        activityStatus = 'stable';
    }
    let currentState = `${artifactCount} artifacts, ${activityStatus}`;
    if (activeTopics.length > 0) {
        currentState += `. Focus areas: ${activeTopics.slice(0, 3).join(', ')}`;
    }
    // Calculate stats
    const totalChars = artifacts.reduce((sum, a) => sum + (a.size_chars || 0), 0);
    const totalTokens = estimateTokens(totalChars);
    const coreCount = keyArtifacts.length;
    return {
        generated: formatDateTime(now),
        currentState,
        projectDescription: projectDesc.slice(0, 200) || null,
        recentChanges: recentChanges.slice(0, 5),
        keyArtifacts: keyArtifacts.slice(0, 8),
        activeTopics,
        stats: {
            totalArtifacts: artifactCount,
            coreArtifacts: coreCount,
            totalTokens,
            changesLast7Days: recentChanges.length,
            changesLast30Days: recentChanges.length + recentActivity.length,
        },
    };
}
//# sourceMappingURL=living-summary.js.map