/**
 * Shared behaviour for every page object: navigation, common assertions and
 * small helpers that keep the concrete pages free of Cypress boilerplate.
 */
export default class BasePage {
  /** @param {string} path route the page lives on, e.g. "/cart" */
  constructor(path) {
    this.path = path;
  }

  visit(options = {}) {
    cy.visit(this.path, options);
    return this;
  }

  assertIsCurrentPage() {
    cy.location('pathname', { timeout: 15000 }).should('eq', this.path);
    return this;
  }

  getHeading(level = 'h1') {
    return cy.get(level);
  }

  assertHeading(text, level = 'h1') {
    this.getHeading(level).should('be.visible').and('contain.text', text);
    return this;
  }

  /** Scoped `contains` that avoids leaking into unrelated parts of the DOM. */
  containsWithin(container, selector, text) {
    return cy.get(container).contains(selector, text);
  }
}
