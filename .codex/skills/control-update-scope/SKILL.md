---
name: control-update-scope
description: Modify only the explicitly requested page or feature and keep every other page unchanged. Use when a multi-page project request concerns one page's layout, behavior, content, or styles and changes must not affect other pages.
---

# Control Update Scope

## Goal

Change only the page, feature, or behavior the user explicitly requests. Preserve every other page exactly as it was, including layout, content, commands, styles, and interactions.

## Required Workflow

1. Identify the exact target page or feature before editing.
2. Trace the target and all shared code paths used by it.
3. Prefer page-specific modules, render functions, components, selectors, or branches over shared changes.
4. Do not refactor, rename, format, or reorganize unrelated code.
5. If a shared file must change, make the smallest scoped change possible and ensure shared defaults and all non-target branches retain their original behavior.
6. Do not modify a shared style, token, utility, or component if doing so changes another page. Create a page-scoped alternative instead.
7. Stop and propose a scoped alternative if the requested change cannot be implemented without altering another page.

## Scope Rules

- A request to update one page does not implicitly authorize changes to any other page.
- Do not add shared UI, commands, styles, or state unless required by the requested feature.
- Do not update other pages merely for consistency, cleanup, or convenience.
- Do not change content in another page while editing a shared data file.
- Preserve existing APIs and behavior outside the requested scope.
- Deployment and unrelated maintenance require an explicit request.

## Verification

Before finishing:

- Review the diff and confirm every change is necessary for the requested scope.
- Check that non-target branches still produce their original output and behavior.
- Run the project build or relevant tests when available.
- Report any unavoidable shared-file change and explain why non-target pages remain unaffected.

## Project Page Map

Use this mapping when working in this repository:

- `index`: `renderHome` in `src/terminal.ts`
- `bio`: `renderBio` in `src/terminal.ts`
- `project`: `renderProjects` in `src/terminal.ts`
- `award`: `renderAwards` in `src/terminal.ts`
- `note`: `renderNotes`, `src/notes_setting`, and NOTES command handling in `src/TerminalView.tsx`
- `tachyon`: Tachyon rendering in `src/terminal.ts` and Tachyon interaction handling in `src/TerminalView.tsx`
- Shared styles: `src/index.css`

When editing a shared file, modify only the target page's function, branch, or selector. Do not change shared defaults used by other pages.