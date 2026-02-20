# CarHub Frontend

A single-page Angular application for managing an automobile catalog. Users can register, log in, and perform CRUD operations on car records through a paginated, Material-styled table.

## Tech Stack

- **Framework** — Angular 21 (standalone components, lazy-loaded routes)
- **UI** — Angular Material & Angular CDK
- **HTTP** — Angular `HttpClient` with a JWT auth interceptor
- **Testing** — Vitest + Angular testing utilities
- **Hosting** — Firebase Hosting
- **Backend API** — REST service on Google Cloud Run

## Project Structure

```
src/
├── app/
│   ├── core/              # Firebase initialisation
│   ├── features/
│   │   ├── components/    # Reusable UI (add/edit dialogs, table, pagination)
│   │   ├── models/        # Automobile TypeScript interfaces
│   │   ├── pages/         # Route-level pages (login, register, welcome, cars-list)
│   │   └── services/      # API & auth services
│   ├── layout/            # App shell / layout components
│   └── shared/            # Guards & interceptors
├── environments/          # Environment configs (dev / prod)
└── styles.scss            # Global styles
```

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 10
- **Angular CLI** (`npm i -g @angular/cli`)
- **Firebase CLI** (`npm i -g firebase-tools`) — for deployment only

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server (http://localhost:4200)
ng serve
```

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `ng serve` | Start the development server |
| `npm run build` | `ng test --watch=false && ng build` | Run tests then produce a production build |
| `npm test` | `ng test` | Run unit tests with Vitest |
| `npm run watch` | `ng build --watch` | Build in watch mode for development |

## Environment Configuration

Environment files live in `src/environments/`:

| File | Purpose |
|------|---------|
| `environment.ts` | Development defaults |
| `environment.prod.ts` | Production settings (used by `ng build`) |

Key properties:

- `apiBaseUrl` — Base URL for the automobiles REST API
- `production` — Boolean flag for production mode

## Deployment

The app is deployed to **Firebase Hosting**:

```bash
firebase deploy
```

This runs `ng build` as a predeploy step and publishes `dist/frontend/browser`.

## Running Tests

```bash
# Single run
ng test --watch=false

# Watch mode
ng test
```

## Routes

| Path | Access | Description |
|------|--------|-------------|
| `/login` | Guests only | Sign in with email/password |
| `/register` | Guests only | Create a new account |
| `/welcome` | First-time visitors | Onboarding / welcome page |
| `/cars` | Authenticated | Paginated car catalog with add, edit, and delete |

## License

This project is private and not published under an open-source license.
