import * as allure from 'allure-js-commons';
import ProductsPage from '../../pages/ProductsPage';
import CartPage from '../../pages/CartPage';
import HeaderComponent from '../../pages/components/HeaderComponent';
import {
  PRIMARY_PRODUCT,
  SECONDARY_PRODUCT,
  THIRD_PRODUCT,
  COUPONS,
  CART_RULES,
  currency,
  subtotalOf,
  grandTotalOf,
} from '../../utils/testData';

const productsPage = new ProductsPage();
const cartPage = new CartPage();
const header = new HeaderComponent();

const tagTest = (story, severity = 'critical') => {
  allure.epic('Storefront');
  allure.feature('Add to Cart');
  allure.story(story);
  allure.severity(severity);
  allure.owner('QA Automation');
  allure.tags('ui', 'cart');
};

describe('Cart page | single line item', () => {
  beforeEach(() => {
    cy.interceptStorefrontApi();
    cy.clearCartViaApi();
    cy.seedCartItemViaApi(PRIMARY_PRODUCT.id, 1);
    cy.loginViaUi();
    cartPage.open();
    cartPage.assertLineItemCount(1);
  });

  after(() => {
    cy.clearCartViaApi();
  });

  it('shows the product name, unit price, quantity and line total', () => {
    tagTest('Cart contents');

    cartPage.assertLineItem({ ...PRIMARY_PRODUCT, quantity: 1 });
    cartPage
      .getLineItem(PRIMARY_PRODUCT.name)
      .find('img')
      .should('have.attr', 'src')
      .and('not.be.empty');
  });

  it('recalculates the line total and cart totals when the quantity increases', () => {
    tagTest('Quantity update');

    cartPage.increaseQuantity(PRIMARY_PRODUCT.name);
    cy.wait('@updateCartItem').then(({ request, response }) => {
      expect(response.statusCode, 'quantity patched').to.be.oneOf([200, 204]);
      expect(request.body, 'patch payload').to.deep.include({ quantity: 2 });
    });

    const lines = [{ ...PRIMARY_PRODUCT, quantity: 2 }];
    cartPage
      .assertLineItem({ ...PRIMARY_PRODUCT, quantity: 2 })
      .assertTotals({ subtotal: subtotalOf(lines), grandTotal: grandTotalOf(lines) });
    header.assertCartCount(2);
  });

  it('removes the line item when the quantity is decreased below one', () => {
    tagTest('Quantity update');

    cartPage.decreaseQuantity(PRIMARY_PRODUCT.name);
    cy.wait('@deleteCartItem').its('response.statusCode').should('be.oneOf', [200, 204]);

    cartPage.assertCartIsEmpty();
    cy.getCartViaApi().should('have.length', 0);
  });

  it(`caps the quantity at ${CART_RULES.maxReachableQuantity} units per line item`, () => {
    tagTest('Quantity limits', 'normal');
    allure.description(
      'The storefront refuses any quantity update of three or more, so the stepper stops at two.',
    );

    cartPage.increaseQuantity(PRIMARY_PRODUCT.name);
    cartPage.getQuantityValue(PRIMARY_PRODUCT.name).should('have.text', '2');

    cartPage.increaseQuantity(PRIMARY_PRODUCT.name);
    cartPage
      .getQuantityValue(PRIMARY_PRODUCT.name)
      .should('have.text', String(CART_RULES.maxReachableQuantity));

    cy.getCartViaApi().then((items) => {
      expect(items[0].quantity, 'persisted quantity').to.eq(CART_RULES.maxReachableQuantity);
    });
  });

  it('removes the line item and shows the empty cart state', () => {
    tagTest('Remove from cart');

    cartPage.removeLineItem(PRIMARY_PRODUCT.name);
    cy.wait('@deleteCartItem').its('response.statusCode').should('be.oneOf', [200, 204]);

    cartPage.assertCartIsEmpty();
    cy.getCartViaApi().should('have.length', 0);
  });
});

