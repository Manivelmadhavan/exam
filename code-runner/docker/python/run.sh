#!/bin/sh
mkdir -p /tmp/work && cd /tmp/work || exit 125
printf '%s' "$SOURCE_B64" | base64 -d > program.py || exit 125
unset SOURCE_B64
echo '@@RUN@@' >&2
exec python3 -B program.py
