import BasePage from './BasePage';
import HeaderComponent from './components/HeaderComponent';
import { ROUTES } from '../utils/testData';

/**
 * Catalogue page (/products).
 *
 * Layout notes that drive the selectors:
 * - The catalogue itself is loaded from the static feed /api/products.json.
 * - Every product renders as a card whose root element carries the `group` class.
 * - The first four products are duplicated into a "Hot Products" strip above the main grid,
 *   so lookups intentionally resolve the first matching card.
 */
export default class ProductsPage extends BasePage {
  header = new HeaderComponent();

  constructor() {
    super(ROUTES.products);
  }

  selectors = {
    heading: 'h1',
    loadingText: 'Loading products...',
    hotProductsHeading: 'h2',
    productCard: '.group',
    /** Only the paginated grid wraps each card in a bare `relative` div. */
    mainGridItem: '.grid > .relative',
    cardTitle: 'h3',
    cardPrice: 'p.text-2xl',
    cardStock: 'p.text-sm',
    wishlistButton: 'button.absolute',
    filterOption: '[role="option"]',
  };

  /**
   * Reaches the catalogue through the header.
   * Direct visits are avoided because the route guard bounces unrestored sessions back to /login.
   */
  open() {
    this.header.openProducts();
    this.waitUntilLoaded();
    return this;
  }

  waitUntilLoaded() {
    cy.contains(this.selectors.loadingText).should('not.exist');
    cy.get(this.selectors.productCard, { timeout: 20000 }).should('have.length.greaterThan', 0);
    return this;
  }

  assertPageStructure() {
    this.assertHeading('Products');
    cy.contains(this.selectors.hotProductsHeading, 'Hot Products').should('be.visible');
    cy.contains('label', 'Currency').should('be.visible');
    cy.contains('label', 'Price Range').should('be.visible');
    cy.contains('label', 'Results per page').should('be.visible');
    cy.contains('label', 'Sort by').should('be.visible');
    return this;
  }

  getProductCard(productName) {
    return cy.contains(this.selectors.cardTitle, productName).closest(this.selectors.productCard);
  }

  /** The footer call to action; the heart button is the only other button inside a card. */
  getAddToCartButton(productName) {
    return this.getProductCard(productName).find('button').last();
  }

  assertProductCard({ name, price, stock }) {
    this.getProductCard(name).within(() => {
      cy.get('img').should('have.attr', 'alt', name).and('be.visible');
      cy.get(this.selectors.cardTitle).should('have.text', name);
      cy.get(this.selectors.cardPrice).should('have.text', `$${price}`);
      cy.contains('Stock:').should('contain.text', String(stock));
      cy.get('button').last().should('be.enabled');
    });
    return this;
  }

  searchFor(term) {
    this.header.searchFor(term);
    this.waitUntilLoaded();
    return this;
  }

  addProductToCart(productName) {
    this.getAddToCartButton(productName).should('be.enabled').click();
    return this;
  }

  selectFilterOption(labelText, optionText) {
    cy.contains('label', labelText).siblings('button').click();
    cy.get(this.selectors.filterOption).contains(optionText).click();
    return this;
  }

  getPriceRangeSlider() {
    return cy.get('[role="slider"]');
  }

  /** Cards in the paginated grid, excluding the duplicated "Hot Products" strip above it. */
  getMainGridItems() {
    return cy.get(this.selectors.mainGridItem);
  }

  getHotProductCards() {
    return cy
      .contains(this.selectors.hotProductsHeading, 'Hot Products')
      .siblings('div')
      .find(this.selectors.productCard);
  }

  /** The Radix trigger renders the active option, so its text is the current page size. */
  getResultsPerPage() {
    return cy
      .contains('label', 'Results per page')
      .siblings('button')
      .invoke('text')
      .then((text) => Number(text.trim()));
  }

  setResultsPerPage(size) {
    this.selectFilterOption('Results per page', String(size));
    return this;
  }

  assertResultsPerPage(size) {
    cy.contains('label', 'Results per page')
      .siblings('button')
      .should('contain.text', String(size));
    return this;
  }

  /** Product names rendered in the paginated grid, in display order. */
  getMainGridProductNames() {
    return this.getMainGridItems()
      .find(this.selectors.cardTitle)
      .then(($titles) => Cypress.$.makeArray($titles).map((title) => title.textContent.trim()));
  }

  assertNoPaginationControls() {
    cy.contains('button', /^(Next|Previous)$/).should('not.exist');
    cy.get('nav[aria-label*="pagination" i]').should('not.exist');
    return this;
  }
}
