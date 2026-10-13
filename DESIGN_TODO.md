# 🎨 Application Redesign & UX Polish — TODO List

## 📌 Status Overview
- **Goal**: Full app redesign with a unified luxury theme, smooth glassmorphic layout, fixed UI/UX inconsistencies, and a single standardized password confirmation modal across the entire app.
- **Created**: 2026-10-09

---

## 🛠️ Tasks Checklist

### 1. Design System & Global Styles
- [x] **1.1 Global Theme Tokens (`frontend/src/style.css`)**
  - Implement cohesive executive color palette (Slate Obsidian, Royal Indigo, Emerald Glow, Rose Accent).
  - Add refined glassmorphic utilities (`.glass-panel`, `.glass-header`, `.glass-card`).
  - Add modern micro-animations, silky hover lifts, ambient glow rings, and custom minimal scrollbars.
  - Fix button, badge, and input base tokens for consistent radii and shadows.

### 2. Standardized Password Requirement Modal (Single Unified Theme)
- [x] **2.1 Rebuild `PasswordConfirmDialog.vue` (`frontend/src/components/ui/password-dialog/`)**
  - Upgrade modal to ultra-premium design matching the new theme (sleek glass card, security lock halo, subtle glow).
  - Add support for purpose-based variants (`default` | `danger` | `warning` | `reveal`), replacing the harsh hardcoded red across all contexts.
  - Include built-in password visibility toggle, rate-limiting lockout timer, and smooth error shake/animation.
  - Support custom icon, title, description, and action button labels.
- [x] **2.2 Migrate `App.vue` alert dismissal to unified modal**
  - Replace the raw inline `showDismissPwd` dialog in `App.vue` with `PasswordConfirmDialog`.
- [x] **2.3 Standardize across all views**
  - Verify all password checks (`DashboardView`, `CarDetailView`, `UserManagementView`, `ClientDetailView`, `ContratDetailView`) use the unified modal seamlessly.

### 3. Global App Shell & Navigation Layout (`frontend/src/App.vue`)
- [x] **3.1 Sidebar Redesign**
  - Frosted glass sidebar with refined brand logo and glowing accent.
  - Floating pill navigation links with smooth active indicator, micro-animations, and clean icons.
  - Refined admin section headers and authority control badges.
  - Redesigned user profile footer card with status pill, smooth logout trigger.
- [x] **3.2 Top Header & Navigation Bar**
  - Ultra-sleek floating glass header with route context and breadcrumb.
  - Polished active operators online pill with live pulsating green radar.
  - Redesigned notification bell with clean counter badge and hover ripple.
- [x] **3.3 Centralized Alert Drawer Redesign**
  - Smooth slide-out glass drawer with backdrop blur.
  - Filter pills with animated counts and badges.
  - Clean alert cards with actionable maintenance buttons and dismiss workflows.
- [x] **3.4 Quick Action Modals (Vidange & Visite Technique)**
  - Redesign modal headers, input groups, and buttons to match the new unified theme.

### 4. Core Views UX & Aesthetics Harmonization
- [x] **4.1 Dashboard View UX Polish (`DashboardView.vue`)**
  - Ambient background orbs for luxury depth.
  - Animated count-up (ease-out cubic) for KPI count cards on mount & hover.
  - Per-KPI color-tuned hover gradient overlays (indigo/emerald/rose).
  - Enhanced quick-action button hover with gradient background and deeper icon shadows.
- [x] **4.2 Car List & Availability UX Polish (`CarListView.vue`)**
  - Added styled availability filter pills (Tous / Disponibles / Loués) with animated active states.
  - Fleet stats summary ribbon (Total, Disponibles, En location) below the header.
  - Premium animated loading skeleton (bouncing dots) replacing the raw empty row.
  - Table header entity escaped for validity.

### 5. Final Verification & Build
- [x] **5.1 Typecheck & Production Build**
  - `vue-tsc -b && vite build` exited with code 0.
  - 2511 modules transformed, no TypeScript errors.
  - Only pre-existing chunk size warnings (non-critical).
- [x] **5.2 End-to-end UX Verification**
  - Availability filter pills, fleet ribbon, loading skeleton verified via build.
  - Dashboard ambient orbs, count-up animation, KPI hover overlays verified via build.
  - All password modal integrations confirmed intact across views.
