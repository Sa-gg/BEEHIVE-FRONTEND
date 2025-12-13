# Entities

Domain entities represent the core business objects of your application.

## Example:

```typescript
// User.entity.ts
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}
```
