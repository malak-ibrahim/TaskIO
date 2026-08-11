# Project structure

This document maps the **TechMart Add to Cart** Cypress E2E suite: what lives where, what each important file is for, and how the layers connect.

For install, credentials, coverage details, and troubleshooting, see [README.md](README.md).

---

## Purpose

End-to-end automation for the TechMart storefront **Add to Cart** flow, built with **Cypress + JavaScript**, organised with the **Page Object Model**, and reported through **Allure**.

The suite covers:

- **UI** — login, catalogue browsing, adding to cart, cart contents, quantities, coupons, and checkout hand-off
- **API** — Supabase Auth, product catalogue, cart CRUD, and row-level security
- **Defects** — executable bug reports that assert correct behaviour (excluded from the default run)

Application under test: `https://j-mg6317frew-ecommv01-shv02.lovable.app`  
Backend: Supabase Auth + PostgREST (`Cypress.env('supabaseUrl')`)

---

## Source tree

Generated and output folders (`node_modules/`, `allure-results/`, `allure-report/`, `cypress/videos/`, `cypress/screenshots/`, `cypress/downloads/`) are omitted. They are gitignored and recreated at run time.

```text
.
├── .gitignore
├── README.md
├── STRUCTURE.md                 # this file
├── package.json
├── package-lock.json
├── cypress.config.js
├── cypress.env.json             # credentials and Supabase settings (not committed as a secret store; keep out of CI repos)
└── cypress/
    ├── e2e/
    │   ├── api/
    │   │   └── cart-api.cy.js           # default
    │   ├── defects/
    │   │   └── known-defects.cy.js      # excluded from the default run
    │   └── ui/
    │       ├── add-to-cart.cy.js        # default
    │       ├── cart-page.cy.js          # default
    │       └── product-catalogue.cy.js  # default
    ├── fixtures/
    │   └── products.json
    ├── pages/
    │   ├── BasePage.js
    │   ├── LoginPage.js
    │   ├── ProductsPage.js
    │   ├── CartPage.js
    │   ├── DashboardPage.js
    │   └── components/
    │       └── HeaderComponent.js
    ├── support/
    │   ├── e2e.js
    │   ├── commands.js
    │   └── api/
    │       └── supabaseClient.js
    └── utils/
        └── testData.js
```

**Default specs (37 tests):** `cypress/e2e/ui/**` and `cypress/e2e/api/**` (`npm run cy:run`).  
**Excluded from the default run (13 tests):** `cypress/e2e/defects/**` via `excludeSpecPattern` in `cypress.config.js`.  
**All specs (50 tests):** `npm run cy:run:all` overrides the exclude pattern and runs UI + API + defects in one Cypress invocation.

---

## Folders

| Folder | Role |
| --- | --- |
| `cypress/e2e/` | Specs. Behaviour and business assertions live here only. |
| `cypress/e2e/ui/` | Browser journeys against the storefront. |
| `cypress/e2e/api/` | Direct HTTP checks against the same Supabase REST surface the app uses. |
| `cypress/e2e/defects/` | Executable bug reports. Assert the *correct* behaviour, so they fail on the current build. |
| `cypress/pages/` | Page objects: selectors and user-facing actions. |
| `cypress/pages/components/` | Shared UI fragments used by more than one page (currently the signed-in header). |
| `cypress/support/` | Cypress bootstrap, custom commands, and the API client. |
| `cypress/support/api/` | Thin `cy.request` wrappers around Supabase Auth and PostgREST. |
| `cypress/fixtures/` | Static expected data loaded with `cy.fixture`. |
| `cypress/utils/` | Routes, credentials accessors, product constants, coupons, and cart maths. |
| `cypress/videos/` | Run videos (generated; gitignored). |
| `cypress/screenshots/` | Failure screenshots (generated; gitignored). |
| `cypress/downloads/` | Browser downloads (generated; gitignored). |
| `allure-results/` | Raw Allure output from a run (generated; gitignored). |
| `allure-report/` | Rendered HTML report (generated; gitignored). |
| `node_modules/` | npm packages (generated; gitignored). |

---

## Root files

### `package.json`

Project metadata, npm scripts, and dev dependencies (Cypress 14, `allure-cypress`, `allure-js-commons`, `allure-commandline`, `rimraf`).

| Script | What it runs |
| --- | --- |
| `cy:open` | Interactive Cypress runner (default specs only) |
| `cy:run` | Headless default suite: UI + API |
| `cy:run:headed` | Default suite in Chrome, headed |
| `cy:run:ui` / `cy:run:api` | UI specs only / API specs only |
| `cy:run:defects` | Defect specs only (`excludeSpecPattern` overridden) |
| `cy:run:all` | Every spec: UI + API + defects (`excludeSpecPattern` overridden) |
| `test` | Clean Allure folders, then `cy:run` |
| `test:allure` | Default suite, generate report, open it |
| `allure:generate` / `allure:open` / `allure:serve` / `clean:allure` | Report lifecycle |

### `package-lock.json`

Locked dependency tree for reproducible installs.

### `cypress.config.js`

