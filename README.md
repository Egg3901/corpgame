# Corporate Warfare Game

A multiplayer corporate simulation game where players build production, retail, and service units across different economic sectors, manage supply chains, and compete in an hourly turn-based environment.

## Features

### Core Gameplay
- **Hourly Turn-Based Gameplay**: Strategic decisions update every hour via cron jobs
- **Multi-Sector Economy**: Operate in 16 different sectors (Technology, Defense, Energy, Manufacturing, etc.)
- **Unit Management**: Build and manage extraction, production, retail, and service units
- **Corporation Focus**: Choose between extraction, production, retail, service, or diversified strategies
- **State Markets**: Operate in different US states with unique resource availability and market conditions

### Economic System
- **Supply Chain Dynamics**: 
  - Extraction units extract commodities (Oil, Steel, Rare Earth, etc.)
  - Production units consume commodities and produce products
  - Retail/Service units consume products to generate revenue
- **Dynamic Pricing**: Commodity and product prices fluctuate based on supply and demand
- **Resource Scarcity**: State-level resource pools affect production efficiency
- **Product Demands**: Retail and service units require specific products to operate (e.g., Defense retail needs Defense Equipment, Defense service needs both Tech Products and Defense Equipment)

### Strategic Elements
- **Vertical Integration**: Control your supply chain from extraction to retail
- **Horizontal Expansion**: Build market presence across multiple states
- **Sector Restrictions**: Some sectors can only build certain unit types (e.g., Technology/Manufacturing cannot build retail/service)
- **Capital Management**: Balance investment in expansion vs. operational costs

### Social Features
- **Stock Market**: Trade corporation shares with other players
- **User Profiles**: Customizable avatars and player profiles
- **Messaging System**: In-game communication between players
- **Admin Tools**: IP banning, user management, and moderation features

## Tech Stack

- **Frontend**: Next.js 14+ (React) with Tailwind CSS
- **Backend**: Node.js/Express with TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT-based authentication

## Game Economy

### Supply Chain Flow
```
Extraction Units
    ↓ Extract
Commodities (Oil, Steel, Copper, Rare Earth, Lumber, Fertile Land, Chemical Compounds)
    ↓ Consumed by
Production Units
    ↓ Produce
Products (Tech Products, Manufactured Goods, Electricity, Food Products, Defense Equipment, etc.)
    ↓ Demanded by
Retail & Service Units + Other Production Units
    ↓ Generate
Revenue & Profit
```

### Unit Types

1. **Extraction Units**: Extract raw commodities from state resource pools
   - Revenue from selling commodities at market prices
   - Cost: Labor only
   - Limited by resource availability in each state

2. **Production Units**: Convert commodities into products
   - Revenue from selling products
   - Cost: Labor + commodity inputs
   - Require resources (e.g., Tech production needs Rare Earth)

3. **Retail Units**: Sell products to consumers
   - Revenue from consumer sales (fixed)
   - Cost: Labor + product inputs (e.g., Defense retail needs Defense Equipment)
   - **Disabled** in Technology and Manufacturing sectors

4. **Service Units**: Provide services using products
   - Revenue from service fees (fixed)
   - Cost: Labor + product inputs (e.g., Defense service needs Tech + Defense Equipment)
   - **Disabled** in Technology and Manufacturing sectors

### Sector Examples

- **Defense**: Production needs Steel → produces Defense Equipment → retail/service consume Defense Equipment
- **Technology**: Production needs Rare Earth → produces Tech Products → other sectors consume Tech
- **Energy**: Production needs Oil → produces Electricity → retail/service consume Electricity
- **Agriculture**: Extraction produces Food Products → retail/service consume Food Products

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+

### Installation

1. Install dependencies:
```bash
npm run install:all
```

2. Set up environment variables:

Create `backend/.env`:
```
DATABASE_URL=postgresql://username:password@localhost:5432/corporate_sim
JWT_SECRET=your-secret-key-here
REGISTRATION_SECRET=choose-a-shared-registration-code
ADMIN_SECRET=optional-admin-code
PORT=3001
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. Run database migrations:
```bash
cd backend
npm run migrate
```

4. Start development servers:
```bash
npm run dev
```

This will start:
- Backend API server on http://localhost:3001
- Frontend Next.js app on http://localhost:3000

## Project Structure

```
corporate-sim/
├── frontend/          # Next.js frontend application
├── backend/           # Express API server
├── dev/               # Development documentation and tracking
│   ├── docs/          # Unified technical documentation
│   │   ├── README.md           # Documentation hub
│   │   ├── architecture.md     # System architecture
│   │   ├── game-mechanics.md   # Game rules and formulas
│   │   └── deployment.md       # Deployment guide
│   ├── fids/          # Feature Implementation Documents
│   ├── progress.md    # Development progress
│   └── ...            # Other tracking files
├── INSTRUCTIONS.md    # ECHO development protocol
└── README.md          # This file
```

## Development

- Frontend: `npm run dev:frontend`
- Backend: `npm run dev:backend`
- Both: `npm run dev`

## Documentation

**All comprehensive documentation has been unified under `dev/docs/`:**

- **[📚 Documentation Hub](dev/docs/README.md)** - Navigation hub for all documentation
- **[🏗️ Architecture](dev/docs/architecture.md)** - System architecture, tech stack, database schema, API endpoints
- **[🎮 Game Mechanics](dev/docs/game-mechanics.md)** - Game rules, formulas, pricing systems, unit economics
- **[🚀 Deployment](dev/docs/deployment.md)** - Complete deployment guide (local, production, PM2, AWS)

**Development Workflow:**
- **[INSTRUCTIONS.md](INSTRUCTIONS.md)** - ECHO v1.4.0 development protocol

## Admin APIs

Administrators (users with `is_admin = true`) can manage security via:

- `POST /api/admin/ban-ip` `{ ip, reason }` — blocks registrations/logins from an IP and flags existing accounts using it.
- `POST /api/admin/users/:id/ban` `{ reason }` — bans a specific user.
- `DELETE /api/admin/users/:id` — deletes a user account.

All admin routes require a valid JWT with admin privileges.

For detailed deployment instructions, see the **[Deployment Guide](dev/docs/deployment.md)**.

## License

MIT

