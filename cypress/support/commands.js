import LoginPage from '../pages/LoginPage';
import { authenticate, clearCart, getCartItems, addCartItem } from './api/supabaseClient';
import { CREDENTIALS } from '../utils/testData';

/**
 * Signs in through the UI and leaves the browser on the catalogue.
 *
 * Session caching (cy.session) is deliberately not used: the application's route guard renders
 * before Supabase restores the session, so any hard navigation to a protected route bounces back
 * to /login. Every test therefore starts from a real sign-in and then navigates inside the SPA.
 */
Cypress.Commands.add('loginViaUi', (credentials = CREDENTIALS.valid) => {
  new LoginPage().visit().login(credentials);
});

/**
 * Registers every storefront network alias in one place, so specs never re-declare an alias
 * mid-test (which makes `cy.wait` request indexes ambiguous). Call it before signing in.
 */
Cypress.Commands.add('interceptStorefrontApi', () => {
  cy.intercept('GET', '**/api/products.json').as('catalogueFeed');
  cy.intercept('GET', '**/rest/v1/cart_items*').as('readCartItems');
  cy.intercept('POST', '**/rest/v1/cart_items*').as('createCartItem');
  cy.intercept('PATCH', '**/rest/v1/cart_items*').as('updateCartItem');
  cy.intercept('DELETE', '**/rest/v1/cart_items*').as('deleteCartItem');
});

/** Authenticates against the API and yields { accessToken, userId } for direct backend calls. */
Cypress.Commands.add('loginViaApi', (credentials = CREDENTIALS.valid) =>
  authenticate(credentials).then(({ status, body }) => {
    expect(status, 'authentication status code').to.eq(200);
    return { accessToken: body.access_token, userId: body.user.id, session: body };
  }),
);

/** Cached token/user pair so repeated helper calls do not re-authenticate on every use. */
Cypress.Commands.add('getAuthContext', () => {
  const cached = Cypress.env('__authContext');

  if (cached) {
    return cy.wrap(cached, { log: false });
  }

  return cy.loginViaApi().then((context) => {
    Cypress.env('__authContext', context);
    return context;
  });
});

Cypress.Commands.add('clearCartViaApi', () =>
  cy.getAuthContext().then(({ accessToken, userId }) =>
    clearCart(accessToken, userId).then(({ status }) => {
      expect(status, 'clear cart status code').to.be.oneOf([200, 204]);
    }),
  ),
);

Cypress.Commands.add('getCartViaApi', () =>
  cy.getAuthContext().then(({ accessToken, userId }) =>
    getCartItems(accessToken, userId).then(({ status, body }) => {
      expect(status, 'read cart status code').to.eq(200);
      return body;
    }),
  ),
);

Cypress.Commands.add('seedCartItemViaApi', (productId, quantity = 1) =>
  cy.getAuthContext().then(({ accessToken, userId }) =>
    addCartItem(accessToken, { userId, productId, quantity }).then(({ status, body }) => {
      expect(status, 'seed cart item status code').to.eq(201);
      return body[0];
    }),
  ),
);
