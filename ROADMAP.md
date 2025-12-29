# mac-mcp Roadmap

## Vision
A comprehensive MCP tool server for MacBook Pro optimization, focusing on disk management, performance monitoring, and developer workflow automation for the aftrs-studio codebase.

---

## Phase 1: Core Disk Management (Current)

### Completed
- [x] `mac_disk_usage` - Analyze disk usage by category
- [x] `mac_go_cache_status` - Go build cache monitoring
- [x] `mac_cleanup_caches` - Clean system/dev caches (Go, Homebrew, npm, pip, Chrome, Spotify)
- [x] `mac_cleanup_docker` - Docker resource pruning
- [x] `mac_empty_trash` - Trash management
- [x] `mac_full_cleanup_workflow` - Comprehensive automated cleanup
- [x] `mac_analyze_library` - Deep ~/Library analysis
- [x] `mac_developer_cleanup` - Developer artifact cleanup (node_modules, Xcode, pyenv)
- [x] `mac_cleanup_recommendations` - Personalized cleanup suggestions

### Pending
- [ ] `mac_cleanup_schedule` - Schedule automatic cleanups via launchd
- [ ] `mac_disk_alerts` - Alert when disk usage exceeds threshold
- [ ] Size tracking/history to show cache growth over time

---

## Phase 2: Performance Monitoring

### Memory
- [x] `mac_memory_status` - Current memory pressure and top processes
- [ ] `mac_memory_pressure_history` - Track memory pressure over time
- [ ] `mac_swap_analysis` - Detailed swap usage analysis
- [ ] `mac_memory_hogs` - Identify processes with memory leaks

### CPU
- [ ] `mac_cpu_usage` - Real-time CPU utilization per core
- [ ] `mac_thermal_status` - Thermal throttling detection
- [ ] `mac_process_monitor` - Track resource-intensive processes
- [ ] `mac_efficiency_cores` - Monitor efficiency vs performance core usage (Apple Silicon)

### Battery & Power
- [ ] `mac_battery_health` - Battery health and cycle count
- [ ] `mac_power_status` - Power source and charging status
- [ ] `mac_energy_hogs` - Apps consuming excessive energy

---

## Phase 3: System Management

### Process Control
- [ ] `mac_process_list` - List running processes with resource usage
- [ ] `mac_kill_process` - Safely terminate processes
- [ ] `mac_app_not_responding` - Detect and handle frozen apps
- [ ] `mac_startup_items` - Manage login items and launch agents

### Network
- [ ] `mac_network_status` - Current network interfaces and connectivity
- [ ] `mac_wifi_diagnostics` - WiFi signal strength and issues
- [ ] `mac_dns_flush` - Flush DNS cache
- [ ] `mac_network_usage` - Per-app network bandwidth usage

### Storage
- [ ] `mac_disk_health` - SSD health and SMART status
- [ ] `mac_large_files` - Find largest files on disk
- [ ] `mac_duplicate_files` - Detect duplicate files
- [ ] `mac_old_downloads` - Find stale downloads

---

## Phase 4: Developer Workflow (aftrs-studio specific)

### Git Optimization
- [ ] `mac_git_gc` - Run git garbage collection across repos
- [ ] `mac_git_large_files` - Find large files in git history
- [ ] `mac_git_stale_branches` - Identify stale local branches

### Project Management
- [ ] `mac_project_health` - Analyze aftrs-studio project health
- [ ] `mac_dependency_audit` - Check for outdated dependencies
- [ ] `mac_unused_deps` - Find unused npm/pip dependencies
- [ ] `mac_build_cache_status` - Monitor build caches (Next.js, Webpack, etc.)

### Container & Virtualization
- [ ] `mac_docker_stats` - Detailed Docker container stats
- [ ] `mac_container_logs` - Access container logs
- [ ] `mac_vm_status` - Check running VMs (Parallels, VMware, UTM)

---

## Phase 5: Automation & Scheduling

### Maintenance Automation
- [ ] `mac_maintenance_schedule` - Schedule recurring maintenance tasks
- [ ] `mac_weekly_report` - Generate weekly system health report
- [ ] `mac_auto_cleanup` - Automatic cleanup based on triggers

### Alerts & Notifications
- [ ] `mac_alert_config` - Configure alert thresholds
- [ ] `mac_notification_send` - Send macOS notifications
- [ ] `mac_health_check` - Comprehensive system health check

---

## Phase 6: Integration & Extensions

### Cloud Integration
- [ ] `mac_icloud_status` - iCloud sync status and storage
- [ ] `mac_dropbox_cache` - Manage Dropbox cache

### IDE Integration
- [ ] `mac_vscode_cleanup` - Clean VS Code caches and extensions
- [ ] `mac_cursor_cleanup` - Clean Cursor AI caches
- [ ] `mac_jetbrains_cleanup` - Clean JetBrains IDE caches

### Backup Integration
- [ ] `mac_timemachine_status` - Time Machine backup status
- [ ] `mac_backup_excludes` - Manage backup exclusions

---

## Future Considerations

### AI-Powered Features
- Predictive cleanup suggestions based on usage patterns
- Automatic performance optimization recommendations
- Anomaly detection for system issues

### Cross-Device
- Sync settings across multiple Macs
- Remote monitoring capabilities

---

## Contributing

To add a new tool:
1. Add tool definition to `tools` array in `src/index.js`
2. Implement handler function `handleToolName()`
3. Add case to switch statement in request handler
4. Update README.md with tool documentation
5. Update this roadmap

---

## Version History

- **v0.1.0** - Initial release with core disk management tools
