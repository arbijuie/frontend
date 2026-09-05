# Arbijuie Frontend

Public operator interface for the Arbijuie funding-rate arbitrage product.

## Public Scope

This repository contains only the frontend application.
Core strategy and execution services are currently private during reliability and risk hardening.

## Repository

- [frontend](https://github.com/arbijuie/frontend)

## What You Can Do Here

- Run the web interface locally
- Explore UI architecture and product direction
- Open issues with product, UX, and integration ideas

## Tech Stack

- React + TypeScript
- Vite
- SCSS Modules
- TanStack Query
- React Router

## Quick Start

```bash
pnpm install
cp .env.local.example .env.local
pnpm dev
```

Default frontend URL: `http://localhost:5173`

Configure backend endpoint in `.env.local`:

```bash
VITE_ARB_API_URL=http://127.0.0.1:8000
VITE_ARB_API_TOKEN=
```

## Quality Checks

```bash
pnpm lint
pnpm test
pnpm build
pnpm types:check
```

## Contributing

Use GitHub Issues for proposals, bugs, and integration requests:

- [Open an issue](https://github.com/arbijuie/frontend/issues)
