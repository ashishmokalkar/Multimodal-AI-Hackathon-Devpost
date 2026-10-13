# Frontend

The frontend is a Vite, React 18, and TypeScript application using React Three
Fiber for the visualization shell. Tailwind CSS **v3** is configured through
PostCSS; the shell also uses a small project stylesheet for its responsive
layout and visual theme.

## Run locally

```powershell
corepack enable
corepack prepare pnpm@12.9.1 --activate
pnpm install
pnpm dev
```

Use Node.js 24.19.0 as pinned in `.nvmrc`. Quality checks are available through
`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm format`.

