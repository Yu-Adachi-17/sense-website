#!/usr/bin/env bash
set -euo pipefail

# Colima を使う（Docker Desktop でも context が colima ならこのままでOK）
docker context use colima >/dev/null 2>&1 || true

# 古いコンテナを掃除
docker rm -f minutesai-linux-bot 2>/dev/null || true

# 使うイメージ（手元で一番新しいものを自動選択）
IMG=$(docker images --format '{{.Repository}}:{{.Tag}}' | head -n1)
if [ -z "$IMG" ]; then
  echo "!! Docker image が見つかりません。minutes 用のイメージを build/pull してください。"
  exit 1
fi
echo "Using image: $IMG"

# DNS が通るか事前チェック（OKなら DNS_OK）
docker run --rm --dns 8.8.8.8 --dns 1.1.1.1 alpine \
  sh -lc 'apk add --no-progress bind-tools >/dev/null; getent hosts sdk.zoom.us && echo DNS_OK'

# 新しいコンテナを DNS 付きで起動し、bash へ入る（ここから右=新コンソール）
exec docker run --rm -it --name minutesai-linux-bot \
  --dns 8.8.8.8 --dns 1.1.1.1 -h minutesai-bot "$IMG" bash
