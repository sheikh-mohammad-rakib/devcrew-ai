# DevCrew AI

An AI-powered software engineering platform where multiple specialized AI agents collaborate to plan, design, implement, review, and improve software projects under human supervision.

## Overview

DevCrew AI simulates a professional software engineering team. Instead of relying on a single AI assistant, the platform coordinates multiple specialized agents that collaborate on software projects while allowing manual approval at key stages.

The long-term goal is to build an AI-driven engineering workflow where each agent has a clearly defined responsibility, persistent memory, and access to project context.

## Planned AI Team

* 📋 Project Manager
* 🏛️ Software Architect
* 💻 Developer
* 🧪 QA Engineer
* ⚖️ Judge / Reviewer

## Current Features

### Workspace Management

* Create workspaces
* List workspaces
* Workspace dashboard
* Responsive web interface

### Backend

* FastAPI
* SQLAlchemy 2.x
* Alembic migrations
* Neon PostgreSQL
* REST API

### Frontend

* Next.js (App Router)
* TypeScript
* shadcn/ui
* Feature-based architecture

## Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui

### Backend

* FastAPI
* SQLAlchemy
* Alembic
* psycopg
* pgvector
* OpenAI SDK

### Database

* Neon PostgreSQL
* pgvector

### Tooling

* Turborepo
* pnpm
* uv
* GitHub
* Ruff
* Pytest
* Pre-commit

## Project Structure

```text
apps/
    api/            FastAPI backend
    web/            Next.js frontend

packages/
    ui/
    config/
    prompts/
    types/
    utils/

docs/
    api/
    architecture/
    diagrams/
    ROADMAP.md
```

## Development Status

Current milestone:

* ✅ Infrastructure
* ✅ Workspace Management
* 🚧 Project Management
* ⏳ Timeline
* ⏳ Approval Workflow
* ⏳ AI Engineering Team
* ⏳ Vector Memory
* ⏳ Deployment

See `docs/ROADMAP.md` for detailed progress.

## Getting Started

### Clone

```bash
git clone <repository-url>
cd devcrew-ai
```

### Install frontend dependencies

```bash
pnpm install
```

### Install backend dependencies

```bash
cd apps/api
uv sync
```

### Configure environment

Create:

```text
apps/api/.env
```

Add:

```env
DATABASE_URL=your_neon_database_url
OPENAI_API_KEY=your_openai_api_key
```

### Run backend

```bash
cd apps/api
uv run uvicorn devcrew_api.main:app --reload
```

### Run frontend

```bash
pnpm dev
```

## Roadmap

See:

```text
docs/ROADMAP.md
```

## License

This project is currently under active development.
