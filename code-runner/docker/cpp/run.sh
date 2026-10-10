#!/bin/sh
mkdir -p /tmp/work && cd /tmp/work || exit 125
printf '%s' "$SOURCE_B64" | base64 -d > Main.cpp || exit 125
unset SOURCE_B64
if ! g++ Main.cpp -O2 -std=c++17 -o main > /tmp/compile.log 2>&1; then
  head -c 8000 /tmp/compile.log >&2
  exit 100
fi
echo '@@RUN@@' >&2
exec ./main
