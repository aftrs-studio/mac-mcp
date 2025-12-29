#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const server = new Server(
  { name: "mac-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

// Tool definitions
const tools = [
  {
    name: "mac_disk_usage",
    description: "Analyze disk usage and categorize the largest consumers. Returns a breakdown of disk usage by category with recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to analyze (default: home directory)", default: "~" },
        depth: { type: "number", description: "Directory depth to analyze (default: 1)", default: 1 }
      }
    }
  },
  {
    name: "mac_go_cache_status",
    description: "Check Go build cache size and location. Provides recommendations for cache management.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "mac_cleanup_caches",
    description: "Clean various system and development caches to free disk space.",
    inputSchema: {
      type: "object",
      properties: {
        targets: {
          type: "array",
          items: { type: "string", enum: ["go", "brew", "npm", "pip", "chrome", "spotify", "all"] },
          description: "Which caches to clean (default: all)",
          default: ["all"]
        },
        dryRun: { type: "boolean", description: "Preview what would be cleaned without actually deleting", default: false }
      }
    }
  },
  {
    name: "mac_cleanup_docker",
    description: "Prune unused Docker resources (images, containers, volumes, build cache).",
    inputSchema: {
      type: "object",
      properties: {
        includeVolumes: { type: "boolean", description: "Also prune unused volumes (may cause data loss)", default: false },
        dryRun: { type: "boolean", description: "Preview what would be cleaned", default: false }
      }
    }
  },
  {
    name: "mac_memory_status",
    description: "Show current memory pressure, swap usage, and top memory-consuming processes.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "mac_cleanup_recommendations",
    description: "Analyze system and provide personalized cleanup recommendations based on current disk usage.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "mac_empty_trash",
    description: "Empty the system trash to reclaim disk space.",
    inputSchema: {
      type: "object",
      properties: {
        dryRun: { type: "boolean", description: "Show trash size without emptying", default: false }
      }
    }
  },
  {
    name: "mac_full_cleanup_workflow",
    description: "Run a comprehensive disk cleanup workflow. Analyzes disk usage, cleans all safe caches (Go, Homebrew, npm, pip, browser caches), empties trash, and optionally prunes Docker. Returns before/after disk usage comparison.",
    inputSchema: {
      type: "object",
      properties: {
        includeDocker: { type: "boolean", description: "Include Docker cleanup (prune images/containers)", default: false },
        includeDockerVolumes: { type: "boolean", description: "Also prune Docker volumes (potential data loss)", default: false },
        dryRun: { type: "boolean", description: "Preview what would be cleaned without actually deleting", default: false }
      }
    }
  },
  {
    name: "mac_analyze_library",
    description: "Deep analysis of ~/Library folder which often contains large caches and app data. Identifies major space consumers.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "mac_developer_cleanup",
    description: "Clean developer-specific artifacts: node_modules in inactive projects, old Python versions, Xcode derived data, etc.",
    inputSchema: {
      type: "object",
      properties: {
        cleanNodeModules: { type: "boolean", description: "Find and optionally clean node_modules in projects not modified recently", default: false },
        cleanXcode: { type: "boolean", description: "Clean Xcode derived data and archives", default: false },
        cleanPyenvOldVersions: { type: "boolean", description: "List old Python versions for review", default: false },
        dryRun: { type: "boolean", description: "Preview what would be cleaned", default: true }
      }
    }
  },
  // Phase 2: Performance Monitoring
  {
    name: "mac_cpu_usage",
    description: "Get real-time CPU utilization including per-core usage, load averages, and top CPU-consuming processes.",
    inputSchema: {
      type: "object",
      properties: {
        topN: { type: "number", description: "Number of top processes to show (default: 10)", default: 10 }
      }
    }
  },
  {
    name: "mac_thermal_status",
    description: "Check thermal throttling status and CPU temperature on Apple Silicon Macs.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "mac_battery_health",
    description: "Get battery health information including cycle count, capacity, and charging status.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "mac_system_info",
    description: "Get comprehensive system information including macOS version, hardware specs, and uptime.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "mac_process_list",
    description: "List running processes sorted by resource usage (CPU, memory, or name).",
    inputSchema: {
      type: "object",
      properties: {
        sortBy: { type: "string", enum: ["cpu", "memory", "name"], description: "Sort processes by this metric", default: "cpu" },
        limit: { type: "number", description: "Max processes to return", default: 20 },
        filter: { type: "string", description: "Filter processes by name (case-insensitive)" }
      }
    }
  },
  {
    name: "mac_kill_process",
    description: "Terminate a process by PID or name. Use with caution.",
    inputSchema: {
      type: "object",
      properties: {
        pid: { type: "number", description: "Process ID to kill" },
        name: { type: "string", description: "Process name to kill (kills first match)" },
        force: { type: "boolean", description: "Use SIGKILL instead of SIGTERM", default: false }
      }
    }
  },
  {
    name: "mac_startup_items",
    description: "List and manage login items and launch agents that run at startup.",
    inputSchema: {
      type: "object",
      properties: {
        showDisabled: { type: "boolean", description: "Include disabled items", default: false }
      }
    }
  },
  {
    name: "mac_network_status",
    description: "Get network interface status, current connections, and bandwidth usage.",
    inputSchema: { type: "object", properties: {} }
  }
];

