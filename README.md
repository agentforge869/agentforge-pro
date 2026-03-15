# AgentForge Pro

### Production-Ready AI Coding Agents, Skills & Configurations

> **Stop configuring. Start building.** Battle-tested agent definitions, skills, and CLAUDE.md templates that make Claude Code and Cursor 10x more productive.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Agents](https://img.shields.io/badge/Agents-10%20Free-blue.svg)](#agents)
[![Skills](https://img.shields.io/badge/Skills-5%20Free-purple.svg)](#skills)
[![Templates](https://img.shields.io/badge/Templates-3%20Free-orange.svg)](#templates)

---

## Why AgentForge?

Most developers spend **hours** configuring AI coding tools. Writing CLAUDE.md files from scratch. Creating agents that sort-of work. Figuring out the right prompts.

**AgentForge gives you production-ready configurations in 30 seconds.**

Every agent, skill, and template is:
- Battle-tested on real projects
- Optimized for token efficiency
- Following latest best practices (2025-2026)
- Ready to copy-paste and use immediately

## Quick Start

```bash
# Clone the repo
git clone https://github.com/agentforge869/agentforge-pro.git

# Copy an agent to your Claude Code agents folder
cp agentforge-pro/agents/code-reviewer.md ~/.claude/agents/

# Copy a CLAUDE.md template to your project
cp agentforge-pro/templates/react-nextjs.md your-project/CLAUDE.md

# Copy a skill
cp agentforge-pro/skills/commit.md ~/.claude/skills/

# Done! Start using immediately.
```

## Agents

Production-ready agent definitions for `~/.claude/agents/`:

| Agent | What it does | Use case |
|-------|-------------|----------|
| `code-reviewer` | Deep code review with bug, perf & security analysis | Before merging PRs |
| `test-writer` | Generates unit & integration tests automatically | Increase coverage fast |
| `refactorer` | Intelligent refactoring preserving behavior | Clean up tech debt |
| `debugger` | Systematic debug: reproduce, isolate, fix | Squash bugs faster |
| `api-designer` | REST/GraphQL API design with best practices | New API endpoints |
| `doc-generator` | Auto-generate docs from source code | Keep docs current |
| `migration-helper` | Framework/library/version migrations | Upgrade dependencies |
| `performance-optimizer` | Find and fix performance bottlenecks | Speed up your app |
| `security-auditor` | OWASP-based security audit | Pre-launch security |
| `git-workflow` | Branch, PR, commit management | Clean git history |

### Usage

```bash
# Run any agent
claude agent code-reviewer
claude agent test-writer
claude agent debugger
```

## Skills

Reusable workflows you can invoke with slash commands:

| Skill | Trigger | What it does |
|-------|---------|-------------|
| `commit` | `/commit` | Smart commits with conventional format |
| `review-pr` | `/review-pr` | Full PR review with inline comments |
| `scaffold` | `/scaffold` | Project scaffolding for any stack |
| `deploy-check` | `/deploy-check` | Pre-deployment verification |
| `quick-fix` | `/quick-fix` | Rapid error diagnosis and fix |

### Usage

```bash
# In Claude Code, just type:
/commit
/review-pr 123
/scaffold react
```

## CLAUDE.md Templates

Ready-to-use project configurations:

| Template | Stack | Highlights |
|----------|-------|-----------|
| `react-nextjs` | React 19 + Next.js | App Router, TypeScript, Tailwind, Vitest |
| `node-express` | Node.js + Express | REST APIs, JWT auth, Docker, testing |
| `python-fastapi` | Python + FastAPI | Type hints, Pydantic, SQLAlchemy, pytest |

### Usage

```bash
# Copy to your project root
cp templates/react-nextjs.md your-project/CLAUDE.md
```

## Want More?

The free tier includes 10 agents, 5 skills, and 3 templates.

**[AgentForge Pro](https://payhip.com/AgentForgePro)** includes:

| | Free | Pro ($49) | Ultimate ($79) |
|--|------|-----------|-----------------|
| Agents | 10 | 30+ | 50+ |
| Skills | 5 | 15+ | 25+ |
| CLAUDE.md Templates | 3 | 12+ | 20+ |
| Hooks | - | 10+ | 20+ |
| Workflows | - | 5+ | 15+ |
| MCP Configs | - | - | 10+ |
| Updates | Community | 6 months | Lifetime |

**What's in Pro/Ultimate:**
- Framework-specific agents (React, Vue, Svelte, Angular, Django, Rails, Go, Rust...)
- Advanced workflows (TDD, CI/CD, deployment, monitoring)
- Pre-configured hooks for auto-formatting, auto-testing, security scanning
- MCP server configurations for databases, APIs, cloud services
- Regular updates as Claude Code evolves

[Get AgentForge Pro →](https://payhip.com/AgentForgePro)

## Contributing

Contributions welcome! If you have an agent, skill, or template that works great, submit a PR.

## License

MIT License — use freely in personal and commercial projects.

---

Built with Claude Code. Maintained by developers, for developers.
