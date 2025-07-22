# Celestia Deployment Framework

A comprehensive TypeScript-based framework for deploying and managing Celestia light nodes across remote infrastructure. This framework provides automated deployment pipelines, testing capabilities, and lifecycle management for Celestia blockchain nodes.

## 📋 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Documentation](#-documentation)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Configuration](#️-configuration)
- [Development](#-development)
- [Testing](#-testing)
- [Monitoring & Health Checks](#-monitoring--health-checks)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [Support](#️-support)

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Celestia Deployment Framework                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Azure DevOps  │  │   TypeScript    │  │   Playwright    │  │
│  │   Pipelines     │  │   Services      │  │   Testing       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                       │                       │     │
│           ▼                       ▼                       ▼     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  SSH Service    │  │ Node Lifecycle  │  │  Test Executor  │  │
│  │  Management     │  │   Management    │  │    & Reports    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                       │                       │     │
│           └───────────────────────┼───────────────────────┘     │
│                                   ▼                             │
│                    ┌─────────────────────────────┐              │
│                    │     Remote Celestia Node    │              │
│                    │                             │              │
│                    │  • Light Node Process       │              │
│                    │  • Configuration Management │              │
│                    │  • Network Integration      │              │
│                    │  • Health Monitoring        │              │
│                    └─────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## 📚 Documentation

### Core Documentation
- **[API Documentation](docs/api-documentation.md)** - Complete API reference for all services, methods, and interfaces
- **[Deployment Guide](docs/deployment-guide.md)** - Step-by-step deployment instructions for local and CI/CD environments
- **[Configuration Options](docs/configuration-options.md)** - Comprehensive configuration guide for all components and environments
- **[Troubleshooting Guide](docs/troubleshooting.md)** - Common issues, solutions, diagnostic tools, and debugging techniques
- **[Architecture Diagrams](docs/architecture-diagrams.md)** - Visual system architecture, component relationships, and data flows

### Quick Reference
- [Environment Variables Guide](docs/configuration-options.md#environment-variables) - All available configuration options
- [Common Error Solutions](docs/troubleshooting.md#common-error-messages) - Quick fixes for frequent issues
- [Network Configuration](docs/configuration-options.md#network-configuration) - Port and firewall setup
- [Security Best Practices](docs/deployment-guide.md#security) - Security recommendations and configurations

## ✨ Features

### 🚀 **Automated Deployment**
- Complete infrastructure setup and provisioning
- Automated Celestia node compilation and installation
- Environment configuration and dependency management
- Network initialization and configuration

### 🔄 **Lifecycle Management**
- Node start/stop/restart operations
- Health monitoring and status checking
- Process management and cleanup
- Configuration updates and validation

### 🧪 **Testing & Validation**
- Comprehensive Playwright test suites
- End-to-end deployment workflow testing
- Node connectivity and functionality validation
- Automated test reporting and results publishing

### 🔒 **Security & Reliability**
- SSH-based secure remote operations
- Credential management and key handling
- Error handling and retry mechanisms
- Comprehensive logging and monitoring

## 🚀 Quick Start

### Prerequisites

- Node.js 24.x or higher
- SSH key pair for remote server access
- Remote Ubuntu/Debian server with sudo access
- Azure DevOps (for CI/CD pipelines)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd celestia-node
   ```

2. **Install dependencies**
   ```bash
   npm ci
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up SSH keys**
   ```bash
   mkdir -p ~/.ssh
   cp your-key.pem ~/.ssh/id_rsa.pem
   chmod 600 ~/.ssh/id_rsa.pem
   ```

### Basic Usage

**Local Development:**
```bash
# Run full deployment workflow
npm run test:pipeline

# Run specific test patterns
npx playwright test --grep=@DeploymentWorkflow --project=pipeline --reporter=line --timeout=600000

# Development tasks
npm run lint        # Code linting
npm run format      # Code formatting
npm run check       # All quality checks
```

**Production Deployment:**
```bash
# Deploy via Azure DevOps pipeline
# Pipeline automatically triggers on push to main/develop branches

# Manual deployment verification
curl http://your-server:26658/health
curl http://your-server:26659/
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Remote Server Configuration
REMOTE_HOST=your-server-ip
REMOTE_USER=ubuntu
SSH_KEY_PATH=./keys/id_rsa.pem

# Celestia Node Configuration
CELESTIA_USER=celestia
CELESTIA_NETWORK=mocha-4
CELESTIA_VERSION=v0.23.3-mocha
NODE_TYPE=light

# Network Ports
RPC_PORT=26658
GATEWAY_PORT=26659

# Deployment Settings
LOG_LEVEL=info
CREATE_BACKUP=true
ENABLE_DEBUG=false
POOL_NAME=your-pool
```

### Azure DevOps Variables

Configure these variables in your Azure DevOps variable group `celestial-lightning-variable-group`:

| Variable | Description | Example |
|----------|-------------|---------|
| `VM_IP_ADDRESS` | Remote server IP address | `ip address` |
| `VM_USER` | Remote server username | `ubuntu` |
| `SSH_KEY_FILE` | SSH private key filename | `id_rsa.pem` |

## 🔧 Development

### Project Structure

```
src/
├── services/
│   ├── celestia/
│   │   └── lifecycle/
│   │       └── NodeLifecycleService.ts
│   └── ssh/
│       └── SshService.ts
├── tests/
│   └── CelestiaDeploymentWorkflow.spec.ts
└── utils/
    └── PlaywrightTestListener.ts

pipeline/
├── run.yml                    # Main pipeline definition
├── stages/
│   ├── cleanup/
│   ├── deployment/
│   ├── security/
│   └── testing/
├── variables/
│   └── celestia.yml
└── workflows/
    ├── celestia/
    └── common/

docs/
├── api-documentation.md
├── deployment-guide.md
├── configuration-options.md
├── troubleshooting.md
└── architecture-diagrams.md
```

### Development Workflow

1. **Local Development**
   ```bash
   # Install dependencies
   npm ci

   # Run linting and formatting
   npm run lint
   npm run format

   # Run tests locally
   npm run test:pipeline

   # Check all code quality
   npm run check
   ```

2. **Testing Workflow**
   ```bash
   # Unit tests (when available)
   npm test

   # Integration tests
   npm run test:pipeline

   # Specific test patterns
   npx playwright test --grep="@DeploymentWorkflow" --project=pipeline

   # Debug mode testing
   ENABLE_DEBUG=true npm run test:pipeline
   ```

3. **CI/CD Integration**
   ```bash
   # Automatic deployment on push to main/develop
   git push origin main

   # Manual pipeline trigger via Azure DevOps UI
   # View results in pipeline dashboard
   ```

## 🧪 Testing

### Test Types
- **Unit Tests**: Component-level testing (planned)
- **Integration Tests**: Service interaction testing via Playwright
- **End-to-End Tests**: Full deployment workflow testing
- **API Tests**: Celestia node API validation and health checks

### Running Tests

```bash
# All tests (integration + E2E)
npm run test

# Pipeline-specific tests
npm run test:pipeline

# With specific timeout and reporting
npx playwright test --grep=@DeploymentWorkflow --project=pipeline --reporter=line --timeout=600000

# Debug mode with verbose output
ENABLE_DEBUG=true npm run test:pipeline

# Generate and view HTML reports
npx playwright show-report
```

### Test Configuration

The framework uses Playwright with custom configuration for deployment testing:

- **Timeout**: 600 seconds for deployment operations
- **Retries**: Configurable retry logic for flaky operations
- **Parallel**: Single worker for deployment to avoid conflicts
- **Reports**: HTML and JUnit XML formats for CI/CD integration

## 📊 Monitoring & Health Checks

### Built-in Health Monitoring

The framework provides comprehensive health monitoring capabilities:

```bash
# Node API health check
curl http://your-server:26658/health

# Node status and sync information
curl http://your-server:26658/status

# Network information and peers
curl http://your-server:26658/net_info

# Gateway service availability
curl http://your-server:26659/
```

### Automated Monitoring

```bash
# Service status monitoring
ssh -i keys/id_rsa.pem ubuntu@server 'systemctl status celestia-light'

# Real-time log monitoring
ssh -i keys/id_rsa.pem ubuntu@server 'journalctl -u celestia-light -f'

# Resource usage monitoring
ssh -i keys/id_rsa.pem ubuntu@server 'top -b -n1 | head -20'
```

### Logging

Application logs are available in multiple locations:

- **Node Logs**: `/home/celestia/celestia-light.log`
- **System Logs**: `journalctl -u celestia-light`
- **Framework Logs**: Console output and test reports
- **Pipeline Logs**: Azure DevOps pipeline interface

### Alerting and Notifications

For production deployments, consider implementing:
- Health check monitoring (Prometheus/Grafana)
- Log aggregation (ELK stack)
- Alert notification systems (PagerDuty, Slack)
- Automated recovery procedures

## 🚨 Troubleshooting

For detailed troubleshooting information, see the [Troubleshooting Guide](docs/troubleshooting.md).

### Quick Diagnostic Tools

```powershell
# Windows health check script
.\scripts\health-check.ps1

# Manual connection test
ssh -i keys\id_rsa.pem ubuntu@server-ip 'echo "Connection successful"'

# Check framework dependencies
npm run check
node --version
```

### Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| SSH connection refused | `Test-NetConnection server-ip -Port 22` |
| Permission denied | `icacls keys\id_rsa.pem /inheritance:r` |
| Node won't start | `ssh server 'sudo systemctl restart celestia-light'` |
| Tests timeout | Increase `DEPLOYMENT_TIMEOUT` in `.env` |
| Port conflicts | `ssh server 'sudo pkill -f celestia'` |

### Emergency Recovery

```bash
# Complete service restart
ssh -i keys/id_rsa.pem ubuntu@server 'sudo systemctl restart celestia-light'

# Full framework reset (if needed)
npm ci && npm run test:pipeline

# Check service logs for errors
ssh server 'sudo journalctl -u celestia-light -n 50'
```

**For comprehensive troubleshooting:** See [Troubleshooting Guide](docs/troubleshooting.md)

## 🤝 Contributing

We welcome contributions to the Celestia Deployment Framework! Here's how to get started:

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/celestia-node.git
   cd celestia-node
   ```

2. **Install Dependencies**
   ```bash
   npm ci
   ```

3. **Set Up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run Tests**
   ```bash
   npm run check
   npm run test:pipeline
   ```

### Development Workflow

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow TypeScript best practices
   - Write or update tests for new functionality
   - Update documentation as needed
   - Ensure code passes linting and formatting

3. **Validate Changes**
   ```bash
   npm run lint        # Check code style
   npm run format      # Format code
   npm run check       # Run all quality checks
   npm run test:pipeline  # Run integration tests
   ```

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Provide clear description of changes
   - Include test results and documentation updates
   - Reference any related issues

### Code Standards

- **TypeScript**: Use strict TypeScript settings
- **ESLint**: Follow configured linting rules
- **Prettier**: Use for consistent code formatting
- **Testing**: Write comprehensive tests for new features
- **Documentation**: Update all relevant documentation
- **Commit Messages**: Use conventional commit format

### Testing Requirements

All contributions must include:
- Unit tests for new functions/classes
- Integration tests for service interactions
- End-to-end tests for complete workflows
- Documentation updates for configuration changes

### Review Process

1. Automated checks must pass (linting, formatting, tests)
2. Code review by maintainers
3. Documentation review for completeness
4. Manual testing of deployment scenarios
5. Security review for production changes

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

### Getting Help

For support and questions:

- **📖 Documentation**: Check the comprehensive [docs](docs/) directory
- **🐛 Issues**: [Create a GitHub issue](https://github.com/your-repo/celestia-node/issues) for bugs or feature requests
- **💬 Community**: Join the [Celestia Discord community](https://discord.gg/celestiacommunity)
- **📧 Contact**: Reach out to the development team

### Documentation Resources

- **[API Documentation](docs/api-documentation.md)** - Complete service and method reference
- **[Deployment Guide](docs/deployment-guide.md)** - Step-by-step setup instructions
- **[Configuration Guide](docs/configuration-options.md)** - All configuration options
- **[Troubleshooting Guide](docs/troubleshooting.md)** - Common issues and solutions
- **[Architecture Diagrams](docs/architecture-diagrams.md)** - System architecture overview

### Reporting Issues

When reporting issues, please include:

1. **Environment Information**
   - Operating system and version
   - Node.js and npm versions
   - Framework version

2. **Configuration Details** (sanitized)
   - Environment variables (remove sensitive data)
   - Network settings
   - Server specifications

3. **Error Details**
   - Complete error messages
   - Log files (sanitized)
   - Steps to reproduce
   - Expected vs actual behavior

4. **Testing Results**
   ```bash
   # Run health check and include results
   npm run check

   # Include test output
   npm run test:pipeline 2>&1 | tee test-output.log
   ```

### Feature Requests

For new features or enhancements:

1. Check existing issues to avoid duplicates
2. Describe the use case and benefits
3. Provide implementation suggestions if possible
4. Consider contributing the feature yourself

### Security Issues

For security-related issues:
- **DO NOT** create public issues
- Email security concerns privately
- Follow responsible disclosure practices

## 🔗 Related Projects

- **Celestia Node**: https://github.com/celestiaorg/celestia-node
- **Celestia App**: https://github.com/celestiaorg/celestia-app
- **Celestia Docs**: https://docs.celestia.org/
