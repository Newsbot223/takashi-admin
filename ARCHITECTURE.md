# Takashi Admin — Architecture & Development Rules

Version: 1.0

---

# Project Overview

Takashi Admin is the internal administration panel for Takashi.

This repository is NOT the public website.

Purpose:

- staff authentication
- order management
- status updates
- customer management
- staff management
- internal dashboard

This repository must remain independent from the customer website.

---

# Technology Stack

Framework

- Next.js 16.x
- React 19
- TypeScript

Styling

- Tailwind CSS v4
- shadcn/ui

Backend

- Supabase
- PostgreSQL
- Supabase Auth
- Row Level Security

Deployment

- GitHub
- Vercel

Package manager

npm

---

# Project Principles

The project follows these rules.

## Never regenerate the project.

Do NOT create a new Next.js project.

Do NOT replace configuration files unless explicitly requested.

Always continue the existing repository.

---

## Never change the architecture.

Current architecture is the source of truth.

If something seems unusual:

Ask before changing it.

Do NOT redesign the project.

---

## Never send ZIP archives.

Always output code only.

If multiple files change:

Show every changed file completely.

---

## Never use partial code.

Forbidden:

...

// existing code

// rest omitted

Every file must be complete.

---

## Never invent missing files.

If a required file is missing:

Ask for it.

Never guess its contents.

---

# Current Folder Structure

```
app/
    (auth)/
        login/

    (dashboard)/
        dashboard/
        orders/
        customers/
        staff/
        settings/

components/

lib/
    supabase/
        client.ts
        server.ts
        middleware.ts

public/

proxy.ts

package.json
```

Do not create duplicate folders.

Do not move files without approval.

---

# Authentication

Authentication uses

Supabase Auth

ONLY.

No NextAuth.

No Clerk.

No Auth.js.

No Firebase Auth.

---

# Supabase

Current architecture:

```
lib/
    supabase/
        client.ts
        server.ts
        middleware.ts
```

Responsibilities

client.ts

Browser client.

Uses

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

ONLY.

---

server.ts

Server client.

Uses cookies()

Uses anon key.

Never use Service Role.

---

middleware.ts

Contains

updateSession()

Only session refresh.

No authorization logic.

---

proxy.ts

Calls updateSession().

Protects routes.

No database logic.

---

# Environment Variables

Allowed

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

Forbidden in frontend

SUPABASE_SERVICE_ROLE_KEY

Service Role must never be exposed.

---

# Database

Database security relies on

Row Level Security.

Never bypass RLS.

Never recommend disabling RLS.

---

# Authorization

Authorization is database-driven.

Example

is_staff()

SECURITY DEFINER

Policies

must stay inside PostgreSQL whenever possible.

---

# Server Components

Prefer Server Components.

Use Client Components only when required.

Examples:

forms

dialogs

dropdowns

state

browser APIs

---

# Data Fetching

Prefer

Server Components

↓

Server Actions

↓

Client Fetch

Do not fetch everything in the browser.

---

# UI

Use

shadcn/ui

Do not invent custom component libraries.

Icons

lucide-react

---

# Styling

Tailwind v4

Do not downgrade.

Do not migrate to Tailwind v3.

Do not replace PostCSS configuration.

---

# State Management

Default:

React state

Context

Server Components

Do not introduce Redux, Zustand, MobX or other libraries unless requested.

---

# Routing

Current route groups

(auth)

(dashboard)

Keep this structure.

---

# Forms

Prefer

React Hook Form

+

Zod

---

# Validation

Use Zod.

No Yup.

---

# API

Prefer

Server Actions.

Use Route Handlers only when appropriate.

---

# Code Style

Use TypeScript.

Avoid any.

Prefer explicit types.

Small functions.

Single responsibility.

---

# Naming

Components

PascalCase

Functions

camelCase

Files

kebab-case

unless Next.js requires otherwise.

---

# Imports

Prefer absolute imports.

Avoid deep relative paths.

---

# Error Handling

Never swallow errors.

Always return meaningful messages.

---

# Performance

Prefer:

Server Components

Streaming

Suspense

Avoid unnecessary client rendering.

---

# Security

Never expose:

Service Role

Secrets

Private Keys

Never store secrets in the browser.

---

# Git

Small commits.

Logical commits.

Descriptive messages.

---

# Before Changing Code

Always explain

WHY

the change is necessary.

---

# When Answering

Always provide:

1. Architecture explanation

2. Files affected

3. Complete file contents

4. Installation commands if required

5. Final verification steps

---

# Forbidden

Do NOT

- recreate project
- regenerate package.json
- regenerate tsconfig
- replace Next.js configuration
- replace Supabase architecture
- remove SSR
- replace App Router
- create ZIP archives
- omit code
- invent missing files
- redesign folder structure

---

# If Information Is Missing

Stop.

Ask for the required file.

Never guess.

---

# Goal

Continue building the existing Takashi Admin project incrementally, preserving the established architecture and minimizing unnecessary changes.