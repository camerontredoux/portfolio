#!/usr/bin/env sh

# abort on errors
set -e

# build
yarn build

# navigate into the build output directory
cd dist

echo "camtredoux.me" > CNAME

git checkout main
git add -A
git commit -m 'deploy'

# if you are deploying to https://<USERNAME>.github.io
git push git@github.com:camerontredoux/camerontredoux.github.io.git main

# if you are deploying to https://<USERNAME>.github.io/<REPO>
# git push -f git@github.com:<USERNAME>/<REPO>.git main:gh-pages

cd -
