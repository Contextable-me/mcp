# @contextable/mcp

Local-first MCP (Model Context Protocol) server for AI memory. Store and retrieve context across AI conversations.

## Features

- **Local Storage**: SQLite database stored in `~/.contextable/data.db`
- **Full-Text Search**: FTS5-powered search across all artifacts
- **Version History**: Automatic versioning with rollback support
- **Auto-Chunking**: Large content automatically split into manageable parts
- **Topic Clustering**: Automatic topic detection and filtering
- **Living Summaries**: Auto-generated project status summaries

## Installation

```bash
npm install -g @contextable/mcp
```

Or run directly:

```bash
npx @contextable/mcp
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "contextable": {
      "command": "npx",
      "args": ["@contextable/mcp"]
    }
  }
}
```

## Tools

### Project Management

- **project_save** - Create or update a project
- **project_list** - List all projects
- **project_resume** - Load a project with artifact summaries
- **project_analysis_get** - Get cached AI analysis results

### Artifact Management

- **artifact_save** - Save content to a project (auto-chunks large content)
- **artifact_list** - List artifacts with size estimates
- **artifact_get** - Load full artifact content
- **artifact_delete** - Archive an artifact
- **artifact_restore** - Restore an archived artifact
- **artifact_archived** - List archived artifacts
- **artifact_versions** - Get version history
- **artifact_rollback** - Rollback to previous version

### Search

- **search** - Full-text search across all artifacts

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CONTEXTABLE_DATA_DIR` | `~/.contextable` | Data directory |
| `CONTEXTABLE_DB_PATH` | `~/.contextable/data.db` | Database path |
| `CONTEXTABLE_LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |

## Example Usage

Once configured, you can ask Claude to:

- "Create a project called 'My App' for tracking my mobile app development"
- "Save this design decision to the project"
- "Search for authentication-related content"
- "Show me the project summary"
- "Load all security-related artifacts"

## API

The package also exports types and functions for programmatic use:

```typescript
import { SQLiteAdapter, projectSave, artifactGet, search } from '@contextable/mcp';

// Create storage
const storage = new SQLiteAdapter({ path: './my-data.db' });
await storage.initialize();

// Use tools
const ctx = { storage };
const result = await projectSave(ctx, {
  name: 'My Project',
  description: 'A test project',
});

await storage.close();
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type check
npm run typecheck
```

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Links

- [Contextable](https://contextable.me) - Hosted version with advanced features
- [MCP Protocol](https://modelcontextprotocol.io) - Model Context Protocol specification
