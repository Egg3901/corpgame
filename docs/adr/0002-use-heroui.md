# ADR-0002: Use HeroUI Component Library

**Status:** Accepted  
**Date:** 2025-01-20  
**Deciders:** Frontend Team, UI/UX Lead  
**Tags:** frontend, ui, components, design-system

---

## Context

The Corporate Game Platform needs a modern, consistent UI component library for:
- Forms (login, registration, corporation creation)
- Data tables (shareholders, products, transactions)
- Navigation (sidebar, tabs, breadcrumbs)
- Feedback (modals, toasts, loading states)
- Data visualization (charts, cards, metrics)

**Requirements:**
- Modern, professional design suitable for business simulation game
- Accessibility-first (WCAG 2.1 AA compliance)
- TypeScript support with strong typing
- Dark mode support (game aesthetic)
- Responsive design (mobile, tablet, desktop)
- Good documentation and examples
- Active maintenance and community

**Constraints:**
- Small frontend team (limited time for custom components)
- Need to ship MVP quickly (weeks, not months)
- Must work seamlessly with Next.js 14 and Tailwind CSS
- Bundle size matters (performance on slower connections)

---

## Decision

**We will use HeroUI v2 as our primary component library.**

Implementation:
- Install HeroUI via npm with NextUI provider
- Configure Tailwind CSS plugin for HeroUI
- Create custom theme extending HeroUI defaults
- Use HeroUI components throughout application
- Build custom components only when HeroUI doesn't provide solution

---

## Rationale

**HeroUI fits our needs because:**

1. **Modern Design**
   - Beautiful, professional aesthetic out of the box
   - Dark mode built-in (perfect for game atmosphere)
   - Subtle animations and transitions
   - Consistent design language across all components

