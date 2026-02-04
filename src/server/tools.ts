/**
 * Tool registration for the MCP server.
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { StorageAdapter } from '../storage/interface.js';
import type { ToolContext } from '../tools/index.js';
import {
  projectSave,
  projectList,
  projectResume,
  projectAnalysisGet,
  artifactSave,
  artifactList,
  artifactGet,
  artifactDelete,
  artifactRestore,
  artifactArchived,
  artifactVersions,
  artifactRollback,
  search,
  importAnalyze,
  importSeed,
} from '../tools/index.js';

/**
 * Tool definitions for MCP.
 */
export const TOOL_DEFINITIONS = [
  {
    name: 'project_save',
    description: `Create or update a project.

If a project with this name exists, it will be updated. Otherwise, a new
project is created. This is safe to call multiple times with the same name.

IMPORTANT: Before creating a new project, check if a similar project already
exists. The response will include 'similar_projects' if potential duplicates
are found - consider using an existing project instead of creating a new one.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string', description: 'Brief description of the project' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key themes and topics for this project',
        },
        config: {
          type: 'object',
          description: 'Additional metadata',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'project_list',
    description: `List all user's projects.

Returns project names, descriptions, and IDs. Does NOT include artifact
content - use project_resume for that.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'archived'],
          description: 'Filter by project status',
        },
        limit: { type: 'number', description: 'Max projects to return (default 20)' },
        offset: { type: 'number', description: 'Skip this many for pagination' },
      },
    },
  },
  {
    name: 'project_resume',
    description: `Load a project with artifact summaries for resuming work.

DEFAULT BEHAVIOR: Returns artifact summaries only (load_content=False).
This gives you an overview to decide which specific artifacts to load.

For projects >20 artifacts, load only what's needed for the current task.
Use artifact_get to load specific items after reviewing the summary.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: "The project's UUID (if known)" },
        project_name: {
          type: 'string',
          description: "The project's name (case-insensitive, use if no ID)",
        },
        load_content: {
          type: 'boolean',
          description: 'Load full artifact content (default false)',
        },
        max_tokens: {
          type: 'number',
          description: 'Stop loading content after this many tokens (~chars/4)',
        },
        priority_filter: {
          type: 'array',
          items: { type: 'string' },
          description: "Only include artifacts with these priorities (e.g., ['core'])",
        },
        topic_cluster: {
          type: 'string',
          description: "Filter artifacts by tag/topic (e.g., 'security')",
        },
      },
    },
  },
  {
    name: 'project_analysis_get',
    description: `Get cached AI analysis results for a project.

Returns previously-computed analysis from the project's config. This is a
read-only operation that retrieves existing analysis - it does NOT run new
analysis. Analyses are generated via the web dashboard.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: "The project's UUID (if known)" },
        project_name: { type: 'string', description: "The project's name" },
        analysis_type: {
          type: 'string',
          enum: ['summary', 'alignment', 'gaps', 'inventory', 'dependencies', 'improvements'],
          description: 'Type of analysis to retrieve (default: summary)',
        },
      },
    },
  },
  {
    name: 'artifact_save',
    description: `Save content to a project. Large content is automatically chunked.

BEST PRACTICES:
- Keep artifacts focused and under 4KB when possible
- Write meaningful summaries (2-3 sentences)
- Use topic tags for clustering
- Set priority='core' for essential context

SIZE LIMITS:
- Content over 3.5KB is automatically split into multiple parts
- Each part is saved as a separate artifact with _part_N suffix`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'The project to save to' },
        name: { type: 'string', description: 'Artifact name (same name = update existing)' },
        artifact_type: {
          type: 'string',
          enum: ['document', 'code', 'decision', 'conversation', 'file'],
          description: 'Type of artifact',
        },
        content: { type: 'string', description: 'Content to save (markdown)' },
        summary: { type: 'string', description: 'Short summary (2-3 sentences)' },
        priority: {
          type: 'string',
          enum: ['core', 'normal', 'reference'],
          description: 'Priority level (default: normal)',
        },
        description: { type: 'string', description: 'Brief description' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Topic tags for clustering',
        },
        auto_chunk: {
          type: 'boolean',
          description: 'Auto-split large content into parts (default: true)',
        },
      },
      required: ['project_id', 'name', 'artifact_type', 'content'],
    },
  },
  {
    name: 'artifact_list',
    description: `List artifacts in a project with size estimates.

Returns artifact names, types, descriptions, and SIZE ESTIMATES to help you
decide what to load. Full content is NOT included - use artifact_get for that.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'The project to list artifacts from' },
        artifact_type: { type: 'string', description: 'Filter by type' },
        limit: { type: 'number', description: 'Max artifacts to return (default 20)' },
        offset: { type: 'number', description: 'Skip this many for pagination' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'artifact_get',
    description: `Load a specific artifact's full content.

Use this to load ONE artifact when you already know its ID from artifact_list,
search, or a previous project_resume call.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        artifact_id: { type: 'string', description: "The artifact's UUID" },
        max_content_length: {
          type: 'number',
          description: 'Max characters to return (default 50000, truncates if larger)',
        },
      },
      required: ['artifact_id'],
    },
  },
  {
    name: 'artifact_delete',
    description: `Delete (archive) an artifact. The artifact is soft-deleted and can be restored.

This does NOT permanently delete the artifact. It archives it so it won't appear
in lists or searches, but can be restored if needed.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        artifact_id: { type: 'string', description: "The artifact's UUID to archive" },
      },
      required: ['artifact_id'],
    },
  },
  {
    name: 'artifact_restore',
    description: `Restore an archived (deleted) artifact.

Brings back an artifact that was previously deleted with artifact_delete.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        artifact_id: { type: 'string', description: "The artifact's UUID to restore" },
      },
      required: ['artifact_id'],
    },
  },
  {
    name: 'artifact_archived',
    description: `List archived (deleted) artifacts in a project.

Shows artifacts that were deleted but can still be restored.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'The project to list archived artifacts from' },
        limit: { type: 'number', description: 'Max artifacts to return (default 20)' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'artifact_versions',
    description: `Get version history for an artifact.

Shows all previous versions of an artifact, captured automatically whenever
the content, title, summary, or priority changes.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        artifact_id: { type: 'string', description: "The artifact's UUID" },
        limit: { type: 'number', description: 'Max versions to return (default 10)' },
      },
      required: ['artifact_id'],
    },
  },
  {
    name: 'artifact_rollback',
    description: `Rollback an artifact to a previous version.

Restores the artifact's content, title, summary, and other fields to what
they were in a specific version.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        artifact_id: { type: 'string', description: "The artifact's UUID" },
        version_id: {
          type: 'string',
          description: 'The version ID to rollback to (from artifact_versions)',
        },
      },
      required: ['artifact_id', 'version_id'],
    },
  },
  {
    name: 'search',
    description: `Search for content across all projects.

Searches artifact titles and content for matching text. Great for finding
something when you don't remember which project it's in.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Text to search for (searches titles and content)' },
        project_id: { type: 'string', description: 'Optional - limit to one project' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'import_analyze',
    description: `Analyze a chat export file without importing.

Parses a ZIP file exported from ChatGPT, Claude, or Gemini and returns:
- Detected topics and patterns in your conversations
- Suggested projects to create based on conversation clusters
- Key decisions you've made
- Statistics about your chat history

All processing happens locally - your data never leaves your device.

USAGE:
1. Export your chat history from ChatGPT/Claude/Gemini
2. Provide the path to the ZIP file
3. Review the analysis to see suggested projects
4. Use import_seed to create the projects you want`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        file_path: {
          type: 'string',
          description: 'Absolute path to the exported ZIP file (e.g., /Users/you/Downloads/chatgpt-export.zip)',
        },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'import_seed',
    description: `Import selected projects from a chat export.

After running import_analyze, use this to create the projects you want.
Each project will include:
- A context artifact summarizing the imported conversations
- Key decisions extracted from the conversations
- Any suggested artifacts (code snippets, documents, etc.)

All processing happens locally - your data stays on your device.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the ZIP file (same as used in import_analyze)',
        },
        project_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Names of projects to import (from detected_projects in analysis)',
        },
        create_context_artifacts: {
          type: 'boolean',
          description: 'Create context artifacts with conversation summaries (default: true)',
        },
        include_decisions: {
          type: 'boolean',
          description: 'Include detected decisions as artifacts (default: true)',
        },
      },
      required: ['file_path', 'project_names'],
    },
  },
];

/**
 * Tool handler type.
 */
type ToolHandler = (ctx: ToolContext, params: Record<string, unknown>) => Promise<unknown>;

/**
 * Tool handlers map.
 */
const TOOL_HANDLERS: Record<string, ToolHandler> = {
  project_save: (ctx, params) =>
    projectSave(ctx, params as Parameters<typeof projectSave>[1]),
  project_list: (ctx, params) =>
    projectList(ctx, params as Parameters<typeof projectList>[1]),
  project_resume: (ctx, params) =>
    projectResume(ctx, params as Parameters<typeof projectResume>[1]),
  project_analysis_get: (ctx, params) =>
    projectAnalysisGet(ctx, params as Parameters<typeof projectAnalysisGet>[1]),
  artifact_save: (ctx, params) =>
    artifactSave(ctx, params as Parameters<typeof artifactSave>[1]),
  artifact_list: (ctx, params) =>
    artifactList(ctx, params as Parameters<typeof artifactList>[1]),
  artifact_get: (ctx, params) =>
    artifactGet(ctx, params as Parameters<typeof artifactGet>[1]),
  artifact_delete: (ctx, params) =>
    artifactDelete(ctx, params as Parameters<typeof artifactDelete>[1]),
  artifact_restore: (ctx, params) =>
    artifactRestore(ctx, params as Parameters<typeof artifactRestore>[1]),
  artifact_archived: (ctx, params) =>
    artifactArchived(ctx, params as Parameters<typeof artifactArchived>[1]),
  artifact_versions: (ctx, params) =>
    artifactVersions(ctx, params as Parameters<typeof artifactVersions>[1]),
  artifact_rollback: (ctx, params) =>
    artifactRollback(ctx, params as Parameters<typeof artifactRollback>[1]),
  search: (ctx, params) => search(ctx, params as Parameters<typeof search>[1]),
  import_analyze: (ctx, params) =>
    importAnalyze(ctx, params as Parameters<typeof importAnalyze>[1]),
  import_seed: (ctx, params) =>
    importSeed(ctx, params as Parameters<typeof importSeed>[1]),
};

/**
 * Register all tools with the MCP server.
 */
export function registerTools(server: Server, storage: StorageAdapter): void {
  const ctx: ToolContext = { storage };

  // Register tools/list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS,
  }));

  // Register tools/call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

      const handler = TOOL_HANDLERS[name];
      if (!handler) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }),
            },
          ],
        };
      }

      try {
        const result = await handler(ctx, args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
        };
      }
    }
  );
}
