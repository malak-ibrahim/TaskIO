# TechMart - Add to Cart E2E Suite

End-to-end automation for the **Add to Cart** flow of the TechMart storefront, built with
**Cypress + JavaScript**, organised with the **Page Object Model**, and reported through **Allure**.

The suite covers the journey from the UI (login, browsing, adding to cart, cart validation) and the
same flow at the API level (authentication, product data, cart CRUD, authorisation) against the
Supabase backend the storefront talks to.

- Application under test: <https://j-mg6317frew-ecommv01-shv02.lovable.app>
- Backend: `https://ydbupkaqcmhtsysecils.supabase.co` (Supabase Auth + PostgREST)

---

## 1. Prerequisites

| Requirement | Version | Notes |
| --- | --- | --- |
| Node.js | 18 or newer | Cypress 14 and Allure Cypress 3 both require it |
| npm | 9 or newer | Ships with Node |
| Java | 8 or newer | Only needed to render the Allure HTML report |

Java is required by the Allure command line tool. Verify it with `java -version`; if it is missing,
install a JDK (for example Temurin) before running `npm run allure:generate`.

## 2. Install

```bash
npm install
```

This installs Cypress, `allure-cypress`, `allure-js-commons` and the bundled `allure-commandline`,
so no global Allure installation is needed.

## 3. Configure

Environment values live in `cypress.env.json` and are read through `Cypress.env(...)`:

```json
{
  "userEmail": "client@example.com",
  "userPassword": "!Aa123456",
  "supabaseUrl": "https://ydbupkaqcmhtsysecils.supabase.co",
  "supabaseAnonKey": "sb_publishable_..."
}
```

The application URL is set once as `baseUrl` in `cypress.config.js`. To point the suite at another
environment, override either value at run time:

```bash
npx cypress run --config baseUrl=https://staging.example.app
npx cypress run --env userEmail=other@example.com,userPassword=secret
```

`cypress.env.json` is the only place credentials live. In CI, replace it with `CYPRESS_*`
environment variables (for example `CYPRESS_userPassword`) and keep the file out of the repository.

## 4. Run the tests

The default run is **37 tests** (UI + API). Defect specs are excluded so that run stays green.
Use `cy:run:all` when you want every spec, including the 13 bug reports (50 tests in total).

| Command | What it does |
| --- | --- |
| `npm run cy:open` | Opens the Cypress runner (headed, interactive). Defect specs are hidden. |
| `npm run cy:run` | Default suite headless: UI + API (37 tests, no defects) |
| `npm run cy:run:headed` | Default suite in a visible Chrome window |
| `npm run cy:run:ui` | UI specs only |
| `npm run cy:run:api` | API specs only |
| `npm run cy:run:defects` | Bug reports only (13 tests, expected to fail, see section 7) |
| `npm run cy:run:all` | Every spec in one run: UI + API + defects (50 tests; the run fails while those bugs remain) |
| `npm test` | Clears previous Allure output, then runs the default suite |
| `npm run test:allure` | Default suite, generate the Allure report, open it |

To watch the defect specs in the Cypress UI as well:

```bash
npx cypress open --e2e --browser chrome --config excludeSpecPattern=
```

## 5. Allure reporting

Allure is wired in two places:

- `cypress.config.js` registers the reporter inside `setupNodeEvents` and records environment data
  (app URL, Supabase URL, OS, Node and Cypress versions).
- `cypress/support/e2e.js` imports `allure-cypress` so the runtime API is available in specs.

Every test is labelled with an epic, feature, story, severity, owner and tags, and the journey spec
is broken into named Allure steps. Screenshots for failures and the run video are attached
automatically.

```bash
npm run cy:run          # default 37 tests → ./allure-results
npm run cy:run:all      # all 50 tests (report will include failing defects)
npm run allure:generate # renders ./allure-report
npm run allure:open     # serves the rendered report
```

`npm run allure:serve` combines the last two steps into a single throwaway server, and
`npm run clean:allure` deletes both output folders.

## 6. Project structure

A full file-by-file map is in [STRUCTURE.md](STRUCTURE.md).

```text
.
├── README.md                         # install, run, coverage
├── STRUCTURE.md                      # file-by-file map
├── cypress/
│   ├── e2e/
│   │   ├── api/cart-api.cy.js            # Supabase auth, product and cart CRUD validation
│   │   ├── defects/known-defects.cy.js   # Executable bug reports (excluded from the default run)
│   │   └── ui/
│   │       ├── add-to-cart.cy.js         # End to end journey and adding products
│   │       ├── cart-page.cy.js           # Cart contents, quantities, removal, totals, coupons
│   │       └── product-catalogue.cy.js   # Browsing, search, page size and pagination
│   ├── fixtures/products.json            # Expected catalogue data
│   ├── pages/
│   │   ├── BasePage.js                   # Navigation and shared assertions
│   │   ├── LoginPage.js
│   │   ├── ProductsPage.js
│   │   ├── CartPage.js
│   │   ├── DashboardPage.js
│   │   └── components/HeaderComponent.js
│   ├── support/
│   │   ├── api/supabaseClient.js         # Typed wrappers around the Supabase REST endpoints
│   │   ├── commands.js                   # Login, network aliases, cart seeding and cleanup
│   │   └── e2e.js                        # Allure import and global hooks
│   └── utils/testData.js                 # Routes, credentials, products, coupons, cart rules
├── cypress.config.js                   # baseUrl, timeouts, retries, Allure reporter
├── cypress.env.json                    # Credentials and Supabase settings
└── package.json
```