describe('Cart page | several line items', () => {
  const seededProducts = [PRIMARY_PRODUCT, SECONDARY_PRODUCT, THIRD_PRODUCT];
  const seededLines = seededProducts.map((product) => ({ ...product, quantity: 1 }));

  beforeEach(() => {
    cy.interceptStorefrontApi();
    cy.clearCartViaApi();
    seededProducts.forEach((product) => cy.seedCartItemViaApi(product.id, 1));
    cy.loginViaUi();
    cartPage.open();
    cartPage.assertLineItemCount(seededProducts.length);
  });

  after(() => {
    cy.clearCartViaApi();
  });

  it('lists every product with its own price and line total', () => {
    tagTest('Cart contents');

    seededLines.forEach((line) => cartPage.assertLineItem(line));
  });

  it('adds up the rendered line totals into the cart subtotal', () => {
    tagTest('Cart totals');

    cartPage.assertSubtotalMatchesRenderedLines();
    cartPage.assertTotals({
      subtotal: subtotalOf(seededLines),
      grandTotal: grandTotalOf(seededLines),
    });
  });

  it('matches the header badge to the number of units in the cart', () => {
    tagTest('Cart badge');

    header.assertCartCount(seededLines.length);
    cartPage.increaseQuantity(PRIMARY_PRODUCT.name);
    cy.wait('@updateCartItem').its('response.statusCode').should('be.oneOf', [200, 204]);
    header.assertCartCount(seededLines.length + 1);

    cy.getCartViaApi().then((items) => {
      const units = items.reduce((total, item) => total + item.quantity, 0);
      header.getCartUnitCount().should('eq', units);
    });
  });

  it('removes only the selected product and keeps the rest of the cart intact', () => {
    tagTest('Remove from cart');

    cartPage.removeLineItem(SECONDARY_PRODUCT.name);
    cy.wait('@deleteCartItem').its('response.statusCode').should('be.oneOf', [200, 204]);

    cartPage.assertLineItemCount(seededProducts.length - 1);
    cy.contains(SECONDARY_PRODUCT.name).should('not.exist');
    cartPage.assertLineItem({ ...PRIMARY_PRODUCT, quantity: 1 });
    cartPage.assertLineItem({ ...THIRD_PRODUCT, quantity: 1 });

    const remaining = [
      { ...PRIMARY_PRODUCT, quantity: 1 },
      { ...THIRD_PRODUCT, quantity: 1 },
    ];
    cartPage.assertTotals({
      subtotal: subtotalOf(remaining),
      grandTotal: grandTotalOf(remaining),
    });
    header.assertCartCount(remaining.length);

    cy.getCartViaApi().then((items) => {
      expect(items, 'rows left in the backend').to.have.length(2);
      expect(items.map((item) => item.product_id)).to.not.include(SECONDARY_PRODUCT.id);
    });
  });

  it('empties the whole cart with Clear Cart', () => {
    tagTest('Clear cart');
    allure.description(
      'Clear Cart must remove every line item, reset the header badge and replace the cart ' +
        'layout with the empty state, both on screen and in the backend.',
    );

    cartPage.clearCart();
    cy.wait('@deleteCartItem').its('response.statusCode').should('be.oneOf', [200, 204]);

    cartPage.assertCartIsEmpty();
    seededProducts.forEach((product) => cy.contains(product.name).should('not.exist'));
    cy.getCartViaApi().should('have.length', 0);
  });
});

describe('Cart page | coupons', () => {
  beforeEach(() => {
    cy.interceptStorefrontApi();
    cy.clearCartViaApi();
    cy.seedCartItemViaApi(PRIMARY_PRODUCT.id, 1);
    cy.loginViaUi();
    cartPage.open();
  });

  after(() => {
    cy.clearCartViaApi();
  });

  it('lists the coupons that are available to the shopper', () => {
    tagTest('Coupon', 'minor');

    cartPage.assertAvailableCouponsAreListed([COUPONS.percentage.label, COUPONS.fixed.label]);
    cy.get(cartPage.selectors.couponInput).should('have.attr', 'placeholder', 'Enter coupon code');
  });

  it('confirms a coupon and leaves the line items untouched', () => {
    tagTest('Coupon', 'minor');

    cartPage.applyCoupon(COUPONS.percentage.code);
    cartPage.assertCouponApplied();

    cartPage.assertLineItem({ ...PRIMARY_PRODUCT, quantity: 1 });
    cartPage
      .getTotalValue('Cart Subtotal:')
      .should('have.text', currency(subtotalOf([{ ...PRIMARY_PRODUCT, quantity: 1 }])));
  });
});

describe('Cart page | navigation', () => {
  beforeEach(() => {
    cy.interceptStorefrontApi();
    cy.clearCartViaApi();
    cy.loginViaUi();
  });

  after(() => {
    cy.clearCartViaApi();
  });

  it('shows the empty cart state when nothing has been added', () => {
    tagTest('Empty cart', 'normal');

    cartPage.open();
    cartPage.assertCartIsEmpty();
  });

  it('reaches the cart from the catalogue and back through the header', () => {
    tagTest('Navigation', 'normal');

    productsPage.open();
    productsPage.addProductToCart(PRIMARY_PRODUCT.name);
    cy.wait('@createCartItem').its('response.statusCode').should('eq', 201);

    cartPage.open().assertPageStructure();
    productsPage.open();
    productsPage.getProductCard(PRIMARY_PRODUCT.name).should('be.visible');
  });
});
