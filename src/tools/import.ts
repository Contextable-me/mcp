/**
 * Chat history import MCP tools.
 *
 * Tools for importing chat exports from ChatGPT, Claude, and Gemini
 * into local Contextable projects.
 *
 * All parsing happens locally - your data never leaves your device.
 */

import type { ToolContext } from './projects.js';
import type { Project, Artifact, ArtifactType, Priority } from '../storage/interface.js';
import { formatError } from '../utils/errors.js';
import {
  parseExportFromPath,
  analyzeExport,
  type ConversationAnalysis,
  type DetectedProject,
  type DetectedDecision,
  type UsagePattern,
} from '../import/index.js';

/**
 * Analyze a chat export file without importing.
 *
 * Parses the ZIP file and returns analysis including:
 * - Detected topics and patterns
 * - Suggested projects to create
 * - Key decisions found
 * - Statistics about the conversations
 */
export async function importAnalyze(
  _ctx: ToolContext,
  params: {
    file_path: string;
  }
): Promise<{
  success: boolean;
  message: string;
  analysis?: ConversationAnalysis;
}> {
  try {
    // Parse the export file
    const parsed = await parseExportFromPath(params.file_path);

    // Analyze the parsed data
    const analysis = analyzeExport(parsed);

    return {
      success: true,
      message: `Analyzed ${analysis.totalConversations} conversations from ${analysis.source}. Found ${analysis.detectedProjects.length} potential projects.`,
      analysis,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to analyze export: ${formatError(error)}`,
    };
  }
}

/**
 * Import selected projects from a chat export.
 *
 * Takes the analysis results and creates the selected projects
 * with their artifacts in the local database.
 */
export async function importSeed(
  ctx: ToolContext,
  params: {
    /** Path to the ZIP file (same as used in import_analyze) */
    file_path: string;
    /** Names of projects to import (from detected_projects in analysis) */
    project_names: string[];
    /** Whether to create context artifacts with conversation summaries */
    create_context_artifacts?: boolean;
    /** Whether to include detected decisions as artifacts */
    include_decisions?: boolean;
  }
): Promise<{
  success: boolean;
  message: string;
  projects_created?: number;
  artifacts_created?: number;
  project_ids?: string[];
}> {
  try {
    const { storage } = ctx;
    const {
      file_path,
      project_names,
      create_context_artifacts = true,
      include_decisions = true,
    } = params;

    if (!project_names || project_names.length === 0) {
      return {
        success: false,
        message: 'No projects specified. Run import_analyze first to see available projects.',
      };
    }

    // Parse and analyze again (stateless)
    const parsed = await parseExportFromPath(file_path);
    const analysis = analyzeExport(parsed);

    // Find the selected projects
    const selectedProjects = analysis.detectedProjects.filter((p: DetectedProject) =>
      project_names.some(
        (name: string) => name.toLowerCase() === p.suggestedName.toLowerCase()
      )
    );

    if (selectedProjects.length === 0) {
      return {
        success: false,
        message: `None of the specified projects were found. Available: ${analysis.detectedProjects.map((p: DetectedProject) => p.suggestedName).join(', ')}`,
      };
    }

    const projectIds: string[] = [];
    let artifactCount = 0;

    // Create each project
    for (const detected of selectedProjects) {
      // Check if project exists, create or update
      let project: Project;
      const existing = await storage.projects.getByName(detected.suggestedName);

      if (existing) {
        project = await storage.projects.update(existing.id, {
          description: buildProjectDescription(detected, analysis),
          tags: detected.keyTopics,
        });
      } else {
        project = await storage.projects.create({
          name: detected.suggestedName,
          description: buildProjectDescription(detected, analysis),
          tags: detected.keyTopics,
        });
      }

      projectIds.push(project.id);

      // Create context artifact
      if (create_context_artifacts) {
        await createOrUpdateArtifact(storage, {
          project_id: project.id,
          title: 'Import Context',
          artifact_type: 'document',
          content: buildContextContent(detected, analysis),
          summary: `Imported from ${detected.conversationIds.length} conversations`,
          priority: 'core',
        });
        artifactCount++;
      }

      // Create suggested artifacts
      for (const artifact of detected.suggestedArtifacts) {
        await createOrUpdateArtifact(storage, {
          project_id: project.id,
          title: artifact.name,
          artifact_type: mapArtifactType(artifact.type),
          content: artifact.content,
          priority: 'normal',
        });
        artifactCount++;
      }

      // Create decisions artifact
      if (include_decisions) {
        const projectDecisions = analysis.decisions.filter((d: DetectedDecision) =>
          detected.conversationIds.includes(d.conversationId)
        );

        if (projectDecisions.length > 0) {
          const decisionsContent = projectDecisions
            .map((d: DetectedDecision, i: number) => `${i + 1}. **${d.decision}**\n   ${d.context}`)
            .join('\n\n');

          await createOrUpdateArtifact(storage, {
            project_id: project.id,
            title: 'Key Decisions',
            artifact_type: 'decision',
            content: decisionsContent,
            summary: `${projectDecisions.length} decisions from chat history`,
            priority: 'normal',
          });
          artifactCount++;
        }
      }
    }

    return {
      success: true,
      message: `Created ${projectIds.length} projects with ${artifactCount} artifacts from ${analysis.source} export.`,
      projects_created: projectIds.length,
      artifacts_created: artifactCount,
      project_ids: projectIds,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to import: ${formatError(error)}`,
    };
  }
}

