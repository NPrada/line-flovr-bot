# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=18.18.2
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"
WORKDIR /app
ENV NODE_ENV="production"

# Install tzdata so the container can handle timezones properly
RUN apt-get update -qq && \
  apt-get install -y --no-install-recommends tzdata && \
  rm -rf /var/lib/apt/lists/*

# Set timezone and link localtime
ENV TZ="Asia/Tokyo"
RUN ln -snf /usr/share/zoneinfo/"$TZ" /etc/localtime && echo "$TZ" > /etc/timezone

# Install pnpm
ARG PNPM_VERSION=8.11.0
RUN npm install -g pnpm@"$PNPM_VERSION"

FROM base AS build

RUN apt-get update -qq && \
  apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

COPY . .
RUN pnpm run build
RUN pnpm prune --prod

FROM base

COPY --from=build /app /app

# Just run the built file
EXPOSE 3000
CMD [ "node", "dist/index.js" ]
