# MT5 Trading Bot Dashboard Frontend

A production-ready React 18 + TypeScript + Tailwind CSS frontend for a MetaTrader 5 trading bot dashboard with real-time Socket.IO updates, comprehensive state management, and professional trading-terminal design.

## ✨ Features

- **Authentication**: JWT-based login/register with automatic token refresh
- **Real-time Updates**: Socket.IO client for live bot, position, account, and activity updates
- **Comprehensive Dashboard**: Status cards with key metrics (balance, equity, P/L, margin, positions)
- **Live Positions Management**: View, modify SL/TP, close positions with confirmation dialogs
- **Trade History Analytics**: Realized P/L, win rate, profit factor, max drawdown, performance metrics
- **Market Analysis**: Trend detection, support/resistance levels, technical indicators, trade eligibility
- **Activity Feed**: Real-time EA events, trades, commands, and rejections
- **Bot Control**: Pause, resume, stop, and emergency stop actions
- **Settings**: Risk management, strategy selection, notification preferences
- **State Management**: Zustand for auth, bot state, settings, and notifications
- **Responsive Design**: Desktop, tablet, and mobile-optimized UI
- **Dark Trading Terminal Theme**: Professional color scheme with status indicators
- **Error Handling**: Global error boundaries, automatic 401 logout, toast notifications
- **Loading States**: Spinner components and skeleton states for better UX

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── UI.tsx           # Card, Button, Badge, Table, Modal, Input, Select
│   │   ├── Common.tsx       # Toast, ErrorBoundary, ConnectionStatus, ConfirmDialog
│   │   └── Layout.tsx       # Main sidebar layout with navigation
│   ├── pages/               # Page components
│   │   ├── AuthPages.tsx    # Login & Register pages
│   │   ├── DashboardPage.tsx
│   │   ├── PositionsPage.tsx
│   │   ├── TradeHistoryPage.tsx
│   │   ├── ActivityFeedPage.tsx
│   │   ├── MarketAnalysisPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── BotControlPage.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useApi.ts        # API fetch and mutation hooks
│   │   └── useSocket.ts     # Socket.IO connection & subscriptions
│   ├── store/               # Zustand state management
│   │   ├── authStore.ts     # Authentication state
│   │   ├── botStore.ts      # Bot and trading state
│   │   ├── settingsStore.ts # User settings
│   │   └── notificationStore.ts # Toast notifications
│   ├── utils/               # Utility functions
│   │   ├── api.ts           # Axios instance with interceptors
│   │   ├── socket.ts        # Socket.IO initialization
│   │   └── formatting.ts    # Currency, date, status formatting
│   ├── types/               # TypeScript interfaces
│   │   └── index.ts         # All type definitions
│   ├── App.tsx              # Main app with routing
│   ├── main.tsx             # Vite entry point
│   └── index.css            # Global Tailwind styles
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS theme
├── postcss.config.js        # PostCSS plugins
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies
├── .env                     # Environment variables
├── .env.example             # Environment template
└── index.html               # HTML template
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Environment Setup

Create a `.env` file in the `frontend` directory:

```bash
# .env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_IO_URL=http://localhost:3000
```

Update these URLs to match your backend API and Socket.IO server.

### Development

```bash
npm run dev
```

Starts the development server at `http://localhost:5173`

### Production Build

```bash
npm run build
```

