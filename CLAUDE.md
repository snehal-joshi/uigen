# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in a chat interface; Claude generates JSX files into a virtual (in-memory) file system, which is then transpiled and rendered in a sandboxed preview.

## Commands

```bash
# Install deps + generate Prisma client + run migrations
npm run setup

# Development server (Turbopack)
npm run dev

# Build
npm run build

# Run all tests
npm test

# Run a single test file
npx vitest run src/lib/__tests__/file-system.test.ts

# Lint
npm run lint

# Reset database
npm run db:reset

# Regenerate Prisma client after schema changes
npx prisma generate

# Run migrations
npx prisma migrate dev
```

## Architecture

### Request Flow

1. User types a message → `ChatInterface` → `POST /api/chat`
2. The route reconstructs a `VirtualFileSystem` from serialized client state, calls `streamText` (Vercel AI SDK) with Claude, and streams back tool calls
3. Claude uses two tools: `str_replace_editor` (create/view/edit files via string replacement) and `file_manager` (rename/delete/move)
4. Both tools operate on the in-memory `VirtualFileSystem` and update it in place during streaming
5. On finish, the updated VFS and full message history are persisted to Prisma (`Project.data` and `Project.messages` as JSON strings)

### Virtual File System (`src/lib/file-system.ts`)

`VirtualFileSystem` is an in-memory tree of `FileNode` objects. It is serialized to a plain `Record<string, FileNode>` for JSON transport and deserialized back on each API call. The singleton `fileSystem` export is **not** used server-side — each API request instantiates a fresh one from the posted `files` payload.

### Preview (`src/components/preview/PreviewFrame.tsx`)

Generated JSX files are transpiled client-side via `@babel/standalone` (`src/lib/transform/jsx-transformer.ts`) and rendered in a sandboxed iframe. The preview hot-reloads whenever the VFS changes. The entry point is always `/App.jsx`.

### AI Provider (`src/lib/provider.ts`)

`getLanguageModel()` returns a real Anthropic model (`claude-haiku-4-5`) when `ANTHROPIC_API_KEY` is set, or a `MockLanguageModel` that streams static responses when no key is present. The mock still exercises the full tool-call pipeline.

### Auth (`src/lib/auth.ts`, `src/middleware.ts`)

JWT-based sessions stored in an `httpOnly` cookie (`auth-token`). `JWT_SECRET` defaults to a hardcoded development string. Users can generate components anonymously; projects are only persisted for authenticated users. Middleware protects `/api/projects` and `/api/filesystem`.

### Database

Prisma + SQLite (`prisma/dev.db`). The schema is defined in `prisma/schema.prisma` — reference it whenever you need to understand the structure of data stored in the database. Two models: `User` (email/password with bcrypt) and `Project` (stores serialized VFS in `data` and chat history in `messages` as JSON strings). Prisma client is generated into `src/generated/prisma`.

### Key Directories

| Path | Purpose |
|------|---------|
| `src/app/api/chat/` | Streaming AI chat endpoint |
| `src/app/[projectId]/` | Project workspace page |
| `src/lib/tools/` | `str_replace_editor` and `file_manager` tool builders |
| `src/lib/prompts/` | System prompt for the generation model |
| `src/lib/transform/` | Babel-based JSX transpiler for the preview |
| `src/lib/contexts/` | React contexts for VFS and chat state |
| `src/components/preview/` | Sandboxed iframe preview component |
| `src/components/chat/` | Chat UI components |
| `src/actions/` | Next.js server actions for project CRUD |

## Testing

Tests use Vitest + jsdom + React Testing Library. Test files live alongside source in `__tests__/` subdirectories. The vitest config (`vitest.config.mts`) uses `vite-tsconfig-paths` so `@/` path aliases work in tests.

## Code Style

- Use comments sparingly. Only comment complex or non-obvious code.

## Generated Component Conventions

The system prompt (`src/lib/prompts/generation.tsx`) enforces:
- Every project must have a root `/App.jsx` as the entry point
- Style with Tailwind CSS only (no inline styles)
- Import non-library files with the `@/` alias (e.g., `@/components/Button`)
- No HTML files — the VFS only serves JSX/JS
