#!/bin/bash

# Celestia Process Manager Script
# This script provides utilities for managing Celestia process PIDs to improve cleanup reliability

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to store PID for later cleanup
store_celestia_pid() {
    local pid="$1"
    local process_type="${2:-light}"  # light, bridge, or full
    local pid_file="/var/run/celestia-${process_type}.pid"
    local backup_pid_file="/tmp/celestia-${process_type}.pid"

    if [ -z "$pid" ]; then
        log "❌ Error: No PID provided to store"
        return 1
    fi

    # Verify the PID exists and is a celestia process
    if [ ! -e "/proc/$pid" ]; then
        log "❌ Error: Process $pid does not exist"
        return 1
    fi

    local cmd=$(ps -o cmd= -p "$pid" 2>/dev/null || echo "")
    if [[ "$cmd" != *"celestia"* ]]; then
        log "❌ Error: Process $pid is not a celestia process: $cmd"
        return 1
    fi

    # Try to store in /var/run first, fallback to /tmp
    if echo "$pid" > "$pid_file" 2>/dev/null; then
        log "✅ Stored PID $pid in $pid_file"
    elif echo "$pid" > "$backup_pid_file" 2>/dev/null; then
        log "✅ Stored PID $pid in $backup_pid_file"
    else
        log "⚠️ Warning: Could not store PID $pid in any location"
        return 1
    fi

    # Also store in user's home directory as additional backup
    local user_pid_file="$HOME/celestia-${process_type}.pid"
    echo "$pid" > "$user_pid_file" 2>/dev/null || true

    return 0
}

# Function to find and store running celestia processes
discover_and_store_pids() {
    log "🔍 Discovering running celestia processes..."

    # Find celestia light processes
    local light_pids=$(pgrep -f "celestia.*light.*start" 2>/dev/null || true)
    for pid in $light_pids; do
        if [ -e "/proc/$pid" ]; then
            store_celestia_pid "$pid" "light"
        fi
    done

    # Find celestia bridge processes
    local bridge_pids=$(pgrep -f "celestia.*bridge.*start" 2>/dev/null || true)
    for pid in $bridge_pids; do
        if [ -e "/proc/$pid" ]; then
            store_celestia_pid "$pid" "bridge"
        fi
    done

    # Find celestia full processes
    local full_pids=$(pgrep -f "celestia.*full.*start" 2>/dev/null || true)
    for pid in $full_pids; do
        if [ -e "/proc/$pid" ]; then
            store_celestia_pid "$pid" "full"
        fi
    done

    log "✅ Process discovery completed"
}

# Function to monitor systemd service and store its PID
monitor_systemd_service() {
    local service_name="${1:-celestia-light}"
    local max_wait=${2:-30}
    local wait_time=0

    log "🔄 Monitoring systemd service $service_name for PID..."

    while [ $wait_time -lt $max_wait ]; do
        if systemctl is-active "$service_name" >/dev/null 2>&1; then
            local main_pid=$(systemctl show "$service_name" --property MainPID --value 2>/dev/null)
            if [ -n "$main_pid" ] && [ "$main_pid" != "0" ] && [ -e "/proc/$main_pid" ]; then
                local process_type="light"
                if [[ "$service_name" == *"bridge"* ]]; then
                    process_type="bridge"
                elif [[ "$service_name" == *"full"* ]]; then
                    process_type="full"
                fi

                store_celestia_pid "$main_pid" "$process_type"
                log "✅ Successfully stored systemd service PID: $main_pid"
                return 0
            fi
        fi

        sleep 1
        wait_time=$((wait_time + 1))
    done

    log "⚠️ Warning: Could not get PID from systemd service $service_name after ${max_wait}s"
    return 1
}

# Function to create a wrapper script that stores PID when starting celestia
create_celestia_wrapper() {
    local wrapper_path="/usr/local/bin/celestia-managed"
    local celestia_binary="${1:-celestia}"

    log "📝 Creating celestia wrapper script at $wrapper_path..."

    sudo tee "$wrapper_path" > /dev/null << 'WRAPPER_EOF'
#!/bin/bash

# Celestia Managed Wrapper - automatically stores PIDs for cleanup

CELESTIA_BIN="celestia"
if [ -n "$1" ] && command -v "$1" >/dev/null 2>&1; then
    CELESTIA_BIN="$1"
    shift
fi

# Determine process type from arguments
PROCESS_TYPE="light"
for arg in "$@"; do
    if [[ "$arg" == "bridge" ]]; then
        PROCESS_TYPE="bridge"
        break
    elif [[ "$arg" == "full" ]]; then
        PROCESS_TYPE="full"
        break
    fi
done

# Start the process in background and capture PID
"$CELESTIA_BIN" "$@" &
CELESTIA_PID=$!

# Store the PID for cleanup
PID_FILE="/var/run/celestia-${PROCESS_TYPE}.pid"
BACKUP_PID_FILE="/tmp/celestia-${PROCESS_TYPE}.pid"

echo "$CELESTIA_PID" > "$PID_FILE" 2>/dev/null || echo "$CELESTIA_PID" > "$BACKUP_PID_FILE" 2>/dev/null
echo "$CELESTIA_PID" > "$HOME/celestia-${PROCESS_TYPE}.pid" 2>/dev/null || true

echo "Started celestia $PROCESS_TYPE with PID $CELESTIA_PID"

# Wait for the process
wait $CELESTIA_PID
WRAPPER_EOF

    sudo chmod +x "$wrapper_path"
    log "✅ Wrapper script created successfully"
}

# Main execution based on command line arguments
case "$1" in
    "store")
        if [ -n "$2" ]; then
            store_celestia_pid "$2" "$3"
        else
            log "Usage: $0 store <pid> [process_type]"
            exit 1
        fi
        ;;
    "discover")
        discover_and_store_pids
        ;;
    "monitor")
        monitor_systemd_service "$2" "$3"
        ;;
    "wrapper")
        create_celestia_wrapper "$2"
        ;;
    *)
        echo "Celestia Process Manager"
        echo "Usage: $0 {store|discover|monitor|wrapper} [args...]"
        echo ""
        echo "Commands:"
        echo "  store <pid> [type]     - Store a specific PID for later cleanup"
        echo "  discover               - Find and store all running celestia processes"
        echo "  monitor [service] [timeout] - Monitor systemd service and store PID"
        echo "  wrapper [binary]       - Create wrapper script for automatic PID storage"
        echo ""
        echo "Examples:"
        echo "  $0 store 12345 light"
        echo "  $0 discover"
        echo "  $0 monitor celestia-light 30"
        echo "  $0 wrapper /usr/local/bin/celestia"
        exit 1
        ;;
esac