Generates optimized production build in `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## 📦 Dependencies

### Core
- **React 18.2.0**: UI framework
- **React Router 6.20.1**: Client-side routing
- **TypeScript 5.3.3**: Type safety
- **Vite 5.0.8**: Build tool

### State Management & API
- **Zustand 4.4.7**: Lightweight state management
- **Axios 1.6.5**: HTTP client
- **Socket.IO Client 4.7.2**: Real-time updates

### Styling
- **Tailwind CSS 3.4.1**: Utility-first CSS
- **PostCSS 8.4.32**: CSS processing
- **Autoprefixer 10.4.16**: Browser prefixes

### Utilities
- **date-fns 2.30.0**: Date formatting

## 🎨 Component Library

### UI Components (`components/UI.tsx`)

- **Card**: Styled container with border and padding
- **Button**: Multiple variants (primary, secondary, danger, success) and sizes
- **Badge**: Status indicator with color variants
- **Table**: Data table with hover effects
- **Modal**: Dialog modal with close button
- **LoadingSpinner**: Animated loading indicator
- **StatCard**: Dashboard stat card with icon and trend
- **Input**: Form input with label and error support
- **Select**: Dropdown select with options

### Common Components (`components/Common.tsx`)

- **ToastContainer**: Toast notification system
- **ErrorBoundary**: Error catching React boundary
- **ConnectionStatus**: Status indicator with online/offline display
- **ConfirmDialog**: Confirmation dialog for destructive actions

### Layout (`components/Layout.tsx`)

- **MainLayout**: Sidebar navigation with main content area
- Collapsible sidebar
- User profile section
- Navigation items with active state

## 🔐 Authentication Flow

1. **Login**: Email + password → JWT token
2. **Token Storage**: localStorage for persistence
3. **API Interceptor**: Automatic token inclusion in headers
4. **401 Handling**: Auto-logout and redirect to login
5. **Protected Routes**: Route guard checks for valid user

## 🔄 Real-time Updates

Socket.IO subscriptions in `useSocket` hook:

- **botUpdate**: Bot status changes
- **positionsUpdate**: Open positions changes
- **accountUpdate**: Account balance/equity/margin updates
- **activityFeed**: EA events and trade logs

## 📊 State Management

### Auth Store (`store/authStore.ts`)
```typescript
{
  user: User | null
  isLoading: boolean
  error: string | null
  login(credentials): Promise<void>
  register(data): Promise<void>
  logout(): void
  checkAuth(): Promise<void>
}
```

### Bot Store (`store/botStore.ts`)
```typescript
{
  bot: BotStatus
  mt5: MT5Connection
  account: AccountInfo
  positions: Position[]
  trades: Trade[]
  marketAnalysis: MarketAnalysis[]
  activityFeed: ActivityFeed[]
  // ... update methods
}
```

### Settings Store (`store/settingsStore.ts`)
```typescript
{
  settings: Settings
  updateSettings(data): void
  loadSettings(): void
  resetSettings(): void
}
```

### Notification Store (`store/notificationStore.ts`)
```typescript
{
  toasts: Toast[]
  addToast(message, type, duration): void
  removeToast(id): void
}
```

## 🎯 Pages Overview

### Dashboard (`pages/DashboardPage.tsx`)
- Status cards: EA status, trading status, balance, equity, floating P/L, today's P/L, margin
- Connection status indicators
- Recent activity feed (last 10 items)
- Real-time Socket.IO updates

### Positions (`pages/PositionsPage.tsx`)
- Live positions table with all metrics
- Modify SL/TP modal
- Close position with confirmation
- Floating P/L tracking
- Risk/reward ratio display

### Trade History (`pages/TradeHistoryPage.tsx`)
- Completed trades table
- Performance metrics: total trades, win rate, profit factor, max drawdown
- Realized P/L per trade
- Duration and strategy tracking

### Market Analysis (`pages/MarketAnalysisPage.tsx`)
- Technical indicators: RSI, MACD, Bollinger Bands, Moving Averages
- Support/resistance levels
- Trend detection (bullish/bearish/sideways)
- Trade eligibility status with reasons

### Activity Feed (`pages/ActivityFeedPage.tsx`)
- Real-time events: trades, commands, errors, rejections
- Severity levels: info, warning, error, success
- Event type badges
- Timestamp and description

### Bot Control (`pages/BotControlPage.tsx`)
- Resume/Pause/Stop commands
- Emergency stop with confirmation
- Bot status and version info
- Advanced server/account information

### Settings (`pages/SettingsPage.tsx`)
- Risk management: risk per trade, daily loss limit, max drawdown, max positions
- Strategy selection
- Notification preferences: sound alerts, email alerts

## 🎨 Color Scheme (Dark Trading Terminal)

```css
/* Primary Colors */
trading-dark:        #0f172a  /* Main background */
trading-darker:      #0a0e27  /* Secondary background */
trading-card:        #1e293b  /* Card background */
trading-border:      #334155  /* Border color */
trading-text:        #e2e8f0  /* Primary text */
trading-text-muted:  #94a3b8  /* Secondary text */

