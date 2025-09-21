# Git Submodules in Buffalo-AI

This repository uses git submodules to manage different components. Here's how to work with them:

## Current Submodules

- **`agents/buffalo`** → [buffalo-agent](https://github.com/KenjiPcx/buffalo-agent.git)
  - AI-powered browser testing agent with Docker setup
  - Independent repository for standalone development
- **`agents/coral-acidev`** → [Coral-AciDevMCP-Agent](https://github.com/Coral-Protocol/Coral-AciDevMCP-Agent.git)
- **`coral-server`** → [coral-server](https://github.com/Coral-Protocol/coral-server.git)
- **`coral-studio`** → [coral-studio](https://github.com/Coral-Protocol/coral-studio.git)

## Working with Submodules

### Initial Clone
When cloning this repository, use `--recursive` to get all submodules:
```bash
git clone --recursive https://github.com/KenjiPcx/Buffalo-AI.git
```

### If you already cloned without `--recursive`
Initialize and update submodules:
```bash
git submodule update --init --recursive
```

### Updating Submodules
To pull the latest changes from all submodules:
```bash
git submodule update --remote
```

To update a specific submodule:
```bash
git submodule update --remote agents/buffalo
```

### Working on Submodule Code

#### Option 1: Work directly in the submodule directory
```bash
cd agents/buffalo
# Make changes, commit, and push
git add .
git commit -m "Your changes"
git push origin main
```

#### Option 2: Work in the standalone repository
```bash
git clone https://github.com/KenjiPcx/buffalo-agent.git
cd buffalo-agent
# Make changes, commit, and push
# Then update the main repository to use the new commit
```

### Updating Main Repository to Use New Submodule Commits

After making changes to a submodule, update the main repository:
```bash
cd /path/to/Buffalo-AI
git submodule update --remote agents/buffalo
git add agents/buffalo
git commit -m "Update buffalo agent to latest version"
git push
```

## Benefits of This Structure

1. **Independent Development**: Buffalo agent can be developed, versioned, and released independently
2. **Reusability**: The buffalo agent can be used in other projects
3. **Clean History**: Each component maintains its own git history
4. **Docker Ready**: The buffalo agent has its own complete Docker setup
5. **Modular**: Easy to add/remove components without affecting others

## Buffalo Agent Specific

The buffalo agent is now a standalone repository with:
- Complete Docker setup (Ubuntu + Playwright)
- Independent versioning and releases
- Own CI/CD pipeline capability
- Standalone documentation and examples

To work on buffalo agent features, you can either:
1. Work directly in `agents/buffalo/` (submodule)
2. Clone the standalone repo: `git clone https://github.com/KenjiPcx/buffalo-agent.git`
