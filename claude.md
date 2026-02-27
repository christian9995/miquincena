# Project: miquincena (Claude Initialization)

## Context
A financial management tool for tracking income and expenses by bi-weekly periods.

## Architecture
- **Framework**: Next.js (App Router)
- **State**: Centralized in `useFinance` hook.
- **Persistence**: Browser `localStorage`.
- **UI**: Tailwind CSS, Responsive design.

## Components
- `TransactionForm`: Handles adding/editing income and expenses.
- `SummaryPanel`: Shows net total and category breakdowns.
- `PeriodSelector`: Navigates between bi-weekly periods.
- `AnnualReportModal`: Aggregated views of yearly data.

## Development Guidelines
- **Language**: English for code (functions, variables, components), Spanish for UI/Labels.
- **Styling**: Atomic Tailwind classes. Use the theme colors defined in `globals.css` if any.
- **Icons**: Lucide React.
- **Type Safety**: Use interfaces from `src/types/index.ts`. Avoid `any`.

## Core Utilities
- `src/lib/finance-utils.ts`: Contains logic for calculating bi-weekly dates and period indices.

## Performance & Best Practices
- **Vercel Best Practices**: Follow `vercel-react-best-practices` skill guidelines.
  - **Data Fetching**: Use parallel operations for independent data.
  - **State**: Keep `localStorage` schema minimal and versioned.
  - **Rendering**: Optimize heavy components with `next/dynamic` if needed.
  - **JS**: Use O(1) lookups (Sets/Maps) for repeated data processing.
