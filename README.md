# Beehive Frontend

A restaurant POS and management system built with React, TypeScript, and Vite.

## Tech Stack

- **React 19** with TypeScript
- **Vite 7** for build tooling
- **Tailwind CSS 4** for styling
- **Zustand** for state management
- **React Router 7** for routing
- **Radix UI** for accessible UI primitives
- **Recharts** for data visualization
- **Axios** for API communication

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Project Structure

```
src/
├── core/             # Domain entities and business logic
│   ├── domain/       # Entities and interfaces
│   └── usecases/     # Application use cases
├── infrastructure/   # External services and API layer
│   ├── api/          # API clients (orders, menu, auth, etc.)
│   ├── repositories/ # Data repositories
│   └── services/     # Infrastructure services
├── presentation/     # UI layer
│   ├── components/   # Reusable components (common, features, layout)
│   ├── hooks/        # Custom React hooks
│   ├── pages/        # Route pages (admin, auth, client, error)
│   ├── routes/       # Route definitions
│   └── store/        # Zustand stores (auth, settings, notifications)
└── shared/           # Shared utilities, types, constants, and hooks
```

The project follows **Clean Architecture** principles — see `ARCHITECTURE.md` for details.

## License

Private

