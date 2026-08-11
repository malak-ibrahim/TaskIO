import * as allure from 'allure-js-commons';
import {
  authenticate,
  getProducts,
  getProductById,
  getCartItems,
  addCartItem,
  updateCartItemQuantity,
  deleteCartItem,
  clearCart,
  restUrl,
} from '../../support/api/supabaseClient';
import { CREDENTIALS, PRIMARY_PRODUCT, SECONDARY_PRODUCT } from '../../utils/testData';

const tagTest = (story, severity = 'critical') => {
  allure.epic('Storefront');
  allure.feature('Add to Cart');
  allure.story(story);
  allure.severity(severity);
  allure.owner('QA Automation');
  allure.tags('api', 'backend', 'cart');
};

describe('Add to Cart | authentication API', () => {
  it('issues a session for valid credentials', () => {
    tagTest('Authentication', 'blocker');

    authenticate(CREDENTIALS.valid).then(({ status, body, duration }) => {
      expect(status, 'status code').to.eq(200);
      expect(body, 'token payload').to.include.keys([
        'access_token',
        'refresh_token',
        'expires_in',
        'token_type',
        'user',
      ]);
      expect(body.token_type).to.eq('bearer');
      expect(body.access_token).to.be.a('string').and.not.be.empty;
      expect(body.user.email).to.eq(CREDENTIALS.valid.email);
      expect(body.user.id, 'user id').to.match(/^[0-9a-f-]{36}$/);
      expect(duration, 'response time (ms)').to.be.lessThan(10000);
    });
  });

  it('rejects invalid credentials', () => {
    tagTest('Authentication', 'critical');

    authenticate({ ...CREDENTIALS.invalid, failOnStatusCode: false }).then(({ status, body }) => {
      expect(status, 'status code').to.eq(400);
      expect(body).to.have.property('error_code', 'invalid_credentials');
    });
  });

  it('refuses cart access without an API key', () => {
    tagTest('Authorization', 'critical');

    cy.request({
      method: 'GET',
      url: restUrl('cart_items'),
      failOnStatusCode: false,
    }).then(({ status }) => {
      expect(status, 'status code').to.eq(401);
    });
  });
});

describe('Add to Cart | product API', () => {
  beforeEach(() => {
    cy.getAuthContext().as('auth');
  });

  it('returns the catalogue used by the storefront', function () {
    tagTest('Product data', 'critical');

    getProducts(this.auth.accessToken).then(({ status, body }) => {
      expect(status).to.eq(200);
      expect(body, 'catalogue').to.be.an('array').and.have.length.greaterThan(0);

      body.forEach((product) => {
        expect(product, 'product row').to.include.keys(['id', 'name', 'price', 'stock']);
        expect(Number(product.price), `${product.name} price`).to.be.greaterThan(0);
        expect(Number(product.stock), `${product.name} stock`).to.be.at.least(0);
      });
    });
  });

  it('matches the fixture data for the product under test', function () {
    tagTest('Product data', 'normal');

    cy.fixture('products').then(({ expectedCatalogue }) => {
      const expected = expectedCatalogue.find((product) => product.id === PRIMARY_PRODUCT.id);

      getProductById(this.auth.accessToken, PRIMARY_PRODUCT.id).then(({ status, body }) => {
        expect(status).to.eq(200);
        expect(body, 'single product').to.have.length(1);
        expect(body[0].name).to.eq(expected.name);
        expect(Number(body[0].price)).to.eq(expected.price);
        expect(Number(body[0].stock)).to.eq(expected.stock);
      });
    });
  });
});