/* Status Colors */
Green:   #10b981 (success, running, buy, bullish)
Red:     #ef4444 (danger, stopped, sell, bearish)
Amber:   #f59e0b (warning, paused, sideways)
Blue:    #3b82f6 (info, primary action)
```

## 📋 API Endpoints Expected

The backend should provide these endpoints:

```
POST   /api/auth/login              # Login
POST   /api/auth/register           # Register
GET    /api/bot/status              # Get bot status
POST   /api/bot/pause               # Pause bot
POST   /api/bot/resume              # Resume bot
POST   /api/bot/stop                # Stop bot
POST   /api/bot/emergency-stop      # Emergency stop
GET    /api/positions               # Get open positions
POST   /api/positions/close         # Close position
POST   /api/positions/modify        # Modify SL/TP
GET    /api/trades                  # Get trade history
GET    /api/trades/metrics          # Get performance metrics
GET    /api/market/analysis         # Get market analysis
GET    /api/activity                # Get activity feed
GET    /api/settings                # Get user settings
POST   /api/settings                # Save user settings
```

## 🔌 Socket.IO Events Expected

```javascript
// Server → Client (incoming)
socket.on('botUpdate', (data) => {...})           // Bot status
socket.on('positionsUpdate', (data) => {...})     // Positions
socket.on('accountUpdate', (data) => {...})       # Account info
socket.on('activityFeed', (data) => {...})        // Activity

// Client → Server (outgoing)
socket.emit('subscribe', { types: ['positions', 'account'] })
socket.emit('unsubscribe', { types: ['positions'] })
```

## 🛠️ Customization

### Modify Color Scheme

Edit `tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      'trading-dark': '#YOUR_COLOR',
      // ... other colors
    }
  }
}
```

### Add New Pages

1. Create page component in `src/pages/`
2. Add TypeScript types in `src/types/index.ts`
3. Add route in `src/App.tsx`
4. Add navigation link in `src/components/Layout.tsx`

### Extend Store

```typescript
// In relevant store file
interface YourStore extends BaseState {
  yourAction: () => void;
}

export const useYourStore = create<YourStore>((set) => ({
  // ... implementation
}));
```

## 📱 Responsive Breakpoints

Uses Tailwind CSS breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## 🐛 Error Handling

- **Global Error Boundary**: Catches React errors
- **API Interceptors**: Handles 401 auto-logout
- **Toast Notifications**: User-friendly error messages
- **Validation Errors**: Form-level validation with inline errors
- **Confirmation Dialogs**: Prevents accidental destructive actions

## 📈 Performance Optimization

- Code splitting via Vite
- Lazy component loading with React Router
- Memoized state updates with Zustand
- Optimized re-renders with hook dependencies
- Production build: 300.45 kB JS, 13.59 kB CSS (gzipped)

## 🔒 Security Features

- JWT token-based authentication
- Secure token storage in localStorage
- API token included in Authorization header
- CORS ready
- XSS protection via React's built-in escaping
- Confirmation dialogs for destructive actions

## 📝 Type Safety

All components and utilities are fully typed with TypeScript:
- Strict mode enabled
- No implicit any
- Exported interfaces for all data structures
- Type-safe API responses and state

## 🚢 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Services

**Vercel** (recommended for React)
```bash
npm i -g vercel
vercel
```

**Netlify**
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

**Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📚 Key Files Explained

### `src/utils/api.ts`
Axios instance with:
- Base URL configuration
- Request interceptor (adds auth token)
- Response interceptor (401 logout)

### `src/utils/socket.ts`
Socket.IO client with:
- Connection initialization
- Event subscriptions
- Auto-reconnection
- Disconnect handling

### `src/hooks/useApi.ts`
Custom hooks for:
- GET requests with loading/error states
- Mutations (POST/PUT/PATCH/DELETE)
- Toast notifications on success/error
- Automatic refetch

### `src/hooks/useSocket.ts`
Socket.IO integration:
- Auto-initialization on mount
- Store updates on events
- Cleanup on unmount

## 🎯 Best Practices Implemented

✅ Component composition and reusability  
✅ Custom hooks for logic extraction  
✅ Centralized state management  
✅ Type-safe TypeScript  
✅ Error boundaries and error handling  
✅ Loading states and skeleton screens  
✅ Responsive design  
✅ Accessibility considerations  
✅ Code splitting and optimization  
✅ Environment configuration  
✅ Protected routes  
✅ Confirmation dialogs for destructive actions  

## 🤝 Contributing

1. Follow existing code style
2. Use TypeScript for all new code
3. Add types to `src/types/index.ts`
4. Create reusable components in `src/components/`
5. Use Zustand stores for global state
6. Add custom hooks in `src/hooks/`

## 📄 License

Private / Confidential

---

**Built with React 18 + TypeScript + Tailwind CSS + Vite**
