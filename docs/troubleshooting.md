# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Celestia Deployment Framework.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Connection Issues](#connection-issues)
- [Deployment Failures](#deployment-failures)
- [Node Runtime Issues](#node-runtime-issues)
- [Performance Problems](#performance-problems)
- [Azure DevOps Pipeline Issues](#azure-devops-pipeline-issues)
- [Logging and Monitoring](#logging-and-monitoring)
- [Common Error Messages](#common-error-messages)

## Quick Diagnostics

### Health Check Script

Create a quick diagnostic script to check system status:

```powershell
# health-check.ps1
Write-Host "🔍 Celestia Deployment Framework Health Check" -ForegroundColor Green

# Check Node.js version
Write-Host "`n📦 Node.js Version:" -ForegroundColor Yellow
node --version

# Check npm dependencies
Write-Host "`n📚 Dependencies Status:" -ForegroundColor Yellow
npm list --depth=0 2>$null

# Check environment file
Write-Host "`n⚙️ Environment Configuration:" -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ .env file exists"
    Get-Content .env | Where-Object { $_ -match "^[A-Z_]+" } | ForEach-Object {
        $key = $_.Split('=')[0]
        Write-Host "  $key = [SET]" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ .env file missing" -ForegroundColor Red
}

# Check SSH key
Write-Host "`n🔑 SSH Key Status:" -ForegroundColor Yellow
$sshKeyPath = (Get-Content .env | Where-Object { $_ -match "SSH_KEY_PATH" } | ForEach-Object { $_.Split('=')[1] })
if (Test-Path $sshKeyPath) {
    Write-Host "✅ SSH key found at $sshKeyPath"
    $perms = (Get-Acl $sshKeyPath).Access | Where-Object { $_.IdentityReference -eq [System.Security.Principal.WindowsIdentity]::GetCurrent().Name }
    Write-Host "  Permissions: $($perms.FileSystemRights)" -ForegroundColor Gray
} else {
    Write-Host "❌ SSH key not found at $sshKeyPath" -ForegroundColor Red
}

# Test connection
Write-Host "`n🌐 Connection Test:" -ForegroundColor Yellow
$remoteHost = (Get-Content .env | Where-Object { $_ -match "REMOTE_HOST" } | ForEach-Object { $_.Split('=')[1] })
if ($remoteHost) {
    $ping = Test-NetConnection -ComputerName $remoteHost -Port 22 -WarningAction SilentlyContinue
    if ($ping.TcpTestSucceeded) {
        Write-Host "✅ SSH port accessible on $remoteHost" -ForegroundColor Green
    } else {
        Write-Host "❌ Cannot reach SSH port on $remoteHost" -ForegroundColor Red
    }
}

Write-Host "`n✅ Health check completed" -ForegroundColor Green
```

## Connection Issues

### SSH Connection Failures

**Symptoms:**
- "Connection refused" errors
- "Permission denied" errors
- "Host key verification failed"

**Diagnostic Steps:**

1. **Test basic connectivity:**
```powershell
# Test if host is reachable
Test-NetConnection -ComputerName your-server-ip -Port 22

# Test SSH connection
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'echo "Connection successful"'
```

2. **Check SSH key permissions:**
```powershell
# Windows (using icacls)
icacls keys\id_rsa.pem

# Expected: Only your user should have access
# Fix permissions if needed:
icacls keys\id_rsa.pem /inheritance:r /grant:r "$env:USERNAME:R"
```

3. **Verify SSH key format:**
```powershell
# Check key header
Get-Content keys\id_rsa.pem | Select-Object -First 1

# Should show: -----BEGIN RSA PRIVATE KEY----- or similar
```

**Solutions:**

| Problem | Solution |
|---------|----------|
| Wrong permissions | Fix key permissions: `icacls keys\id_rsa.pem /inheritance:r /grant:r "$env:USERNAME:R"` |
| Wrong key format | Convert key format: `ssh-keygen -p -m PEM -f keys/id_rsa.pem` |
| Host key changed | Update known hosts: `ssh-keygen -R your-server-ip` |
| Wrong username | Check server user: `ssh -i keys/id_rsa.pem root@your-server-ip 'whoami'` |

### Network Connectivity Issues

**Symptoms:**
- Timeout errors
- "No route to host"
- Intermittent connection failures

**Diagnostic Commands:**
```bash
# Check network path
traceroute your-server-ip

# Check DNS resolution
nslookup your-server-ip

# Test specific ports
telnet your-server-ip 26658  # RPC port
telnet your-server-ip 26659  # Gateway port

# Check firewall rules on server
sudo ufw status
sudo iptables -L
```

**Solutions:**
- Configure firewall rules on server
- Check cloud provider security groups
- Verify VPN/network access if on private network

## Deployment Failures

### Node Installation Failures

**Symptoms:**
- Binary download failures
- Permission errors during installation
- Service creation failures

**Diagnostic Steps:**

1. **Check disk space:**
```bash
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'df -h'
```

2. **Check internet connectivity on server:**
```bash
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'curl -I https://github.com'
```

3. **Check user permissions:**
```bash
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'sudo -l'
```

**Common Fixes:**

```bash
# Free up disk space
sudo apt autoremove -y
sudo apt autoclean
sudo journalctl --vacuum-time=7d

# Fix permission issues
sudo chmod +x /usr/local/bin/celestia
sudo chown celestia:celestia /home/celestia -R

# Retry with manual installation
wget https://github.com/celestiaorg/celestia-node/releases/download/v0.23.3-mocha/celestia-linux-amd64
chmod +x celestia-linux-amd64
sudo mv celestia-linux-amd64 /usr/local/bin/celestia
```

### Configuration Validation Errors

**Symptoms:**
- "Invalid configuration" errors
- Environment variable errors
- Network parameter errors

**Debug Configuration:**
```typescript
// Debug config loading
import * as dotenv from 'dotenv';
import { Logger } from './utils/Logger';

const logger = Logger.for('ConfigDebug');

// Load and validate environment
const result = dotenv.config();
if (result.error) {
  logger.error('Error loading .env file:', result.error);
}

// Log current configuration (mask sensitive data)
const config = {
  REMOTE_HOST: process.env.REMOTE_HOST,
  REMOTE_USER: process.env.REMOTE_USER,
  SSH_KEY_PATH: process.env.SSH_KEY_PATH ? '[SET]' : '[NOT SET]',
  CELESTIA_NETWORK: process.env.CELESTIA_NETWORK,
  RPC_PORT: process.env.RPC_PORT,
};

logger.info('Current configuration:', config);
```

## Node Runtime Issues

### Node Won't Start

**Symptoms:**
- Service fails to start
- Process exits immediately
- "Address already in use" errors

**Diagnostic Steps:**

1. **Check service status:**
```bash
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'sudo systemctl status celestia-light'
```

2. **Check logs:**
```bash
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'sudo journalctl -u celestia-light -n 50'
```

3. **Check port conflicts:**
```bash
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'sudo netstat -tlnp | grep 26658'
```

4. **Manual startup test:**
```bash
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'sudo -u celestia celestia light start --p2p.network mocha-4'
```

**Solutions:**

| Problem | Solution |
|---------|----------|
| Port in use | Kill conflicting process: `sudo pkill -f celestia` |
| Missing permissions | Fix ownership: `sudo chown -R celestia:celestia /home/celestia` |
| Invalid network | Check network name: `celestia light init --help` |
| Corrupted config | Reinitialize: `sudo -u celestia celestia light init --p2p.network mocha-4` |

### Node Crashes or Stops

**Symptoms:**
- Node stops unexpectedly
- High memory/CPU usage
- Connection errors

**Investigation:**
```bash
# Check system resources
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'top -b -n1 | head -20'

# Check memory usage
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'free -h'

# Check disk usage
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'df -h'

# Check for OOM killer
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'dmesg | grep -i "killed process"'

# Check node logs for errors
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'tail -100 /home/celestia/celestia-light.log | grep -i error'
```

### Network Connectivity Issues

**Symptoms:**
- "No peers found" errors
- Sync failures
- Network timeout errors

**Check Network Status:**
```bash
# Test node API endpoints
curl http://your-server-ip:26658/health
curl http://your-server-ip:26658/net_info

# Check peer connections
curl http://your-server-ip:26658/status | jq '.result.sync_info'

# Test P2P connectivity
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'sudo netstat -an | grep 2121'
```

## Performance Problems

### Slow Deployment Times

**Symptoms:**
- Deployment takes excessive time
- Timeout errors
- Slow SSH operations

**Performance Analysis:**
```typescript
// Add timing to operations
const startTime = Date.now();
await NodeLifecycleService.start();
const endTime = Date.now();
logger.info(`Deployment took ${endTime - startTime}ms`);
```

**Optimizations:**

1. **Increase timeouts:**
```bash
# In .env file
DEPLOYMENT_TIMEOUT=900000  # 15 minutes
SSH_TIMEOUT=60000         # 60 seconds
```

2. **Optimize SSH connections:**
```bash
# Enable connection reuse
SSH_CONNECTION_REUSE=true
MAX_POOL_SIZE=5
```

3. **Parallel operations:**
```typescript
// Execute multiple operations in parallel where possible
await Promise.all([
  checkNodeStatus(),
  validateConfiguration(),
  prepareEnvironment()
]);
```

### High Resource Usage

**Monitor Resource Usage:**
```bash
# CPU and memory monitoring
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'htop'

# Disk I/O monitoring
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'iotop'

# Network monitoring
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'iftop'
```

**Resource Optimization:**
```bash
# Adjust node configuration for lower resource usage
echo 'CELESTIA_CUSTOM_FLAGS="--log.level warn --p2p.max-conns 20"' >> .env
```

## Azure DevOps Pipeline Issues

### Pipeline Authentication Failures

**Symptoms:**
- "Authentication failed" in pipeline
- SSH key not found errors
- Permission denied in CI/CD

**Debug Steps:**

1. **Check variable group:**
```yaml
- task: AzureCLI@2
  displayName: 'Debug Variables'
  inputs:
    azureSubscription: 'your-subscription'
    scriptType: 'bash'
    scriptLocation: 'inlineScript'
    inlineScript: |
      echo "VM_IP_ADDRESS: $(VM_IP_ADDRESS)"
      echo "VM_USER: $(VM_USER)"
      echo "SSH_KEY_FILE: $(SSH_KEY_FILE)"
      ls -la $(Agent.TempDirectory)
```

2. **Test SSH key in pipeline:**
```yaml
- task: DownloadSecureFile@1
  inputs:
    secureFile: '$(SSH_KEY_FILE)'
  displayName: 'Download SSH Key'

- script: |
    chmod 600 $(Agent.TempDirectory)/$(SSH_KEY_FILE)
    ssh-keygen -y -f $(Agent.TempDirectory)/$(SSH_KEY_FILE)
  displayName: 'Validate SSH Key'
```

### Pipeline Timeout Issues

**Symptoms:**
- Pipeline jobs timeout
- "The job running on agent took longer than the maximum allowed time"

**Solutions:**
```yaml
# Increase job timeout
jobs:
- job: DeployNode
  timeoutInMinutes: 120  # Increase from default 60

  # Add timeout to individual tasks
  steps:
  - task: npmAuthenticate@0
    timeoutInMinutes: 10

  # Use parallel execution
  - task: PowerShell@2
    displayName: 'Parallel Deployment'
    inputs:
      script: |
        $jobs = @()
        $jobs += Start-Job { npm run test:connectivity }
        $jobs += Start-Job { npm run test:configuration }
        $jobs | Wait-Job | Receive-Job
```

## Logging and Monitoring

### Enable Debug Logging

**Framework Debug Logging:**
```bash
# Enable debug mode in .env
ENABLE_DEBUG=true
LOG_LEVEL=debug

# Or set environment variable
export DEBUG=celestia:*
```

**Node Debug Logging:**
```bash
# Increase Celestia node logging
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'sudo systemctl edit celestia-light'

# Add in the editor:
[Service]
Environment="CELESTIA_LOG_LEVEL=debug"
```

### Log Collection

**Collect All Relevant Logs:**
```powershell
# Create log collection script
$logDir = "debug-logs-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $logDir

# Application logs
Copy-Item "test-results\*" -Destination $logDir -Recurse -ErrorAction SilentlyContinue

# Framework logs
npm run test:pipeline --reporter=json > "$logDir\test-output.json" 2>&1

# Remote logs
ssh -i keys\id_rsa.pem ubuntu@your-server-ip 'sudo journalctl -u celestia-light --no-pager' > "$logDir\systemd.log"
ssh -i keys\id_rsa.pem ubuntu@your-server-ip 'tail -1000 /home/celestia/celestia-light.log' > "$logDir\node.log"

Write-Host "Logs collected in $logDir"
```

### Monitoring Setup

**Health Monitoring Script:**
```bash
#!/bin/bash
# monitor.sh

while true; do
  echo "$(date): Checking node health..."

  # Check if service is running
  if systemctl is-active --quiet celestia-light; then
    echo "✅ Service is running"
  else
    echo "❌ Service is not running"
    systemctl restart celestia-light
  fi

  # Check API endpoint
  if curl -s http://localhost:26658/health > /dev/null; then
    echo "✅ API endpoint responsive"
  else
    echo "❌ API endpoint not responsive"
  fi

  # Check resource usage
  cpu=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
  memory=$(free | grep Mem | awk '{printf("%.1f\n", $3/$2 * 100.0)}')
  echo "📊 CPU: ${cpu}%, Memory: ${memory}%"

  sleep 300  # Check every 5 minutes
done
```

## Common Error Messages

### "Connection refused"
**Cause:** SSH service not running or wrong port
**Solution:**
```bash
sudo systemctl start ssh
sudo systemctl enable ssh
```

### "Permission denied (publickey)"
**Cause:** SSH key issues or wrong username
**Solutions:**
- Check key permissions: `chmod 600 keys/id_rsa.pem`
- Verify username: try `root`, `ubuntu`, or `centos`
- Check key format: ensure it's in correct format

### "Address already in use"
**Cause:** Port conflict with existing process
**Solution:**
```bash
# Find and kill conflicting process
sudo netstat -tlnp | grep 26658
sudo pkill -f celestia
```

### "No such file or directory"
**Cause:** Missing binary or configuration files
**Solution:**
```bash
# Reinstall binary
wget -O /tmp/celestia https://github.com/celestiaorg/celestia-node/releases/download/v0.23.3-mocha/celestia-linux-amd64
sudo mv /tmp/celestia /usr/local/bin/celestia
sudo chmod +x /usr/local/bin/celestia
```

### "Timeout waiting for node to start"
**Cause:** Node taking too long to initialize
**Solutions:**
- Increase timeout values in configuration
- Check server resources (CPU, memory, disk)
- Verify network connectivity

### "Failed to sync with network"
**Cause:** Network connectivity or configuration issues
**Solutions:**
- Check firewall rules
- Verify network name
- Check peers: `curl http://localhost:26658/net_info`

## Emergency Recovery

### Complete Reset Procedure

If all else fails, perform a complete reset:

```bash
# 1. Stop all services
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'sudo systemctl stop celestia-light'

# 2. Backup current state
ssh -i keys/id_rsa.pem ubuntu@your-server-ip 'sudo tar -czf /tmp/celestia-backup-$(date +%Y%m%d).tar.gz /home/celestia'

# 3. Clean installation
ssh -i keys/id_rsa.pem ubuntu@your-server-ip '
sudo rm -rf /home/celestia/.celestia-light
sudo rm -f /usr/local/bin/celestia
sudo systemctl disable celestia-light
sudo rm -f /etc/systemd/system/celestia-light.service
'

# 4. Redeploy from scratch
npm run test:pipeline
```

### Support and Help

If you continue to experience issues:

1. **Collect debug information** using the scripts provided above
2. **Check GitHub Issues** for similar problems
3. **Create detailed issue report** with:
   - System information
   - Configuration (sanitized)
   - Complete error logs
   - Steps to reproduce

Remember to sanitize logs and configuration before sharing, removing sensitive information like IP addresses, private keys, and passwords.
