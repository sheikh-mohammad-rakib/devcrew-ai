# Architecture Decision Log (ADR)

This document records the major architectural and technical decisions made during the development of DevCrew AI.

The goal is to preserve the reasoning behind important choices so future contributors (or future us) understand *why* a decision was made.

---

# ADR-001: Monorepo Architecture

**Status:** Accepted

## Decision

Use a Turborepo monorepo.

## Rationale

* Single repository for frontend and backend
* Shared packages for UI, types, configuration, and prompts
* Easier dependency management
* Simpler CI/CD
* Better developer experience

---

# ADR-002: Backend Framework

**Status:** Accepted

## Decision

Use FastAPI.

## Rationale

* Excellent performance
* Automatic OpenAPI / Swagger documentation
* Strong typing with Pydantic
* Async support
* Large ecosystem

---

# ADR-003: Python Package Manager

**Status:** Accepted

## Decision

Use uv for Python dependency management.

## Rationale

* Very fast
* Modern Python workflow
* Excellent virtual environment management
* Lockfile support

---

# ADR-004: Database

**Status:** Accepted

## Decision

Use Neon PostgreSQL.

## Rationale

* Managed PostgreSQL
* No local database required
* Easy cloud deployment
* Branching support
* Compatible with pgvector

---

# ADR-005: Vector Storage

**Status:** Accepted

## Decision

Use pgvector on Neon.

## Rationale

* Avoid maintaining a separate vector database
* Native PostgreSQL integration
* Suitable for semantic search and AI memory

---

# ADR-006: Frontend Architecture

**Status:** Accepted

## Decision

Use a feature-based frontend structure.

## Structure

```text
features/
    workspace/
    project/
    timeline/
    agent/
```

## Rationale

* Better scalability
* Easier maintenance
* Clear separation of concerns
* Feature encapsulation

---

# ADR-007: Backend Architecture

**Status:** Accepted

## Decision

Separate API, services, models, and schemas.

## Rationale

Business logic belongs in services rather than API routes.

---

# ADR-008: Development Workflow

**Status:** Accepted

## Decision

Implement features as vertical slices.

## Workflow

Database

↓

Migration

↓

Service

↓

API

↓

Frontend API

↓

UI

↓

Testing

↓

Git Commit

↓

Push

## Rationale

* Small reviewable changes
* Easier debugging
* Every sprint ends with a working feature

---

# ADR-009: Human Approval

**Status:** Accepted

## Decision

Keep a manual approval step before major AI workflow transitions.

## Rationale

* Human oversight
* Better reliability
* Easier debugging
* Prevent unintended autonomous actions

---

# ADR-010: AI Team Structure

**Status:** Accepted

## Decision

Implement specialized AI agents instead of one general-purpose agent.

## Planned Agents

* Project Manager
* Architect
* Developer
* QA
* Judge

## Rationale

* Clear responsibilities
* Easier prompt engineering
* Better scalability
* Simulates a real engineering team

---

# ADR-011: Deployment

**Status:** Accepted

## Decision

Deploy on Alibaba Cloud ECS.

## Rationale

* Full server control
* Suitable for long-running AI services
* Easy integration with Docker and CI/CD

---

# ADR-012: Git Strategy

**Status:** Accepted

## Decision

Commit after every completed feature and create Git tags after major milestones.

## Rationale

* Small, meaningful commits
* Easy rollback
* Clear project history
* Better release management

---

# Future Decisions

New architecture decisions should follow the same format:

* Decision
* Status
* Rationale
* Consequences (if applicable)

Only decisions that significantly affect the architecture, development workflow, infrastructure, or long-term maintainability should be recorded.
