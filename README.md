# Corporate Sim Game

A multiplayer corporate simulation game where players build production, retail, and service units, choose integration strategies, and compete in an hourly turn-based environment.

## Features

- **Hourly Turn-Based Gameplay**: Make strategic decisions every hour
- **Unit Management**: Build and manage production, retail, and service units
- **Integration Strategies**: Choose between vertical or horizontal integration
- **Labor Policies**: Customize your labor policy focus
- **Sector Focus**: Specialize in different business sectors

## Tech Stack

- **Frontend**: Next.js 14+ (React) with Tailwind CSS
- **Backend**: Node.js/Express with TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT-based authentication

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
psql -U username -d corporate_sim -f migrations/001_initial.sql
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
├── architecture.md    # System architecture documentation
└── README.md          # This file
```

## Development

- Frontend: `npm run dev:frontend`
- Backend: `npm run dev:backend`
- Both: `npm run dev`

## Admin APIs

Administrators (users with `is_admin = true`) can manage security via:

- `POST /api/admin/ban-ip` `{ ip, reason }` — blocks registrations/logins from an IP and flags existing accounts using it.
- `POST /api/admin/users/:id/ban` `{ reason }` — bans a specific user.
- `DELETE /api/admin/users/:id` — deletes a user account.

All admin routes require a valid JWT with admin privileges.

## License

MIT
