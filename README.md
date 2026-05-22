# Git-it-Got-it-Good-
Git Manager is an orchestrator, not an uncontrolled autonomous swarm. Its job is to map, classify, plan, draft, review, and execute only bounded GitHub actions that the user authorizes.
# Git Manager MCP

Approval-gated GitHub MCP server for ChatGPT Developer Mode.

This app is built around a "blue system" operating model:

- read-only by default
- narrow typed tools
- explicit policy guard before every GitHub action
- no repository deletion, secret mutation, force-push, or autonomous merge
- audit logging for all tool calls
- human approval expected for any write action

## ChatGPT app fields

| Field | Value |
|---|---|
| Name | Git Manager |
| Description | AI-assisted GitHub repository, issue, pull request, and release manager with approval-gated actions. |
| MCP Server URL | `https://your-domain.example/mcp` |
| Authentication | OAuth |

Use `https://your-domain.example/mcp` for Streamable HTTP. If your ChatGPT screen specifically asks for SSE, deploy the compatibility route and use `https://your-domain.example/sse`.

## Local setup

```bash
cp .env.example .env
npm install
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

## Production setup

1. Create a GitHub OAuth App.
2. Set homepage URL to `https://your-domain.example`.
3. Set callback URL to `https://your-domain.example/oauth/github/callback`.
4. Put credentials in `.env`.
5. Deploy behind HTTPS.
6. Add the MCP server URL to ChatGPT Developer Mode.

## Safety stance

The first production deployment should keep:

```bash
ALLOW_WRITES=false
BLOCK_DESTRUCTIVE_ACTIONS=true
REQUIRE_APPROVAL_FOR_WRITES=true
```

Turn on write tools only after read-only repository mapping is stable.
