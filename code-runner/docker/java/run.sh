#!/bin/sh
mkdir -p /tmp/work && cd /tmp/work || exit 125
printf '%s' "$SOURCE_B64" | base64 -d > Main.java || exit 125
unset SOURCE_B64
if ! javac -J-Xmx256m Main.java > /tmp/compile.log 2>&1; then
  head -c 8000 /tmp/compile.log >&2
  exit 100
fi
echo '@@RUN@@' >&2
exec java -Xmx${MEM_MB}m -XX:+UseSerialGC -XX:-UsePerfData -Xss16m Main