// Tool handlers
async function handleDiskUsage({ path = "~", depth = 1 }) {
  try {
    const expandedPath = path.replace("~", process.env.HOME);
    const { stdout } = await execAsync(`dust -d ${depth} -n 20 -c "${expandedPath}" 2>/dev/null || du -h -d ${depth} "${expandedPath}" 2>/dev/null | sort -hr | head -20`);
    const { stdout: dfOutput } = await execAsync("df -h / | tail -1");
    return { diskUsage: stdout, systemStatus: dfOutput.trim() };
  } catch (error) {
    return { error: error.message };
  }
}

async function handleGoCacheStatus() {
  try {
    const { stdout: cachePath } = await execAsync("go env GOCACHE");
    const { stdout: cacheSize } = await execAsync(`du -sh "${cachePath.trim()}" 2>/dev/null || echo "Unable to determine size"`);
    const sizeGB = parseFloat(cacheSize.split(/\s+/)[0].replace("G", "")) || 0;

    let recommendation = "";
    if (sizeGB > 20) recommendation = "CRITICAL: Cache is very large. Run 'go clean -cache' to reclaim space.";
    else if (sizeGB > 10) recommendation = "WARNING: Cache is getting large. Consider cleaning with 'go clean -cache'.";
    else recommendation = "Cache size is reasonable.";

    return {
      cachePath: cachePath.trim(),
      cacheSize: cacheSize.trim(),
      recommendation,
      commands: {
        cleanBuildCache: "go clean -cache",
        cleanTestCache: "go clean -testcache",
        cleanModuleCache: "go clean -modcache (careful: re-downloads all modules)"
      }
    };
  } catch (error) {
    return { error: error.message, note: "Go may not be installed" };
  }
}

async function handleCleanupCaches({ targets = ["all"], dryRun = false }) {
  const results = {};
  const all = targets.includes("all");

  if (all || targets.includes("go")) {
    try {
      if (dryRun) {
        const { stdout } = await execAsync("du -sh $(go env GOCACHE) 2>/dev/null");
        results.go = { wouldClean: stdout.trim() };
      } else {
        await execAsync("go clean -cache");
        results.go = { status: "cleaned" };
      }
    } catch (e) { results.go = { error: e.message }; }
  }

  if (all || targets.includes("brew")) {
    try {
      if (dryRun) {
        const { stdout } = await execAsync("brew cleanup --dry-run 2>&1 | tail -5");
        results.brew = { wouldClean: stdout.trim() };
      } else {
        const { stdout } = await execAsync("brew cleanup --prune=all 2>&1 | tail -3");
        results.brew = { status: stdout.trim() };
      }
    } catch (e) { results.brew = { error: e.message }; }
  }

  if (all || targets.includes("npm")) {
    try {
      if (dryRun) {
        const { stdout } = await execAsync("npm cache ls 2>/dev/null | wc -l");
        results.npm = { cachedItems: stdout.trim() };
      } else {
        await execAsync("npm cache clean --force 2>/dev/null");
        results.npm = { status: "cleaned" };
      }
    } catch (e) { results.npm = { error: e.message }; }
  }

  if (all || targets.includes("pip")) {
    try {
      if (dryRun) {
        const { stdout } = await execAsync("pip cache info 2>/dev/null | grep 'Size'");
        results.pip = { info: stdout.trim() };
      } else {
        await execAsync("pip cache purge 2>/dev/null");
        results.pip = { status: "cleaned" };
      }
    } catch (e) { results.pip = { error: e.message }; }
  }

  if (all || targets.includes("chrome")) {
    const chromeCachePath = `${process.env.HOME}/Library/Caches/Google/Chrome`;
    try {
      if (dryRun) {
        const { stdout } = await execAsync(`du -sh "${chromeCachePath}" 2>/dev/null`);
        results.chrome = { size: stdout.trim() };
      } else {
        await execAsync(`rm -rf "${chromeCachePath}"/* 2>/dev/null`);
        results.chrome = { status: "cleaned" };
      }
    } catch (e) { results.chrome = { error: e.message }; }
  }

  if (all || targets.includes("spotify")) {
    const spotifyCachePath = `${process.env.HOME}/Library/Caches/com.spotify.client`;
    try {
      if (dryRun) {
        const { stdout } = await execAsync(`du -sh "${spotifyCachePath}" 2>/dev/null`);
        results.spotify = { size: stdout.trim() };
      } else {
        await execAsync(`rm -rf "${spotifyCachePath}"/* 2>/dev/null`);
        results.spotify = { status: "cleaned" };
      }
    } catch (e) { results.spotify = { error: e.message }; }
  }

  return { dryRun, results };
}

