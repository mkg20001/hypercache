#!/bin/bash

set -e

newver="$1"

[ -z "$newver" ] && echo "Usage: $0 <new-version>" && exit 2

for f in package.json package-lock.json; do
  sed -r 's|^(  "version" *: *").*"|\1'$newver'"|' -i $f
  git add $f
done
git commit -m "Bump version to $newver"

git tag v$newver
