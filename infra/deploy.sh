#!/bin/bash
set -e
cd ~/apps/imob && git pull
cd ~/apps/imob/infra && docker compose build imobintel-api && docker compose up -d
