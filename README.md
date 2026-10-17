# PFOS frontend

React + TypeScript + Vite client for the existing Spring Boot Daily Log APIs.

## Run locally

Use Node.js 22.12+ (or a supported newer version).

```sh
cd pfos-front
npm install
npm run dev
```

Open http://localhost:5173. Run your Spring Boot backend separately on port 8080 with MongoDB available and master data seeded. Vite proxies `/api` to the backend, so local CORS changes are unnecessary.

Copy `.env.example` to `.env.local` if you need a different `API_PROXY_TARGET`, then restart Vite. `VITE_API_BASE_URL` defaults to same-origin requests. For a separately hosted API, set it to the server origin (without `/api`) and configure backend CORS. Vite variables are public: never put credentials in them.

## Included

- Applied filters for inclusive dates, category, type, payment method, and description search. Changing or clearing filters resets pagination; refresh and CRUD retain the applied filters.
- Paginated transaction history (10, 20, or 50 rows).
- Details loaded from GET by ID, add and edit forms, soft-delete confirmation.
- Controlled master-data dropdowns and retention of inactive current selections during edits.
- Client validation matching the current backend field limits; API error messages preserved.
- Loading, empty, unavailable-server, and retry states; unsaved form values survive failed saves.
- NPR formatting, Kathmandu default dates, date-only display without timezone shifts.
- Responsive layout and keyboard-accessible native dialogs.

No sample transactions are inserted, no financial data is persisted in browser storage, and no backend source is modified. Day Book and summaries await implementation. Filter dropdowns show the master values returned by the backend; inactive values are not currently available for selection. Concurrent edits follow the backend's current last-write-wins policy.

## Checks and deployment

```sh
npm run format:check
npm test
npm run build
npm run preview
```

`npm run preview` previews production assets only: it does not use the development `/api` proxy. A deployment must route `/api` to Spring Boot or configure `VITE_API_BASE_URL` before building. `dist/` contains the generated frontend. There is no authentication in the current API, so this project is intended for local development until access control is implemented.

The UI uses Google Fonts when available, with system font fallbacks. All styles and icons otherwise ship with the application.

## Editing the frontend

Run `npm run format` after edits to format TypeScript, JSX, CSS, and configuration consistently.

- `src/types.ts`: request, response, and filter types.
- `src/api.ts`: HTTP calls and query parameter encoding.
- `src/components/TransactionFilterBar.tsx`: filter inputs and buttons.
- `src/App.tsx`: draft versus applied filter state, date range validation, history requests, and pagination.
- `src/styles.css`: layout and responsive styling.

Typing changes only the draft. Apply filters copies trimmed, nonempty values into the applied filters, which trigger a new history request. Filtering runs on the backend across all transactions, not just the visible page.
