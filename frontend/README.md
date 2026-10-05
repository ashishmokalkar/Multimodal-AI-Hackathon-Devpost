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

## Troubleshooting

If a fresh PowerShell launched by the Copilot app cannot find Node.js or pnpm,
prepend the installed Node and Corepack shim directories to `PATH`:

```powershell
$env:Path = "C:\Program Files\nodejs;$env:LOCALAPPDATA\Programs\nodejs;$env:Path"
node -v
pnpm -v
```

The pnpm shim is installed under
`$env:LOCALAPPDATA\Programs\nodejs`; Node.js is installed under
`C:\Program Files\nodejs`.
