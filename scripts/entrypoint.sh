#!/bin/sh
set -eu
if [ "$(id -u)" = "0" ]; then
	chown bun:bun /data
	exec runuser -u bun -- "$@"
fi
exec "$@"
