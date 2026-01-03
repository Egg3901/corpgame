# Frontend Component Audit & HeroUI Migration Plan

## 1. Executive Summary
This audit identifies frontend components currently using basic HTML elements with Tailwind CSS utility classes and outlines a plan to migrate them to the **HeroUI** component library. The goal is to improve code maintainability, accessibility, and visual consistency.

## 2. Component Analysis

### 2.1. Authentication Components
**File**: `components/AuthForm.tsx`
- **Current State**: 
  - Uses `<form>`, `<input>`, `<select>`, `<button>`.
  - Manual error handling and loading states.
  - Custom styling for focus states and borders.
- **HeroUI Mapping**:
  - `<input>` → `<Input>` (Supports `errorMessage`, `isInvalid`, `startContent`, `endContent`).
  - `<select>` → `<Select>` & `<SelectItem>`.
  - `<button>` → `<Button>` (Supports `isLoading`, `color`, `variant`).
  - Container → `<Card>`.

**File**: `components/auth/PasswordInput.tsx`
- **Current State**: Custom implementation with toggle visibility icon.
- **HeroUI Mapping**: `<Input>` with `endContent` (eye icon) and `type` toggle.

### 2.2. Modal Components
**File**: `components/SendCashModal.tsx`
- **Current State**: 
  - Custom `fixed inset-0` overlay.
  - Manual z-index and positioning management.
  - Custom animation classes.
- **HeroUI Mapping**:
  - Wrapper → `<Modal>` (Handles backdrop, scroll lock, accessibility).
  - Content → `<ModalContent>`, `<ModalHeader>`, `<ModalBody>`, `<ModalFooter>`.

### 2.3. Admin & Configuration Panels
**File**: `components/admin/SectorConfigPanel.tsx`
- **Current State**: 
  - Complex nested divs for layout.
  - Custom tabs implementation.
  - Tables built with flexbox/grid.
- **HeroUI Mapping**:
  - Navigation → `<Tabs>` & `<Tab>`.
  - Data Display → `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableCell>`.
  - Status Indicators → `<Chip>` (for Unit Types).
  - Edit Actions → `<Tooltip>` + `<Button isIconOnly>`.

### 2.4. General UI Components
**File**: `components/SectorCard.tsx`
- **Current State**: Div with `border`, `rounded-lg`, `shadow`.
- **HeroUI Mapping**: `<Card>`, `<CardHeader>`, `<CardBody>`, `<CardFooter>`.

**File**: `components/TickerTape.tsx`
- **Current State**: Custom CSS animation (`animate-scroll`).
- **HeroUI Mapping**: Keep custom animation but wrap in `<Card>` or `<ScrollShadow>`.

## 3. Migration Plan

### Phase 1: Core Primitives (Immediate)
**Goal**: Migrate low-hanging fruit with high visual impact.
1.  **AuthForm**: Convert inputs and buttons.
2.  **SendCashModal**: Switch to HeroUI Modal.
3.  **AppNavigation**: Update Navbar to HeroUI `<Navbar>`.

### Phase 2: Data Display (Week 1)
**Goal**: Standardize lists and tables.
1.  **SectorConfigPanel**: Implement HeroUI Tables and Tabs.
2.  **ProfileDashboard**: Use `<Card>` and `<Grid>`/`<Spacer>`.

### Phase 3: Complex Interactions (Week 2)
**Goal**: Refactor complex widgets.
1.  **ProductionChainDiagram**: Likely keep custom ReactFlow but use HeroUI for controls.
2.  **Charts**: Wrap Recharts in HeroUI Cards.

## 4. Refactoring Guidelines
- **Props**: Use `variant="bordered"` or `variant="flat"` to match current aesthetic.
- **Colors**: Map `bg-surface-1` to HeroUI's default/content background.
- **Icons**: Continue using `lucide-react`, passing them to `startContent`/`endContent` props.
- **Validation**: Leverage HeroUI's built-in `isInvalid` and `errorMessage` props instead of custom error divs.

