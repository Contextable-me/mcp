/**
 * Project management MCP tools.
 *
 * Tools for managing the user's projects in Contextable.
 * A project is a container for related artifacts.
 */

import type { StorageAdapter, Project } from '../storage/interface.js';
import { formatError } from '../utils/errors.js';
import { buildTopicClusters, filterByTopic } from '../logic/topics.js';
import { generateLivingSummary } from '../logic/living-summary.js';
import { estimateTokens } from '../logic/tokens.js';

/**
 * Context passed to tool functions.
 */
export interface ToolContext {
  storage: StorageAdapter;
}

/**
 * Find projects with similar names to help prevent duplicates.
 */
async function findSimilarProjects(
  storage: StorageAdapter,
  name: string
): Promise<Array<{ id: string; name: string; description: string | null }>> {
  const allProjects = await storage.projects.list({ limit: 100 });

  const nameLower = name.toLowerCase().trim();
  const nameWords = new Set(nameLower.split(/\s+/));

  const similar: Array<{ id: string; name: string; description: string | null }> = [];

  for (const project of allProjects) {
    const projName = project.name.toLowerCase().trim();
    const projWords = new Set(projName.split(/\s+/));

    // Skip exact matches (will be handled by upsert)
    if (projName === nameLower) {
      continue;
    }

    // Check for similarity
    let isSimilar = false;

    // One name contains the other
    if (nameLower.includes(projName) || projName.includes(nameLower)) {
      isSimilar = true;
    } else if (nameWords.size > 0 && projWords.size > 0) {
      // Significant word overlap
      const commonWords = [...nameWords].filter((w) => projWords.has(w));
      const overlapRatio = commonWords.length / Math.min(nameWords.size, projWords.size);
      if (overlapRatio >= 0.5 && commonWords.length >= 1) {
        isSimilar = true;
      }
    }

    if (isSimilar) {
      similar.push({
        id: project.id,
        name: project.name,
        description: project.description,
      });
    }
  }

  return similar.slice(0, 3);
}

/**
 * Create or update a project.
 */
export async function projectSave(
  ctx: ToolContext,
  params: {
    name: string;
    description?: string | null;
    tags?: string[];
    config?: Record<string, unknown>;
  }
): Promise<{
  success: boolean;
  project?: Project;
  status?: 'created' | 'updated';
  message: string;
  similar_projects?: Array<{ id: string; name: string; description: string | null }>;
  warning?: string;
  error?: string;
}> {
  try {
    const { name, description, tags, config } = params;

    // Check if project with this name already exists
    const existing = await ctx.storage.projects.getByName(name);

    // Check for similar projects before creating
    const similarProjects = existing ? [] : await findSimilarProjects(ctx.storage, name);

    let project: Project;
    let status: 'created' | 'updated';

    if (existing) {
      // Update existing project
      project = await ctx.storage.projects.update(existing.id, {
        description: description ?? undefined,
        tags: tags ?? undefined,
        config: config ?? undefined,
      });
      status = 'updated';
    } else {
      // Create new project
      project = await ctx.storage.projects.create({
        name,
        description: description ?? null,
        tags: tags ?? [],
        config: config ?? undefined,
      });
      status = 'created';
    }

    const response: ReturnType<typeof projectSave> extends Promise<infer R> ? R : never = {
      success: true,
      project,
      status,
      message: `Project '${name}' ${status} successfully`,
    };

    // Warn about similar projects when creating
    if (status === 'created' && similarProjects.length > 0) {
      response.similar_projects = similarProjects;
      const similarNames = similarProjects.map((p) => `'${p.name}'`).join(', ');
      response.warning =
        `Note: Similar project(s) already exist: ${similarNames}. ` +
        `If this is the same project, consider using the existing one instead.`;
    }

    return response;
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
      error: formatError(error),
    };
  }
}

/**
 * List all user's projects.
 */