Cypress E2E configuration:

- `baseUrl` for the storefront
- `specPattern`: `cypress/e2e/**/*.cy.js`
- `excludeSpecPattern`: `cypress/e2e/defects/**/*.cy.js` (default run skips defects)
- Timeouts, viewport (1440x900), video, failure screenshots, and retries (`runMode: 1`, `openMode: 0`)
- Allure reporter in `setupNodeEvents`, writing to `allure-results` with environment info (app URL, Supabase URL, OS, Node, Cypress version)

### `cypress.env.json`

Runtime secrets and backend settings read via `Cypress.env(...)`:

- `userEmail` / `userPassword` — shopper account used by UI and API tests
- `supabaseUrl` / `supabaseAnonKey` — Supabase project the storefront talks to

Override at run time with `--env` or `CYPRESS_*` variables. Do not put a second copy of credentials in specs.

### `.gitignore`

Ignores `node_modules/`, Allure output, Cypress videos/screenshots/downloads, logs, and editor folders.

### `README.md`

How to install, configure, run the suite, generate Allure, and what each spec covers. This file (`STRUCTURE.md`) is the file-by-file map.

---

## Specs

### `cypress/e2e/ui/add-to-cart.cy.js` (default)

Full UI journey and add-to-cart cases. Signs in through the form, adds products from the catalogue (including Hot Products), checks the header badge, cart line items and totals, and cross-checks cart rows in the backend. Also covers invalid credentials staying signed out, three distinct products, and adding the same product twice.

### `cypress/e2e/ui/product-catalogue.cy.js` (default)

Catalogue browsing: filters, card details, price range slider, every product from the feed, the Hot Products strip, header search staying on `/products`, and pagination (grid never exceeds page size; whole catalogue fits at 20 and 50 results per page).

### `cypress/e2e/ui/cart-page.cy.js` (default)

Cart page behaviour after seeding via API: single-item display, quantity increase/decrease, the two-unit cap, removal, multi-item subtotals and badge, Clear Cart, advertised coupons (apply leaves line items untouched), empty state, and header navigation between catalogue and cart. Mutations are checked against both the intercepted Supabase request and the rendered UI.

### `cypress/e2e/api/cart-api.cy.js` (default)

Backend-only coverage with no browser UI: `POST /auth/v1/token` (valid session, invalid credentials, missing API key), `GET /rest/v1/products` vs the fixture, and cart lifecycle (create, read with product join, patch quantity, delete row, clear cart, row-level security).

### `cypress/e2e/defects/known-defects.cy.js` (excluded)

Thirteen executable bug reports (BUG-01 through BUG-12). They assert the behaviour the application *should* have, so they fail until the storefront is fixed. Retries are disabled. Run them with `npm run cy:run:defects`, or together with the default suite using `npm run cy:run:all`. Both scripts override `excludeSpecPattern` so this folder is included.

---

## Page objects

Specs import these classes and call intention-revealing methods. Selectors stay inside the page objects.

### `cypress/pages/BasePage.js`

Shared navigation and assertions: `visit`, `assertIsCurrentPage`, heading helpers, and a scoped `contains`. Concrete pages extend this and pass their route.

### `cypress/pages/LoginPage.js`

Login form (`/login`). Fills credentials, submits, and retries the post-login redirect when the app swallows it (session created but the browser stays on `/login`, several attempts). Also asserts an invalid login keeps the shopper signed out.

### `cypress/pages/ProductsPage.js`

Catalogue (`/products`). Opens via the header (not a hard navigation), waits for the feed, asserts card details, adds a product, filters, page size, Hot Products vs the main grid, and pagination controls.

### `cypress/pages/CartPage.js`

Shopping cart (`/cart`). Line items, quantity stepper, remove, Clear Cart, coupons, totals (subtotal, displayed shipping, grand total), checkout link, and empty state. Opens via the header cart icon.

### `cypress/pages/DashboardPage.js`

Account dashboard (`/dashboard`). Welcome banner and summary tiles (Total Orders, Cart Items, Wishlist, Total Spent). Used by defect specs that check whether "Cart Items" matches the real cart.

### `cypress/pages/components/HeaderComponent.js`

Signed-in site header: brand, search, Products / Cart / Dashboard links, cart badge, and logout. Composed into Products, Cart, and Dashboard page objects so in-SPA navigation keeps the session (hard visits to protected routes bounce to `/login`).

---

## Support, API client, and data

### `cypress/support/e2e.js`

Loaded before every spec (`supportFile` in config). Imports `allure-cypress` and `commands.js`. Swallows `ResizeObserver loop` uncaught exceptions from the UI library so they do not fail the run.

### `cypress/support/commands.js`

Custom commands used by specs and `beforeEach` hooks:

