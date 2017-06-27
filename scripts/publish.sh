#!/bin/bash

set -e

ver=$(echo $(cat package.json | grep "version" | sed "s|\"||g" | sed "s|  ||g" | grep " .*" -o) | sed "s|,||g")

echo "Publishing hypercache @ $ver"

echo "Sure?"

read foo

[ "$foo" != "yes" ] && echo "Abort." && exit 2

set -x

npm publish
