# Clean Architecture - Frontend Structure

## 🎯 What is Clean Architecture?

Clean Architecture is a way of organizing your code so that:
- **Each part has ONE clear job** (like organizing your room - clothes in closet, books on shelf)
- **Changes in one area don't break other areas** (changing your UI won't break your business logic)
- **Testing is easier** (you can test each part separately)
- **Your code is more maintainable** (easier to understand and modify)

Think of it like a house:
- **Presentation** = The rooms and furniture (what users see and interact with)
- **Core** = The blueprint and rules (how things should work)
- **Infrastructure** = The plumbing and electricity (connections to outside world)

## 📊 Architecture Layers (How They Talk to Each Other)

```
USER CLICKS BUTTON
      ↓
┌─────────────────────────────────────────────────────────┐
│                 PRESENTATION LAYER                       │
│         "What the user sees and clicks"                  │
│  Components, Pages, Buttons, Forms                       │
└────────────────────┬────────────────────────────────────┘
                     │ "Hey, user wants to get their profile!"
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    CORE LAYER                            │
│              "The brain/business rules"                  │
│  "OK, let me check if that's allowed and process it"    │
└────────────────────┬────────────────────────────────────┘
                     │ "Go fetch the data from the database"
                     ▼
┌─────────────────────────────────────────────────────────┐
│              INFRASTRUCTURE LAYER                        │
│         "Talks to the outside world"                     │
│  Makes actual API calls to your backend server           │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
              BACKEND SERVER
```

## 🎓 For Beginners: How to Read This Structure

**Think of your app like a restaurant:**

1. **Presentation Layer** = The dining room and waiters
   - What customers see
   - Where they interact
   - Takes orders (user clicks)

2. **Core Layer** = The kitchen rules and recipes
   - How to make each dish
   - What ingredients are needed
   - Quality standards

3. **Infrastructure Layer** = The supply deliveries
   - Gets ingredients from suppliers (API calls)
   - Stores them properly (data handling)
   - Delivers to kitchen (repositories)

## 📂 Complete Folder Structure with Examples

```
src/
├── 📁 core/                              ⭐ THE BRAIN - Business Logic
│   ├── 📁 domain/                        (The "what" your app deals with)
│   │   ├── 📁 entities/                  🎯 Your main objects
│   │   │   └── User.entity.ts            Example: { id, name, email }
│   │   │   └── Post.entity.ts            Example: { id, title, content, author }
│   │   │
│   │   └── 📁 interfaces/                🔌 Contracts/Promises
│   │       └── IUserRepository.ts        "I promise to fetch users this way"
│   │
│   └── 📁 usecases/                      🎬 Actions your app can do
│       └── GetUserUseCase.ts             "Get a user by ID"
│       └── CreatePostUseCase.ts          "Create a new post"
│
├── 📁 infrastructure/                    🔧 CONNECTIONS - Talks to outside
│   ├── 📁 api/                           🌐 Setup for talking to backend
│   │   └── apiClient.ts                  Sets up axios with your API URL
│   │
│   ├── 📁 repositories/                  📦 Actually fetches the data
│   │   └── UserRepository.ts             Makes API call: GET /api/users/123
│   │
│   └── 📁 services/                      🛠️ Other external stuff
│       └── authService.ts                Login, logout, check if logged in
│
├── 📁 presentation/                      🎨 THE FACE - What users see
│   ├── 📁 components/                    🧩 Building blocks of UI
│   │   ├── 📁 common/                    Buttons, Inputs (reuse everywhere)
│   │   │   └── Button.tsx
│   │   │   └── Input.tsx
│   │   │
│   │   ├── 📁 features/                  Specific to one feature
│   │   │   └── UserProfile/
│   │   │       └── UserAvatar.tsx
│   │   │
│   │   └── 📁 layout/                    Page structure
## 📚 Detailed Layer Guide (Read This Step by Step!)

---

### 🧠 LAYER 1: Core (`src/core/`) - THE BRAIN

**🎯 Purpose**: This is where your app's "intelligence" lives. It knows WHAT your app does, but not HOW to show it or WHERE to get data.

**Think of it as**: The recipe book in a kitchen. It knows the steps but doesn't care if you use a gas or electric stove.

#### 📦 Folder: `core/domain/entities/`
**What it is**: The "things" your app deals with. Your main objects.

**Real-world example**:
```typescript
// User.entity.ts
export interface User {
  id: string;           // Unique identifier
  name: string;         // User's name
  email: string;        // Email address
  avatar?: string;      // Optional profile picture
  createdAt: Date;      // When they joined
}
```

**When to use**: Creating a new "thing" in your app? Make it an entity!
- Building a blog? Create `Post.entity.ts`
- Building a store? Create `Product.entity.ts`

---

#### 🔌 Folder: `core/domain/interfaces/`
**What it is**: Promises/contracts about how to get data. Like a menu that promises certain dishes.

**Real-world example**:
```typescript
// IUserRepository.ts
export interface IUserRepository {
  // "I promise there's a way to get a user by ID"
  findById(id: string): Promise<User | null>;
  
