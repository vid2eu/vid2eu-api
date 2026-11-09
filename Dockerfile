# syntax=docker/dockerfile:1
#
# The API: auth, users and videos.
# Runs the TypeScript directly (Node's built-in type stripping), so there is no compile
# step. @vid2eu/db comes from the core submodule (github.com/vid2eu/vid2eu) as an npm
# workspace: clone with --recurse-submodules, or run `git submodule update --init`.

ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-slim
WORKDIR /app
ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false
COPY package.json package-lock.json ./
COPY core/packages/db/package.json core/packages/db/
RUN npm ci --omit=dev && npm cache clean --force
COPY core/packages/db core/packages/db
COPY src src
USER node
CMD ["node", "src/app.ts"]
