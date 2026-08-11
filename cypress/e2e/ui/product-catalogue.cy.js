import * as allure from 'allure-js-commons';
import ProductsPage from '../../pages/ProductsPage';
import { PRIMARY_PRODUCT, SECONDARY_PRODUCT, ROUTES } from '../../utils/testData';

const productsPage = new ProductsPage();

const tagTest = (story, severity = 'normal') => {
  allure.epic('Storefront');
  allure.feature('Product catalogue');
  allure.story(story);
  allure.severity(severity);
  allure.owner('QA Automation');
  allure.tags('ui', 'catalogue');
};

describe('Product catalogue | browsing', () => {
  beforeEach(() => {
    // Registered before signing in: the catalogue is fetched by the post-login redirect.
    cy.interceptStorefrontApi();
    cy.loginViaUi();
    productsPage.waitUntilLoaded();
  });

  it('renders the catalogue filters and product card details', () => {
    tagTest('Product browsing');

    productsPage.assertPageStructure();
    productsPage.assertProductCard(PRIMARY_PRODUCT);
    productsPage.assertProductCard(SECONDARY_PRODUCT);
    productsPage.getPriceRangeSlider().should('have.attr', 'aria-valuenow');
  });

  it('shows every catalogue product from the feed', () => {
    tagTest('Product browsing', 'critical');

    cy.fixture('products').then(({ expectedCatalogue }) => {
      productsPage.getMainGridProductNames().then((renderedNames) => {
        expectedCatalogue.forEach((product) => {
          expect(renderedNames, 'catalogue grid').to.include(product.name);
        });
      });
    });
  });

  it('promotes the first four products in the Hot Products strip', () => {
    tagTest('Product browsing');

    productsPage.getHotProductCards().should('have.length', 4);
  });

  it('keeps the shopper on the catalogue when searching from the header', () => {
    tagTest('Product search');

    productsPage.searchFor(PRIMARY_PRODUCT.name);

    cy.location('pathname').should('eq', ROUTES.products);
    cy.location('search').should('include', 'search=iPhone');
    productsPage.getProductCard(PRIMARY_PRODUCT.name).should('be.visible');
  });
});

describe('Product catalogue | pagination', () => {
  beforeEach(() => {
    cy.interceptStorefrontApi();
    cy.loginViaUi();
    productsPage.waitUntilLoaded();
  });

  it('never renders more products than the selected page size', () => {
    tagTest('Pagination', 'critical');
    allure.description(
      'The grid is capped by the "Results per page" filter. With fewer products than the page ' +
        'size every product fits on one page, so no pagination controls are expected.',
    );

    productsPage.getResultsPerPage().then((pageSize) => {
      allure.parameter('results per page', String(pageSize));

      productsPage.getMainGridItems().should('have.length.at.most', pageSize);

      cy.wait('@catalogueFeed').then(({ response }) => {
        const catalogueSize = response.body.length;
        allure.parameter('catalogue size', String(catalogueSize));

        productsPage
          .getMainGridItems()
          .should('have.length', Math.min(catalogueSize, pageSize));

        if (catalogueSize > pageSize) {
          cy.contains('button', /^Next$/).should('be.visible');
        } else {
          productsPage.assertNoPaginationControls();
        }
      });
    });
  });

  [20, 50].forEach((pageSize) => {
    it(`keeps the whole catalogue on one page at ${pageSize} results per page`, () => {
      tagTest('Pagination');
      allure.parameter('results per page', String(pageSize));

      productsPage.setResultsPerPage(pageSize);
      productsPage.assertResultsPerPage(pageSize);

      cy.fixture('products').then(({ expectedCatalogue }) => {
        productsPage.getMainGridItems().should('have.length', expectedCatalogue.length);
      });
      productsPage.assertNoPaginationControls();
    });
  });
});