  // "I promise there's a way to get all users"
  findAll(): Promise<User[]>;
  
  // "I promise there's a way to create a user"
  create(user: Omit<User, 'id'>): Promise<User>;
}
```

**When to use**: Need to fetch/save data? Define the contract here, implement later!

---

### 🔧 LAYER 2: Infrastructure (`src/infrastructure/`) - THE CONNECTIONS

**🎯 Purpose**: This layer does the "dirty work" - talking to servers, storing data, connecting to external services.

**Think of it as**: The delivery trucks and phone lines. Gets stuff from outside and brings it in.

#### 🌐 Folder: `infrastructure/api/`
**What it is**: Setup for talking to your backend server.

**Real-world example**:
```typescript
// apiClient.ts
---

### 🎨 LAYER 3: Presentation (`src/presentation/`) - THE FACE

**🎯 Purpose**: Everything the user sees and clicks. This is your React components!

**Think of it as**: The storefront window and interior design. Makes everything look good and interactive.

#### 🧩 Folder: `presentation/components/common/`
**What it is**: Reusable UI pieces you use EVERYWHERE (like LEGO blocks).

**Real-world example**:
```typescript
// Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary' 
}) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded ${
        variant === 'primary' ? 'bg-blue-600 text-white' : 'bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
};
```

**When to use**: Creating something you'll use on MULTIPLE pages? Put it here!
- Button, Input, Card, Modal, Spinner, Alert, etc.

---

#### 🎯 Folder: `presentation/components/features/`
**What it is**: Components specific to ONE feature. Not reused everywhere.

**Real-world example**:
```
features/
├── UserProfile/
│   ├── UserAvatar.tsx        (Only used in user profiles)
│   ├── UserBio.tsx           (Only used in user profiles)
│   └── UserStats.tsx         (Only used in user profiles)
└── Dashboard/
    ├── DashboardCard.tsx     (Only used in dashboard)
    └── MetricsChart.tsx      (Only used in dashboard)
```

**When to use**: Building components for a specific feature/section? Group them here!

---

#### 🏗️ Folder: `presentation/components/layout/`
**What it is**: The "frame" of your pages. Header, footer, sidebar.

**Real-world example**:
```typescript
// Header.tsx
export const Header = () => {
  return (
    <header className="bg-blue-600 text-white p-4">
      <nav className="flex justify-between">
        <h1>BEEHIVE</h1>
        <div>
          <a href="/dashboard">Dashboard</a>
          <a href="/profile">Profile</a>
        </div>
      </nav>
    </header>
  );
};
---

### 🤝 LAYER 4: Shared (`src/shared/`) - THE TOOLBOX

**🎯 Purpose**: Stuff EVERYONE can use. No dependencies on other folders.

**Think of it as**: The toolbox everyone shares. Hammers and screwdrivers anyone can grab.

#### 📌 Folder: `shared/constants/`
**What it is**: Values that NEVER change.

**Real-world example**:
```typescript
---

## 🔄 How Data Flows (The Full Journey!)

Let's trace what happens when a user clicks "View Profile":

