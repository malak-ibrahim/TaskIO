import { ROUTES } from '../../utils/testData';

/**
 * The authenticated site header: brand, product search, navigation icons,
 * cart badge and the logout control. Rendered on every signed-in page.
 */
export default class HeaderComponent {
  selectors = {
    root: 'header',
    brand: 'header a[href="/dashboard"]',
    searchInput: 'header input[placeholder="Search products..."]',
    productsLink: 'header a[href="/products"]',
    wishlistLink: 'header a[href="/wishlist"]',
    cartLink: 'header a[href="/cart"]',
    cartBadge: 'header a[href="/cart"] span',
    ordersLink: 'header a[href="/orders"]',
    userName: 'header nav span.text-sm',
    logoutButton: 'header button',
  };

  get root() {
    return cy.get(this.selectors.root, { timeout: 20000 });
  }

  assertIsVisible() {
    this.root.should('be.visible');
    cy.get(this.selectors.brand).should('have.text', 'TechMart');
    cy.get(this.selectors.searchInput).should('be.visible');
    cy.get(this.selectors.productsLink).should('be.visible');
    cy.get(this.selectors.cartLink).should('be.visible');
    return this;
  }

  assertUserIsSignedIn() {
    cy.get(this.selectors.userName).should('be.visible').and('not.be.empty');
    this.logoutButton.should('be.visible').and('contain.text', 'Logout');
    return this;
  }

  get logoutButton() {
    return cy.contains(`${this.selectors.root} button`, 'Logout');
  }

  searchFor(term) {
    cy.get(this.selectors.searchInput).clear().type(`${term}{enter}`);
    cy.location('search').should('include', 'search=');
    return this;
  }

  openProducts() {
    cy.get(this.selectors.productsLink).click();
    cy.location('pathname').should('eq', ROUTES.products);
    return this;
  }

  openDashboard() {
    cy.get(this.selectors.brand).click();
    cy.location('pathname').should('eq', ROUTES.dashboard);
    return this;
  }

  openCart() {
    cy.get(this.selectors.cartLink).click();
    cy.location('pathname').should('eq', ROUTES.cart);
    return this;
  }

  /** The badge is only rendered when the cart holds at least one unit. */
  assertCartCount(expectedCount) {
    if (expectedCount === 0) {
      cy.get(this.selectors.cartBadge).should('not.exist');
    } else {
      cy.get(this.selectors.cartBadge, { timeout: 15000 })
        .should('be.visible')
        .and('have.text', String(expectedCount));
    }
    return this;
  }

  /** Yields the badge value as a number, or 0 when no badge is rendered. */
  getCartUnitCount() {
    return cy.get(this.selectors.root).then(($header) => {
      const badge = $header.find('a[href="/cart"] span');
      return badge.length ? Number(badge.text().trim()) : 0;
    });
  }

  logout() {
    this.logoutButton.click();
    cy.location('pathname').should('eq', ROUTES.login);
    return this;
  }
}
