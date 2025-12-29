# mac-mcp

Local MCP (Model Context Protocol) tool server for optimizing MacBook arm64 performance, with special consideration for the aftrs-studio codebase.

## Features

### Disk Management
- **Disk Usage Analysis**: Analyze disk usage by category with recommendations
- **Cache Cleanup**: Clean Go build cache, Homebrew cache, browser caches, npm/pip caches
- **Docker Cleanup**: Prune unused Docker images, containers, and volumes
- **Developer Cleanup**: Clean node_modules, .git objects, and other dev artifacts

### Performance Monitoring
- **Memory Pressure**: Monitor system memory and swap usage
- **CPU Usage**: Track CPU utilization across cores
- **Disk I/O**: Monitor read/write performance

### Developer Workflow
- **Go Cache Management**: Automatic GOCACHE monitoring and cleanup
- **Python Environment Cleanup**: Manage pyenv versions and pip cache
- **Node.js Cleanup**: Clean npm/pnpm cache and stale node_modules

## Installation

```bash
# Clone the repo
git clone https://github.com/aftrs-studio/mac-mcp.git ~/mac-mcp

# Install dependencies
cd ~/mac-mcp && npm install

# Add to Claude Desktop config
```

Add to `~/.config/claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "mac-mcp": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/mac-mcp/src/index.js"]
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `mac_disk_usage` | Analyze disk usage and categorize largest consumers |
| `mac_cleanup_caches` | Clean various caches (go, brew, npm, pip, browser) |
| `mac_cleanup_docker` | Prune Docker resources |
| `mac_go_cache_status` | Check Go build cache size and provide recommendations |
| `mac_memory_status` | Show memory pressure and swap usage |
| `mac_cleanup_recommendations` | Get personalized cleanup recommendations |

## Go Cache Management

Go's build cache has no built-in size limit and can grow to 50GB+. This tool provides:

1. **Monitoring**: Track cache size over time
2. **Alerts**: Warn when cache exceeds threshold (default: 10GB)
3. **Cleanup**: Safe cache clearing with `go clean -cache`
4. **Scheduling**: Optional launchd integration for automatic cleanup

### Manual Go Cache Commands
```bash
# Check cache location and size
go env GOCACHE
du -sh $(go env GOCACHE)

# Clear build cache
go clean -cache

# Clear test cache only
go clean -testcache

# Clear module cache (careful - will re-download modules)
go clean -modcache
```

## License

MIT
