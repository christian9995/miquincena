# Project: miquincena (Gemini Initialization)

## Overview
`miquincena` is a Next.js application designed to track bi-weekly finances, manage budgets, and generate annual reports. It migrated from a vanilla JS implementation to a modern React-based architecture.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + Lucide React icons
- **State Management**: Custom hook `useFinance` with `localStorage` persistence.
- **Charts**: Chart.js with `react-chartjs-2`.

## Project Structure
- `src/app/`: Next.js pages and globals.
- `src/components/`: Reusable UI components.
  - `Charts/`: Chart-specific components.
- `src/hooks/`: Business logic and state management (`useFinance.ts`).
- `src/lib/`: Utility functions (`finance-utils.ts`).
- `src/types/`: TypeScript definitions.

## Key Logic
- **`useFinance.ts`**: Handles all CRUD operations for transactions and budgets. Computes period-specific data using `useMemo`.
- **LocalStorage**: Data is stored under `finanzas_v2026` and `presupuestos_v2026`.

## Coding Standards
- Use functional components and hooks.
- Favor Tailwind for styling.
- Maintain Spanish labels for user-facing text, variable names in English.
- Use `lucide-react` for icons.

## Skills & Best Practices
- **`vercel-react-best-practices`**: Mandatory reference for React/Next.js performance optimizations. Focus on:
  - Eliminating waterfalls with parallel fetching.
  - Minimizing serum/client serialization overhead.
  - Optimizing re-renders with `memo` and stable primitives.
  - Efficient `localStorage` management (minimizing state).
