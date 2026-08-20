# 3D TSI Material Ordering

A full-stack material request form for 3D Technology Services. The application runs as a Cloudflare Worker and stores submitted requests in Cloudflare D1.

## Important: deploy as a Worker

This is not a static Cloudflare Pages site. Deploying only `dist/client` to Pages produces a 404 because the homepage and submission API are served by the Worker.

Use **Workers & Pages → Create application → Import a repository → Worker** and select `MyKyah70/OrderPprojectMaterials`.

## Cloudflare setup

### 1. Create the D1 database

In Cloudflare, open **Storage & databases → D1 SQL database**, create a database named:

```text
order-project-materials
```

Copy its database ID.

### 2. Configure Workers Builds

Use these production settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production deploy command | `npx wrangler versions upload` |
| Root directory | `/` |

Add these build variables:

| Variable | Value |
| --- | --- |
| `CLOUDFLARE_D1_DATABASE_ID` | The D1 database ID from step 1 |
| `CLOUDFLARE_D1_DATABASE_NAME` | `order-project-materials` |

The binding name used by the application is `DB`. The generated Worker configuration includes that binding automatically.

Submitted requests are also emailed to Frankie Pedersen at `fjpedersen@3dtsi.com` from the restricted sender `material-requests@orders.awgoodson.com`. The Worker binding only permits that sender and recipient, and submissions are rate-limited before email delivery.

### 3. Deploy

Save the build settings and trigger a deployment. Cloudflare will provide a `workers.dev` address. The application creates its required D1 tables on the first valid material-request submission.

For an internal-only form, protect the Worker or its custom domain with a Cloudflare Access policy before distributing the URL.

## Local development

Prerequisite: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

## Validation

```bash
npm run build
npm test
```

## Project structure

- `app/page.tsx` — material-request interface
- `app/api/material-requests/route.ts` — validated D1 submission endpoint
- `db/schema.ts` — material request and line-item schema
- `drizzle/` — database migration history
- `worker/index.ts` — Cloudflare Worker entry point
- `vite.config.ts` — Worker build and D1 binding configuration
