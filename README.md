# Aimage Generation Frontend

This is the frontend for the Aimage Generation system, a web application for generating reference images with AI.

## Tech Stack

- **Framework:** [React](https://reactjs.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) (using Radix UI)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) & [TanStack Query](https://tanstack.com/query/v5)
- **Routing:** [React Router](https://reactrouter.com/)
- **Forms:** [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **API Communication:** [Axios](https://axios-http.com/)

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have [Node.js](https://nodejs.org/) (version 18 or higher) and [pnpm](https://pnpm.io/) installed on your system.

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Navigate to the project directory:
    ```bash
    cd aimage-generation-frontend
    ```
3.  Install the dependencies:
    ```bash
    pnpm install
    ```

### Running the Development Server

To start the local development server, run the following command:

```bash
pnpm dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

## Available Scripts

- `pnpm dev`: Starts the development server with Hot Module Replacement (HMR).
- `pnpm build`: Compiles TypeScript and builds the application for production.
- `pnpm lint`: Lints the codebase using ESLint.
- `pnpm lint:fix`: Lints the codebase and attempts to fix issues automatically.
- `pnpm format`: Formats the code using Prettier.
- `pnpm preview`: Serves the production build locally for previewing.
- `pnpm api`: Generates TypeScript types from the `openapi.json` specification file.

## Project Structure

The codebase is organized into the following main directories:

- `public/`: Static assets that are publicly accessible.
- `src/`: Application source code.
  - `api/`: API client setup and service definitions.
  - `components/`: Reusable UI components.
  - `hooks/`: Custom React hooks.
  - `pages/`: Top-level page components for different routes.
  - `services/`: Business logic and services.
  - `types/`: TypeScript type definitions.
  - `utils/`: Utility functions.
  - `constants/`: Application-wide constants.

## API Integration

This frontend communicates with a backend service. The API contract is defined in the `openapi.json` file at the root of the project.

To ensure type safety between the frontend and backend, TypeScript types are automatically generated from this OpenAPI specification. To update the types after a change in the API, run:

```bash
pnpm api
```

This command uses `openapi-typescript` to generate a `schemas.d.ts` file in the `src/api` directory.
