#!/usr/bin/env bash
set -euo pipefail

# Install ImobIntel systemd timers for crawl/ML pipeline
# Run as root or with sudo on the VPS

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="/etc/systemd/system"

echo "Installing ImobIntel systemd timers..."

for f in "$SCRIPT_DIR"/imob-*.service "$SCRIPT_DIR"/imob-*.timer; do
  name="$(basename "$f")"
  cp "$f" "$DEST/$name"
  echo "  Installed $name"
done

systemctl daemon-reload

# Enable and start all timers
for timer in "$SCRIPT_DIR"/imob-*.timer; do
  name="$(basename "$timer")"
  systemctl enable "$name"
  systemctl start "$name"
  echo "  Enabled $name"
done

echo ""
echo "All timers installed. Check status with:"
echo "  systemctl list-timers 'imob-*'"
echo ""
echo "View logs with:"
echo "  journalctl -u imob-crawl-tick --since '1 hour ago'"
