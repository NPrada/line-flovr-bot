# Line Flovr Chat Bot

Welcome to this simple guide on how to create an Echo Bot for the LINE messaging platform using TypeScript and ECMAScript Modules (ESM).
An Echo Bot is a basic bot that replies to a user's message with the same content.
This tutorial will help you set up a LINE Echo Bot from scratch.

## Prerequisite

- Node.js version 18 or higher
- You've created a channel in the LINE Developers Console, and got your channel access token and channel secret.
  - Read https://developers.line.biz/en/docs/messaging-api/getting-started/#using-console if you haven't done this yet.

## Installation


- Install all dependencies.

```bash
npm install
```

- Build and run the application

```bash
npm run start
```


- Set the following environment variables.

```bash
export CHANNEL_ACCESS_TOKEN=<YOUR_CHANNEL_ACCESS_TOKEN>
export CHANNEL_SECRET=<YOUR_CHANNEL_SECRET>
export PORT=<YOUR_PORT>
```

- Set up your webhook URL in your LINE Official Account to be in the following format. Don't forget to disable the greeting messages and auto-response messages for convenience.

```bash
https://example.com/callback
```

- Build the application.

```bash
npm run build
```

- Run the application.

```bash
npm start
```
