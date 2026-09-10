# Terminal Home Page

An interactive terminal-style personal homepage built with Vite, React, TypeScript, and xterm.js.

## Commands

| Command | Purpose |
| --- | --- |
| `index` | Return to the homepage |
| `bio` | Show the biography |
| `project` | Show personal projects |
| `award` | Show awards and honors |
| `note` | Show learning notes |

The terminal also supports command history with the up/down arrow keys and command completion with Tab.

## Development

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite.

## Production build

```bash
pnpm build
pnpm preview
```

The production files are generated in `dist/`.

## Customize your information

All personal placeholders are stored in:

```text
src/data/profile.ts
```

Replace the placeholder values with your own name, role, biography, projects, awards, notes, and links. The command behavior and terminal rendering are defined in:

```text
src/terminal.ts
src/TerminalView.tsx
```

## Deploy to GitHub Pages

The included `.github/workflows/deploy.yml` builds and deploys the site to GitHub Pages.

1. Create a repository named `your-handle.github.io`.
2. Push this project to the repository's default branch.
3. In GitHub, open **Settings → Pages** and select **GitHub Actions** as the source.
4. Push a new commit to trigger deployment.

If the site is hosted from a repository subpath instead of a user site, update the Vite `base` option in `vite.config.ts`.
