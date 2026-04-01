# mac-mcp — Agent Instructions

## Project Overview
Local MCP server for optimizing MacBook arm64 performance. Provides disk management, performance monitoring, Go/Node/Python cache cleanup, and developer workflow tools.

## Tech Stack
- Node.js (ES modules)
- @modelcontextprotocol/sdk
- macOS system commands (diskutil, vm_stat, sysctl, etc.)

## Build & Run
```bash
npm install
npm start        # or: node src/index.js
npm run dev      # watch mode
```

## Test
```bash
npm test
```

## Architecture
- `src/index.js` — Main MCP server with all tool definitions
- Stdio transport for Claude Desktop / Claude Code integration
- ~20 tools across categories: disk, performance, process, network
- Targets macOS arm64 specifically

## Tool Categories
- **Disk Management**: usage analysis, cache cleanup, Docker cleanup, developer artifacts
- **Performance**: memory pressure, CPU usage, thermal, battery health
- **Process/System**: process list/kill, startup items, network status, system info

## Code Standards
- ES module syntax (import/export)
- Async/await for all shell command execution
- Structured JSON responses from all tools