```
1. 👆 USER CLICKS "View Profile" button
   ↓
   
2. 🎨 PRESENTATION/pages/UserProfilePage.tsx
   Component says: "I need user data!"
   ↓
   
3. 🪝 PRESENTATION/hooks/useUser.ts
   Hook says: "Let me get that for you"
   ↓
   
4. 🎬 CORE/usecases/GetUserUseCase.ts
   Use case says: "I'll handle this request"
   Checks: Is the user ID valid? ✅
   ↓
   
5. 🔌 CORE/domain/interfaces/IUserRepository.ts
   Interface says: "Repository, fetch me this user!"
   ↓
   
6. 📦 INFRASTRUCTURE/repositories/UserRepository.ts
   Repository says: "Making API call now..."
   ↓
   
7. 🌐 INFRASTRUCTURE/api/apiClient.ts
   API Client says: "GET http://localhost:3000/api/users/123"
   ↓
   
8. 🖥️ YOUR BACKEND SERVER (Node.js)
   Backend: "Here's the user data!"
   ↓
   
9. 📤 DATA COMES BACK UP THE CHAIN
   Backend → API Client → Repository → Use Case → Hook → Component
   ↓
   
10. 🎉 USER SEES THEIR PROFILE!
    Component renders: "Welcome, John Doe!"
```

### Example in Real Code:

**Step 1-2: User clicks, component needs data**
```typescript
// UserProfilePage.tsx
export const UserProfilePage = () => {
  const { user, loading } = useUser('123');  // Step 3: Call the hook
  
  if (loading) return <div>Loading...</div>;
  
  return <div>Welcome, {user.name}!</div>;
};
```

**Step 3: Hook connects everything**
---

## 🚀 Step-by-Step: Adding Your First Feature

### Example: Adding a "Posts" Feature

Let's say you want users to create and view blog posts. Here's the EXACT order:

#### Step 1: Define the Entity (What is a Post?)
```typescript
// src/core/domain/entities/Post.entity.ts
export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Step 2: Create the Interface (How to get Posts?)
```typescript
// src/core/domain/interfaces/IPostRepository.ts
import { Post } from '../entities/Post.entity';

export interface IPostRepository {
  findById(id: string): Promise<Post | null>;
  findAll(): Promise<Post[]>;
  create(post: Omit<Post, 'id'>): Promise<Post>;
  delete(id: string): Promise<void>;
}
```

#### Step 3: Create Use Cases (What can users DO with posts?)
```typescript
// src/core/usecases/GetAllPostsUseCase.ts
export class GetAllPostsUseCase {
  constructor(private postRepo: IPostRepository) {}
  
  async execute(): Promise<Post[]> {
    return await this.postRepo.findAll();
  }
}

// src/core/usecases/CreatePostUseCase.ts
export class CreatePostUseCase {
  constructor(private postRepo: IPostRepository) {}
  