export async function projectList(
  ctx: ToolContext,
  params: {
    status?: 'active' | 'archived';
    limit?: number;
    offset?: number;
  } = {}
): Promise<{
  success: boolean;
  projects?: Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    tags: string[];
    created_at: string;
    updated_at: string;
  }>;
  count?: number;
  limit?: number;
  offset?: number;
  message: string;
  error?: string;
}> {
  try {
    const { status, limit = 20, offset = 0 } = params;

    const projects = await ctx.storage.projects.list({ status, limit, offset });

    return {
      success: true,
      projects,
      count: projects.length,
      limit,
      offset,
      message:
        `Found ${projects.length} project(s)` +
        (offset > 0 ? ` (showing ${offset + 1}-${offset + projects.length})` : ''),
    };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
      error: formatError(error),
    };
  }
}

/**
 * Default token limit to prevent context overflow.
 */
const DEFAULT_MAX_TOKENS = 15000;

/**
 * Load a project with artifact summaries for resuming work.
 */
export async function projectResume(
  ctx: ToolContext,
  params: {
    project_id?: string;
    project_name?: string;
    load_content?: boolean;
    max_tokens?: number;
    priority_filter?: string[];
    topic_cluster?: string;
  }
): Promise<{
  success: boolean;
  project?: {
    id: string;
    name: string;
    description: string | null;
    tags: string[];
    updated_at: string;
  };
  living_summary?: ReturnType<typeof generateLivingSummary>;
  artifact_index?: Array<{
    id: string;
    name: string;
    summary: string;
    topics: string[];
    priority: string;
    size_tokens: number;
    updated_at: string;
    content_loaded: boolean;
  }>;
  artifacts?: Array<{
    id: string;
    title: string;
    artifact_type: string;
    content: string;
    summary: string | null;
    priority: string;
    tags: string[];
    version: number;
    updated_at: string;
  }>;
  artifact_count?: number;
  topic_clusters?: Record<string, string[]>;
  content_loaded_count?: number;
  loaded_tokens?: number;
  available_tokens?: number;
  message: string;
  hint?: string;
  error?: string;
}> {
  try {
    const {
      project_id,
      project_name,
      load_content = false,
      max_tokens = DEFAULT_MAX_TOKENS,
      priority_filter,
      topic_cluster,
    } = params;

    // Get project
    let project: Project | null = null;
    if (project_id) {
      project = await ctx.storage.projects.get(project_id);
    } else if (project_name) {
      project = await ctx.storage.projects.getByName(project_name);
    }

    if (!project) {
      return {
        success: false,
        message: `Project not found: ${project_id || project_name}`,
        error: 'Project not found',
      };
    }

    // Get artifacts
    let artifacts = await ctx.storage.artifacts.list(project.id, {
      priority: priority_filter?.[0] as 'core' | 'normal' | 'reference' | undefined,
    });

    // Filter by topic cluster if specified
    if (topic_cluster) {
      const filtered = filterByTopic(
        artifacts.map((a) => ({
          title: a.title,
          summary: a.summary ?? undefined,
          tags: a.tags,
        })),
        topic_cluster
      );
      const filteredTitles = new Set(filtered.map((a) => a.title));
      artifacts = artifacts.filter((a) => filteredTitles.has(a.title));
    }

    // Calculate sizes
    const totalChars = artifacts.reduce((sum, a) => sum + a.size_chars, 0);
    const totalTokensEst = estimateTokens(totalChars);

    // Build topic clusters
    const topicClusters = buildTopicClusters(
      artifacts.map((a) => ({
        title: a.title,
        summary: a.summary ?? undefined,
        tags: a.tags,
      }))
    );

    // Generate living summary
    const livingSummary = generateLivingSummary(
      { name: project.name, description: project.description },
      artifacts.map((a) => ({
        title: a.title,
        summary: a.summary ?? undefined,
        priority: a.priority,
        updated_at: a.updated_at,
        size_chars: a.size_chars,
      })),
      topicClusters
    );

    // Build artifact index
    const artifactIndex = artifacts.map((a) => ({
      id: a.id,
      name: a.title,
      summary: a.summary || '(no summary)',
      topics: a.tags,
      priority: a.priority,
      size_tokens: estimateTokens(a.size_chars),
      updated_at: a.updated_at,
      content_loaded: load_content,
    }));

    // Load full content if requested (up to token limit)
    let fullArtifacts: Array<{
      id: string;
      title: string;
      artifact_type: string;
      content: string;
      summary: string | null;
      priority: string;
      tags: string[];
      version: number;
      updated_at: string;
    }> = [];
    let loadedTokens = 0;
    let contentLoadedCount = 0;

    if (load_content) {
      for (const summary of artifacts) {
        const tokens = estimateTokens(summary.size_chars);
        if (loadedTokens + tokens > max_tokens) {
          break;
        }

        const full = await ctx.storage.artifacts.get(summary.id);
        if (full) {
          fullArtifacts.push({
            id: full.id,
            title: full.title,
            artifact_type: full.artifact_type,
            content: full.content,
            summary: full.summary,
            priority: full.priority,
            tags: full.tags,
            version: full.version,
            updated_at: full.updated_at,
          });
          loadedTokens += tokens;
          contentLoadedCount++;
        }
      }
    }

    const response: Awaited<ReturnType<typeof projectResume>> = {
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        tags: project.tags,
        updated_at: project.updated_at,
      },
      living_summary: livingSummary,
      artifact_index: artifactIndex,
      artifact_count: artifacts.length,
      topic_clusters: topicClusters,
      content_loaded_count: contentLoadedCount,
      loaded_tokens: loadedTokens,
      available_tokens: totalTokensEst,
      message:
        `Loaded '${project.name}' with ${artifacts.length} artifact(s)` +
        (load_content ? ` (~${loadedTokens.toLocaleString()} tokens loaded)` : ' (summaries only)'),
    };

    // Include full artifacts if loaded
    if (load_content && fullArtifacts.length > 0) {
      response.artifacts = fullArtifacts;
    }

    // Add navigation hints
    if (artifacts.length > 20) {
      response.hint =
        `Large project (${artifacts.length} artifacts). ` +
        `Topics: ${Object.keys(topicClusters).join(', ') || 'none tagged'}. ` +
        "Use artifact_get(id) to load specific items, or topic_cluster='topic' to filter.";
    } else if (!load_content && artifacts.length > 0) {
      response.hint =
        'Summaries loaded. Call artifact_get(id) for full content of items needed for current task.';
    }

    return response;
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
      error: formatError(error),
    };
  }
}

