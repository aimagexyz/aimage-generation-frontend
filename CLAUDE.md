# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI content supervision and management frontend application built with React, TypeScript, and Vite. It provides workflows for task management, content annotation, quality review, and AI-powered reference generation.

## Development Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Code quality
pnpm lint          # Run ESLint
pnpm lint:fix      # Run ESLint with auto-fix
pnpm format        # Format code with Prettier

# API types generation
pnpm api           # Generate TypeScript types from OpenAPI spec
```

## Architecture

### Tech Stack

- **Framework:** React 18 with TypeScript (strict mode)
- **Build Tool:** Vite with React Compiler enabled
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** TanStack Query (server state) + Zustand (client state)
- **Forms:** React Hook Form + Zod validation
- **API:** Axios with auto-generated types from OpenAPI spec

### Directory Structure

- `/src/pages/` - Route-based page components organized by feature
- `/src/components/` - Reusable UI components (shadcn/ui based)
- `/src/hooks/` - Custom React hooks for business logic
- `/src/services/` - Business logic and external service integrations
- `/src/api/` - API client configuration and generated types
- `/src/utils/` - Utility functions

### Key Features & Their Locations

- **Task Management:** `/src/pages/Tasks/` - Main workflow with subtasks, annotations
- **Review Points:** `/src/pages/ReviewPointsPage/` - Quality control definitions
- **Character Management:** `/src/pages/CharactersPage/` - Character assets with AI associations
- **Reference Generation:** `/src/pages/ReferenceGenerationPage/` - AI-powered content generation
- **Data Registry:** `/src/pages/DataRegistryPage/` - Asset management

### Authentication & Routing

- Auth context: `/src/contexts/AuthContext.tsx`
- Protected routes use `ProtectedRoute` component
- Google OAuth integration for authentication
- Role-based access control (admin features)

### API Integration

- API types are auto-generated from `/openapi.json`
- Use `fetchApi` from `/src/api/client.ts` for API calls
- Environment variables in `/src/constants/env.ts`

### Form Patterns

```typescript
// Standard form pattern with Zod validation
const schema = z.object({
  field: z.string().min(1, 'Required'),
});

const form = useForm({
  resolver: zodResolver(schema),
});
```

### State Management Patterns

- Server state: Use TanStack Query hooks (`useQuery`, `useMutation`)
- Client state: Zustand stores in `/src/stores/`
- Form state: React Hook Form with Zod schemas

### Media File Support

- Images: All image/\* MIME types supported
- Videos: All video/\* MIME types supported
- Documents: PPTX, DOC/DOCX, XLS/XLSX, CSV, TXT
- File size limit: 1000MB for subtask uploads

### Component Conventions

- UI components use shadcn/ui as base
- Icons from Lucide React (LuXxx) or React Icons
- Japanese UI text throughout the application
- Custom components follow composition pattern

### Important Configuration

- TypeScript path alias: `@/*` maps to `./src/*`
- Tailwind config includes custom design tokens
- React Compiler is enabled in Vite config
- Sentry error tracking configured in production

## Common Development Tasks

### Adding a New Page

1. Create component in `/src/pages/[FeatureName]/`
2. Add route in `/src/main.tsx`
3. Use `ProtectedRoute` wrapper if authentication required

### Working with API

1. Update `/openapi.json` with latest API spec
2. Run `pnpm api` to regenerate types
3. Use generated types from `/src/api/schemas.d.ts`

### Creating Forms

1. Define Zod schema for validation
2. Use React Hook Form with zodResolver
3. Follow existing patterns in CreateSubtaskDialog or similar components

### File Upload Handling

- Use multipart/form-data for file uploads
- Check file type with `file.type.startsWith('image/')` or `startsWith('video/')`
- Reference upload patterns in `/src/pages/Tasks/index.tsx`

## Notes

- All UI text is in Japanese
- Authentication required for most features
- Google Drive integration available for some features
- PDF export functionality available for reports