  async execute(postData: Omit<Post, 'id'>): Promise<Post> {
---

## 🎓 Common Beginner Questions

### Q: "Where do I put [X]?"

**A component that's reused everywhere?**
→ `presentation/components/common/`

**A component only used in one feature?**
→ `presentation/components/features/FeatureName/`

**A page that has a URL?**
→ `presentation/pages/`

**Business logic?**
→ `core/usecases/`

**An API call?**
→ `infrastructure/repositories/`

**A helper function?**
→ `shared/utils/`

**A constant value?**
→ `shared/constants/`

**A TypeScript type?**
→ `shared/types/`

### Q: "Can [X] import from [Y]?"

✅ **Presentation** can import from **Core** and **Infrastructure**  
✅ **Infrastructure** can import from **Core**  
✅ **Anyone** can import from **Shared**  
❌ **Core** should NEVER import from **Presentation** or **Infrastructure**  
❌ **Shared** should NEVER import from anywhere  

### Q: "This seems complicated. Can I skip layers?"

Start simple! You can:
1. Start with just `presentation/` and `shared/` for small projects
2. Add `infrastructure/` when you connect to a backend
3. Add `core/` when your business logic gets complex

But following the full structure from the start will save you time later!

### Q: "Do I HAVE to use classes for use cases?"

No! You can use functions too:

```typescript
// Class style
export class GetUserUseCase {
  constructor(private repo: IUserRepository) {}
  async execute(id: string) { ... }
}

// Function style (simpler for beginners)
export const getUserUseCase = (repo: IUserRepository) => {
  return async (id: string) => {
    return await repo.findById(id);
  };
};
```

---

## 📖 Reading Order for This Project

When you come back to this code later, read in this order:

1. **`ARCHITECTURE.md`** (this file) - Understand the structure
2. **`src/core/domain/entities/`** - See what "things" exist
3. **`src/core/usecases/`** - See what actions are possible
4. **`src/presentation/pages/`** - See what pages exist
5. **`src/presentation/components/`** - See how UI is built
6. **`src/infrastructure/repositories/`** - See how data is fetched

---

## 🛠️ Next Steps to Get Started

### 1. Install Routing (to navigate between pages)
```bash
npm install react-router-dom
```

### 2. Create your first route setup
```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './presentation/pages/HomePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 3. Set up environment variables
```bash
# Create .env file
cp .env.example .env

# Edit .env with your backend URL
VITE_API_URL=http://localhost:3000/api
```

### 4. Start building your first feature!
Follow the step-by-step guide above to add your first feature.

---

## 💡 Pro Tips

1. **Start small**: Begin with one simple feature (like displaying a list)
2. **Follow the pattern**: Once you build one feature, copy the pattern for others
3. **Keep files small**: If a file gets too big, split it up
4. **Name things clearly**: `UserProfilePage.tsx` is better than `Profile.tsx`
5. **Comment your code**: Especially in use cases - explain WHY, not just WHAT
6. **Test as you go**: Build one layer, test it, then move to the next

---

## 🎯 Summary (TL;DR)

```
📂 src/
├── 🧠 core/           → Business logic (the "what" and "why")
├── 🔧 infrastructure/ → External connections (the "how to get data")
├── 🎨 presentation/   → UI and React (the "what user sees")
├── 🤝 shared/         → Helpers everyone uses
└── ⚙️  config/        → Settings

GOLDEN RULE: Data flows DOWN, never UP
Presentation → Core → Infrastructure → Backend
```

**Remember**: This structure exists to help you, not confuse you. As you build more features, the patterns will become second nature!

---

**Need help?** Read the README.md files in each folder for specific examples!

**Ready to code?** Start with `INSTRUCTIONS.md` for setup, then build your first feature! 🚀
import { Post } from '../../core/domain/entities/Post.entity';
import { apiClient } from '../api/apiClient';

export class PostRepository implements IPostRepository {
  async findAll(): Promise<Post[]> {
    const response = await apiClient.get<Post[]>('/posts');
    return response.data;
  }

  async create(post: Omit<Post, 'id'>): Promise<Post> {
    const response = await apiClient.post<Post>('/posts', post);
    return response.data;
  }
  
  // ... other methods
}
```

#### Step 5: Create Custom Hook (Connect to React)
```typescript
// src/presentation/hooks/usePosts.ts
import { useState, useEffect } from 'react';
import { Post } from '../../core/domain/entities/Post.entity';
import { GetAllPostsUseCase } from '../../core/usecases/GetAllPostsUseCase';
import { PostRepository } from '../../infrastructure/repositories/PostRepository';

export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const repo = new PostRepository();
      const useCase = new GetAllPostsUseCase(repo);
      const data = await useCase.execute();
      setPosts(data);
      setLoading(false);
    };
    
    fetchPosts();
  }, []);

  return { posts, loading };
};
```

#### Step 6: Create UI Components
```typescript
// src/presentation/components/features/Posts/PostCard.tsx
export const PostCard = ({ post }: { post: Post }) => {
  return (
    <div className="border rounded p-4">
      <h3 className="text-xl font-bold">{post.title}</h3>
      <p>{post.content}</p>
      <span className="text-sm text-gray-500">
        {formatDate(post.createdAt)}
      </span>
    </div>
  );
};
```

#### Step 7: Create the Page
```typescript
// src/presentation/pages/PostsPage.tsx
import { usePosts } from '../hooks/usePosts';
import { PostCard } from '../components/features/Posts/PostCard';
import { MainLayout } from '../components/layout/MainLayout';

export const PostsPage = () => {
  const { posts, loading } = usePosts();

  if (loading) return <div>Loading posts...</div>;

  return (
    <MainLayout>
      <h1 className="text-3xl font-bold mb-6">All Posts</h1>
      <div className="space-y-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </MainLayout>
  );
};
```

#### Step 8: Add the Route (in your router setup)
```typescript
// In your App.tsx or router config
<Route path="/posts" element={<PostsPage />} />
```

### ✅ Checklist for Every New Feature:
- [ ] Entity created in `core/domain/entities/`
- [ ] Interface created in `core/domain/interfaces/`
- [ ] Use cases created in `core/usecases/`
- [ ] Repository created in `infrastructure/repositories/`
- [ ] Hook created in `presentation/hooks/`
- [ ] Components created in `presentation/components/features/`
- [ ] Page created in `presentation/pages/`
- [ ] Route added to router
  
  return { user, loading };
};
```

**Step 4: Use case processes request**
```typescript
// GetUserUseCase.ts
export class GetUserUseCase {
  constructor(private repo: IUserRepository) {}  // Step 5
  
