# DevCrew AI Roadmap

> A living roadmap for DevCrew AI. This document tracks completed milestones, upcoming work, development standards, and long-term goals.

---

# Vision

DevCrew AI is an AI-powered software engineering platform where multiple specialized AI agents collaborate to design, implement, review, and improve software projects under human supervision.

The long-term vision is to simulate a complete software engineering team with persistent memory, structured workflows, and manual approval gates.

---

# Definition of Done (DoD)

A feature or sprint is considered complete only when every item below is satisfied.

## Development

* [ ] Feature implemented
* [ ] Architecture follows project conventions
* [ ] No unnecessary code duplication

## Backend

* [ ] Database migration applied (if applicable)
* [ ] API endpoints implemented
* [ ] Swagger endpoints verified
* [ ] Database changes verified

## Frontend

* [ ] UI implemented
* [ ] Loading state handled
* [ ] Empty state handled
* [ ] Error state handled
* [ ] Responsive layout verified

## Quality

* [ ] `pnpm lint` passes
* [ ] Backend tests/checks pass
* [ ] No browser console errors
* [ ] No backend runtime errors

## Git

* [ ] Working tree clean
* [ ] Changes committed
* [ ] Changes pushed

## Documentation

* [ ] README updated (if necessary)
* [ ] ROADMAP updated (if milestone completed)

---

# Development Workflow

Every feature follows the same lifecycle.

```text
Design
    ↓
Database Model
    ↓
Migration
    ↓
Service Layer
    ↓
REST API
    ↓
Swagger Testing
    ↓
Frontend API Client
    ↓
Frontend UI
    ↓
Browser Testing
    ↓
Quality Checks
    ↓
Commit
    ↓
Push
    ↓
Roadmap Update
```

---

# Milestones

---

## ✅ Milestone 1 — Infrastructure

### Completed

* [x] Turborepo monorepo
* [x] Next.js frontend
* [x] FastAPI backend
* [x] uv package manager
* [x] Neon PostgreSQL
* [x] Alembic migrations
* [x] SQLAlchemy
* [x] Feature-based frontend architecture
* [x] Backend service architecture
* [x] GitHub repository
* [x] Dashboard layout

Version:

```
v0.1.0
```

---

## ✅ Milestone 2 — Workspace Management

### Backend

* [x] Workspace model
* [x] Alembic migration
* [x] CRUD API
* [x] Service layer

### Frontend

* [x] Workspace list
* [x] Create Workspace dialog
* [x] Workspace cards
* [x] API integration

### Verification

* [x] Swagger verified
* [x] Browser tested

Version:

```
v0.2.0
```

---

## 🚧 Milestone 3 — Project Management

### Backend

* [x] Project model
* [x] Workspace → Project relationship
* [x] Alembic migration
* [x] CRUD API
* [x] Service layer

### Frontend

* [ ] Project list
* [ ] Project card
* [ ] Create Project dialog
* [ ] Project detail page
* [ ] Project status badge

### Verification

* [ ] Browser testing
* [ ] Swagger verification
* [ ] Lint
* [ ] Documentation updated

Version:

```
v0.3.0
```

---

## ⏳ Milestone 4 — Timeline

Deliverables

* [ ] Timeline model
* [ ] Timeline API
* [ ] Timeline UI
* [ ] Timeline stages
* [ ] Timeline history

Stages

* Requirements
* Architecture
* Implementation
* Testing
* Deployment

---

## ⏳ Milestone 5 — Approval Workflow

Deliverables

* [ ] Approval model
* [ ] Approval API
* [ ] Approval UI
* [ ] Human approval flow

---

## ⏳ Milestone 6 — AI Coordinator

Deliverables

* [ ] Coordinator service
* [ ] Agent orchestration
* [ ] Workflow execution
* [ ] Approval integration

---

## ⏳ Milestone 7 — AI Engineering Team

Agents

* [ ] Project Manager
* [ ] Architect
* [ ] Developer
* [ ] QA Engineer
* [ ] Judge

Each agent includes

* Prompt
* Memory
* Tools
* History
* Output

---

## ⏳ Milestone 8 — Memory

Deliverables

* [ ] pgvector integration
* [ ] Embeddings
* [ ] Semantic search
* [ ] Long-term memory
* [ ] Context retrieval

---

## ⏳ Milestone 9 — Deployment

Deliverables

* [ ] Docker
* [ ] Production configuration
* [ ] Alibaba Cloud ECS
* [ ] CI/CD
* [ ] Monitoring
* [ ] Logging

Version

```
v1.0.0
```

---

# Git Strategy

## Commit Format

```
feat(scope): description
fix(scope): description
refactor(scope): description
docs: description
test(scope): description
chore: description
```

Examples

```
feat(workspace): implement workspace CRUD
feat(project): implement project backend
fix(api): validate project status
docs: update roadmap
```

---

# Release Strategy

| Version | Milestone            |
| ------- | -------------------- |
| v0.1.0  | Infrastructure       |
| v0.2.0  | Workspace Management |
| v0.3.0  | Project Management   |
| v0.4.0  | Timeline             |
| v0.5.0  | Approval Workflow    |
| v0.6.0  | AI Coordinator       |
| v0.7.0  | AI Engineering Team  |
| v0.8.0  | Memory               |
| v1.0.0  | Production Release   |

---

# Project Architecture

High-level domain model

```text
Workspace
    │
    ├── Project
    │      │
    │      ├── Timeline
    │      ├── Task
    │      ├── Approval
    │      ├── Artifact
    │      ├── Memory
    │      ├── Conversation
    │      └── Agent Session
    │
    └── Project
```

---

# Development Principles

* Build complete vertical slices.
* Backend services contain business logic.
* API routes remain thin.
* Feature-based frontend architecture.
* Reusable shared components.
* Human approval before major workflow transitions.
* AI agents have single, well-defined responsibilities.
* Keep the codebase modular and maintainable.

---

# Current Sprint

**Sprint 3.2 — Project Frontend**

Goals

* [ ] Project list
* [ ] Create Project dialog
* [ ] Project cards
* [ ] Project detail page
* [ ] Status badge
* [ ] Browser testing
* [ ] Commit
* [ ] Push

---

# Future Ideas

These are intentionally postponed until after the MVP.

* Authentication
* Organizations
* Teams
* File uploads
* Notifications
* Comments
* Audit logs
* Analytics
* Deployment pipelines
* GitHub integration
* Slack integration
* Multi-model AI support

---

# Notes

This roadmap is a living document and should be updated whenever a milestone is completed or a significant architectural decision changes.
