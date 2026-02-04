/**
 * MCP Tools exports.
 *
 * All tools follow the same pattern:
 * - Take a ToolContext with storage adapter
 * - Take typed parameters
 * - Return a result object with success, message, and optional data
 */

export type { ToolContext } from './projects.js';

// Project tools
export { projectSave, projectList, projectResume, projectAnalysisGet } from './projects.js';

// Artifact tools
export {
  artifactSave,
  artifactList,
  artifactGet,
  artifactDelete,
  artifactRestore,
  artifactArchived,
  artifactVersions,
  artifactRollback,
} from './artifacts.js';

// Search tool
export { search } from './search.js';

// Import tools
export { importAnalyze, importSeed } from './import.js';
