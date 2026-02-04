# @contextable/mcp

Give your AI a memory. Works with Claude Desktop and any MCP-compatible client.

## Quick Start (30 seconds)

Add to your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

Restart Claude Desktop. Done.

Now ask Claude: *"Create a project called My App to track my development decisions"*

## What You Can Do

**Save context that persists across conversations:**

- *"Save this architecture decision to the project"*
- *"Remember this API design for later"*
- *"Store this bug investigation so I don't forget"*

**Find anything instantly:**

- *"Search for authentication"*
- *"What did we decide about the database?"*
- *"Load all security-related artifacts"*

**Pick up where you left off:**

- *"Resume my project"*
- *"Show me the project summary"*
- *"What were we working on?"*

**Import your chat history (NEW):**

- *"Analyze my ChatGPT export at ~/Downloads/chatgpt-export.zip"*
- *"Import the 'React Development' project from my chat history"*
- *"What projects can you detect from my Claude conversations?"*

## Features

| Feature | Description |
|---------|-------------|
| **Projects** | Organize context by project or topic |
| **Artifacts** | Save decisions, code snippets, docs, conversations |
| **Full-Text Search** | Find anything across all projects |
| **Version History** | Every change tracked, rollback anytime |
| **Auto-Chunking** | Large content automatically split |
| **Topic Clustering** | Auto-detect themes across artifacts |
| **Chat Import** | Import from ChatGPT, Claude, Gemini exports |

## All 15 Tools

### Projects
- `project_save` - Create or update a project
- `project_list` - List all projects
- `project_resume` - Load project with summaries
- `project_analysis_get` - Get AI-generated insights

### Artifacts
- `artifact_save` - Save content (auto-chunks large files)
- `artifact_list` - List with size estimates
- `artifact_get` - Load full content
- `artifact_delete` - Archive (recoverable)
- `artifact_restore` - Restore archived
- `artifact_archived` - List archived items
- `artifact_versions` - View history
- `artifact_rollback` - Restore previous version

### Search
- `search` - Full-text search across everything

### Import (NEW in v0.2.0)
- `import_analyze` - Analyze chat exports from ChatGPT, Claude, or Gemini
- `import_seed` - Create projects from analyzed chat history

## Your Data

Everything is stored locally in SQLite:

```
~/.contextable/data.db
```

No account. No cloud. No tracking. Your data stays on your machine.

---

## Want More?

**[Contextable Cloud](https://contextable.me)** adds:

| Feature | Local | Cloud |
|---------|:-----:|:-----:|
| Claude Desktop | ✓ | ✓ |
| ChatGPT | - | ✓ |
| Claude.ai (web) | - | ✓ |
| Sync across devices | - | ✓ |
| AI analysis & insights | - | ✓ |
| Team sharing | - | Coming soon |

**[Try Contextable Cloud →](https://contextable.me)**

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CONTEXTABLE_DATA_DIR` | `~/.contextable` | Data directory |
| `CONTEXTABLE_DB_PATH` | `~/.contextable/data.db` | SQLite database path |
| `CONTEXTABLE_LOG_LEVEL` | `info` | Logging: debug, info, warn, error |

### Custom Database Location

```json
{
  "mcpServers": {
    "contextable": {
      "command": "npx",
      "args": ["@contextable/mcp"],
      "env": {
        "CONTEXTABLE_DB_PATH": "/path/to/my/data.db"
      }
    }
  }
}
```

### HTTP Mode (Advanced)

For web-based MCP clients, run as HTTP server:

```bash
npx @contextable/mcp --sse --port 3000
```

Endpoints:
- `GET /health` - Health check
- `POST /mcp` - MCP messages (JSON-RPC)

## Programmatic Usage

```typescript
import { SQLiteAdapter } from '@contextable/mcp';

const storage = new SQLiteAdapter({ path: './my-context.db' });
await storage.initialize();

// Create a project
const project = await storage.createProject({
  name: 'My Project',
  description: 'Project description',
});

// Save an artifact
const artifact = await storage.createArtifact({
  projectId: project.id,
  title: 'Design Decision',
  artifactType: 'decision',
  content: '# We chose PostgreSQL because...',
});

// Search
const results = await storage.search('postgresql');

await storage.close();
```

## Development

```bash
git clone https://github.com/Contextable-me/mcp.git
cd mcp
npm install
npm run build
npm test
```

## License

Apache 2.0 - See [LICENSE](LICENSE)

## Links

- **[Contextable Cloud](https://contextable.me)** - Sync, ChatGPT, AI analysis
- **[GitHub](https://github.com/Contextable-me/mcp)** - Source code
- **[MCP Protocol](https://modelcontextprotocol.io)** - Specification
- **[npm](https://www.npmjs.com/package/@contextable/mcp)** - Package