  async execute(userId: string) {
    if (!userId) throw new Error("ID required");
    return await this.repo.findById(userId);     // Step 6
  }
}
```

**Step 6-7: Repository makes API call**
```typescript
// UserRepository.ts
export class UserRepository implements IUserRepository {
  async findById(id: string) {
    const response = await apiClient.get(`/users/${id}`); // Step 7-8
    return response.data;  // Step 9: Return data back up
  }
}
```ort const COLORS = {
  PRIMARY: '#3B82F6',
  DANGER: '#EF4444',
  SUCCESS: '#10B981',
} as const;
```

**When to use**: Values you use in multiple places and never change!

---

#### 📝 Folder: `shared/types/`
**What it is**: TypeScript types used across your app.

**Real-world example**:
```typescript
// api.types.ts
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// common.types.ts
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface SelectOption {
  value: string;
  label: string;
}
```

**When to use**: Types you use in MULTIPLE files!

---

#### 🔨 Folder: `shared/utils/`
**What it is**: Helper functions anyone can use.

**Real-world example**:
```typescript
// formatters.ts
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

// validators.ts
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 8;
};

// Use them anywhere!
// if (isValidEmail(email)) { ... }
// const price = formatCurrency(29.99); // "$29.99"
```

**When to use**: Functions you'll use in MULTIPLE places!

**🔑 RULES for Shared Layer**:
- ✅ NO imports from other layers
- ✅ Pure functions only (same input = same output)
- ✅ Can be used ANYWHERE in the app

**When to use**: Every app needs at least one layout!

---

#### 📄 Folder: `presentation/pages/`
**What it is**: Full pages that match your routes/URLs.

**Real-world example**:
```typescript
// HomePage.tsx (shows at "/")
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/common/Button';

export const HomePage = () => {
  return (
    <MainLayout>
      <h1>Welcome to BEEHIVE!</h1>
      <p>Your productivity app</p>
      <Button variant="primary">Get Started</Button>
    </MainLayout>
  );
};

// UserProfilePage.tsx (shows at "/profile")
export const UserProfilePage = () => {
  const { user } = useUser();  // Uses custom hook
  
  return (
    <MainLayout>
      <h1>{user.name}'s Profile</h1>
      <UserAvatar src={user.avatar} />
      <UserBio bio={user.bio} />
    </MainLayout>
  );
};
```

**When to use**: One file per route!
- `/` → HomePage.tsx
- `/dashboard` → DashboardPage.tsx
- `/login` → LoginPage.tsx

---

#### 🪝 Folder: `presentation/hooks/`
**What it is**: Custom reusable React hooks. Connects your UI to your use cases.

**Real-world example**:
```typescript
// useUser.ts
import { useState, useEffect } from 'react';
import { User } from '../../core/domain/entities/User.entity';
import { GetUserUseCase } from '../../core/usecases/GetUserUseCase';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';

export const useUser = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const repository = new UserRepository();
      const useCase = new GetUserUseCase(repository);
      const data = await useCase.execute(userId);
      setUser(data);
      setLoading(false);
    };

    fetchUser();
  }, [userId]);

  return { user, loading };
};

// Use it in a component:
// const { user, loading } = useUser('123');
```

**When to use**: When multiple components need the same data/logic!

---

#### 🗄️ Folder: `presentation/store/`
**What it is**: Global state - data that MANY components need (like "who's logged in?").

**Real-world example**:
```typescript
// AuthContext.tsx
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (email, password) => {
    // Login logic
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Use anywhere:
// const { user, login, logout } = useAuth();
```

**When to use**: For data needed by many components (auth, theme, language).

**🔑 RULES for Presentation Layer**:
- ✅ ALL React code goes here
- ✅ CAN import from `core` and `infrastructure`
- ✅ Handles ALL UI and user interactions
- ❌ NO business logic (that's in `core`!)
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**When to use**: Set this up ONCE at the start, then forget about it!

---

#### 📦 Folder: `infrastructure/repositories/`
**What it is**: The ACTUAL code that fetches data from your backend. Implements the promises from `core/domain/interfaces/`.

**Real-world example**:
```typescript
// UserRepository.ts
import { IUserRepository } from '../../core/domain/interfaces/IUserRepository';
import { User } from '../../core/domain/entities/User.entity';
import { apiClient } from '../api/apiClient';

export class UserRepository implements IUserRepository {
  // Actually makes the HTTP request!
  async findById(id: string): Promise<User | null> {
    try {
      const response = await apiClient.get<User>(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      return null;
    }
  }

  async findAll(): Promise<User[]> {
    const response = await apiClient.get<User[]>('/users');
    return response.data;
  }

  async create(user: Omit<User, 'id'>): Promise<User> {
    const response = await apiClient.post<User>('/users', user);
    return response.data;
  }
}
```

**When to use**: One repository file per entity. If you have `User.entity.ts`, create `UserRepository.ts`.

---

#### 🛠️ Folder: `infrastructure/services/`
**What it is**: Other external stuff like authentication, analytics, payment processing.

**Real-world example**:
```typescript
// authService.ts
export class AuthService {
  async login(email: string, password: string): Promise<string> {
    const response = await apiClient.post('/auth/login', { email, password });
    const token = response.data.token;
    localStorage.setItem('token', token);
    return token;
  }

  logout(): void {
    localStorage.removeItem('token');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
}
```

**When to use**: For things that aren't just CRUD (Create, Read, Update, Delete) operations.

**🔑 RULES for Infrastructure Layer**:
- ✅ CAN import from `core`
- ✅ Makes ALL the API calls
- ❌ NO React components here
- ❌ NO imports from `presentation`
    if (!userId) {
      throw new Error("User ID is required");
    }
    return await this.userRepository.findById(userId);
  }
}
```

**When to use**: Every time a user does something (clicks, submits form), there should be a use case!
- User logs in → `LoginUseCase.ts`
- User creates post → `CreatePostUseCase.ts`

**🔑 RULES for Core Layer**:
- ✅ NO imports from `presentation` or `infrastructure`
- ✅ NO React code here
- ✅ NO API calls here
- ✅ ONLY business logic and rules
├── 📁 shared/                            🤝 HELPERS - Used by everyone
│   ├── 📁 constants/                     📌 Fixed values
│   │   └── routes.ts                     All your URLs in one place
│   │
│   ├── 📁 types/                         📝 TypeScript definitions
│   │   └── api.types.ts                  Common type definitions
│   │
│   └── 📁 utils/                         🔨 Helper functions
│       └── formatDate.ts                 Turn dates into pretty strings
│
├── 📁 config/                            ⚙️ SETTINGS
│   └── env.ts                            Environment variables (API URL, etc.)
│
├── 📁 assets/                            🖼️ MEDIA
│   └── logo.svg                          Images, fonts, icons
│
├── main.tsx                              🚀 START HERE - App entry point
└── index.css                             🎨 Global styles (Tailwind)
```

