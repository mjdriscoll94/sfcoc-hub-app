# Church Hub Web Application

A modern, mobile-friendly web application for church community engagement and information sharing.

## Features

- Responsive design for mobile and desktop
- Event calendar
- Ministry information
- Service times and locations
- Announcements
- Contact information
- Resources and media

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- ESLint

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Development

The project uses Next.js App Router and follows modern React best practices. Components are organized in the `src/components` directory, and pages are in the `src/app` directory.

## Church Directory MCP server

This app exposes an authenticated Streamable HTTP MCP endpoint at `/mcp`. It lets
ChatGPT read canonical congregation records and write only to research workflow,
source, proposal, and candidate tables. It does not expose SQL, deletes, or direct
inserts/updates to `congregations`.

### Database setup

The app uses Neon's serverless HTTP driver and `DATABASE_URL`. Apply
[`migrations/001_mcp_directory_support.sql`](migrations/001_mcp_directory_support.sql)
to the same Neon database that contains `congregations` and `research_urls`. You can
paste the migration into the Neon SQL Editor or run it with `psql`:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/001_mcp_directory_support.sql
```

The migration creates `congregation_sources`, `proposed_changes`,
`candidate_congregations`, OAuth authorization-code storage, and any missing queue
metadata columns on `research_urls`. It does not alter `congregations`.

### Environment

Copy [`.env.example`](.env.example) to `.env.local` and retain the application's
existing variables. Add all MCP variables shown in the example. Generate secrets,
for example, with `openssl rand -base64 48`. None of the MCP variables may use a
`NEXT_PUBLIC_` prefix.

`MCP_BASE_URL` must exactly match the public origin in production (for example,
`https://app.example.com`). `MCP_OAUTH_REDIRECT_URIS` is a comma-separated allowlist
of exact callback URLs. ChatGPT shows its callback URL while you create the app; add
that value to the deployment environment and redeploy before completing OAuth.

### Run and test locally

```bash
npm install
npm run dev
```

The endpoint is `http://localhost:3000/mcp` when `MCP_BASE_URL` is set to
`http://localhost:3000`. The health check is
`http://localhost:3000/api/health/mcp`. Use the MCP Inspector for protocol testing:

```bash
npx @modelcontextprotocol/inspector
```

Choose Streamable HTTP, enter `http://localhost:3000/mcp`, and use the Inspector's
OAuth settings. Add the callback URL shown by the Inspector to
`MCP_OAUTH_REDIRECT_URIS`.

Run automated checks with:

```bash
npm test
npm run lint:mcp
npm run typecheck:mcp
npm run build
```

The repository-wide checks remain available as `npm run lint` and
`npm run typecheck`.

### Deploy and connect ChatGPT

Deploy the existing Next.js application to Vercel as usual, add the MCP environment
variables to the production environment, apply the migration to Neon, and redeploy.
The URL entered in ChatGPT is:

```text
https://YOUR-PRODUCTION-DOMAIN/mcp
```

In ChatGPT on the web:

1. Open **Settings → Security and login** and enable **Developer mode**.
2. Open the ChatGPT Plugins page, select **+**, and create a developer-mode app.
3. Choose Streamable HTTP and enter the production `/mcp` URL.
4. Choose OAuth with static client credentials. Enter `MCP_OAUTH_CLIENT_ID` and
   `MCP_OAUTH_CLIENT_SECRET` from the deployment environment.
5. Copy ChatGPT's exact redirect URL into `MCP_OAUTH_REDIRECT_URIS`, redeploy if it
   was not already allowlisted, then authorize with `MCP_AUTH_PASSWORD`.
6. Open the app's details page and refresh/scan tools. Confirm that all seven tools
   appear, then enable the tools you want available in conversations.

If tool metadata changes later, refresh the app from its details page so ChatGPT
rescans names, descriptions, schemas, and safety annotations.

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

MIT
