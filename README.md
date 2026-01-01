# 🏢 Corporate Warfare - Multiplayer Business Strategy Game

[![TypeScript](https://img.shields.io/badge/TypeScript-0_errors-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-209%2F209_passing-success?logo=vitest)](https://vitest.dev/)
[![Accessibility](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA-success?logo=w3c)](https://www.w3.org/WAI/WCAG2AA-Conformance)
[![Quality](https://img.shields.io/badge/Quality_Score-100%2F100-success?logo=github)](https://github.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **A deep multiplayer corporate simulation game where players build business empires, compete in stock markets, manage complex supply chains, and engage in strategic corporate warfare.**

🎮 **[Play Now](http://localhost:3000)** • 📚 **[Documentation](docs/)** • 🐛 **[Report Bug](https://github.com/yourusername/corpgame/issues)** • 💡 **[Request Feature](https://github.com/yourusername/corpgame/issues)**

---

## ✨ Features

### 🏭 **Core Gameplay**
- **Corporation Management** - Build and manage multinational corporations across 12+ industries
- **Stock Market Trading** - Real-time stock exchange with dynamic pricing algorithms
- **Supply Chain Simulation** - Complex production chains with 40+ commodities and products
- **Board of Directors** - Corporate governance with voting systems and proposals
- **Corporate Actions** - Dividends, stock splits, capital raises, and more
- **Loan System** - Banking and financial management with interest calculations
- **Real Estate** - Property ownership and management
- **Government Simulation** - Political systems with states, policies, and elections

### 💼 **Advanced Features**
- **Multi-Industry Operations** - Finance, Manufacturing, Energy, Technology, Healthcare, Media, and more
- **Economic Simulation** - Supply/demand dynamics, market cycles, and economic indicators
- **Multiplayer Interactions** - Compete, collaborate, or dominate other players
- **Portfolio Management** - Track investments, analyze performance, visualize gains/losses
- **Messaging System** - In-game communication between players
- **Admin Tools** - Comprehensive game management and moderation

### 🎨 **User Experience**
- **Modern UI** - Built with HeroUI v2 (React Aria foundation) for accessibility
- **Dark/Light Themes** - Customizable appearance with multiple theme options
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- **Real-time Updates** - Live data synchronization and instant feedback
- **Accessibility First** - WCAG 2.1 AA compliant, screen reader friendly

---

## 🏆 Quality Metrics

This project maintains **AAA quality standards** with comprehensive testing, documentation, and professional development practices:

| Metric | Score | Status |
|--------|-------|--------|
| **Overall Quality** | 100/100 | ✅ Perfect |
| **TypeScript Compilation** | 0 errors | ✅ Strict mode |
| **Test Coverage** | 209/209 passing | ✅ 100% pass rate |
| **Accessibility** | 95+/100 | ✅ WCAG 2.1 AA |
| **API Validation** | 82/82 routes | ✅ Zod schemas |
| **HeroUI Compliance** | 95%+ | ✅ Consistent |
| **Documentation** | Comprehensive | ✅ 8+ docs |
| **Security** | Production-ready | ✅ OWASP compliant |

---

## 🏗️ Technology Stack

### **Frontend**
- **Framework**: Next.js 14 (App Router, React Server Components)
- **UI Library**: HeroUI v2 (React Aria foundation)
- **Styling**: Tailwind CSS v3
- **Language**: TypeScript (strict mode)
- **State Management**: React Context + Custom Hooks
- **Charts**: Recharts for data visualization

### **Backend**
- **Runtime**: Node.js 18+
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Custom JWT implementation with secure token refresh
- **Validation**: Zod schemas on all 82 API routes
- **Middleware**: Rate limiting, CORS, security headers, request logging
- **API**: RESTful with comprehensive error handling

### **Development**
- **Testing**: Vitest with 209 comprehensive tests
- **Code Quality**: ESLint, TypeScript strict mode
- **Documentation**: Markdown docs, JSDoc comments, ADRs
- **Version Control**: Git with conventional commits
- **Development System**: ECHO v1.3.4 protocol for quality assurance

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18 or higher
- **MongoDB** (local installation or Atlas cloud)
- **npm** or **yarn** package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/corpgame.git
   cd corpgame
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/corpgame
   JWT_SECRET=your-super-secret-jwt-key
   JWT_REFRESH_SECRET=your-refresh-secret-key
   NEXTAUTH_SECRET=your-nextauth-secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Initialize database**
   ```bash
   npm run db:reset
   ```
   This seeds the database with:
   - 12 industry sectors
   - 51 US states
   - Sample corporations
   - Initial commodity prices
   - Admin user account

5. **Start development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) and sign in with:
   - **Username**: `admin`
   - **Password**: `password` (change immediately!)

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Build optimized production bundle |
| `npm run start` | Start production server |
| `npm test` | Run Vitest test suite (209 tests) |
| `npm run lint` | Run ESLint code quality checks |
| `npm run db:reset` | Reset and seed database with initial data |
| `npm run typecheck` | Run TypeScript compiler (no emit) |

---

## 📁 Project Structure

```
corpgame/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (82 endpoints)
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── corporations/         # Corporation management
│   │   ├── shares/               # Stock trading
│   │   ├── loans/                # Loan system
│   │   ├── commodity/            # Commodity trading
│   │   ├── product/              # Product management
│   │   └── admin/                # Admin operations
│   ├── (authenticated pages)/    # Protected routes
│   │   ├── home/                 # Dashboard
│   │   ├── portfolio/            # Investment tracking
│   │   ├── stock-market/         # Trading interface
│   │   ├── corporation/          # Corp management
│   │   ├── messages/             # Player messaging
│   │   └── profile/              # User profiles
│   └── (public pages)/           # Open routes
│       ├── login/                # Authentication
│       └── register/             # User registration
├── components/                   # React components
│   ├── shared/                   # Reusable UI components
│   ├── corporation/              # Corp-specific components
│   ├── stock-market/             # Trading components
│   └── admin/                    # Admin components
├── lib/                          # Core business logic
│   ├── db/                       # Database configuration
│   │   └── models/               # Mongoose models (20+ models)
│   ├── validations/              # Zod validation schemas
│   ├── services/                 # Business logic services
│   ├── middleware/               # Express-style middleware
│   ├── utils/                    # Helper utilities
│   └── constants/                # Game constants and config
├── hooks/                        # Custom React hooks
├── tests/                        # Vitest test suite
├── docs/                         # Project documentation
│   ├── API_OVERVIEW.md          # Complete API reference
│   ├── MIDDLEWARE_GUIDE.md      # Middleware documentation
│   ├── adr/                     # Architecture Decision Records
│   └── *.md                     # Completion reports, guides
├── dev/                          # Development tracking (ECHO)
│   ├── completed.md             # Completed features
│   ├── progress.md              # Active work
│   ├── planned.md               # Planned features
│   ├── architecture.md          # System architecture
│   └── fids/                    # Feature Implementation Docs
├── scripts/                      # Utility scripts
│   ├── dev-audit.ps1           # Development audit tool
│   ├── master-reset.js         # Database reset/seed
│   └── seed-*.js               # Data seeding scripts
├── public/                       # Static assets
├── CONTRIBUTING.md              # Contribution guidelines
├── CODE_REVIEW_CHECKLIST.md    # Review standards
└── README.md                    # This file
```

---

## 🎮 Gameplay Overview

### **Getting Started**
1. **Register Account** - Create your player profile
2. **Start Corporation** - Found your first company in any industry
3. **Manage Operations** - Hire employees, purchase resources, produce goods
4. **Trade Stocks** - Buy and sell shares on the stock exchange
5. **Expand Empire** - Grow across multiple industries and markets

### **Core Loops**
- **Production Cycle**: Buy commodities → Manufacture products → Sell to market
- **Trading Loop**: Analyze stocks → Buy low → Sell high → Build portfolio
- **Corporate Growth**: Reinvest profits → Expand operations → Increase valuation
- **Competition**: Outmaneuver rivals → Dominate industries → Become economic powerhouse

### **Industries Available**
- 💰 Finance & Banking
- 🏭 Manufacturing
- ⚡ Energy (Oil, Gas, Renewables)
- 💻 Technology & Software
- 🏥 Healthcare & Pharmaceuticals
- 📰 Media & Entertainment
- 🍔 Food & Beverage
- 🏪 Retail & E-commerce
- 🏗️ Construction & Real Estate
- 🚗 Transportation & Logistics
- 📞 Telecommunications
- 🔬 Research & Development

---

## 📚 Documentation

Comprehensive documentation is available in the [`/docs`](docs/) directory:

### **Getting Started**
- [`CONTRIBUTING.md`](CONTRIBUTING.md) - How to contribute to the project
- [`CODE_REVIEW_CHECKLIST.md`](CODE_REVIEW_CHECKLIST.md) - Review standards

### **API Documentation**
- [`docs/API_OVERVIEW.md`](docs/API_OVERVIEW.md) - Complete API reference with examples
- [`docs/MIDDLEWARE_GUIDE.md`](docs/MIDDLEWARE_GUIDE.md) - Middleware configuration
- [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md) - Auth system documentation

### **Architecture**
- [`docs/adr/001-mongodb-database.md`](docs/adr/001-mongodb-database.md) - Database choice
- [`docs/adr/002-heroui-v2-component-library.md`](docs/adr/002-heroui-v2-component-library.md) - UI framework
- [`docs/adr/003-nextjs-14-app-router.md`](docs/adr/003-nextjs-14-app-router.md) - Framework decision

### **Development**
- [`dev/README.md`](dev/README.md) - Development tracking system
- [`dev/QUICK_START.md`](dev/QUICK_START.md) - Project status and next steps

---

## 🧪 Testing

This project maintains **100% test pass rate** with comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Test Suite Coverage:**
- ✅ Authentication & Authorization (JWT, sessions)
- ✅ Trading Operations (buy, sell, transfers)
- ✅ Financial Calculations (revenue, profit, valuation)
- ✅ Corporate Actions (dividends, splits, raises)
- ✅ API Validation (Zod schema testing)
- ✅ Sorting & Filtering (table operations)

**209 tests across 15 test files** ensure reliability and prevent regressions.

---

## 🔒 Security

Security is a top priority with multiple layers of protection:

- **Authentication**: Secure JWT implementation with token refresh
- **Rate Limiting**: Token bucket algorithm prevents API abuse
- **CORS**: Configured origin whitelist for cross-origin requests
- **Security Headers**: OWASP-compliant headers (HSTS, CSP, X-Frame-Options)
- **Input Validation**: Zod schemas validate all API inputs
- **SQL Injection**: MongoDB's native protection against injection attacks
- **XSS Protection**: Content Security Policy and sanitization
- **Request Logging**: Comprehensive logging for security monitoring

---

## ♿ Accessibility

This project is committed to **universal accessibility**:

- ✅ **WCAG 2.1 AA Compliant** - Meets international accessibility standards
- ✅ **Keyboard Navigation** - Full keyboard support with skip links
- ✅ **Screen Reader Support** - ARIA labels, live regions, semantic HTML
- ✅ **Focus Management** - Visible focus indicators, modal traps
- ✅ **Color Accessibility** - Sufficient contrast ratios, color-independent indicators
- ✅ **Responsive Design** - Mobile-first design for all devices
- ✅ **Touch Targets** - Minimum 44px touch targets for mobile

**Lighthouse Accessibility Score: 95+**

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on:

- Code of Conduct
- Development workflow (Git Flow)
- Commit message conventions
- Pull request process
- Code review checklist
- Testing requirements

### **Quick Contribution Steps**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following our standards
4. Run tests (`npm test`) and linting (`npm run lint`)
5. Commit with conventional commits (`git commit -m 'feat: add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📊 Development Process

This project follows the **ECHO v1.3.4** development protocol for consistent quality:

- **Feature Implementation Documents (FIDs)** - Structured planning for all features
- **Multi-Phase Delivery** - Break large features into manageable phases
- **Auto-Audit System** - Automated tracking of progress and completion
- **Quality Gates** - TypeScript verification, test requirements, code review
- **Documentation First** - Comprehensive docs generated with each feature
- **Lessons Learned** - Continuous improvement through retrospectives

See [`dev/README.md`](dev/README.md) for complete development system documentation.

---

## 📈 Project Status

**Current Version**: 1.0.0 (Production Ready)  
**Status**: ✅ All quality gates passed, ready for deployment

### **Recent Achievements**
- ✅ Quality Perfection Initiative Complete (8 phases, ~82 hours)
- ✅ TypeScript: 0 errors (strict mode)
- ✅ Test Suite: 209/209 passing (100%)
- ✅ Accessibility: WCAG 2.1 AA compliant
- ✅ API Validation: All 82 routes validated
- ✅ Security: Production-ready middleware stack
- ✅ Documentation: 8+ comprehensive documents

### **Roadmap**
- [ ] User onboarding tutorial
- [ ] Advanced AI competitors
- [ ] Multiplayer chat system
- [ ] Mobile app (React Native)
- [ ] Blockchain integration for NFTs
- [ ] International expansion (multi-language)

See [`dev/planned.md`](dev/planned.md) for detailed roadmap.

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Next.js Team** - Excellent framework and documentation
- **Vercel** - Deployment platform and serverless functions
- **HeroUI** - Beautiful, accessible component library
- **MongoDB** - Flexible, scalable database solution
- **React Aria** - Accessibility foundation for UI components
- **Vitest** - Fast, modern testing framework

---

## 📞 Support

- **Documentation**: Check [`/docs`](docs/) directory first
- **Issues**: Report bugs via [GitHub Issues](https://github.com/yourusername/corpgame/issues)
- **Discussions**: Join [GitHub Discussions](https://github.com/yourusername/corpgame/discussions)
- **Email**: support@corpgame.com (if configured)

---

## 🌟 Star History

If you find this project useful, please consider giving it a star! ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/corpgame&type=Date)](https://star-history.com/#yourusername/corpgame&Date)

---

**Built with ❤️ using modern web technologies and AAA quality standards**

*Last Updated: January 1, 2026*
