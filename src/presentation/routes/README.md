# Routes

This directory contains all routing configuration for the application.

## Structure

```
routes/
├── index.tsx           # Main router configuration
├── guards/             # Route protection (auth guards, role guards)
└── README.md          # This file
```

## Route Organization

Routes are organized by feature areas:

- **Client Routes** (`/`) - Public-facing pages (home, menu, about)
- **Auth Routes** (`/login`, `/register`) - Authentication pages
- **Admin Routes** (`/admin/*`) - Protected admin dashboard pages

## Clean Architecture Principles

1. **Separation of Concerns**: Routes are defined separately from business logic
2. **Lazy Loading**: Pages are loaded on-demand for better performance
3. **Centralized Configuration**: All routes defined in one place
4. **Type Safety**: Full TypeScript support with RouteObject types

## Usage

The router is imported and used in `App.tsx`:

```tsx
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'

function App() {
  return <RouterProvider router={router} />
}
```

## Route Guards (Future)

Create route guards in `routes/guards/` to protect routes:

```tsx
// routes/guards/AuthGuard.tsx
export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuth() // from your auth context
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}
```

## Navigation

Use React Router hooks and components:

```tsx
import { Link, useNavigate } from 'react-router-dom'

// Declarative navigation
<Link to="/menu">Menu</Link>

// Programmatic navigation
const navigate = useNavigate()
navigate('/admin/dashboard')
```
