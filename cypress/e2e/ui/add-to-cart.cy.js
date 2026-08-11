import * as allure from 'allure-js-commons';
import LoginPage from '../../pages/LoginPage';
import ProductsPage from '../../pages/ProductsPage';
import CartPage from '../../pages/CartPage';
import HeaderComponent from '../../pages/components/HeaderComponent';
import {
  CREDENTIALS,
  PRIMARY_PRODUCT,
  SECONDARY_PRODUCT,
  THIRD_PRODUCT,
  ROUTES,
  subtotalOf,
  grandTotalOf,
} from '../../utils/testData';

const loginPage = new LoginPage();
const productsPage = new ProductsPage();
const cartPage = new CartPage();
const header = new HeaderComponent();

const tagTest = (story, severity = 'critical') => {
  allure.epic('Storefront');
  allure.feature('Add to Cart');
  allure.story(story);
  allure.severity(severity);
  allure.owner('QA Automation');
  allure.tags('ui', 'e2e', 'cart');
};

describe('Add to Cart | full UI journey', () => {
  beforeEach(() => {
    cy.interceptStorefrontApi();
    cy.clearCartViaApi();
  });

  after(() => {
    cy.clearCartViaApi();
  });

  it('takes a shopper from login through the cart to the checkout hand-off', () => {
    tagTest('End to end journey', 'blocker');
    allure.description(
      'Signs in with a real account, browses the catalogue, adds a product, and verifies that ' +
        'the header badge, cart line item, quantities and totals all agree with the product data ' +
        'and with the cart rows stored in the backend.',
    );

    allure.step('Sign in with valid credentials', () => {
      loginPage.visit().assertLoginFormIsRendered().login(CREDENTIALS.valid);

      cy.location('pathname').should('eq', ROUTES.products);
      header.assertIsVisible().assertUserIsSignedIn();
    });

    allure.step('Browse the catalogue', () => {
      cy.wait('@catalogueFeed').then(({ response }) => {
        expect(response.statusCode, 'catalogue feed status').to.eq(200);
        expect(response.body, 'catalogue feed payload').to.have.length.greaterThan(0);
      });

      productsPage.waitUntilLoaded().assertPageStructure().assertProductCard(PRIMARY_PRODUCT);
      header.assertCartCount(0);
    });

    allure.step(`Add "${PRIMARY_PRODUCT.name}" to the cart`, () => {
      productsPage.addProductToCart(PRIMARY_PRODUCT.name);

      cy.wait('@createCartItem').then(({ request, response }) => {
        expect(response.statusCode, 'cart item created').to.eq(201);
        expect(request.body, 'persisted cart row').to.include({
          product_id: PRIMARY_PRODUCT.id,
          quantity: 1,
        });
      });

      header.assertCartCount(1);
    });

    allure.step('Open the cart from the header', () => {
      cartPage.open().assertPageStructure();
    });

    allure.step('Validate the cart contents against the product data', () => {
      const lines = [{ ...PRIMARY_PRODUCT, quantity: 1 }];

      cartPage
        .assertLineItemCount(1)
        .assertLineItem({ ...PRIMARY_PRODUCT, quantity: 1 })
        .assertTotals({ subtotal: subtotalOf(lines), grandTotal: grandTotalOf(lines) });
    });

    allure.step('Cross-check the cart against the backend', () => {
      cy.getCartViaApi().then((items) => {
        expect(items, 'cart rows for the signed-in user').to.have.length(1);
        expect(items[0].product_id).to.eq(PRIMARY_PRODUCT.id);
        expect(items[0].quantity).to.eq(1);
        expect(items[0].products.name).to.eq(PRIMARY_PRODUCT.name);
        expect(Number(items[0].products.price)).to.eq(PRIMARY_PRODUCT.price);
      });
    });

    allure.step('Hand off to checkout', () => {
      cartPage.proceedToCheckout();
      cy.location('pathname').should('eq', ROUTES.checkout);
    });
  });

  it('keeps a shopper signed out when the credentials are wrong', () => {
    tagTest('Authentication');

    loginPage.visit().attemptInvalidLogin(CREDENTIALS.invalid);
  });
});

describe('Add to Cart | adding products', () => {
  beforeEach(() => {
    cy.interceptStorefrontApi();
    cy.clearCartViaApi();
    cy.loginViaUi();
    productsPage.waitUntilLoaded();
  });

  after(() => {
    cy.clearCartViaApi();
  });

  it('adds three different products and counts every unit in the header badge', () => {
    tagTest('Multiple products');

    const products = [PRIMARY_PRODUCT, SECONDARY_PRODUCT, THIRD_PRODUCT];

    products.forEach((product, index) => {
      productsPage.addProductToCart(product.name);
      cy.wait('@createCartItem').then(({ request, response }) => {
        expect(response.statusCode, `${product.name} added`).to.eq(201);
        expect(request.body).to.include({ product_id: product.id, quantity: 1 });
      });
      header.assertCartCount(index + 1);
    });

    const lines = products.map((product) => ({ ...product, quantity: 1 }));

    cartPage.open().assertLineItemCount(products.length);
    lines.forEach((line) => cartPage.assertLineItem(line));
    cartPage.assertTotals({ subtotal: subtotalOf(lines), grandTotal: grandTotalOf(lines) });

    cy.getCartViaApi().should('have.length', products.length);
  });

  it('counts two units when the same product is added twice', () => {
    tagTest('Duplicate product handling');
    allure.description(
      'Asserts the outcome rather than the mechanism: however the storefront stores the second ' +
        'add, the shopper must end up with two units of the product and totals that match.',
    );

    productsPage.addProductToCart(PRIMARY_PRODUCT.name);
    cy.wait('@createCartItem').its('response.statusCode').should('eq', 201);
    header.assertCartCount(1);

    productsPage.addProductToCart(PRIMARY_PRODUCT.name);
    header.assertCartCount(2);

    cy.getCartViaApi().then((items) => {
      const units = items.reduce((total, item) => total + item.quantity, 0);
      expect(units, 'units of the product in the cart').to.eq(2);
      items.forEach((item) => expect(item.product_id).to.eq(PRIMARY_PRODUCT.id));
    });

    const lines = [{ ...PRIMARY_PRODUCT, quantity: 2 }];
    cartPage.open().assertTotals({ subtotal: subtotalOf(lines), grandTotal: grandTotalOf(lines) });
  });

  it('adds a promoted product from the Hot Products strip', () => {
    tagTest('Multiple products', 'normal');

    productsPage.getHotProductCards().should('have.length', 4);
    productsPage.addProductToCart(SECONDARY_PRODUCT.name);
    cy.wait('@createCartItem').its('response.statusCode').should('eq', 201);

    header.assertCartCount(1);
    cartPage.open().assertLineItem({ ...SECONDARY_PRODUCT, quantity: 1 });
  });
});
