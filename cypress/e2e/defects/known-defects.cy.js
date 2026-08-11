import * as allure from 'allure-js-commons';
import ProductsPage from '../../pages/ProductsPage';
import CartPage from '../../pages/CartPage';
import DashboardPage from '../../pages/DashboardPage';
import {
  PRIMARY_PRODUCT,
  COUPONS,
  ROUTES,
  CART_RULES,
  currency,
  subtotalOf,
  discountFor,
} from '../../utils/testData';

/**
 * Defects found in the application while building the Add to Cart suite.
 *
 * These specs assert the CORRECT expected behaviour, so they fail on purpose against the
 * current build and act as executable bug reports. They are excluded from the default run
 * (see `excludeSpecPattern` in cypress.config.js) and are executed with `npm run cy:run:defects`.
 */

const productsPage = new ProductsPage();
const cartPage = new CartPage();
const dashboardPage = new DashboardPage();

const reportDefect = (id, summary) => {
  allure.epic('Storefront');
  allure.feature('Add to Cart');
  allure.story('Known defects');
  allure.severity('critical');
  allure.tags('defect', id);
  allure.description(summary);
};

// Retries are pointless here: these tests are expected to fail until the defects are fixed.
describe('Add to Cart | known defects', { retries: 0 }, () => {
  beforeEach(() => {
    cy.interceptStorefrontApi();
    cy.clearCartViaApi();
    cy.seedCartItemViaApi(PRIMARY_PRODUCT.id, 1);
    cy.loginViaUi();
  });

  after(() => {
    cy.clearCartViaApi();
  });

  it('BUG-01: cart line item shows the product name without a debug suffix', () => {
    reportDefect('BUG-01', 'The cart renders "iPhone 14 Pro x667@#" instead of the product name.');

    cartPage.open();
    cartPage.getLineItem(PRIMARY_PRODUCT.name).find('h3').should('have.text', PRIMARY_PRODUCT.name);
  });

  it('BUG-02: grand total equals the subtotal plus the shipping shown on screen', () => {
    reportDefect(
      'BUG-02',
      'Shipping renders as $7.99 but the grand total adds a flat $100 surcharge instead.',
    );

    cartPage.open();
    const subtotal = subtotalOf([{ ...PRIMARY_PRODUCT, quantity: 1 }]);
    cartPage
      .getTotalValue('Grand Total:')
      .should('have.text', currency(subtotal + CART_RULES.displayedShipping));
  });

  it('BUG-03: quantity can be raised beyond two while stock allows it', () => {
    reportDefect(
      'BUG-03',
      'updateQuantity refuses any value of three or more, so shoppers cannot buy three units of an in-stock product.',
    );

    cartPage.open();
    cartPage.increaseQuantity(PRIMARY_PRODUCT.name);
    cartPage.increaseQuantity(PRIMARY_PRODUCT.name);
    cartPage.getQuantityValue(PRIMARY_PRODUCT.name).should('have.text', '3');
  });

  it('BUG-04: an invalid coupon code is rejected', () => {
    reportDefect(
      'BUG-04',
      'Any string, including an empty one, reports "Coupon applied successfully!" and discounts nothing.',
    );

    cartPage.open();
    cartPage.applyCoupon(COUPONS.invalid);
    cy.contains('Coupon applied successfully!').should('not.exist');
  });

  it('BUG-05: Continue Shopping returns to the catalogue', () => {
    reportDefect('BUG-05', 'The Continue Shopping button navigates to /orders.');

    cartPage.open();
    cartPage.continueShopping();
    cy.location('pathname').should('eq', ROUTES.products);
  });

  it('BUG-06: the empty cart call to action is spelled correctly', () => {
    reportDefect('BUG-06', 'The empty cart state renders a button labelled "Return to Stor e".');

    cartPage.open();
    cartPage.clearCart();
    cy.contains('button', 'Return to Store').should('be.visible');
  });

  it('BUG-07: catalogue search filters the grid by the search term', () => {
    reportDefect(
      'BUG-07',
      'Header search navigates to /products?search=<term> but the catalogue ignores the query and lists every product.',
    );

    productsPage.open();
    productsPage.searchFor(PRIMARY_PRODUCT.name);
    cy.get(productsPage.selectors.cardTitle).each(($title) => {
      expect($title.text()).to.contain(PRIMARY_PRODUCT.name);
    });
  });

  it('BUG-08: adding the same product twice keeps one line item with quantity two', () => {
    reportDefect(
      'BUG-08',
      'The duplicate lookup filters on selected_color=eq.null, which never matches a NULL column, ' +
        'so a second "Add to Cart" inserts another row instead of incrementing the existing one.',
    );

    productsPage.open();
    productsPage.addProductToCart(PRIMARY_PRODUCT.name);
    cy.contains('a[href="/cart"] span', '2').should('be.visible');

    cartPage.open();
    cartPage.assertLineItemCount(1);
    cartPage.getQuantityValue(PRIMARY_PRODUCT.name).should('have.text', '2');
  });

  it('BUG-09: a signed-in shopper survives a page refresh', () => {
    reportDefect(
      'BUG-09',
      'The route guard renders before Supabase restores the session, so refreshing or deep linking ' +
        'to any protected route redirects the signed-in shopper back to /login.',
    );

    cartPage.open();
    cy.reload();
    cy.get('header', { timeout: 20000 }).should('be.visible');
    cy.location('pathname').should('eq', ROUTES.cart);
  });

  it('BUG-10: the dashboard reports the real number of cart items', () => {
    reportDefect(
      'BUG-10',
      'The dashboard summary tiles are hard-coded ("Cart Items" always renders 3), so they never ' +
        'agree with the cart or the header badge.',
    );

    cartPage.open();
    cartPage.assertLineItemCount(1);

    dashboardPage.open();
    dashboardPage.getStatValue('Cart Items').should('have.text', '1');
  });

  it('BUG-11: the "Return to Store" button goes back to the storefront', () => {
    reportDefect(
      'BUG-11',
      'The empty cart button triggers a hard navigation to /orders, which the route guard then ' +
        'bounces to /login, so the shopper is signed out instead of returning to the store.',
    );

    cartPage.open();
    cartPage.clearCart();
    cartPage.returnToStore();

    cy.location('pathname', { timeout: 20000 }).should('eq', ROUTES.products);
    cy.get('header').should('be.visible');
  });

  [COUPONS.percentage, COUPONS.fixed].forEach((coupon) => {
    it(`BUG-12: ${coupon.code} reduces the cart total`, () => {
      reportDefect(
        'BUG-12',
        'Applying a coupon always stores a discount of 0 and the calculated discount is discarded, ' +
          `so "${coupon.label}" never changes the amount the shopper pays.`,
      );
      allure.parameter('coupon', coupon.code);

      cartPage.open();

      const subtotal = subtotalOf([{ ...PRIMARY_PRODUCT, quantity: 1 }]);
      expect(subtotal, 'order qualifies for the coupon').to.be.greaterThan(coupon.minimumSpend);

      cartPage.getTotalAmount('Grand Total:').then((totalBeforeCoupon) => {
        cartPage.applyCoupon(coupon.code);
        cartPage.assertCouponApplied();

        const expectedTotal = Number(
          (totalBeforeCoupon - discountFor(coupon, subtotal)).toFixed(2),
        );
        cartPage.getTotalValue('Grand Total:').should('have.text', currency(expectedTotal));
      });
    });
  });
});
