# Corporate Warfare - Documentation Hub

Welcome to the unified documentation for the Corporate Warfare game project. All technical documentation has been consolidated here for easy access.

## Quick Navigation

### Core Documentation

- **[Architecture](architecture.md)** - Complete system architecture, technology stack, database schema, API endpoints, and technical decisions
- **[Game Mechanics](game-mechanics.md)** - Game rules, formulas, pricing systems, unit economics, and gameplay mechanics
- **[Deployment](deployment.md)** - Comprehensive deployment guide covering local development, production deployment, PM2 management, and AWS setup

### Development Tracking

Located in the parent `dev/` directory:

- **[Progress](../progress.md)** - Current development progress and recent work
- **[Completed](../completed.md)** - Completed features and implementations
- **[Planned](../planned.md)** - Planned features and roadmap items
- **[Issues](../issues.md)** - Known issues and bugs
- **[FIDs](../fids/)** - Feature Implementation Documents (detailed specs)

### Development Workflow

- **[INSTRUCTIONS.md](../../INSTRUCTIONS.md)** - ECHO v1.4.0 development protocol (root level)
- **[Decisions](../decisions.md)** - Technical decisions and rationale
- **[Lessons Learned](../lessons-learned.md)** - Development insights and best practices

## Document Structure

```
dev/
├── docs/                          # Unified technical documentation (you are here)
│   ├── README.md                  # This navigation file
│   ├── architecture.md            # System architecture and design
│   ├── game-mechanics.md          # Game rules and formulas
│   └── deployment.md              # Deployment and operations guide
│
├── fids/                          # Feature Implementation Documents
├── progress.md                    # Development progress tracking
├── completed.md                   # Completed features log
├── planned.md                     # Planned features and roadmap
└── ...                            # Other tracking files
```

## Getting Started

### For Developers

1. Start with **[Architecture](architecture.md)** to understand the system design
2. Review **[INSTRUCTIONS.md](../../INSTRUCTIONS.md)** for the ECHO development protocol
3. Check **[Progress](../progress.md)** for current work status
4. Browse **[FIDs](../fids/)** for detailed feature specifications

### For Deployment

1. Read **[Deployment](deployment.md)** for complete deployment instructions
2. Follow the Quick Start section for local development
3. Use the AWS Deployment section for production setup
4. Reference the Troubleshooting section for common issues

### For Game Design

1. Review **[Game Mechanics](game-mechanics.md)** for all game rules
2. Check **[Architecture](architecture.md)** for data models and API endpoints
3. See **[Planned](../planned.md)** for upcoming features

## Common Tasks

| Task | Documentation |
|------|---------------|
| Start local development | [Deployment - Quick Start](deployment.md#quick-start---development) |
| Deploy to production | [Deployment - Production Deployment](deployment.md#production-deployment) |
| Understand game pricing | [Game Mechanics - Pricing Systems](game-mechanics.md#pricing-systems) |
| Review API endpoints | [Architecture - API Endpoints](architecture.md#api-endpoints) |
| Setup environment variables | [Deployment - Environment Variables](deployment.md#environment-variables) |
| Troubleshoot PM2 issues | [Deployment - PM2 Process Management](deployment.md#pm2-process-management) |
| Deploy to AWS | [Deployment - AWS Deployment](deployment.md#aws-deployment) |

## Version History

- **v1.0** (2025-12-25): Initial unified documentation structure
  - Consolidated architecture.md from root
  - Consolidated game rules from gamerulesandformulas.md
  - Consolidated deployment guides (DEPLOYMENT_GUIDE.md, PM2_GUIDE.md, STARTUP_GUIDE.md)
  - Created unified documentation hub

---

**Last Updated**: December 25, 2025
