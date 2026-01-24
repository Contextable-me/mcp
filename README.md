# @contextable/mcp

MCP (Model Context Protocol) server for AI memory. Store and retrieve context across AI conversations.

## Features

- **Dual Transport Modes**: Stdio (for Claude Desktop) or HTTP/SSE (for web clients)
- **Dual Storage Modes**: Local SQLite or hosted Supabase cloud storage
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

## Storage Modes

### Local Mode (Default)

Uses SQLite database stored locally at `~/.contextable/data.db`. Your data stays on your machine.

```bash
npx @contextable/mcp
# or explicitly:
npx @contextable/mcp --local
```

### Hosted Mode

Connects to the Contextable cloud service for synced storage across devices.

```bash
# Set your API key
export CONTEXTABLE_API_KEY=ctx_your_api_key_here

# Run in hosted mode
npx @contextable/mcp --hosted
```

Get your API key at: https://contextable.me/settings

## Transport Modes

### Stdio (Default)

Uses standard input/output for communication. This is the default mode and works with Claude Desktop.

```bash
npx @contextable/mcp
```

### HTTP/SSE

Uses HTTP with Server-Sent Events for communication. This mode enables web-based clients to connect.

```bash
# Start HTTP server on default port 3000
npx @contextable/mcp --sse

# Custom port and host
npx @contextable/mcp --sse --port=8080 --host=0.0.0.0
```

The HTTP server provides:
- `GET /health` - Health check endpoint
- `POST /mcp` - MCP message endpoint
- `GET /mcp` - SSE stream for server-to-client messages

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

### Local Mode

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

### Hosted Mode

```json
{
  "mcpServers": {
    "contextable": {
      "command": "npx",
      "args": ["@contextable/mcp", "--hosted"],
      "env": {
        "CONTEXTABLE_API_KEY": "ctx_your_api_key_here"
      }
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

### General

| Variable | Default | Description |
|----------|---------|-------------|
| `CONTEXTABLE_MODE` | `local` | Storage mode: `local` or `hosted` |
| `CONTEXTABLE_LOG_LEVEL` | `info` | Log level: debug, info, warn, error |

### Local Mode

| Variable | Default | Description |
|----------|---------|-------------|
| `CONTEXTABLE_DATA_DIR` | `~/.contextable` | Data directory |
| `CONTEXTABLE_DB_PATH` | `~/.contextable/data.db` | Database path |

### Hosted Mode

| Variable | Default | Description |
|----------|---------|-------------|
| `CONTEXTABLE_API_KEY` | - | Your API key (required for hosted mode) |
| `CONTEXTABLE_API_URL` | `https://api.contextable.me` | API URL |

### HTTP/SSE Transport

| Variable | Default | Description |
|----------|---------|-------------|
| `CONTEXTABLE_PORT` | `3000` | HTTP server port |
| `CONTEXTABLE_HOST` | `127.0.0.1` | HTTP server host |

## Example Usage

Once configured, you can ask Claude to:

- "Create a project called 'My App' for tracking my mobile app development"
- "Save this design decision to the project"
- "Search for authentication-related content"
- "Show me the project summary"
- "Load all security-related artifacts"

## API

The package exports types and functions for programmatic use:

### Local Storage (SQLite)

```typescript
import { SQLiteAdapter, projectSave, artifactGet, search } from '@contextable/mcp';

// Create local storage
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

### Hosted Storage (Supabase)

```typescript
import { SupabaseAdapter, projectSave } from '@contextable/mcp';

// Create hosted storage
const storage = new SupabaseAdapter({
  supabaseUrl: 'https://api.contextable.me',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  apiKey: process.env.CONTEXTABLE_API_KEY!,
});
await storage.initialize();

// Use tools - same API as local mode
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