/**
 * Get cached AI analysis results for a project.
 */
export async function projectAnalysisGet(
  ctx: ToolContext,
  params: {
    project_id?: string;
    project_name?: string;
    analysis_type?: string;
  }
): Promise<{
  success: boolean;
  project_id?: string;
  project_name?: string;
  analysis_type?: string;
  analysis?: unknown;
  available_types?: string[];
  stale?: boolean;
  message: string;
  error?: string;
}> {
  const validAnalysisTypes = ['summary', 'alignment', 'gaps', 'inventory', 'dependencies', 'improvements'];
  const { project_id, project_name, analysis_type = 'summary' } = params;

  // Validate analysis_type
  if (!validAnalysisTypes.includes(analysis_type)) {
    return {
      success: false,
      message: `Invalid analysis_type '${analysis_type}'. Valid types: ${validAnalysisTypes.join(', ')}`,
      error: `Invalid analysis_type`,
    };
  }

  try {
    // Get project
    let project: Project | null = null;
    if (project_id) {
      project = await ctx.storage.projects.get(project_id);
    } else if (project_name) {
      project = await ctx.storage.projects.getByName(project_name);
    }

    if (!project) {
      return {
        success: false,
        message: `Project not found: ${project_id || project_name}`,
        error: 'Project not found',
      };
    }

    // Get analyses from project config
    const config = project.config as { analyses?: Record<string, unknown> } | undefined;
    const analyses = config?.analyses ?? {};
    const availableTypes = Object.keys(analyses);

    if (!(analysis_type in analyses)) {
      return {
        success: true,
        project_id: project.id,
        project_name: project.name,
        analysis_type,
        analysis: null,
        available_types: availableTypes,
        message:
          `No '${analysis_type}' analysis found. Available: ${availableTypes.join(', ') || 'none'}. ` +
          'Generate analysis from the web dashboard.',
      };
    }

    const analysis = analyses[analysis_type];

    return {
      success: true,
      project_id: project.id,
      project_name: project.name,
      analysis_type,
      analysis,
      available_types: availableTypes,
      stale: false, // Would need artifact timestamps to determine staleness
      message: `Retrieved '${analysis_type}' analysis for '${project.name}'`,
    };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
      error: formatError(error),
    };
  }
}