| Command | Purpose |
| --- | --- |
| `cy.loginViaUi()` | Sign in through the login form; lands on the catalogue. Does not use `cy.session` (route guard races session restore). |
| `cy.interceptStorefrontApi()` | Registers catalogue and cart intercepts once per test (`@catalogueFeed`, `@readCartItems`, `@createCartItem`, `@updateCartItem`, `@deleteCartItem`). |
| `cy.loginViaApi()` | Authenticates against Supabase Auth and yields `{ accessToken, userId, session }`. |
| `cy.getAuthContext()` | Cached token/user pair so helpers do not re-authenticate on every call. |
| `cy.clearCartViaApi()` | Deletes all cart rows for the test user. |
| `cy.getCartViaApi()` | Reads cart rows joined with product data. |
| `cy.seedCartItemViaApi(productId, quantity)` | Inserts a cart row so UI tests start from a known state. |

### `cypress/support/api/supabaseClient.js`

Typed `cy.request` wrappers for the same REST surface the storefront uses:

- Auth: `authenticate`
- Products: `getProducts`, `getProductById`
- Cart: `getCartItems`, `addCartItem`, `updateCartItemQuantity`, `deleteCartItem`, `clearCart`

URL helpers (`restUrl`, `authUrl`) and headers (anon key + optional bearer token) live here. API specs call these functions directly; UI specs usually go through the custom commands.

### `cypress/utils/testData.js`

Shared constants and helpers, kept out of specs:

- `ROUTES` — `/login`, `/products`, `/cart`, `/dashboard`, and related paths
- `CREDENTIALS` — valid (from `Cypress.env`) and invalid
- `PRIMARY_PRODUCT`, `SECONDARY_PRODUCT`, `THIRD_PRODUCT` — catalogue items used across journeys
- `COUPONS` — `SAVE10`, `WELCOME20`, and an invalid code
- `CART_RULES` — displayed shipping `$7.99`, grand-total surcharge `$100`, max reachable quantity `2`
- `TIMEOUTS`, `currency`, `subtotalOf`, `grandTotalOf`, `discountFor`

### `cypress/fixtures/products.json`

Expected catalogue (`expectedCatalogue`): six products with id, name, price, stock, brand, and category. Used by catalogue and API specs to assert the feed and `GET /rest/v1/products`.

---

## How the layers relate

```text
cypress.config.js          baseUrl, spec pattern, excludeSpecPattern, Allure reporter
        │
        ▼
cypress/support/e2e.js     Allure runtime + uncaught-exception filter
        │
        ├── commands.js    login, intercepts, cart seed / clear  ──►  supabaseClient.js
        │                                                              (Auth + PostgREST)
        ▼
cypress/e2e/**/*.cy.js     describe / it, Allure labels, business assertions
        │
        ├── pages/*.js     selectors and user actions (POM)
        │       └── components/HeaderComponent.js
        ├── utils/testData.js
        └── fixtures/products.json
```

Flow in practice:

1. **Config** decides which specs run, where the app lives, and how Allure is wired.
2. **Support** loads once per spec: Allure, custom commands, and exception handling.
3. **Specs** describe behaviour. UI specs call page objects and commands; API specs call `supabaseClient` and assert on HTTP status/body.
4. **Page objects** own the DOM. Specs do not hard-code selectors.
5. **Commands + API client** own setup and teardown. Cart state is shared by a single test account, so every UI test clears (and often seeds) the cart through the API so runs are independent.
6. **testData + fixtures** own expected values so retargeting products or routes does not mean editing every spec.

Typical UI `beforeEach`: `cy.interceptStorefrontApi()` then `cy.clearCartViaApi()` (and optionally `cy.seedCartItemViaApi`) then `cy.loginViaUi()`, then a page object `open()` via the header.

---

## Default vs excluded specs

| Location | Included in `npm run cy:run` / `npm test`? | How to run |
| --- | --- | --- |
| `cypress/e2e/ui/*.cy.js` | Yes | `npm run cy:run:ui` or the full suite |
| `cypress/e2e/api/*.cy.js` | Yes | `npm run cy:run:api` or the full suite |
| `cypress/e2e/defects/*.cy.js` | **No** (`excludeSpecPattern`) | `npm run cy:run:defects` or `npm run cy:run:all` |

`cy:run:defects` passes `--spec cypress/e2e/defects/**/*.cy.js` and sets `excludeSpecPattern` to a dummy path so the defects folder is not filtered out. `cy:run:all` does the same with `--spec cypress/e2e/**/*.cy.js`, so all 50 tests run in a single Cypress process. The combined run is expected to fail until the listed storefront bugs are fixed.

---

## Running tests and Allure

```bash
npm install
npm run cy:open          # interactive runner (default specs)
npm run cy:run           # default suite (UI + API, 37 tests)
npm run cy:run:headed    # same, visible Chrome
npm run cy:run:ui
npm run cy:run:api
npm run cy:run:defects   # 13 bug reports; expected to fail until bugs are fixed
npm run cy:run:all       # UI + API + defects (50 tests) in one Cypress run
npm test                 # clean Allure results, then cy:run
npm run test:allure      # default suite, generate report, open it
```

Allure:

```bash
npm run cy:run           # or npm run cy:run:all to include defect results
npm run allure:generate  # allure-results → allure-report (needs Java)
npm run allure:open
```

Full instructions, environment overrides, and troubleshooting: [README.md](README.md).