async function handleDockerCleanup({ includeVolumes = false, dryRun = false }) {
  try {
    const { stdout: dfBefore } = await execAsync("docker system df 2>/dev/null");

    if (dryRun) {
      return { currentUsage: dfBefore, note: "Run with dryRun=false to clean" };
    }

    const { stdout: pruneOutput } = await execAsync("docker system prune -af 2>/dev/null");
    let volumeOutput = "";
    if (includeVolumes) {
      const { stdout } = await execAsync("docker volume prune -f 2>/dev/null");
      volumeOutput = stdout;
    }
    const { stdout: dfAfter } = await execAsync("docker system df 2>/dev/null");

    return { before: dfBefore, after: dfAfter, pruneResult: pruneOutput, volumeResult: volumeOutput || "skipped" };
  } catch (error) {
    return { error: error.message, note: "Docker may not be running" };
  }
}

async function handleMemoryStatus() {
  try {
    const { stdout: vmStat } = await execAsync("vm_stat");
    const { stdout: memPressure } = await execAsync("memory_pressure 2>/dev/null || echo 'memory_pressure command not available'");
    const { stdout: topProcesses } = await execAsync("ps aux --sort=-%mem | head -10");

    // Parse vm_stat to get human-readable values
    const pageSize = 16384; // Apple Silicon uses 16KB pages
    const lines = vmStat.split("\n");
    const stats = {};
    lines.forEach(line => {
      const match = line.match(/^(.+):\s+(\d+)/);
      if (match) stats[match[1].trim()] = parseInt(match[2]) * pageSize / (1024 * 1024 * 1024);
    });

    return {
      memoryPressure: memPressure.trim(),
      topProcesses,
      vmStats: {
        freeGB: stats["Pages free"]?.toFixed(2) || "N/A",
        activeGB: stats["Pages active"]?.toFixed(2) || "N/A",
        inactiveGB: stats["Pages inactive"]?.toFixed(2) || "N/A",
        wiredGB: stats["Pages wired down"]?.toFixed(2) || "N/A",
        compressedGB: stats["Pages occupied by compressor"]?.toFixed(2) || "N/A"
      }
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function handleCleanupRecommendations() {
  const recommendations = [];

  // Check disk usage
  try {
    const { stdout } = await execAsync("df -h / | tail -1");
    const parts = stdout.trim().split(/\s+/);
    const usedPercent = parseInt(parts[4]?.replace("%", "") || "0");
    if (usedPercent > 90) recommendations.push({ priority: "HIGH", message: `Disk ${usedPercent}% full - immediate cleanup needed` });
    else if (usedPercent > 80) recommendations.push({ priority: "MEDIUM", message: `Disk ${usedPercent}% full - consider cleanup` });
  } catch (e) {}

  // Check Go cache
  try {
    const { stdout: cachePath } = await execAsync("go env GOCACHE");
    const { stdout } = await execAsync(`du -s "${cachePath.trim()}" 2>/dev/null`);
    const sizeKB = parseInt(stdout.split(/\s+/)[0]);
    const sizeGB = sizeKB / 1024 / 1024;
    if (sizeGB > 10) recommendations.push({ priority: "HIGH", target: "go-cache", sizeGB: sizeGB.toFixed(1), command: "go clean -cache" });
  } catch (e) {}

  // Check Trash
  try {
    const { stdout } = await execAsync(`du -s ~/.Trash 2>/dev/null`);
    const sizeKB = parseInt(stdout.split(/\s+/)[0]);
    const sizeGB = sizeKB / 1024 / 1024;
    if (sizeGB > 1) recommendations.push({ priority: "LOW", target: "trash", sizeGB: sizeGB.toFixed(1), command: "rm -rf ~/.Trash/*" });
  } catch (e) {}

  // Check Docker
  try {
    const { stdout } = await execAsync("docker system df --format '{{.Size}}' 2>/dev/null | head -1");
    if (stdout.includes("GB")) recommendations.push({ priority: "MEDIUM", target: "docker", size: stdout.trim(), command: "docker system prune -a" });
  } catch (e) {}

  // Check Homebrew
  try {
    const { stdout } = await execAsync(`du -s ~/Library/Caches/Homebrew 2>/dev/null`);
    const sizeKB = parseInt(stdout.split(/\s+/)[0]);
    const sizeGB = sizeKB / 1024 / 1024;
    if (sizeGB > 1) recommendations.push({ priority: "LOW", target: "homebrew-cache", sizeGB: sizeGB.toFixed(1), command: "brew cleanup --prune=all" });
  } catch (e) {}

  return { recommendations: recommendations.length ? recommendations : [{ message: "No immediate cleanup needed" }] };
}

async function handleEmptyTrash({ dryRun = false }) {
  try {
    const { stdout: size } = await execAsync("du -sh ~/.Trash 2>/dev/null");
    if (dryRun) return { trashSize: size.trim(), note: "Run with dryRun=false to empty" };
    await execAsync("rm -rf ~/.Trash/* 2>/dev/null");
    return { status: "emptied", previousSize: size.trim() };
  } catch (error) {
    return { error: error.message };
  }
}

async function handleFullCleanupWorkflow({ includeDocker = false, includeDockerVolumes = false, dryRun = false }) {
  const workflow = { steps: [], totalRecovered: "calculating...", dryRun };

  // Step 1: Get initial disk status
  try {
    const { stdout } = await execAsync("df -h / | tail -1");
    const parts = stdout.trim().split(/\s+/);
    workflow.before = { used: parts[2], available: parts[3], percentUsed: parts[4] };
  } catch (e) { workflow.before = { error: e.message }; }

  // Step 2: Empty Trash
  try {
    const { stdout: trashSize } = await execAsync("du -sh ~/.Trash 2>/dev/null");
    if (!dryRun) await execAsync("rm -rf ~/.Trash/* 2>/dev/null");
    workflow.steps.push({ name: "Empty Trash", size: trashSize.trim().split(/\s+/)[0], status: dryRun ? "would clean" : "cleaned" });
  } catch (e) { workflow.steps.push({ name: "Empty Trash", status: "skipped", error: e.message }); }

  // Step 3: Go build cache
  try {
    const { stdout: cachePath } = await execAsync("go env GOCACHE");
    const { stdout: cacheSize } = await execAsync(`du -sh "${cachePath.trim()}" 2>/dev/null`);
    if (!dryRun) await execAsync("go clean -cache");
    workflow.steps.push({ name: "Go Build Cache", size: cacheSize.trim().split(/\s+/)[0], status: dryRun ? "would clean" : "cleaned" });
  } catch (e) { workflow.steps.push({ name: "Go Build Cache", status: "skipped", note: "Go not installed or cache empty" }); }

  // Step 4: Homebrew cache
  try {
    const { stdout: brewSize } = await execAsync("du -sh ~/Library/Caches/Homebrew 2>/dev/null");
    if (!dryRun) {
      const { stdout } = await execAsync("brew cleanup --prune=all 2>&1 | grep -E 'freed|Removing' | tail -1");
      workflow.steps.push({ name: "Homebrew Cache", size: brewSize.trim().split(/\s+/)[0], status: "cleaned", detail: stdout.trim() });
    } else {
      workflow.steps.push({ name: "Homebrew Cache", size: brewSize.trim().split(/\s+/)[0], status: "would clean" });
    }
  } catch (e) { workflow.steps.push({ name: "Homebrew Cache", status: "skipped" }); }

  // Step 5: Chrome cache
  try {
    const chromePath = `${process.env.HOME}/Library/Caches/Google/Chrome`;
    const { stdout: chromeSize } = await execAsync(`du -sh "${chromePath}" 2>/dev/null`);
    if (!dryRun) await execAsync(`rm -rf "${chromePath}"/* 2>/dev/null`);
    workflow.steps.push({ name: "Chrome Cache", size: chromeSize.trim().split(/\s+/)[0], status: dryRun ? "would clean" : "cleaned" });
  } catch (e) { workflow.steps.push({ name: "Chrome Cache", status: "skipped" }); }

  // Step 6: Spotify cache
  try {
    const spotifyPath = `${process.env.HOME}/Library/Caches/com.spotify.client`;
    const { stdout: spotifySize } = await execAsync(`du -sh "${spotifyPath}" 2>/dev/null`);
    if (!dryRun) await execAsync(`rm -rf "${spotifyPath}"/* 2>/dev/null`);
    workflow.steps.push({ name: "Spotify Cache", size: spotifySize.trim().split(/\s+/)[0], status: dryRun ? "would clean" : "cleaned" });
  } catch (e) { workflow.steps.push({ name: "Spotify Cache", status: "skipped" }); }

  // Step 7: npm cache
  try {
    if (!dryRun) await execAsync("npm cache clean --force 2>/dev/null");
    workflow.steps.push({ name: "npm Cache", status: dryRun ? "would clean" : "cleaned" });
  } catch (e) { workflow.steps.push({ name: "npm Cache", status: "skipped" }); }

  // Step 8: pip cache
  try {
    if (!dryRun) await execAsync("pip cache purge 2>/dev/null");
    workflow.steps.push({ name: "pip Cache", status: dryRun ? "would clean" : "cleaned" });
  } catch (e) { workflow.steps.push({ name: "pip Cache", status: "skipped" }); }

  // Step 9: Docker (optional)
  if (includeDocker) {
    try {
      const { stdout: dockerDf } = await execAsync("docker system df --format '{{.TotalCount}} {{.Size}}' 2>/dev/null");
      if (!dryRun) {
        await execAsync("docker system prune -af 2>/dev/null");
        if (includeDockerVolumes) await execAsync("docker volume prune -f 2>/dev/null");
      }
      workflow.steps.push({ name: "Docker", detail: dockerDf.trim(), status: dryRun ? "would clean" : "cleaned", volumesCleaned: includeDockerVolumes });
    } catch (e) { workflow.steps.push({ name: "Docker", status: "skipped", note: "Docker not running" }); }
  }

  // Get final disk status
  if (!dryRun) {
    try {
      const { stdout } = await execAsync("df -h / | tail -1");
      const parts = stdout.trim().split(/\s+/);
      workflow.after = { used: parts[2], available: parts[3], percentUsed: parts[4] };

      // Calculate recovered space
      const beforeAvailGB = parseFloat(workflow.before.available?.replace("G", "") || 0);
      const afterAvailGB = parseFloat(workflow.after.available?.replace("G", "") || 0);
      workflow.totalRecovered = `${(afterAvailGB - beforeAvailGB).toFixed(1)}G`;
    } catch (e) { workflow.after = { error: e.message }; }
  } else {
    workflow.after = { note: "Dry run - no changes made" };
  }

  return workflow;
}

async function handleAnalyzeLibrary() {
  const analysis = { categories: {} };

  // Analyze major Library subdirectories
  const dirs = [
    { name: "Caches", path: "~/Library/Caches" },
    { name: "Application Support", path: "~/Library/Application Support" },
    { name: "Containers", path: "~/Library/Containers" },
    { name: "Developer", path: "~/Library/Developer" },
    { name: "Fonts", path: "~/Library/Fonts" },
    { name: "Mail", path: "~/Library/Mail" },
    { name: "Messages", path: "~/Library/Messages" }
  ];

  for (const dir of dirs) {
    try {
      const expandedPath = dir.path.replace("~", process.env.HOME);
      const { stdout } = await execAsync(`du -sh "${expandedPath}" 2>/dev/null`);
      analysis.categories[dir.name] = { size: stdout.trim().split(/\s+/)[0] };
    } catch (e) {
      analysis.categories[dir.name] = { size: "N/A" };
    }
  }

  // Deep dive into Caches
  try {
    const { stdout } = await execAsync(`du -sh ~/Library/Caches/*/ 2>/dev/null | sort -hr | head -10`);
    analysis.topCaches = stdout.trim().split("\n").map(line => {
      const [size, path] = line.split(/\s+/);
      return { size, path: path?.split("/").pop() };
    });
  } catch (e) {}

  // Check specific large caches
  const knownLargeCaches = [
    { name: "Go Build", path: "~/Library/Caches/go-build", cleanCmd: "go clean -cache" },
    { name: "Homebrew", path: "~/Library/Caches/Homebrew", cleanCmd: "brew cleanup --prune=all" },
    { name: "Google Chrome", path: "~/Library/Caches/Google/Chrome", cleanCmd: "rm -rf ~/Library/Caches/Google/Chrome/*" },
    { name: "Xcode DerivedData", path: "~/Library/Developer/Xcode/DerivedData", cleanCmd: "rm -rf ~/Library/Developer/Xcode/DerivedData/*" }
  ];

  analysis.knownLargeCaches = [];
  for (const cache of knownLargeCaches) {
    try {
      const expandedPath = cache.path.replace("~", process.env.HOME);
      const { stdout } = await execAsync(`du -sh "${expandedPath}" 2>/dev/null`);
      const size = stdout.trim().split(/\s+/)[0];
      analysis.knownLargeCaches.push({ ...cache, size });
    } catch (e) {}
  }

  return analysis;
}

async function handleDeveloperCleanup({ cleanNodeModules = false, cleanXcode = false, cleanPyenvOldVersions = false, dryRun = true }) {
  const results = {};

  // Find node_modules directories
  if (cleanNodeModules) {
    try {
      const { stdout } = await execAsync(`find ~ -name "node_modules" -type d -prune 2>/dev/null | head -20`);
      const dirs = stdout.trim().split("\n").filter(Boolean);

      const nodeModulesInfo = [];
      for (const dir of dirs.slice(0, 10)) {
        try {
          const { stdout: size } = await execAsync(`du -sh "${dir}" 2>/dev/null`);
          const { stdout: mtime } = await execAsync(`stat -f "%Sm" -t "%Y-%m-%d" "${dir}" 2>/dev/null`);
          nodeModulesInfo.push({ path: dir, size: size.trim().split(/\s+/)[0], lastModified: mtime.trim() });
        } catch (e) {}
      }
      results.nodeModules = { found: dirs.length, analyzed: nodeModulesInfo, dryRun };
    } catch (e) { results.nodeModules = { error: e.message }; }
  }

  // Xcode cleanup
  if (cleanXcode) {
    try {
      const derivedDataPath = `${process.env.HOME}/Library/Developer/Xcode/DerivedData`;
      const { stdout: size } = await execAsync(`du -sh "${derivedDataPath}" 2>/dev/null`);
      if (!dryRun) await execAsync(`rm -rf "${derivedDataPath}"/* 2>/dev/null`);
      results.xcodeDerivedData = { size: size.trim().split(/\s+/)[0], status: dryRun ? "would clean" : "cleaned" };
    } catch (e) { results.xcodeDerivedData = { status: "skipped", note: "Xcode not installed or empty" }; }

    try {
      const archivesPath = `${process.env.HOME}/Library/Developer/Xcode/Archives`;
      const { stdout: size } = await execAsync(`du -sh "${archivesPath}" 2>/dev/null`);
      results.xcodeArchives = { size: size.trim().split(/\s+/)[0], note: "Review before deleting - contains app builds" };
    } catch (e) {}
  }

  // pyenv versions
  if (cleanPyenvOldVersions) {
    try {
      const { stdout: currentVersion } = await execAsync("pyenv version-name 2>/dev/null");
      const { stdout: allVersions } = await execAsync("ls ~/.pyenv/versions/ 2>/dev/null");
      const versions = allVersions.trim().split("\n").filter(Boolean);

      const versionInfo = [];
      for (const ver of versions) {
        try {
          const { stdout: size } = await execAsync(`du -sh ~/.pyenv/versions/${ver} 2>/dev/null`);
          versionInfo.push({
            version: ver,
            size: size.trim().split(/\s+/)[0],
            isCurrent: ver.trim() === currentVersion.trim()
          });
        } catch (e) {}
      }
      results.pyenvVersions = { current: currentVersion.trim(), versions: versionInfo, note: "Run 'pyenv uninstall VERSION' to remove" };
    } catch (e) { results.pyenvVersions = { status: "skipped", note: "pyenv not installed" }; }
  }

  return results;
}

// Phase 2: Performance Monitoring Handlers
async function handleCpuUsage({ topN = 10 }) {
  try {
    // Get load averages
    const { stdout: loadAvg } = await execAsync("sysctl -n vm.loadavg");

    // Get CPU usage summary
    const { stdout: cpuInfo } = await execAsync("top -l 1 -n 0 | grep 'CPU usage'");

    // Get top CPU processes
    const { stdout: topProcesses } = await execAsync(`ps aux -r | head -${topN + 1}`);

    // Get core count
    const { stdout: coreCount } = await execAsync("sysctl -n hw.ncpu");
    const { stdout: perfCores } = await execAsync("sysctl -n hw.perflevel0.physicalcpu 2>/dev/null || echo 'N/A'");
    const { stdout: effCores } = await execAsync("sysctl -n hw.perflevel1.physicalcpu 2>/dev/null || echo 'N/A'");

    return {
      loadAverages: loadAvg.trim(),
      cpuUsage: cpuInfo.trim(),
      totalCores: parseInt(coreCount.trim()),
      performanceCores: perfCores.trim() !== 'N/A' ? parseInt(perfCores.trim()) : null,
      efficiencyCores: effCores.trim() !== 'N/A' ? parseInt(effCores.trim()) : null,
      topProcesses: topProcesses.trim()
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function handleThermalStatus() {
  try {
    // Check thermal state using pmset
    const { stdout: thermalState } = await execAsync("pmset -g therm 2>/dev/null || echo 'Thermal info not available'");

    // Try to get CPU die temperature (requires sudo or specific tools)
    let temperature = "Temperature monitoring requires additional tools (e.g., osx-cpu-temp)";
    try {
      const { stdout } = await execAsync("osx-cpu-temp 2>/dev/null");
      temperature = stdout.trim();
    } catch (e) {}

    // Check if thermal throttling is active
    const isThrottling = thermalState.includes("CPU_Speed_Limit") && !thermalState.includes("100");

    return {
      thermalState: thermalState.trim(),
      temperature,
      isThrottling,
      recommendation: isThrottling ? "System is thermal throttling. Consider improving ventilation or reducing workload." : "Thermal status normal."
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function handleBatteryHealth() {
  try {
    // Get battery info using system_profiler
    const { stdout: batteryInfo } = await execAsync("system_profiler SPPowerDataType 2>/dev/null");

    // Parse key metrics
    const cycleCount = batteryInfo.match(/Cycle Count: (\d+)/)?.[1] || "N/A";
    const condition = batteryInfo.match(/Condition: (.+)/)?.[1]?.trim() || "N/A";
    const maxCapacity = batteryInfo.match(/Maximum Capacity: (\d+%)/)?.[1] || "N/A";
    const charging = batteryInfo.includes("Charging: Yes");
    const fullyCharged = batteryInfo.includes("Fully Charged: Yes");
    const powerSource = batteryInfo.includes("Connected: Yes") ? "AC Power" : "Battery";

    // Get current charge level
    const { stdout: pmsetOutput } = await execAsync("pmset -g batt");
    const chargeLevel = pmsetOutput.match(/(\d+)%/)?.[1] || "N/A";

    return {
      chargeLevel: `${chargeLevel}%`,
      cycleCount: parseInt(cycleCount) || cycleCount,
      condition,
      maxCapacity,
      isCharging: charging,
      isFullyCharged: fullyCharged,
      powerSource,
      healthNote: parseInt(maxCapacity) < 80 ? "Battery capacity significantly degraded. Consider replacement." :
                  parseInt(maxCapacity) < 90 ? "Battery showing some wear." : "Battery health good."
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function handleSystemInfo() {
  try {
    const info = {};

    // macOS version
    const { stdout: osVersion } = await execAsync("sw_vers");
    info.macOS = osVersion.trim().replace(/\n/g, ", ");

    // Hardware model
    const { stdout: model } = await execAsync("sysctl -n hw.model");
    info.model = model.trim();

    // Chip
    const { stdout: chip } = await execAsync("sysctl -n machdep.cpu.brand_string 2>/dev/null || echo 'Apple Silicon'");
    info.chip = chip.trim();

    // Memory
    const { stdout: memory } = await execAsync("sysctl -n hw.memsize");
    info.memoryGB = (parseInt(memory) / 1024 / 1024 / 1024).toFixed(0) + " GB";

    // Uptime
    const { stdout: uptime } = await execAsync("uptime");
    info.uptime = uptime.trim();

    // Disk info
    const { stdout: disk } = await execAsync("df -h / | tail -1");
    const diskParts = disk.trim().split(/\s+/);
    info.disk = { total: diskParts[1], used: diskParts[2], available: diskParts[3], percentUsed: diskParts[4] };

    // User
    const { stdout: user } = await execAsync("whoami");
    info.currentUser = user.trim();

    // Hostname
    const { stdout: hostname } = await execAsync("hostname");
    info.hostname = hostname.trim();

    return info;
  } catch (error) {
    return { error: error.message };
  }
}

async function handleProcessList({ sortBy = "cpu", limit = 20, filter = "" }) {
  try {
    let sortFlag = "-r"; // CPU by default
    if (sortBy === "memory") sortFlag = "-m";
    else if (sortBy === "name") sortFlag = "";

    let cmd = `ps aux ${sortFlag} | head -${limit + 1}`;
    if (filter) {
      cmd = `ps aux ${sortFlag} | grep -i "${filter}" | head -${limit}`;
    }

    const { stdout } = await execAsync(cmd);

    // Parse into structured format
    const lines = stdout.trim().split("\n");
    const header = lines[0];
    const processes = lines.slice(1).map(line => {
      const parts = line.split(/\s+/);
      return {
        user: parts[0],
        pid: parseInt(parts[1]),
        cpu: parseFloat(parts[2]),
        mem: parseFloat(parts[3]),
        command: parts.slice(10).join(" ")
      };
    });

    return { sortedBy: sortBy, header, processes };
  } catch (error) {
    return { error: error.message };
  }
}

async function handleKillProcess({ pid, name, force = false }) {
  const signal = force ? "-9" : "-15";

  try {
    if (pid) {
      await execAsync(`kill ${signal} ${pid}`);
      return { success: true, killed: { pid }, signal: force ? "SIGKILL" : "SIGTERM" };
    } else if (name) {
      // Find PID by name first
      const { stdout } = await execAsync(`pgrep -f "${name}" | head -1`);
      const foundPid = stdout.trim();
      if (!foundPid) {
        return { success: false, error: `No process found matching: ${name}` };
      }
      await execAsync(`kill ${signal} ${foundPid}`);
      return { success: true, killed: { pid: parseInt(foundPid), name }, signal: force ? "SIGKILL" : "SIGTERM" };
    } else {
      return { success: false, error: "Must provide either pid or name" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleStartupItems({ showDisabled = false }) {
  const items = { loginItems: [], launchAgents: [], launchDaemons: [] };

  try {
    // User launch agents
    const { stdout: userAgents } = await execAsync(`ls -la ~/Library/LaunchAgents/*.plist 2>/dev/null || echo ''`);
    if (userAgents.trim()) {
      items.launchAgents = userAgents.trim().split("\n").map(line => {
        const parts = line.split(/\s+/);
        return { path: parts[parts.length - 1], type: "user" };
      });
    }

    // Check which are loaded
    const { stdout: loadedAgents } = await execAsync("launchctl list 2>/dev/null | head -30");
    items.loadedAgents = loadedAgents.trim();

    // System launch agents (that affect current user)
    const { stdout: systemAgents } = await execAsync(`ls /Library/LaunchAgents/*.plist 2>/dev/null | head -10 || echo ''`);
    if (systemAgents.trim()) {
      items.systemAgents = systemAgents.trim().split("\n");
    }

    return items;
  } catch (error) {
    return { error: error.message };
  }
}

async function handleNetworkStatus() {
  try {
    const status = {};

    // Get active network interfaces
    const { stdout: interfaces } = await execAsync("ifconfig | grep -E '^[a-z]|inet ' | head -20");
    status.interfaces = interfaces.trim();

    // Get current WiFi network
    try {
      const { stdout: wifi } = await execAsync("/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I 2>/dev/null | grep -E 'SSID|BSSID|channel|RSSI'");
      status.wifi = wifi.trim();
    } catch (e) { status.wifi = "Not connected to WiFi"; }

    // Get external IP
    try {
      const { stdout: externalIp } = await execAsync("curl -s --max-time 2 ifconfig.me");
      status.externalIp = externalIp.trim();
    } catch (e) { status.externalIp = "Unable to determine"; }

    // Get DNS servers
    const { stdout: dns } = await execAsync("scutil --dns | grep 'nameserver' | head -5");
    status.dnsServers = dns.trim();

    // Get active connections count
    const { stdout: connCount } = await execAsync("netstat -an | grep ESTABLISHED | wc -l");
    status.activeConnections = parseInt(connCount.trim());

    return status;
  } catch (error) {
    return { error: error.message };
  }
}

// Request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  let result;
  switch (name) {
    case "mac_disk_usage": result = await handleDiskUsage(args || {}); break;
    case "mac_go_cache_status": result = await handleGoCacheStatus(); break;
    case "mac_cleanup_caches": result = await handleCleanupCaches(args || {}); break;
    case "mac_cleanup_docker": result = await handleDockerCleanup(args || {}); break;
    case "mac_memory_status": result = await handleMemoryStatus(); break;
    case "mac_cleanup_recommendations": result = await handleCleanupRecommendations(); break;
    case "mac_empty_trash": result = await handleEmptyTrash(args || {}); break;
    case "mac_full_cleanup_workflow": result = await handleFullCleanupWorkflow(args || {}); break;
    case "mac_analyze_library": result = await handleAnalyzeLibrary(); break;
    case "mac_developer_cleanup": result = await handleDeveloperCleanup(args || {}); break;
    // Phase 2: Performance Monitoring
    case "mac_cpu_usage": result = await handleCpuUsage(args || {}); break;
    case "mac_thermal_status": result = await handleThermalStatus(); break;
    case "mac_battery_health": result = await handleBatteryHealth(); break;
    case "mac_system_info": result = await handleSystemInfo(); break;
    case "mac_process_list": result = await handleProcessList(args || {}); break;
    case "mac_kill_process": result = await handleKillProcess(args || {}); break;
    case "mac_startup_items": result = await handleStartupItems(args || {}); break;
    case "mac_network_status": result = await handleNetworkStatus(); break;
    default: throw new Error(`Unknown tool: ${name}`);
  }

  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("mac-mcp server running");
