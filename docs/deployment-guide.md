# Deployment Guide

This guide provides step-by-step instructions for deploying the Celestia Deployment Framework in both local development and production CI/CD environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Production Deployment](#production-deployment)
- [Azure DevOps Pipeline Setup](#azure-devops-pipeline-setup)
- [Remote Server Preparation](#remote-server-preparation)
- [Troubleshooting Deployment Issues](#troubleshooting-deployment-issues)

## Prerequisites

### System Requirements

- **Node.js**: 24.x or higher
- **npm**: 10.x or higher
- **Operating System**: Windows, macOS, or Linux
- **Remote Server**: Ubuntu 20.04+ or Debian 11+ with sudo access

### Required Access

- SSH key pair for remote server access
- Remote server with sudo privileges
- Internet connectivity for downloading dependencies
- Azure DevOps account (for CI/CD pipelines)

### Network Requirements

- SSH access (port 22) to remote server
- Outbound HTTPS (port 443) for package downloads
- Celestia network ports:
  - RPC: 26658
  - Gateway: 26659
  - P2P: 2121

## Local Development Setup

### 1. Clone and Install

```powershell
# Clone the repository
git clone <repository-url>
cd testnets

# Install dependencies
npm ci

# Verify installation
npm run check
```

### 2. Environment Configuration

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
```

### 3. SSH Key Setup

```powershell
# Create keys directory
mkdir keys

# Copy your SSH private key
copy your-key.pem keys\id_rsa.pem

# Set appropriate permissions (if using WSL or Git Bash)
chmod 600 keys/id_rsa.pem
```

### 4. Test Connection

```powershell
# Test SSH connection
ssh -i keys\id_rsa.pem ubuntu@your-server-ip

# Test framework connectivity
npm run test:pipeline
```

## Production Deployment

### 1. Server Preparation

Prepare your remote Ubuntu server:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required dependencies
sudo apt install -y curl wget git build-essential

# Create Celestia user
sudo useradd -m -s /bin/bash celestia
sudo usermod -aG sudo celestia

# Set up directory structure
sudo mkdir -p /home/celestia/.celestia-light
sudo chown -R celestia:celestia /home/celestia/.celestia-light
```

### 2. Celestia Binary Installation

The framework will handle binary installation, but you can manually install:

```bash
# Download and install Celestia binary
cd /tmp
wget https://github.com/celestiaorg/celestia-node/releases/download/v0.23.3-mocha/celestia-linux-amd64
sudo mv celestia-linux-amd64 /usr/local/bin/celestia
sudo chmod +x /usr/local/bin/celestia

# Verify installation
celestia version
```

### 3. Network Configuration

Configure firewall rules:

```bash
# Allow SSH
sudo ufw allow ssh

# Allow Celestia ports
sudo ufw allow 26658/tcp  # RPC
sudo ufw allow 26659/tcp  # Gateway
sudo ufw allow 2121/tcp   # P2P

# Enable firewall
sudo ufw --force enable
```

### 4. Service Configuration

Create systemd service file:

```bash
sudo tee /etc/systemd/system/celestia-light.service > /dev/null <<EOF
[Unit]
Description=Celestia Light Node
After=network-online.target

[Service]
Type=simple
User=celestia
ExecStart=/usr/local/bin/celestia light start --p2p.network mocha-4
Restart=on-failure
RestartSec=3
LimitNOFILE=4096

[Install]
WantedBy=multi-user.target
EOF

# Reload and enable service
sudo systemctl daemon-reload
sudo systemctl enable celestia-light
```

## Azure DevOps Pipeline Setup

### 1. Variable Group Configuration

Create a variable group named `celestial-lightning-variable-group`:

| Variable Name | Value | Secure |
|---------------|-------|---------|
| `VM_IP_ADDRESS` | Your server IP | No |
| `VM_USER` | ubuntu | No |
| `SSH_KEY_FILE` | id_rsa.pem | No |
| `SSH_PRIVATE_KEY` | SSH private key content | Yes |
| `CELESTIA_NETWORK` | mocha-4 | No |
| `LOG_LEVEL` | info | No |

### 2. Pipeline Configuration

The main pipeline is defined in `pipeline/run.yml`:

```yaml
# Key sections of the pipeline configuration
trigger:
- main
- develop

pool:
  vmImage: 'ubuntu-latest'

variables:
- group: celestial-lightning-variable-group

stages:
- template: stages/deployment/deployment.yml
- template: stages/testing/test.yml
- template: stages/cleanup/cleanup.yml
```

### 3. Secure Files

Upload your SSH private key as a secure file:

1. Go to Azure DevOps → Project → Pipelines → Library
2. Select "Secure files" tab
3. Upload your SSH private key file
4. Name it `id_rsa.pem`
5. Grant access to your pipeline

### 4. Pipeline Execution

```yaml
# Example pipeline stage for deployment
- stage: Deploy
  jobs:
  - job: DeployNode
    steps:
    - template: ../deployment/deployment-setup-environment.yml
    - template: ../deployment/deployment-install-dependencies.yml
    - template: ../deployment/deployment-start-service.yml
```

## Remote Server Preparation

### Automated Preparation Script

Create `scripts/prepare-server.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Preparing server for Celestia node deployment..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl wget git build-essential jq

# Create celestia user if doesn't exist
if ! id "celestia" &>/dev/null; then
    sudo useradd -m -s /bin/bash celestia
    sudo usermod -aG sudo celestia
fi

# Create directories
sudo mkdir -p /home/celestia/.celestia-light
sudo chown -R celestia:celestia /home/celestia/

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 26658/tcp
sudo ufw allow 26659/tcp
sudo ufw allow 2121/tcp
sudo ufw --force enable

echo "✅ Server preparation completed successfully!"
```

### Manual Server Setup

If you prefer manual setup:

```bash
# 1. Connect to your server
ssh -i keys/id_rsa.pem ubuntu@your-server-ip

# 2. Update and install packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential jq

# 3. Create celestia user
sudo useradd -m -s /bin/bash celestia
sudo passwd celestia
sudo usermod -aG sudo celestia

# 4. Setup directories
sudo mkdir -p /home/celestia/.celestia-light
sudo chown -R celestia:celestia /home/celestia/

# 5. Install Celestia binary
wget -O /tmp/celestia https://github.com/celestiaorg/celestia-node/releases/download/v0.23.3-mocha/celestia-linux-amd64
sudo mv /tmp/celestia /usr/local/bin/celestia
sudo chmod +x /usr/local/bin/celestia

# 6. Initialize node
sudo -u celestia celestia light init --p2p.network mocha-4
```

## Deployment Workflow

### 1. Pre-deployment Checks

```powershell
# Verify environment
npm run check

# Test SSH connectivity
ssh -i keys\id_rsa.pem ubuntu@your-server-ip 'echo "Connection successful"'

# Check server requirements
ssh -i keys\id_rsa.pem ubuntu@your-server-ip 'uname -a && free -h && df -h'
```

### 2. Deployment Execution

```powershell
# Run full deployment workflow
npm run test:pipeline

# Or run individual stages
npx playwright test --grep="@DeploymentWorkflow" --project=pipeline
```

### 3. Post-deployment Validation

```bash
# Verify node is running
curl http://your-server-ip:26658/health

# Check node info
curl http://your-server-ip:26658/node_info

# View logs
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'tail -f /home/celestia/celestia-light.log'
```

## Configuration Management

### Environment-specific Configurations

Create separate configuration files for different environments:

```
config/
├── development.env
├── staging.env
└── production.env
```

**development.env:**
```bash
CELESTIA_NETWORK=private
LOG_LEVEL=debug
ENABLE_DEBUG=true
CREATE_BACKUP=false
```

**production.env:**
```bash
CELESTIA_NETWORK=mocha-4
LOG_LEVEL=info
ENABLE_DEBUG=false
CREATE_BACKUP=true
```

### Configuration Loading

```typescript
// Load environment-specific config
import * as dotenv from 'dotenv';

const environment = process.env.NODE_ENV || 'development';
dotenv.config({ path: `config/${environment}.env` });
```

## Monitoring and Health Checks

### Health Check Endpoints

```bash
# Node health
curl http://your-server-ip:26658/health

# Node status
curl http://your-server-ip:26658/status

# Network info
curl http://your-server-ip:26658/net_info
```

### Log Monitoring

```bash
# Application logs
tail -f /home/celestia/celestia-light.log

# System logs
journalctl -u celestia-light -f

# Error logs
grep -i error /home/celestia/celestia-light.log
```

## Backup and Recovery

### Automated Backup

```bash
#!/bin/bash
# backup-node.sh

BACKUP_DIR="/backup/celestia-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup configuration
cp -r /home/celestia/.celestia-light "$BACKUP_DIR/"

# Backup logs
cp /home/celestia/celestia-light.log "$BACKUP_DIR/"

echo "Backup created: $BACKUP_DIR"
```

### Recovery Process

```bash
# Stop node
sudo systemctl stop celestia-light

# Restore configuration
sudo -u celestia cp -r /backup/celestia-20231201-120000/.celestia-light /home/celestia/

# Start node
sudo systemctl start celestia-light
```

## Troubleshooting Deployment Issues

### Common Issues and Solutions

#### SSH Connection Failed
```bash
# Check SSH key permissions
ls -la keys/
chmod 600 keys/id_rsa.pem

# Test connection
ssh -i keys/id_rsa.pem -v ubuntu@your-server-ip
```

#### Node Won't Start
```bash
# Check logs
tail -f /home/celestia/celestia-light.log

# Check service status
sudo systemctl status celestia-light

# Restart service
sudo systemctl restart celestia-light
```

#### Port Access Issues
```bash
# Check firewall
sudo ufw status

# Check if port is listening
sudo netstat -tlnp | grep 26658

# Test port connectivity
telnet your-server-ip 26658
```

### Debug Mode

Enable debug mode for troubleshooting:

```bash
# Set debug environment
export ENABLE_DEBUG=true
export LOG_LEVEL=debug

# Run deployment with verbose output
npm run test:pipeline -- --reporter=list
```

## Best Practices

### Security

1. **Key Management**: Store SSH keys securely, never commit to version control
2. **User Permissions**: Use dedicated service user with minimal required permissions
3. **Network Security**: Configure firewall rules appropriately
4. **Regular Updates**: Keep system and dependencies updated

### Reliability

1. **Health Monitoring**: Implement comprehensive health checks
2. **Backup Strategy**: Regular automated backups
3. **Service Management**: Use systemd for service management
4. **Log Rotation**: Configure log rotation to prevent disk space issues

### Performance

1. **Resource Monitoring**: Monitor CPU, memory, and disk usage
2. **Network Optimization**: Configure appropriate network settings
3. **Connection Pooling**: Utilize SSH connection pooling for efficiency

This deployment guide provides a comprehensive approach to setting up and managing Celestia node deployments. For additional help, refer to the [troubleshooting guide](troubleshooting.md) or the [API documentation](api-documentation.md).
