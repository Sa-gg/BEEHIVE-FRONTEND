# Configuration

Environment-specific configuration files.

## Example:

```typescript
// env.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  appName: import.meta.env.VITE_APP_NAME || 'BEEHIVE',
  environment: import.meta.env.MODE,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;
```

Don't forget to create a `.env` file in the root:

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=BEEHIVE
```