## Layer Responsibilities

### 1. Core Layer (`src/core/`)

**Purpose**: Contains pure business logic independent of any framework or external dependencies.

- **Entities** (`domain/entities/`): Business objects and models
- **Interfaces** (`domain/interfaces/`): Contracts for repositories and services
- **Use Cases** (`usecases/`): Application-specific business rules

**Rules**:
- ✅ Should NOT depend on any external layers
- ✅ Should NOT import from `infrastructure` or `presentation`
- ✅ Should contain only pure TypeScript/JavaScript
- ✅ Should be framework-agnostic

### 2. Infrastructure Layer (`src/infrastructure/`)

**Purpose**: Handles external communications and concrete implementations.

- **API** (`api/`): HTTP clients, axios configurations, interceptors
- **Repositories** (`repositories/`): Implements repository interfaces from core
- **Services** (`services/`): External service integrations (auth, analytics, etc.)

**Rules**:
- ✅ Implements interfaces from `core/domain/interfaces`
- ✅ Can depend on `core` layer
- ✅ Handles all external API calls
- ❌ Should NOT depend on `presentation` layer

### 3. Presentation Layer (`src/presentation/`)

**Purpose**: Everything related to UI and user interaction.

- **Components**: React components organized by purpose
- **Pages**: Route-level components
- **Hooks**: Custom React hooks
- **Store**: Global state management

