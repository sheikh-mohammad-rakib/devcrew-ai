# DevCrew AI Domain Model

## Purpose

This document defines the core business entities of DevCrew AI and the relationships between them.

The domain model acts as the blueprint for the database, backend services, APIs, frontend features, and AI workflow.

---

# High-Level Domain Model

```text
Workspace
│
├── Project
│     │
│     ├── Timeline
│     ├── Task
│     ├── Artifact
│     ├── Approval
│     ├── Memory
│     ├── Agent Session
│     └── Conversation
│
└── Project
```

---

# Core Entities

## Workspace

A workspace is the highest-level organizational unit.

It groups related software projects.

### Responsibilities

* Organize projects
* Store workspace metadata
* Entry point for users

### Relationships

```text
Workspace
    │
    ├── Project
    ├── Project
    └── Project
```

---

## Project

A project represents a software product being developed.

Every AI agent operates within the context of a project.

### Responsibilities

* Track software development
* Coordinate AI agents
* Store project artifacts
* Maintain project lifecycle

### Relationships

```text
Project

belongs_to → Workspace

has_many → Timeline

has_many → Tasks

has_many → Artifacts

has_many → Approvals

has_many → Memory Entries

has_many → Agent Sessions

has_many → Conversations
```

---

## Timeline

Represents the lifecycle of a software project.

Initial stages:

```text
Requirements

↓

Architecture

↓

Implementation

↓

Testing

↓

Deployment
```

Future versions may support custom workflows.

---

## Task

Represents an individual unit of work.

Examples:

* Write authentication API
* Fix failing tests
* Refactor project service

Tasks may be assigned to AI agents or humans.

---

## Artifact

Generated project outputs.

Examples:

* Source code
* Design documents
* UML diagrams
* API specifications
* Test reports

---

## Approval

Represents human approval gates.

Example workflow:

```text
Developer

↓

Await Approval

↓

Architect

↓

Await Approval

↓

QA

↓

Await Approval

↓

Judge

↓

Completed
```

Manual approval is intentionally required before progressing between major stages.

---

## Memory

Long-term knowledge associated with a project.

Examples:

* Important design decisions
* Coding conventions
* Previous discussions
* Technical constraints
* User preferences

Memory will be stored using PostgreSQL + pgvector.

---

## Agent Session

Represents one execution of an AI agent.

Stores:

* Input
* Output
* Duration
* Model used
* Cost
* Token usage

---

## Conversation

Stores discussions between:

* Human ↔ AI
* AI ↔ AI
* Debate sessions
* Planning sessions

---

# Planned AI Team

```text
Coordinator
      │
      ▼
Project Manager
      │
      ▼
Architect
      │
      ▼
Developer
      │
      ▼
QA
      │
      ▼
Judge
```

Each agent has:

* Prompt
* Memory
* Tools
* Output
* History

---

# Database Relationships

```text
Workspace (1)

↓

Projects (N)

↓

Timeline (1)

Tasks (N)

Artifacts (N)

Approvals (N)

Memory (N)

Agent Sessions (N)

Conversations (N)
```

---

# Project Lifecycle

```text
Workspace

↓

Project

↓

Requirements

↓

Architecture

↓

Development

↓

Testing

↓

Approval

↓

Deployment

↓

Completed
```

---

# Guiding Principles

## Workspace First

Everything belongs to a workspace.

---

## Project-Centric

All AI activity occurs within a project.

---

## Human in the Loop

Major workflow transitions require manual approval.

---

## Persistent Memory

Agents retain project knowledge across sessions.

---

## Modular AI

Each AI agent has a single responsibility.

---

## Extensible Architecture

New entities should attach to existing domain objects rather than introducing parallel hierarchies.

---

# Future Entities

These are intentionally postponed until later milestones.

* User
* Team
* Organization
* Notification
* File Storage
* Integrations
* Billing
* Audit Log
* Analytics
* Deployment Pipeline

These entities are not required for the initial hackathon release but can be introduced without changing the core domain model.

---

# Version History

| Version | Changes                      |
| ------- | ---------------------------- |
| 1.0     | Initial domain model created |
