import BasePage from './BasePage';
import HeaderComponent from './components/HeaderComponent';
import { ROUTES, CART_RULES, currency } from '../utils/testData';

/**
 * Shopping cart page (/cart).
 *
 * Each line item is a card in the left hand column ([class*="col-span-2"]) holding the
 * thumbnail, title, unit price, a quantity stepper, the line total and a remove button.
 * The right hand column holds the coupon form and the cart totals.
 */
export default class CartPage extends BasePage {
  header = new HeaderComponent();

  constructor() {
    super(ROUTES.cart);
  }

  selectors = {
    heading: 'h1',
    itemsColumn: '[class*="col-span-2"]',
    itemTitle: 'h3',
    itemUnitPrice: 'p.text-2xl',
    quantityGroup: '[class*="space-x-2"]',
    quantityValue: 'span[class*="w-12"]',
    lineTotalColumn: '.text-right',
    lineTotal: '.text-right p',
    continueShoppingButton: 'Continue Shopping',
    clearCartButton: 'Clear Cart',
    couponInput: 'input[placeholder="Enter coupon code"]',
    applyCouponButton: 'Apply',
    couponSuccess: 'Coupon applied successfully!',
    removeCouponButton: 'Remove',
    subtotalLabel: 'Cart Subtotal:',
    shippingLabel: 'Shipping:',
    grandTotalLabel: 'Grand Total:',
    checkoutLink: 'a[href="/checkout"]',
    emptyStateHeading: 'Your cart is empty',
  };

  /**
   * Reaches the cart through the header icon.
   * Direct visits are avoided because the route guard bounces unrestored sessions back to /login.
   */
  open() {
    this.header.openCart();
    this.assertIsCurrentPage();
    return this;
  }

  assertPageStructure() {
    this.assertHeading('Shopping Cart');
    cy.contains('Apply Coupon').should('be.visible');
    cy.contains('CART TOTALS').should('be.visible');
    cy.get(this.selectors.couponInput).should('be.visible');
    cy.contains('button', this.selectors.clearCartButton).should('be.visible');
    cy.contains('button', this.selectors.continueShoppingButton).should('be.visible');
    cy.get(this.selectors.checkoutLink).should('be.visible').and('contain.text', 'Proceed to Checkout');
    return this;
  }

  getLineItems() {
    return cy.get(`${this.selectors.itemsColumn} ${this.selectors.itemTitle}`);
  }

  assertLineItemCount(expectedCount) {
    this.getLineItems().should('have.length', expectedCount);
    return this;
  }

  /**
   * Resolves a line item card by product name.
   * The rendered title also carries a trailing marketing suffix, so a partial match is used.
   */
  getLineItem(productName) {
    return cy
      .get(this.selectors.itemsColumn)
      .contains(this.selectors.itemTitle, productName)
      .closest('[class*="p-6"]');
  }

  assertLineItem({ name, price, quantity }) {
    this.getLineItem(name).within(() => {
      cy.get('img').should('have.attr', 'alt').and('include', name);
      cy.get(this.selectors.itemTitle).should('contain.text', name);
      cy.get(this.selectors.itemUnitPrice).should('have.text', `$${price}`);
      cy.get(this.selectors.quantityValue).should('have.text', String(quantity));
      cy.get(this.selectors.lineTotal)
        .first()
        .should('have.text', currency(price * quantity));
    });
    return this;
  }

  getQuantityValue(productName) {
    return this.getLineItem(productName).find(this.selectors.quantityValue);
  }

  increaseQuantity(productName) {
    this.getLineItem(productName).find(`${this.selectors.quantityGroup} button`).last().click();
    return this;
  }

  decreaseQuantity(productName) {
    this.getLineItem(productName).find(`${this.selectors.quantityGroup} button`).first().click();
    return this;
  }

  removeLineItem(productName) {
    this.getLineItem(productName).find(`${this.selectors.lineTotalColumn} button`).click();
    return this;
  }

  clearCart() {
    cy.contains('button', this.selectors.clearCartButton).click();
    return this;
  }

  applyCoupon(code) {
    cy.get(this.selectors.couponInput).clear().type(code);
    cy.contains('button', this.selectors.applyCouponButton).click();
    return this;
  }

  assertCouponApplied() {
    cy.contains(this.selectors.couponSuccess).should('be.visible');
    return this;
  }

  assertAvailableCouponsAreListed(coupons) {
    coupons.forEach((description) => cy.contains('li', description).should('be.visible'));
    return this;
  }

  /** Every rendered line total, as numbers, in display order. */
  getRenderedLineTotals() {
    return cy
      .get(`${this.selectors.itemsColumn} ${this.selectors.lineTotal}`)
      .then(($totals) =>
        Cypress.$.makeArray($totals).map((total) =>
          Number(total.textContent.replace('$', '').trim()),
        ),
      );
  }

  /** Sums what the page actually renders instead of trusting a precomputed expectation. */
  assertSubtotalMatchesRenderedLines() {
    this.getRenderedLineTotals().then((lineTotals) => {
      const expected = Number(lineTotals.reduce((sum, value) => sum + value, 0).toFixed(2));
      this.getTotalValue(this.selectors.subtotalLabel).should('have.text', currency(expected));
    });
    return this;
  }

  getTotalAmount(label) {
    return this.getTotalValue(label)
      .invoke('text')
      .then((text) => Number(text.replace('$', '').trim()));
  }

  continueShopping() {
    cy.contains('button', this.selectors.continueShoppingButton).click();
    return this;
  }

  /** Matched loosely because the current build renders the label as "Return to Stor e". */
  getEmptyStateButton() {
    return cy.contains('button', /Return to Stor/);
  }

  returnToStore() {
    this.getEmptyStateButton().click();
    return this;
  }

  getTotalValue(label) {
    return cy.contains('span', label).next('span');
  }

  assertTotals({ subtotal, grandTotal }) {
    this.getTotalValue(this.selectors.subtotalLabel).should('have.text', currency(subtotal));
    this.getTotalValue(this.selectors.shippingLabel).should(
      'have.text',
      currency(CART_RULES.displayedShipping),
    );
    this.getTotalValue(this.selectors.grandTotalLabel).should('have.text', currency(grandTotal));
    return this;
  }

  proceedToCheckout() {
    cy.get(this.selectors.checkoutLink).click();
    return this;
  }

  /** The empty state replaces the whole cart layout: no rows, no coupon form, no totals. */
  assertCartIsEmpty() {
    cy.contains('h2', this.selectors.emptyStateHeading, { timeout: 15000 }).should('be.visible');
    cy.contains('Add some products to get started!').should('be.visible');
    this.getEmptyStateButton().should('be.visible');
    cy.get(this.selectors.itemsColumn).should('not.exist');
    cy.contains('CART TOTALS').should('not.exist');
    cy.contains('Apply Coupon').should('not.exist');
    cy.contains('button', this.selectors.clearCartButton).should('not.exist');
    this.header.assertCartCount(0);
    return this;
  }
}