**Rules**:
- ✅ Can use `core` use cases
- ✅ Can use `infrastructure` repositories via dependency injection
- ✅ Contains all React-specific code
- ❌ Should NOT contain business logic

### 4. Shared Layer (`src/shared/`)

**Purpose**: Code shared across all layers.

- **Constants**: App-wide constant values
- **Types**: Shared TypeScript types/interfaces
- **Utils**: Pure utility functions

**Rules**:
- ✅ Should contain only pure functions/constants
- ✅ Should have NO dependencies on other layers
- ✅ Should be highly reusable

## Data Flow

```
User Interaction
      ↓
  Component (Presentation)
      ↓
  Custom Hook (Presentation)
      ↓
  Use Case (Core)
      ↓
  Repository Interface (Core)
      ↓
  Repository Implementation (Infrastructure)
      ↓
  API Client (Infrastructure)
      ↓
  Backend API
```

## Example: User Feature

```
src/
├── core/
│   ├── domain/
│   │   ├── entities/
│   │   │   └── User.entity.ts
│   │   └── interfaces/
│   │       └── IUserRepository.ts
│   └── usecases/
│       ├── GetUserUseCase.ts
│       └── CreateUserUseCase.ts
│
├── infrastructure/
│   ├── api/
│   │   └── apiClient.ts
│   └── repositories/
│       └── UserRepository.ts
│
└── presentation/
    ├── components/
    │   └── features/
    │       └── UserProfile/
    │           ├── UserAvatar.tsx
    │           └── UserInfo.tsx
    ├── hooks/
    │   └── useUser.ts
    └── pages/
        └── UserProfilePage.tsx
```

## Benefits of This Architecture

1. **Separation of Concerns**: Each layer has a clear responsibility
2. **Testability**: Business logic is isolated and easy to test
3. **Maintainability**: Changes in one layer don't affect others
4. **Scalability**: Easy to add new features following the same pattern
5. **Framework Independence**: Core logic is not tied to React
6. **Reusability**: Components and logic can be easily reused
7. **Team Collaboration**: Clear structure helps teams work independently

## Development Guidelines

### Adding a New Feature

1. **Define Entity** in `core/domain/entities/`
2. **Create Interface** in `core/domain/interfaces/`
3. **Implement Use Cases** in `core/usecases/`
4. **Create Repository** in `infrastructure/repositories/`
5. **Build UI Components** in `presentation/components/features/`
6. **Create Custom Hooks** in `presentation/hooks/`
7. **Add Page Component** in `presentation/pages/`

### Dependency Rules

- **Core** → Dependencies: NONE
- **Infrastructure** → Dependencies: Core
- **Presentation** → Dependencies: Core, Infrastructure (via DI)
- **Shared** → Dependencies: NONE

### Best Practices