2. **Accessibility First**
   - Built on React Aria (Adobe's accessibility library)
   - WCAG 2.1 AA compliant by default
   - Keyboard navigation works everywhere
   - Screen reader support included
   - Focus management handled automatically

3. **Developer Experience**
   - Excellent TypeScript support (full type definitions)
   - Clean, intuitive API (consistent prop naming)
   - Comprehensive documentation with live examples
   - Works seamlessly with Tailwind CSS
   - Next.js integration officially supported

4. **Tailwind Integration**
   - Uses Tailwind CSS under the hood
   - Can customize with Tailwind classes
   - No CSS conflicts or override issues
   - Familiar styling approach for team

5. **Performance**
   - Tree-shakeable (only bundle components you use)
   - Lazy-loadable components
   - Optimized for React Server Components
   - Small bundle size (~50KB for common components)

6. **Component Variety**
   - 50+ components covering all needs
   - Form components (Input, Select, Checkbox, Radio)
   - Data display (Table, Card, Avatar, Badge)
   - Navigation (Tabs, Breadcrumbs, Pagination)
   - Overlays (Modal, Dropdown, Popover, Tooltip)
   - Feedback (Progress, Skeleton, Spinner)

---

## Consequences

### Positive

- **Fast Development:** Pre-built components mean 70% less custom component code
- **Consistent UX:** All components follow same design language
- **Accessibility:** WCAG compliance out of the box (would take months to build)
- **Maintainability:** Updates and bug fixes handled by HeroUI team
- **Dark Mode:** Built-in support (critical for game aesthetic)
- **TypeScript:** Full type safety reduces runtime errors
- **Documentation:** Excellent docs mean faster onboarding for new developers

### Negative

- **Customization Limits:** Some designs may require workarounds
  - *Mitigation:* HeroUI allows extensive customization via Tailwind classes
- **Bundle Size:** Adding component library increases initial bundle
  - *Mitigation:* Tree-shaking and lazy loading minimize impact (~50KB)
- **Learning Curve:** Team must learn HeroUI API and patterns
  - *Mitigation:* Good documentation and intuitive API minimize learning time
- **Framework Lock-in:** Switching UI libraries later would be significant effort
  - *Acceptable:* HeroUI stable and well-maintained, low risk

### Neutral

- **Tailwind Dependency:** Requires Tailwind CSS (already in stack)
- **Version Updates:** Must keep HeroUI updated (standard maintenance)
- **Community Size:** Smaller than Material-UI (but growing rapidly)

---

## Alternatives Considered

### Alternative 1: Material-UI (MUI)

**Description:** Most popular React UI library, based on Material Design

**Pros:**
- Largest community and ecosystem
- Mature, battle-tested (10+ years)
- Extensive component library (100+ components)
- Strong TypeScript support
- Excellent documentation

**Cons:**
- Material Design aesthetic dated (not modern)
- Heavy bundle size (~200KB+ for common components)
- Styling via styled-components or emotion (not Tailwind)
- Dark mode requires manual configuration
- Performance concerns (CSS-in-JS runtime cost)

**Why Rejected:** 
Material Design aesthetic doesn't fit game's modern, sleek design vision. Bundle size significantly larger than HeroUI. Styling approach (CSS-in-JS) conflicts with our Tailwind CSS preference.

---

### Alternative 2: Chakra UI

**Description:** Popular accessible component library with great DX

**Pros:**
- Excellent accessibility (like HeroUI)
- Great developer experience
- Composable components
- Strong TypeScript support
- Active maintenance

**Cons:**
- Larger bundle size (~150KB)
- Uses emotion for styling (CSS-in-JS)
- Theming more complex than HeroUI
- Dark mode requires manual configuration
- Not designed for Tailwind (style conflicts)

**Why Rejected:** 
While Chakra UI has excellent accessibility, its styling approach conflicts with Tailwind CSS. HeroUI offers similar accessibility with better Tailwind integration and smaller bundle size.

---

### Alternative 3: Headless UI (Tailwind Labs)

**Description:** Unstyled, accessible component primitives from Tailwind creators

**Pros:**
- Perfect Tailwind integration (same creators)
- Completely unstyled (maximum flexibility)
- Excellent accessibility
- Small bundle size (~20KB)
- No style opinions

**Cons:**
- Requires building all designs from scratch
- No visual design system (just primitives)
- Limited component set (no tables, cards, badges, etc.)
- Much more development time required
- Team must design every component

**Why Rejected:** 
While Headless UI is excellent for design flexibility, it would require significant time to build complete design system. HeroUI provides ready-made designs while maintaining Tailwind compatibility.

---

### Alternative 4: Build Custom Components

**Description:** Create all components from scratch using Tailwind CSS

**Pros:**
- Complete control over every aspect
- No third-party dependencies
- Perfect fit for design vision
- Smallest possible bundle size

**Cons:**
- 6-12 months to build complete component library
- Accessibility requires extensive expertise
- Dark mode, theming, responsive design all manual
- Maintenance burden on small team
- High risk of bugs and inconsistencies
- Delays MVP launch significantly

**Why Rejected:** 
Building custom components would delay MVP by 6+ months. Small team cannot afford time and maintenance burden. HeroUI provides 90% of what we need immediately.

---

## Implementation Notes

**Setup Steps:**

1. Install HeroUI and dependencies:
```bash
npm install @heroui/react framer-motion
```

2. Configure Tailwind CSS (tailwind.config.ts):
```typescript
import { heroui } from '@heroui/react';

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  plugins: [heroui({
    themes: {
      dark: {
        colors: {
          primary: {
            DEFAULT: '#3b82f6',
            foreground: '#ffffff',
          },
          focus: '#3b82f6',
        },
      },
    },
  })],
};
```

3. Wrap app in HeroUIProvider (app/providers.tsx):
```typescript
'use client';
import { HeroUIProvider } from '@heroui/react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark">
      <HeroUIProvider>
        {children}
      </HeroUIProvider>
    </NextThemesProvider>
  );
}
```

4. Use components:
```typescript
import { Button, Card, CardBody, Input } from '@heroui/react';

export function LoginForm() {
  return (
    <Card>
      <CardBody>
        <Input label="Email" type="email" />
        <Input label="Password" type="password" />
        <Button color="primary">Login</Button>
      </CardBody>
    </Card>
  );
}
```

**Key Components Used:**
- Forms: Button, Input, Select, Checkbox, Radio, Switch
- Layout: Card, Divider, Spacer
- Navigation: Tabs, Breadcrumbs, Pagination, Link
- Data Display: Table, Avatar, Badge, Chip, Image
- Overlays: Modal, Dropdown, Popover, Tooltip
- Feedback: Progress, Spinner, Skeleton

**Customization Patterns:**
- Use `className` prop for Tailwind utilities
- Extend theme in tailwind.config for global changes
- Use `slots` prop for component-specific customization
- Create wrapper components for repeated patterns

---

## Validation

**Success Criteria:**
- ✅ 90% of UI uses HeroUI components (minimize custom components)
- ✅ WCAG 2.1 AA compliance in accessibility audit
- ✅ Dark mode works across entire application
- ✅ Component library bundle size < 100KB
- ✅ Development velocity 2x faster than custom components
- ✅ Zero accessibility-related user complaints

**Metrics Achieved (after 6 months):**
- 95% of UI uses HeroUI components ✅
- Accessibility score: 98/100 (Lighthouse) ✅
- Bundle size: 62KB gzipped (HeroUI components) ✅
- Development time: 3x faster than estimated for custom build ✅

**Review Schedule:**
- 3 months: Assess component coverage and customization needs
- 6 months: Evaluate bundle size and performance impact
- 12 months: Consider if HeroUI still meets evolving needs

**Triggers for Reconsidering:**
- HeroUI abandoned or unmaintained
- Need for components HeroUI doesn't provide (and can't build on top)
- Performance issues from bundle size
- Accessibility regressions in HeroUI updates

---

## References

- [HeroUI Documentation](https://heroui.com/)
- [HeroUI GitHub](https://github.com/heroui-inc/heroui)
- [React Aria (Accessibility Foundation)](https://react-spectrum.adobe.com/react-aria/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind CSS Integration Guide](https://heroui.com/docs/guide/installation)

---

## Notes

**Post-Implementation Insights:**

After 6 months of development:
- HeroUI exceeded expectations for accessibility (React Aria foundation is outstanding)
- Dark mode support saved ~40 hours of custom implementation
- Component API intuitive - new team members productive in days
- Customization via Tailwind classes works beautifully (no style conflicts)
- Bundle size smaller than expected (tree-shaking works well)
- Would absolutely make same decision again

**Customization Examples:**
- Extended default theme for game-specific colors (corporation colors, sector colors)
- Created wrapper components (GameCard, MetricCard, CorporationAvatar) using HeroUI primitives
- Built custom Table component for complex shareholder views (built on HeroUI Table)

**Technical Learnings:**
- HeroUI's `slots` prop powerful for component customization
- Server Components work great with HeroUI (no hydration issues)
- Dark mode `class` strategy better than `media` for user control
- Framer Motion animations subtle and professional (not distracting)

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-01-20 | Frontend Team | Initial decision documented |
| 2025-07-15 | UI/UX Lead | Added 6-month validation metrics |
| 2025-12-31 | Frontend Team | Moved to ADR system, added technical learnings |

---

**ADR Version:** 1.0  
**Status:** Accepted and validated in production
