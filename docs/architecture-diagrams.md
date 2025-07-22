# Architecture Diagrams

This document provides visual representations of the Celestia Deployment Framework architecture, component relationships, and data flows.

## Table of Contents

- [System Overview](#system-overview)
- [Component Architecture](#component-architecture)
- [Deployment Pipeline Flow](#deployment-pipeline-flow)
- [Network Architecture](#network-architecture)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Security Architecture](#security-architecture)

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Celestia Deployment Framework                            │
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│ │   Developer     │  │   Azure DevOps  │  │   Remote        │                │
│ │   Workstation   │  │   Pipeline      │  │   Server        │                │
│ │                 │  │                 │  │                 │                │
│ │ • TypeScript    │  │ • YAML Stages   │  │ • Ubuntu/Debian │                │
│ │ • Playwright    │  │ • Variable Grps │  │ • Celestia Node │                │
│ │ • npm Scripts   │  │ • SSH Tasks     │  │ • System Services│               │
│ │ • Local Testing │  │ • Artifact Mgmt │  │ • Network Config │                │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│          │                       │                       │                   │
│          └───────────────────────┼───────────────────────┘                   │
│                                  ▼                                           │
│ ┌─────────────────────────────────────────────────────────────┐              │
│ │                    Core Services Layer                      │              │
│ │                                                             │              │
│ │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │              │
│ │  │     SSH      │ │  Lifecycle   │ │    Wallet    │        │              │
│ │  │   Service    │ │   Service    │ │   Service    │        │              │
│ │  └──────────────┘ └──────────────┘ └──────────────┘        │              │
│ │                                                             │              │
│ │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │              │
│ │  │   Logger     │ │ Config Mgmt  │ │   Testing    │        │              │
│ │  │   Utility    │ │   Service    │ │  Framework   │        │              │
│ │  └──────────────┘ └──────────────┘ └──────────────┘        │              │
│ └─────────────────────────────────────────────────────────────┘              │
│                                  │                                           │
│                                  ▼                                           │
│ ┌─────────────────────────────────────────────────────────────┐              │
│ │                  Celestia Network                           │              │
│ │                                                             │              │
│ │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │              │
│ │  │   Mocha-4    │ │  Arabica-11  │ │   Private    │        │              │
│ │  │   Testnet    │ │   Devnet     │ │   Network    │        │              │
│ │  └──────────────┘ └──────────────┘ └──────────────┘        │              │
│ └─────────────────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Service Layer                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │               NodeLifecycleService                      │    │
│  │                                                         │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │    │
│  │  │   Starter   │ │   Stopper   │ │   Status    │       │    │
│  │  │             │ │             │ │             │       │    │
│  │  │ • validate  │ │ • graceful  │ │ • health    │       │    │
│  │  │ • init      │ │ • force     │ │ • processes │       │    │
│  │  │ • start     │ │ • cleanup   │ │ • details   │       │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘       │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │              Initializer                            │   │    │
│  │  │                                                     │   │    │
│  │  │ • Network configuration                             │   │    │
│  │  │ • Directory setup                                   │   │    │
│  │  │ • Binary installation                               │   │    │
│  │  │ • Service registration                              │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┐    │
│                                                              │    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  SSH Service                             │    │
│  │                                                         │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │    │
│  │  │ Connection  │ │  Command    │ │   Pool      │       │    │
│  │  │  Manager    │ │  Executor   │ │  Manager    │       │    │
│  │  │             │ │             │ │             │       │    │
│  │  │ • create    │ │ • execute   │ │ • reuse     │       │    │
│  │  │ • validate  │ │ • retry     │ │ • cleanup   │       │    │
│  │  │ • cleanup   │ │ • timeout   │ │ • monitor   │       │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 Wallet Service                          │    │
│  │                                                         │    │
│  │ • Balance queries                                       │    │
│  │ • Transaction management                                │    │
│  │ • Address validation                                    │    │
│  │ • Key management                                        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Utility Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Utility Layer                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                Logger System                            │    │
│  │                                                         │    │
│  │  Component Loggers:                                     │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │    │
│  │  │   SSH       │ │ Lifecycle   │ │   Wallet    │       │    │
│  │  │  Logger     │ │  Logger     │ │  Logger     │       │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘       │    │
│  │                                                         │    │
│  │  Log Levels: ERROR → WARN → INFO → DEBUG → TRACE       │    │
│  │                                                         │    │
│  │  Output Formats:                                        │    │
│  │  • Console (colored)                                    │    │
│  │  • File (structured)                                    │    │
│  │  • JSON (for parsing)                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Configuration System                       │    │
│  │                                                         │    │
│  │  Sources (priority order):                              │    │
│  │  1. Command line arguments                              │    │
│  │  2. Environment variables                               │    │
│  │  3. .env files                                          │    │
│  │  4. Default values                                      │    │
│  │                                                         │    │
│  │  Validation:                                            │    │
│  │  • Schema validation (Joi)                              │    │
│  │  • Type checking                                        │    │
│  │  • Range validation                                     │    │
│  │  • Required field checking                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │             Testing Framework                           │    │
│  │                                                         │    │
│  │  Test Types:                                            │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │    │
│  │  │    Unit     │ │ Integration │ │    E2E      │       │    │
│  │  │   Tests     │ │   Tests     │ │   Tests     │       │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘       │    │
│  │                                                         │    │
│  │  Features:                                              │    │
│  │  • Playwright integration                               │    │
│  │  • Test listeners                                       │    │
│  │  • Report generation                                    │    │
│  │  • Parallel execution                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Pipeline Flow

### Azure DevOps Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Azure DevOps Pipeline                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                       Trigger                                   │        │
│  │                                                                 │        │
│  │  Git Push → Branch (main/develop) → Pipeline Trigger            │        │
│  └─────────────────────┬───────────────────────────────────────────┘        │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                  Pre-deployment                                 │        │
│  │                                                                 │        │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │        │
│  │  │  Checkout   │ │   Install   │ │  Validate   │              │        │
│  │  │    Code     │ │ Dependencies│ │   Config    │              │        │
│  │  └─────────────┘ └─────────────┘ └─────────────┘              │        │
│  │                                                                 │        │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │        │
│  │  │  Download   │ │    Lint     │ │   Build     │              │        │
│  │  │  SSH Key    │ │    Code     │ │   Project   │              │        │
│  │  └─────────────┘ └─────────────┘ └─────────────┘              │        │
│  └─────────────────────┬───────────────────────────────────────────┘        │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                    Deployment                                   │        │
│  │                                                                 │        │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │        │
│  │  │  Setup      │ │   Install   │ │  Configure  │              │        │
│  │  │Environment  │ │Dependencies │ │   Service   │              │        │
│  │  └─────────────┘ └─────────────┘ └─────────────┘              │        │
│  │                                                                 │        │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │        │
│  │  │   Start     │ │   Verify    │ │   Health    │              │        │
│  │  │  Service    │ │  Operation  │ │   Check     │              │        │
│  │  └─────────────┘ └─────────────┘ └─────────────┘              │        │
│  └─────────────────────┬───────────────────────────────────────────┘        │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                     Testing                                     │        │
│  │                                                                 │        │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │        │
│  │  │ Connectivity│ │ Functionality│ │Performance  │              │        │
│  │  │    Tests    │ │    Tests    │ │    Tests    │              │        │
│  │  └─────────────┘ └─────────────┘ └─────────────┘              │        │
│  │                                                                 │        │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │        │
│  │  │  Generate   │ │   Publish   │ │   Archive   │              │        │
│  │  │   Reports   │ │   Results   │ │  Artifacts  │              │        │
│  │  └─────────────┘ └─────────────┘ └─────────────┘              │        │
│  └─────────────────────┬───────────────────────────────────────────┘        │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                     Cleanup                                     │        │
│  │                                                                 │        │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │        │
│  │  │   Remove    │ │  Clean Up   │ │  Restore    │              │        │
│  │  │Temp Files   │ │ Resources   │ │  State      │              │        │
│  │  └─────────────┘ └─────────────┘ └─────────────┘              │        │
│  └─────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Local Development Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Local Development Workflow                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Developer Workstation:                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                                                                 │        │
│  │  npm ci              Install dependencies                       │        │
│  │     ↓                                                           │        │
│  │  npm run check      Code quality validation                     │        │
│  │     ↓                                                           │        │
│  │  npm run test       Unit tests                                  │        │
│  │     ↓                                                           │        │
│  │  npm run test:pipe  Integration tests                           │        │
│  │                                                                 │        │
│  └─────────────────────┬───────────────────────────────────────────┘        │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                SSH Connection                                   │        │
│  │                                                                 │        │
│  │  Local Machine ──────SSH──────► Remote Server                  │        │
│  │                                                                 │        │
│  │  Authentication:                                                │        │
│  │  • Private key (id_rsa.pem)                                    │        │
│  │  • Username (ubuntu/root)                                       │        │
│  │  • Host verification                                            │        │
│  └─────────────────────┬───────────────────────────────────────────┘        │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │              Remote Operations                                  │        │
│  │                                                                 │        │
│  │  1. System preparation                                          │        │
│  │  2. Binary installation                                         │        │
│  │  3. Configuration setup                                         │        │
│  │  4. Service management                                           │        │
│  │  5. Health verification                                          │        │
│  └─────────────────────┬───────────────────────────────────────────┘        │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │               Test Execution                                    │        │
│  │                                                                 │        │
│  │  • Playwright tests                                             │        │
│  │  • API endpoint testing                                         │        │
│  │  • Service health checks                                        │        │
│  │  • Report generation                                            │        │
│  └─────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Network Architecture

### Network Communication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Network Architecture                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Client Environment:                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                                                                 │        │
│  │  Developer Machine                                              │        │
│  │  ┌─────────────┐                                               │        │
│  │  │Framework App│                                               │        │
│  │  │   Port: *   │                                               │        │
│  │  └─────────────┘                                               │        │
│  │         │                                                      │        │
│  │         │ SSH (Port 22)                                        │        │
│  │         ▼                                                      │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                             │
│                        Internet / Network                                   │
│                                                                             │
│  Remote Server Environment:                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                                                                 │        │
│  │  Ubuntu Server (your-server-ip)                                │        │
│  │                                                                 │        │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │        │
│  │  │  SSH Server │  │   Firewall  │  │ Celestia    │            │        │
│  │  │   Port: 22  │  │   (ufw)     │  │   Node      │            │        │
│  │  └─────────────┘  └─────────────┘  └─────────────┘            │        │
│  │                                            │                   │        │
│  │  Service Ports:                           │                   │        │
│  │  • RPC:     26658 ◄─────────────────────┘                   │        │
│  │  • Gateway: 26659                                            │        │
│  │  • P2P:     2121  ◄──────────── Celestia Network            │        │
│  │  • Metrics: 9090 (optional)                                  │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                        │                                                    │
│                        │ P2P Connections                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                 Celestia Network                               │        │
│  │                                                                 │        │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │        │
│  │  │  Mocha-4    │  │ Arabica-11  │  │  Private    │            │        │
│  │  │  Testnet    │  │   Devnet    │  │  Network    │            │        │
│  │  │             │  │             │  │             │            │        │
│  │  │ • Bootstrap │  │ • Bootstrap │  │ • Custom    │            │        │
│  │  │ • Peers     │  │ • Peers     │  │ • Peers     │            │        │
│  │  │ • Consensus │  │ • Consensus │  │ • Config    │            │        │
│  │  └─────────────┘  └─────────────┘  └─────────────┘            │        │
│  └─────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Security Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Security Architecture                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                    Transport Security                           │        │
│  │                                                                 │        │
│  │  SSH Protocol:                                                  │        │
│  │  • Public key authentication                                    │        │
│  │  • Encrypted communication                                      │        │
│  │  • Host key verification                                        │        │
│  │  • Session integrity                                            │        │
│  └─────────────────────┬───────────────────────────────────────────┘        │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                   Access Control                                │        │
│  │                                                                 │        │
│  │  Authentication:                                                │        │
│  │  • SSH key pairs (RSA/Ed25519)                                 │        │
│  │  • Key file permissions (600)                                   │        │
│  │  • User isolation                                               │        │
│  │                                                                 │        │
│  │  Authorization:                                                 │        │
│  │  • Sudo permissions                                             │        │
│  │  • Service user (celestia)                                     │        │
│  │  • File system permissions                                      │        │
│  └─────────────────────┬───────────────────────────────────────────┘        │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                  Network Security                               │        │
│  │                                                                 │        │
│  │  Firewall Rules:                                                │        │
│  │  • SSH (22) - Limited source IPs                               │        │
│  │  • RPC (26658) - Application access                            │        │
│  │  • Gateway (26659) - Public access                             │        │
│  │  • P2P (2121) - Celestia network                               │        │
│  │  • All other ports blocked                                      │        │
│  │                                                                 │        │
│  │  Network Isolation:                                             │        │
│  │  • Process-level isolation                                      │        │
│  │  • User-level isolation                                         │        │
│  │  • Service-level configuration                                  │        │
│  └─────────────────────┬───────────────────────────────────────────┘        │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                 Data Protection                                 │        │
│  │                                                                 │        │
│  │  Configuration Security:                                        │        │
│  │  • Environment variable isolation                               │        │
│  │  • Secure credential storage                                    │        │
│  │  • Azure Key Vault integration                                  │        │
│  │                                                                 │        │
│  │  Runtime Security:                                              │        │
│  │  • Process isolation                                            │        │
│  │  • Resource limits                                              │        │
│  │  • Log sanitization                                             │        │
│  └─────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### Deployment Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Deployment Data Flow                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Configuration Input:                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Environment    │  │  Azure DevOps   │  │  Command Line   │              │
│  │  Variables      │  │  Variables      │  │  Arguments      │              │
│  │                 │  │                 │  │                 │              │
│  │ • .env file     │  │ • Variable grp  │  │ • CLI flags     │              │
│  │ • Local config  │  │ • Secure files  │  │ • Override opts │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│           │                      │                      │                   │
│           └──────────────────────┼──────────────────────┘                   │
│                                  │                                          │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                Configuration Merger                             │        │
│  │                                                                 │        │
│  │  Priority Order:                                                │        │
│  │  1. Command line arguments                                      │        │
│  │  2. Environment variables                                       │        │
│  │  3. Configuration files                                         │        │
│  │  4. Default values                                              │        │
│  └─────────────────────┬───────────────────────────────────────────┘        │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │               Configuration Validation                          │        │
│  │                                                                 │        │
│  │  Validation Steps:                                              │        │
│  │  • Schema validation (Joi)                                      │        │
│  │  • Type checking                                                │        │
│  │  • Range validation                                             │        │
│  │  • Dependency checking                                          │        │
│  │  • Security validation                                          │        │
│  └─────────────────────┬───────────────────────────────────────────┘        │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                 Service Execution                               │        │
│  │                                                                 │        │
│  │  Data Flow Through Services:                                    │        │
│  │                                                                 │        │
│  │  SSH Connection ──► Command Execution ──► Result Processing     │        │
│  │       ▲                    │                      │            │        │
│  │       │                    ▼                      ▼            │        │
│  │  Connection Pool    Remote Operations      Local Processing     │        │
│  │       ▲                    │                      │            │        │
│  │       │                    ▼                      ▼            │        │
│  │  Pool Management    System Changes         Status Updates      │        │
│  └─────────────────────┬───────────────────────────────────────────┘        │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                 Output Generation                               │        │
│  │                                                                 │        │
│  │  Output Types:                                                  │        │
│  │  • Console logs (colored)                                       │        │
│  │  • Test reports (HTML/XML)                                      │        │
│  │  • Status information                                           │        │
│  │  • Error messages                                               │        │
│  │  • Performance metrics                                          │        │
│  └─────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Testing Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Testing Data Flow                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Test Execution:                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                                                                 │        │
│  │  Test Discovery ──► Test Planning ──► Test Execution            │        │
│  │        │                   │                   │               │        │
│  │        ▼                   ▼                   ▼               │        │
│  │  *.spec.ts files    Test configuration   Playwright runner      │        │
│  │                                                                 │        │
│  │  Features:                                                      │        │
│  │  • Parallel execution                                           │        │
│  │  • Test grouping                                                │        │
│  │  • Retry logic                                                  │        │
│  │  • Timeout handling                                             │        │
│  └─────────────────────┬───────────────────────────────────────────┘        │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │               Service Integration Testing                       │        │
│  │                                                                 │        │
│  │  Test Flow:                                                     │        │
│  │                                                                 │        │
│  │  Connection Test ──► Deployment Test ──► Functionality Test     │        │
│  │         │                    │                    │            │        │
│  │         ▼                    ▼                    ▼            │        │
│  │  SSH validation      Service operations    API endpoint tests   │        │
│  │         │                    │                    │            │        │
│  │         ▼                    ▼                    ▼            │        │
│  │  Authentication     System changes        Health verification   │        │
│  └─────────────────────┬───────────────────────────────────────────┘        │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                 Result Processing                               │        │
│  │                                                                 │        │
│  │  Result Types:                                                  │        │
│  │  • Test outcomes (pass/fail/skip)                               │        │
│  │  • Performance metrics                                          │        │
│  │  • Error details                                                │        │
│  │  • System state                                                 │        │
│  │  • Screenshots/traces                                           │        │
│  │                                                                 │        │
│  │  Processing:                                                    │        │
│  │  • Result aggregation                                           │        │
│  │  • Report generation                                            │        │
│  │  • Artifact collection                                          │        │
│  └─────────────────────┬───────────────────────────────────────────┘        │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                Report Generation                                │        │
│  │                                                                 │        │
│  │  Report Formats:                                                │        │
│  │  • HTML reports (interactive)                                   │        │
│  │  • XML reports (CI/CD integration)                              │        │
│  │  • JSON reports (API consumption)                               │        │
│  │  • Console output (development)                                 │        │
│  │                                                                 │        │
│  │  Distribution:                                                  │        │
│  │  • Local file system                                            │        │
│  │  • Azure DevOps artifacts                                       │        │
│  │  • Test result integration                                      │        │
│  └─────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

This architecture documentation provides comprehensive visual representations of the system design, component relationships, and data flows. It serves as a reference for understanding how the Celestia Deployment Framework operates at various levels, from high-level system architecture to detailed data processing flows.

The diagrams use ASCII art for compatibility and can be viewed in any text editor or documentation viewer. For more detailed technical information about specific components, refer to the [API documentation](api-documentation.md) and [deployment guide](deployment-guide.md).