1. **Keep components small and focused**
2. **Use dependency injection** for repositories in hooks
3. **Keep business logic in use cases**, not components
4. **Use TypeScript interfaces** for all contracts
5. **Write unit tests** for use cases and utilities
6. **Use custom hooks** to connect UI with use cases
7. **Keep state management simple** - use Context API unless you need more

## Integration with Backend

When you create your Node.js backend:

1. Update API client configuration in `src/infrastructure/api/`
2. Implement repositories to match your API endpoints
3. Ensure entities match your backend models
4. Use environment variables for API URL configuration

```typescript
// src/config/env.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
};
```

```env
# .env
VITE_API_URL=http://localhost:3000/api
```

## 🛣️ Routing in Clean Architecture

### Setup and Structure

Routes are defined in `src/presentation/routes/index.tsx` following clean architecture principles.

**Folder Structure:**
```
presentation/
├── routes/
│   ├── index.tsx          # Main router configuration
│   ├── guards/            # Route protection (future)
│   └── README.md          # Routing documentation
└── pages/
    ├── client/            # Public pages (HomePage, MenuPage, etc.)
    ├── auth/              # Auth pages (LoginPage, RegisterPage)
    ├── admin/             # Protected admin pages (DashboardPage, etc.)
    └── error/             # Error pages (NotFoundPage)
```

### How Routing Works

```
USER VISITS URL
      ↓
┌─────────────────────────────────────────────────────────┐
│                  REACT ROUTER                            │
│         Matches URL to route configuration               │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│                  MAIN LAYOUT                             │
│         Wraps all pages with <Outlet />                  │
│         Provides loading fallback                        │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│              SPECIFIC LAYOUT                             │
│    ClientLayout (header/footer)                          │
│    AuthLayout (centered card)                            │
│    AdminLayout (sidebar/topbar)                          │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│                    PAGE CONTENT                          │
│    HomePage, LoginPage, DashboardPage, etc.             │
└─────────────────────────────────────────────────────────┘
```

### Route Examples

**Public Routes** (accessible to everyone):
```
/              → HomePage (ClientLayout)
/menu          → MenuPage (ClientLayout)
/about         → AboutPage (ClientLayout)
```

**Auth Routes** (login/signup):
```
/login         → LoginPage (AuthLayout)
/register      → RegisterPage (AuthLayout)
```

**Admin Routes** (protected, requires auth):
```
/admin         → DashboardPage (AdminLayout)
/admin/pos     → POSPage (AdminLayout)
/admin/orders  → OrdersPage (AdminLayout)
```

### Navigation Methods

**1. Declarative (using Link/anchor tags):**
```tsx
// In components
<a href="/menu">View Menu</a>

// Or with React Router Link (better for SPAs)
import { Link } from 'react-router-dom'
<Link to="/menu">View Menu</Link>
```

**2. Programmatic (using navigate):**
```tsx
import { useNavigate } from 'react-router-dom'

const MyComponent = () => {
  const navigate = useNavigate()
  
  const handleClick = () => {
    navigate('/admin/dashboard')
  }
}
```

### Lazy Loading (Performance)

Pages are lazy-loaded for better performance:
```tsx
const HomePage = lazy(() => 
  import('../pages/client/HomePage').then(m => ({ default: m.HomePage }))
)
```

This means:
- Pages only load when visited
- Faster initial load time
- Better performance

### Future: Route Guards

To protect admin routes, create guards:

```tsx
// routes/guards/AuthGuard.tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/presentation/hooks/useAuth'

export const AuthGuard = ({ children }) => {
  const { isAuthenticated } = useAuth()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

// Then wrap admin routes:
{
  path: 'admin',
  element: <AuthGuard><AdminLayout /></AuthGuard>,
  children: [...]
}
```

## Next Steps

1. ✅ Routing is set up with React Router DOM
2. Add state management if needed: `npm install zustand` or use Context API
3. Configure API client with your backend URL
4. Start building features following the architecture patterns
5. Add authentication flow in `infrastructure/services/authService.ts`
6. Create route guards for protected routes

---

**Remember**: This architecture is flexible. Adapt it to your specific needs while maintaining the core principles of separation of concerns and dependency management.