/**
 * Helper to create or update an artifact by title.
 */
async function createOrUpdateArtifact(
  storage: ToolContext['storage'],
  data: {
    project_id: string;
    title: string;
    artifact_type: ArtifactType;
    content: string;
    summary?: string;
    priority?: Priority;
  }
): Promise<Artifact> {
  // Try to find existing artifact with same title in project
  const existing = await storage.artifacts.list(data.project_id, {
    limit: 100,
  });

  const existingArtifact = existing.find(
    (a) => a.title.toLowerCase() === data.title.toLowerCase()
  );

  if (existingArtifact) {
    return storage.artifacts.update(existingArtifact.id, {
      content: data.content,
      summary: data.summary,
      priority: data.priority,
    });
  }

  return storage.artifacts.create({
    project_id: data.project_id,
    title: data.title,
    artifact_type: data.artifact_type,
    content: data.content,
    summary: data.summary || null,
    priority: data.priority || 'normal',
  });
}

/**
 * Map import artifact type to storage artifact type.
 */
function mapArtifactType(type: string): ArtifactType {
  const typeMap: Record<string, ArtifactType> = {
    context: 'document',
    decision: 'decision',
    code: 'code',
    document: 'document',
    conversation: 'conversation',
    file: 'file',
  };
  return typeMap[type.toLowerCase()] || 'document';
}

/**
 * Build a description for an imported project.
 */
function buildProjectDescription(
  project: DetectedProject,
  analysis: ConversationAnalysis
): string {
  const parts: string[] = [];

  parts.push(`Imported from ${analysis.source} chat history.`);
  parts.push(`Based on ${project.conversationIds.length} conversations.`);

  if (project.keyTopics.length > 0) {
    parts.push(`Key topics: ${project.keyTopics.slice(0, 5).join(', ')}.`);
  }

  return parts.join(' ');
}

/**
 * Build content for a context artifact.
 */
function buildContextContent(
  project: DetectedProject,
  analysis: ConversationAnalysis
): string {
  const lines: string[] = [];

  lines.push(`# ${project.suggestedName}`);
  lines.push('');
  lines.push('## Overview');
  lines.push('');
  lines.push(`This project was created from ${project.conversationIds.length} conversations imported from ${analysis.source}.`);
  lines.push('');

  if (project.keyTopics.length > 0) {
    lines.push('## Key Topics');
    lines.push('');
    for (const topic of project.keyTopics) {
      lines.push(`- ${topic}`);
    }
    lines.push('');
  }

  // Add relevant patterns
  const relevantPatterns = analysis.patterns.filter((p: UsagePattern) =>
    p.examples.some((ex: string) =>
      project.keyTopics.some((topic: string) =>
        ex.toLowerCase().includes(topic.toLowerCase())
      )
    )
  );

  if (relevantPatterns.length > 0) {
    lines.push('## Usage Patterns');
    lines.push('');
    for (const pattern of relevantPatterns) {
      lines.push(`### ${pattern.patternType.replace(/_/g, ' ')}`);
      lines.push(pattern.description);
      lines.push('');
    }
  }

  lines.push('## Source');
  lines.push('');
  lines.push(`- **Platform**: ${analysis.source}`);
  lines.push(`- **Conversations**: ${project.conversationIds.length}`);
  if (analysis.dateRange[0] && analysis.dateRange[1]) {
    lines.push(`- **Date Range**: ${analysis.dateRange[0].toLocaleDateString()} - ${analysis.dateRange[1].toLocaleDateString()}`);
  }

  return lines.join('\n');
}
