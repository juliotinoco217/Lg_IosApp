# Analytis iOS App

iOS clone of the analytics_LG web application using Capacitor.

## Project Structure

- **Frontend only** - This is the React frontend wrapped in Capacitor for iOS
- **Backend** - Uses deployed backend at `https://app.getlucagrey.com`
- **Database** - Supabase (shared with web app)

## Current Status

### Working
- [x] Capacitor iOS project initialized
- [x] Environment configured to point to production backend
- [x] Supabase client configured

### Needs to be Fixed

#### 1. Backend CORS Configuration (BLOCKING)
The deployed backend at `app.getlucagrey.com` does not allow requests from Capacitor iOS apps.

**Fix required in `analytics_LG/backend/src/index.ts`:**
```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'capacitor://localhost',  // ADD THIS - iOS app origin
  'ionic://localhost',      // ADD THIS - Alternative iOS origin
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];
```

Then redeploy the backend.

#### 2. Build and Sync Web Assets
After any frontend changes, must rebuild and sync to iOS:
```bash
npm run ios
# or separately:
npm run build
npx cap sync ios
```

#### 3. Open Correct Xcode File
Always open the **workspace**, not the project:
```bash
open ios/App/App.xcworkspace
```
NOT `App.xcodeproj` - the workspace includes CocoaPods dependencies.

## Environment Variables

**.env** (frontend only):
```
VITE_SUPABASE_URL=https://nrrgofvpnfbozufcipuu.supabase.co
VITE_SUPABASE_ANON_KEY=<key>
VITE_API_URL=https://app.getlucagrey.com
```

## Development Workflow

1. Make frontend changes in `src/`
2. Run `npm run build` to build the Vite app
3. Run `npx cap sync ios` to copy to iOS
4. Open `ios/App/App.xcworkspace` in Xcode
5. Build and run on simulator/device

## Key Files

- `capacitor.config.ts` - Capacitor configuration (webDir: "dist")
- `ios/App/App/` - Native iOS app code
- `ios/App/Podfile` - CocoaPods dependencies
- `src/lib/api.ts` - API client (sends auth token with requests)
- `src/config/supabase.ts` - Supabase client configuration

## Dependencies

- Capacitor 6.x
- React 19.x
- Supabase JS client
- Vite 7.x

## Related Projects

- `../analytics_LG` - Original full-stack project (frontend + backend)
- Backend deployed at: `https://app.getlucagrey.com`

---

## UI/UX Design Guidelines (Robinhood-Style)

### Design Philosophy
Inspired by Robinhood and modern fintech apps. Clean, dark, data-focused interface.

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#000000` | Pure black app background |
| `card` | `#1c1c1e` | Card backgrounds |
| `card-hover` | `#2c2c2e` | Card hover state |
| `accent` | `#ff6b35` | Primary charts, highlights |
| `accent-gold` | `#d4af37` | Secondary charts |
| `positive` | `#00c853` | Positive values, up trends |
| `negative` | `#ff5252` | Negative values, down trends |
| `text-primary` | `#ffffff` | Primary text |
| `text-secondary` | `#8e8e93` | Muted/secondary text |

### Typography Scale

```
Hero values:     text-4xl font-bold tracking-tight
Section titles:  text-xl font-semibold
Card labels:     text-sm text-gray-400
Values:          text-lg font-semibold tabular-nums
Small text:      text-xs text-muted-foreground
```

### Navigation Pattern

1. **Top Sliding Tabs** - Horizontal scrollable tabs for section navigation
   - Swipeable on mobile
   - Active tab has underline indicator
   - Tabs: KPIs | Products | Customers | Finance | Meta | Shopify | Inventory

2. **Bottom Tab Bar** (Mobile) - Quick access to main sections
   - Home, Search, Activity, Profile
   - Accent color on active tab

### Component Patterns

#### Hero Metric
- Large centered dollar amount
- Change indicator below: `+$X,XXX (X.XX%)` in green/red
- Time period label in muted text
- Optional badge

```tsx
<HeroMetric
  value="$45,230.00"
  change={{ value: 2340, percent: 5.45, direction: 'up' }}
  period="Year to date"
/>
```

#### Charts (Robinhood-Style)
- Single color (orange or gold)
- NO grid lines
- Minimal/hidden axes
- Smooth monotone curves
- Full-width in container
- Time range selector below: 1W | 1M | 3M | YTD | 1Y | ALL

#### Market Cards (Horizontal Scroll)
- Dark rounded cards
- Title + sparkline + value + change%
- Horizontal scroll section

#### List Items
- Row: icon/name + sparkline + colored badge
- Divider between items
- Optional chevron for navigation

### Dashboard Structure

Each dashboard follows this pattern:
1. **Hero Section** - Large primary metric with change indicator
2. **Chart** - Full-width line/area chart with time selector
3. **Market Cards** - Horizontal scroll of key metrics
4. **List View** - Detailed metrics with sparklines

### Spacing & Layout

```
Page padding:    p-4 (mobile) / p-6 (desktop)
Card padding:    p-4
Card radius:     rounded-xl
Card gap:        gap-4
Section gap:     space-y-6
```

### Animation Guidelines

- Smooth transitions: `transition-all duration-200`
- Chart animations: `animationDuration={500}`
- Tab transitions: slide with momentum
- Touch feedback: scale or opacity change