### Layering

- **Specs** describe behaviour and own the assertions that matter to the business.
- **Page objects** own selectors and interactions, and expose intention-revealing methods
  (`addProductToCart`, `assertTotals`, `increaseQuantity`).
- **Custom commands and the API client** own setup, teardown and backend verification, so tests
  start from a known cart state instead of depending on each other. `cy.interceptStorefrontApi()`
  registers every network alias once per test, so `cy.wait` request indexes stay unambiguous.

## 7. Test coverage

37 tests run by default, plus 13 executable bug reports.

### UI - `cypress/e2e/ui/add-to-cart.cy.js`

- Full journey: sign in, validate the catalogue feed, add a product, verify the header badge,
  open the cart, validate the line item and totals, cross-check the rows in the backend, and hand
  off to checkout.
- Invalid credentials keep the shopper signed out.
- Adds three different products and checks the badge, line items and totals after each one.
- Adds the same product twice and confirms two units and matching totals.
- Adds a promoted product from the Hot Products strip.

### UI - `cypress/e2e/ui/product-catalogue.cy.js`

- Filters, card details (image, name, price, stock, call to action) and the price range slider.
- Every product from the feed is rendered, and the Hot Products strip promotes four of them.
- Header search keeps the shopper on the catalogue.
- Pagination: the grid never exceeds the selected page size, the whole catalogue fits on one page
  at 10, 20 and 50 results per page, and no pagination controls are rendered while it fits. If the
  catalogue ever outgrows the page size, the test expects a Next control instead.

### UI - `cypress/e2e/ui/cart-page.cy.js`

- Single item: name, unit price, quantity, line total, image, quantity increase and recalculation,
  the two-unit cap, decreasing below one, and removal.
- Several items: each line rendered independently, the subtotal summed from the rendered line
  totals, the header badge matching the number of units, removing one product while the rest stay
  intact, and Clear Cart emptying the page, the badge and the backend.
- Coupons: the advertised coupons are listed, and applying one leaves the line items untouched.
- Navigation: the empty cart state, and moving between the catalogue and the cart via the header.
- Every cart mutation is verified twice: the intercepted Supabase request and the rendered UI.

### API - `cypress/e2e/api/cart-api.cy.js`

- `POST /auth/v1/token` returns 200 with an access token, refresh token, bearer type, and user, and
  rejects bad credentials with 400 `invalid_credentials`.
- Requests without an API key are refused with 401.
- `GET /rest/v1/products` returns the catalogue, and the product under test matches the fixture.
- Cart lifecycle: create (201 with representation), read joined with product data, patch quantity,
  delete a row, and clear the whole cart.
- Row level security keeps carts private to their owner.

### Defects - `cypress/e2e/defects/known-defects.cy.js`

These specs assert the **correct** behaviour and therefore fail against the current build. They are
excluded from `npm run cy:run` through `excludeSpecPattern`. Run them alone with
`npm run cy:run:defects`, or with the rest of the suite using `npm run cy:run:all`.

| ID | Defect |
| --- | --- |
| BUG-01 | Cart line items render `iPhone 14 Pro x667@#` instead of the product name |
| BUG-02 | Shipping shows `$7.99` but the grand total adds a flat `$100` surcharge |
| BUG-03 | Quantity cannot be raised to 3 or more even when stock allows it |
| BUG-04 | Any coupon code, including an empty one, reports success and discounts nothing |
| BUG-05 | "Continue Shopping" navigates to `/orders` |
| BUG-06 | The empty cart button reads "Return to Stor e" |
| BUG-07 | Header search navigates to `/products?search=` but the grid ignores the term |
| BUG-08 | Adding the same product twice inserts a duplicate row instead of incrementing quantity |
| BUG-09 | Refreshing or deep linking a protected route signs the shopper out |
| BUG-10 | The dashboard summary tiles are hard-coded, so "Cart Items" never matches the real cart |
| BUG-11 | "Return to Store" navigates to `/orders` and ends up back on the login page |
| BUG-12 | `SAVE10` and `WELCOME20` are accepted but never reduce the total |

## 8. Notes on the application

Two application behaviours shape how the suite is written; both are logged above.

- **No deep linking (BUG-09).** The route guard renders before Supabase restores the session, so any
  hard navigation to a protected route bounces to `/login`. Tests therefore sign in through the form
  and then navigate inside the SPA by clicking header links. This is also why `cy.session` is not
  used: a restored session cannot survive a page load.
- **Unstable post-login redirect.** Roughly a third of successful sign-ins show an unrelated toast
  and never leave `/login`. `LoginPage.attemptSignIn` detects this and submits the form again
  (several attempts) before failing with a clear message.

Cart state is shared by the single test account, so every test cleans up through
`cy.clearCartViaApi()` and seeds exactly what it needs with `cy.seedCartItemViaApi()`. Runs are
therefore repeatable and can be re-run without manual cleanup.

## 9. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `allure: command not found` | Use the npm scripts; they resolve the bundled `allure-commandline` |
| Allure report fails to generate | Install a JDK, Allure requires Java |
| Empty Allure report | Results are cleared by `npm test`; generate after a run, not before |
| Tests fail at sign-in | Confirm the credentials in `cypress.env.json` are still valid |
| `npm run cy:run:all` fails | Expected: the 13 defect specs assert correct behaviour and fail on the current app |
