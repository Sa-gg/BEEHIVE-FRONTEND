# Layout Components

Components that define the structure and layout of pages.

## Examples:
- Header.tsx
- Footer.tsx
- Sidebar.tsx
- Navigation.tsx
- MainLayout.tsx

```typescript
// MainLayout.tsx
import { Header } from './Header';
import { Footer } from './Footer';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 bg-gray-50">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
};
```