describe('Add to Cart | cart API lifecycle', () => {
  beforeEach(() => {
    cy.getAuthContext().as('auth');
    cy.clearCartViaApi();
  });

  after(() => {
    cy.clearCartViaApi();
  });

  it('creates a cart item for the authenticated user', function () {
    tagTest('Create cart item', 'blocker');

    addCartItem(this.auth.accessToken, {
      userId: this.auth.userId,
      productId: PRIMARY_PRODUCT.id,
      quantity: 1,
    }).then(({ status, body }) => {
      expect(status, 'status code').to.eq(201);
      expect(body, 'created representation').to.have.length(1);
      expect(body[0]).to.include({
        user_id: this.auth.userId,
        product_id: PRIMARY_PRODUCT.id,
        quantity: 1,
      });
      expect(body[0].id, 'row id').to.be.a('string');
    });
  });

  it('returns the cart joined with product details', function () {
    tagTest('Read cart', 'critical');

    addCartItem(this.auth.accessToken, {
      userId: this.auth.userId,
      productId: PRIMARY_PRODUCT.id,
      quantity: 2,
    });

    getCartItems(this.auth.accessToken, this.auth.userId).then(({ status, body }) => {
      expect(status).to.eq(200);
      expect(body).to.have.length(1);
      expect(body[0].quantity).to.eq(2);
      expect(body[0].products.name).to.eq(PRIMARY_PRODUCT.name);
      expect(Number(body[0].products.price)).to.eq(PRIMARY_PRODUCT.price);
      expect(body[0].products.images, 'product images').to.be.an('array').and.not.be.empty;
    });
  });

  it('updates the quantity of an existing cart item', function () {
    tagTest('Update cart item', 'critical');

    addCartItem(this.auth.accessToken, {
      userId: this.auth.userId,
      productId: PRIMARY_PRODUCT.id,
      quantity: 1,
    })
      .then(({ body }) => updateCartItemQuantity(this.auth.accessToken, body[0].id, 2))
      .then(({ status, body }) => {
        expect(status).to.eq(200);
        expect(body[0].quantity, 'patched quantity').to.eq(2);
      });
  });

  it('removes a single cart item', function () {
    tagTest('Delete cart item', 'critical');

    addCartItem(this.auth.accessToken, {
      userId: this.auth.userId,
      productId: SECONDARY_PRODUCT.id,
      quantity: 1,
    })
      .then(({ body }) => deleteCartItem(this.auth.accessToken, body[0].id))
      .then(({ status }) => {
        expect(status, 'status code').to.be.oneOf([200, 204]);
      });

    getCartItems(this.auth.accessToken, this.auth.userId).then(({ body }) => {
      expect(body, 'cart after delete').to.have.length(0);
    });
  });

  it('clears every cart item belonging to the user', function () {
    tagTest('Clear cart', 'normal');

    addCartItem(this.auth.accessToken, {
      userId: this.auth.userId,
      productId: PRIMARY_PRODUCT.id,
      quantity: 1,
    });
    addCartItem(this.auth.accessToken, {
      userId: this.auth.userId,
      productId: SECONDARY_PRODUCT.id,
      quantity: 1,
    });

    getCartItems(this.auth.accessToken, this.auth.userId).its('body').should('have.length', 2);

    clearCart(this.auth.accessToken, this.auth.userId).then(({ status }) => {
      expect(status).to.be.oneOf([200, 204]);
    });

    getCartItems(this.auth.accessToken, this.auth.userId).its('body').should('have.length', 0);
  });

  it('keeps carts private to their owner', function () {
    tagTest('Authorization', 'critical');

    addCartItem(this.auth.accessToken, {
      userId: this.auth.userId,
      productId: PRIMARY_PRODUCT.id,
      quantity: 1,
    });

    // The anonymous key alone must not expose another user's cart rows.
    cy.request({
      method: 'GET',
      url: restUrl('cart_items'),
      qs: { select: '*' },
      headers: { apikey: Cypress.env('supabaseAnonKey') },
      failOnStatusCode: false,
    }).then(({ status, body }) => {
      expect(status, 'status code').to.be.oneOf([200, 401, 403]);

      if (status === 200) {
        expect(body, 'rows visible to an anonymous caller').to.have.length(0);
      }
    });
  });
});
