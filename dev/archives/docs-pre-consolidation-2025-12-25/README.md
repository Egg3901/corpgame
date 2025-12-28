# Archived Documentation (Pre-Consolidation)

**Archive Date**: December 25, 2025
**Reason**: Documentation consolidation into unified structure under `dev/docs/`

## Files Archived

The following files were archived and consolidated into the new unified documentation:

| Old File | New Location | Description |
|----------|--------------|-------------|
| `architecture.md` | `dev/docs/architecture.md` | System architecture documentation |
| `gamerulesandformulas.md` | `dev/docs/game-mechanics.md` | Game rules and formulas |
| `DEPLOYMENT_GUIDE.md` | `dev/docs/deployment.md` | AWS deployment guide |
| `PM2_GUIDE.md` | `dev/docs/deployment.md` | PM2 process management (merged) |
| `STARTUP_GUIDE.md` | `dev/docs/deployment.md` | Startup guide (merged) |

## What Changed

### Consolidation Benefits

1. **Single Source of Truth**: All technical documentation now lives in `dev/docs/`
2. **Better Navigation**: Documentation hub at `dev/docs/README.md` provides easy access
3. **Reduced Duplication**: Merged related guides (deployment, PM2, startup) into comprehensive docs
4. **Clearer Structure**: Separation between technical docs and development tracking

### New Structure

```
dev/
├── docs/                          # Unified technical documentation
│   ├── README.md                  # Documentation navigation hub
│   ├── architecture.md            # System architecture
│   ├── game-mechanics.md          # Game rules and formulas
│   └── deployment.md              # Complete deployment guide
├── fids/                          # Feature Implementation Documents
├── progress.md                    # Development progress
└── archives/                      # Archived documentation
    └── docs-pre-consolidation-2025-12-25/  # This archive
```

## How to Access New Documentation

- **Main Hub**: [dev/docs/README.md](../../docs/README.md)
- **Architecture**: [dev/docs/architecture.md](../../docs/architecture.md)
- **Game Mechanics**: [dev/docs/game-mechanics.md](../../docs/game-mechanics.md)
- **Deployment**: [dev/docs/deployment.md](../../docs/deployment.md)

## Migration Notes

- Root `README.md` updated to point to `dev/docs/`
- `dev/architecture.md` now redirects to new location
- All content preserved and enhanced with better organization
- Cross-references updated to new structure

## Archived Files Status

These files are kept for historical reference only. For current documentation, always refer to `dev/docs/`.
