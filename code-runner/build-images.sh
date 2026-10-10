#!/bin/sh
# Builds the three sandbox images used by the code runner.
set -eu
cd "$(dirname "$0")"
for lang in python java cpp; do
  echo "Building exam-runner-$lang ..."
  docker build -t "exam-runner-$lang" "docker/$lang"
done
echo "Done."
