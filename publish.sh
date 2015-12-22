#!/usr/bin/env bash

cd `dirname $0` && gulp build:dist && cd ../mi-lib-dist && git add -A && git commit -m "new version" && git push