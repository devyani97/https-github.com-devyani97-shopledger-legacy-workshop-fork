# Repository guide

## Stack

- Node.js using CommonJS modules and Express 4.
- Browser UI uses static HTML, CSS, and vanilla JavaScript from `public/`; there is no build script.
- Express serves the UI and mounts the API routers under `/api`.
- Application data is stored in `data/db.json`; `lib/store.js` reads and writes it synchronously.

## Module map

- `server.js`: Express setup, static UI, API router mounting, and printable invoice route.
- `config.js`: port, shop details, tax slabs, inventory defaults, and coupon configuration.
- `routes/`: `products.js` serves products and coupons; `orders.js` handles order lookup, placement, and cancellation; `customers.js` handles customer data and settlements; `reports.js` serves dashboard, pricing preview, GST reconciliation, and admin export endpoints.
- `lib/`: `coupons.js` validates discounts; `dates.js` handles dates; `inventory.js` handles stock; `invoice.js` renders invoice HTML; `ledger.js` handles Khata balances and settlements; `orders.js` handles order records; `pricing.js` calculates totals; `reports.js` builds summaries and reconciliation; `store.js` persists JSON data; `tax.js` resolves tax rates and splits GST.
- `public/`: `index.html`, `css/style.css`, and `js/app.js` make up the browser UI.
- `data/db.json`: JSON store containing products, customers, orders, settlements, and audit entries.

## Commands

- `npm start`: runs `node server.js` (port defaults to 3000 unless `PORT` is set).
- `npm test`: currently only prints `Error: no test specified` and exits with status 1; no test suite is configured in `package.json`.

## Change rules

- Write characterization tests before changing behaviour.
- Change only the module the ticket is about.
- Tests must never read or write `data/db.json`.
- Add no dependencies.
