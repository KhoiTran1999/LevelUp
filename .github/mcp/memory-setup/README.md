# 🧠 Codebase Memory MCP - Manual Workflow Guide

This guide explains how to manually index your projects and update the knowledge graph after making code changes when `codebase-memory-mcp` is configured with `auto_index=false` and `auto_watch=false`.

## 📌 Prerequisites

Ensure you have run the All-in-One installation script which sets up:
- The UI build of `codebase-memory-mcp`
- Global ignore patterns for DevOps, testing, and build artifacts
- `auto_index false` and `auto_watch false`

## 🚀 How to Index a Project Manually

Since automatic indexing is disabled to save CPU/RAM, you must manually trigger the indexer on the specific folders containing your core logic (ignoring configuration or pipeline folders).

### Method 1: Using the Web UI (Recommended for first-time indexing)

1. Start the MCP server and UI in your terminal:
   ```bash
   codebase-memory-mcp ui --port=9749
   ```
2. Open your browser and navigate to: `http://localhost:9749`
3. Click the green **"Index your first repository"** or **"+ New Index"** button.
4. Enter the **absolute path** to the specific folder you want to index.
   - *Example:* Instead of `C:\Projects\memberfirst.core`, use `C:\Projects\memberfirst.core\Source`
5. Click confirm. The 3D graph will generate immediately.

### Method 2: Using GitHub Copilot Chat (Fastest for daily use)

If the server is running in the background and connected to VS Code via `mcp.json`, you can ask Copilot to trigger it:

1. Open Copilot Chat in VS Code.
2. Prompt:
   > *"Please use codebase-memory to index this directory: `C:\Projects\memberfirst.core\Source`"*
3. Copilot will call the tool and notify you when the indexing is complete.

### Method 3: Run mcp directly on vscode as an mcp tool

Check output console it will have an url and navigate to UI 

## 🔄 Updating the Graph After Code Changes

When you make changes to your codebase (e.g., adding new files, changing function names, or updating endpoints), the system will **not** automatically detect them. You need to re-index manually.

### When should you re-index?
You do **not** need to re-index for minor logic changes inside a function. Only re-index when you alter the **structure** of the code:
- Adding/Deleting files or folders.
- Changing Class, Interface, or Method names.
- Modifying API endpoints or DTO structures.
- Changing significant import/export relationships.

### If you want to auto re-index whenever save file
Run this command to turn on again

```bash
codebase-memory-mcp config set auto_index true
codebase-memory-mcp config set auto_watch true
```

### How to re-index:

1. **Via Copilot Chat:**
   Simply tell Copilot to update the index for your working directory:
   > *"Please re-index the graph for the current project."*
   *(Make sure to specify the path if Copilot isn't sure which folder you mean).*

2. **Via Terminal (CLI):**
   Open the VS Code terminal (navigate to your target folder first) and run:
   ```bash
   codebase-memory-mcp index
   ```
   *The command will execute a fast differential scan (using git strategy) and exit in a few seconds, returning your CPU to normal.*


### How to update:
1. **Run command on Terminal:**
```bash
codebase-memory-mcp update
```