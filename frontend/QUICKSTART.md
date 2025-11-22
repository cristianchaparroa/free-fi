# FreeFi Frontend - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Upgrade Node.js (Required)

Your current Node.js version (18.20.4) is too old for Next.js 16.

**Option A: Using nvm (Recommended)**
```bash
# Install nvm if you don't have it
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart your terminal, then:
nvm install 20
nvm use 20
nvm alias default 20
```

**Option B: System-wide upgrade**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify installation:
```bash
node --version  # Should show v20.x.x or higher
```

### Step 2: Install Dependencies

```bash
cd /home/hackwy/frontend/free-fi/frontend
npm install
```

### Step 3: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎨 What You'll See

### Landing Page (Default)
- Animated 3D crypto globe with rotating symbols
- "GLOBAL SAVINGS PROTOCOLS" hero section
- Three feature cards: Gasless, Cross-Chain, Auto-Optimized
- Live market rates showing best APY
- FreeFi vs Legacy DeFi comparison
- "Connect Wallet" button

### Dashboard (After Clicking Connect)
- Portfolio balance: $5,247.89 USDC
- Earnings display: +$47.89 (0.92%)
- Active strategy: Compound Arbitrum at 12.3% APY
- Deposit operations panel
- Withdraw operations panel
- Yield performance chart
- Event log with transaction history

## 🎯 Key Features to Test

### 1. Animated Globe
- Watch the 3D crypto symbols rotate
- See Ξ (Ethereum) symbols in blue
- See $ (USDC) symbols in turquoise
- Notice the orbital data ring animation

### 2. Responsive Design
Try resizing your browser window:
- Desktop: Full layout with side-by-side panels
- Tablet: Stacked layouts
- Mobile: Single column, optimized for touch

### 3. Interactive Elements
- Hover over feature cards
- Click "Connect Wallet" to toggle views
- Type in deposit amount field
- Hover over buttons for effects
- Scroll the event log

## 📁 Project Structure

```
frontend/src/
├── app/
│   ├── page.tsx           ← Main app entry
│   └── globals.css        ← Styles with Dragonfly palette
├── components/
│   ├── ui/                ← Reusable UI components
│   ├── landing/           ← Landing page view
│   └── dashboard/         ← Dashboard view & panels
└── types/
    └── index.ts           ← TypeScript definitions
```

## 🎨 Design System

### Colors
- **Ethereum Blue**: `#5B8FFF` - Primary brand color
- **USDC Turquoise**: `#2DD4BF` - Success/yield indicators
- **Warning Gold**: `#F4B944` - Alerts and highlights
- **Background**: `#0F1419` - Deep dark background

### Typography
- **Font**: Geist Mono (monospace)
- **Style**: Technical, financial, modern

### Components
- **BracketBox**: Wireframe containers with corner brackets
- **Badge**: Color-coded status indicators
- **CryptoGlobe**: Animated 3D background

## 🛠️ Development Commands

```bash
# Development server (with hot reload)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type checking
npx tsc --noEmit

# Lint code
npm run lint
```

## 🔧 Customization

### Change Globe Symbol Count
Edit `src/components/ui/CryptoGlobe.tsx`:
```typescript
const numPoints = 450; // Reduce for better performance
```

### Modify Color Palette
Edit `src/app/page.tsx`:
```typescript
const theme: Theme = {
  brand: '#5B8FFF',    // Change to your brand color
  success: '#2DD4BF',  // Change success color
  // ...
};
```

### Update Mock Data
- **Balance**: Edit `src/components/dashboard/DashboardView.tsx`
- **Market Rates**: Edit `src/components/landing/LandingView.tsx`
- **Events**: Edit `src/components/dashboard/EventLog.tsx`

## 🐛 Troubleshooting

### Port 3000 Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### "Cannot find module" Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json .next
npm install
```

### Tailwind Classes Not Working
Verify `globals.css` has:
```css
@import "tailwindcss";
```

### TypeScript Errors
```bash
# Check for type errors
npx tsc --noEmit
```

## 📱 Mobile Testing

### Using Browser DevTools
1. Open DevTools (F12)
2. Click device icon (Ctrl+Shift+M)
3. Select device (iPhone, iPad, etc.)

### Using ngrok (Access from Real Phone)
```bash
# Install ngrok
npm install -g ngrok

# In one terminal:
npm run dev

# In another terminal:
ngrok http 3000

# Use the https URL on your phone
```

## 🔜 Next Steps

### Phase 1: Web3 Integration
1. Install wagmi and viem
2. Add wallet connection logic
3. Replace mock data with blockchain data

### Phase 2: Smart Contracts
1. Connect to FreeFi contracts
2. Implement deposit functionality
3. Implement withdrawal functionality

### Phase 3: Real Data
1. Fetch real APY rates from protocols
2. Display actual transaction history
3. Show live balances

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 💡 Tips

1. **Hot Reload**: Changes auto-refresh in dev mode
2. **Component Isolation**: Each component is self-contained
3. **Type Safety**: All components have TypeScript interfaces
4. **Responsive First**: Test on mobile early
5. **Performance**: Use Chrome DevTools Performance tab

## ✨ Features Checklist

- [x] Animated 3D crypto globe
- [x] Landing page with hero section
- [x] Dashboard with portfolio metrics
- [x] Deposit/withdraw panels
- [x] Yield performance chart
- [x] Event log timeline
- [x] Responsive design
- [x] TypeScript types
- [x] Component documentation
- [ ] Web3 wallet connection
- [ ] Real blockchain data
- [ ] Transaction functionality

---

**Ready to code!** 🚀

Start the dev server and visit http://localhost:3000
