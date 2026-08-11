import BasePage from './BasePage';
import HeaderComponent from './components/HeaderComponent';
import { ROUTES } from '../utils/testData';

/**
 * Account dashboard (/dashboard): a welcome banner, four summary tiles
 * (Total Orders, Cart Items, Wishlist, Total Spent) and the profile form.
 */
export default class DashboardPage extends BasePage {
  header = new HeaderComponent();

  constructor() {
    super(ROUTES.dashboard);
  }

  selectors = {
    welcomeHeading: 'h1',
    statLabel: 'p.text-sm',
    statValue: 'p.text-2xl',
  };

  /** Reached through the header brand link so the SPA keeps the restored session. */
  open() {
    this.header.openDashboard();
    this.assertIsCurrentPage();
    return this;
  }

  /** Yields the value rendered underneath a summary tile label, e.g. "Cart Items". */
  getStatValue(label) {
    return cy.contains(this.selectors.statLabel, label).siblings(this.selectors.statValue);
  }

  assertWelcomesUser() {
    this.getHeading().should('contain.text', 'Welcome back');
    return this;
  }

  assertStatsAreRendered() {
    ['Total Orders', 'Cart Items', 'Wishlist', 'Total Spent'].forEach((label) => {
      this.getStatValue(label).should('be.visible').and('not.be.empty');
    });
    return this;
  }
}
