# Pages

Top-level page components that represent routes in your application.

## Examples:
- HomePage.tsx
- DashboardPage.tsx
- LoginPage.tsx
- UserProfilePage.tsx
- NotFoundPage.tsx

```typescript
// HomePage.tsx
import { MainLayout } from '../components/layout/MainLayout';

export const HomePage = () => {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Welcome to BEEHIVE</h1>
        {/* Page content */}
      </div>
    </MainLayout>
  );
};
```
