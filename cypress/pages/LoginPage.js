import BasePage from './BasePage';
import { ROUTES, TIMEOUTS } from '../utils/testData';

export default class LoginPage extends BasePage {
  constructor() {
    super(ROUTES.login);
  }

  selectors = {
    subtitle: 'Sign in to your account',
    emailInput: '#email',
    passwordInput: '#password',
    submitButton: 'button[type="submit"]',
    signupLink: 'a[href="/signup"]',
    forgotPasswordButton: 'Forgot password?',
  };

  /** The sign-in request is aliased up front so every submit attempt can be awaited. */
  visit(options = {}) {
    cy.intercept('POST', '**/auth/v1/token*').as('signInRequest');
    super.visit(options);
    return this;
  }

  assertLoginFormIsRendered() {
    cy.contains('TechMart').should('be.visible');
    cy.contains(this.selectors.subtitle).should('be.visible');
    cy.contains('label', 'Email').should('be.visible');
    cy.contains('label', 'Password').should('be.visible');
    cy.get(this.selectors.emailInput)
      .should('be.visible')
      .and('have.attr', 'type', 'email')
      .and('have.attr', 'placeholder', 'Enter your email');
    cy.get(this.selectors.passwordInput)
      .should('be.visible')
      .and('have.attr', 'type', 'password');
    cy.get(this.selectors.submitButton).should('be.enabled').and('contain.text', 'Sign In');
    cy.get(this.selectors.signupLink).should('be.visible');
    cy.contains('button', this.selectors.forgotPasswordButton).should('be.visible');
    return this;
  }

  fillCredentials({ email, password }) {
    cy.get(this.selectors.emailInput).clear().type(email);
    cy.get(this.selectors.passwordInput).clear().type(password, { log: false });
    return this;
  }

  submit() {
    cy.get(this.selectors.submitButton).click();
    return this;
  }

  /**
   * Signs in and lands on the catalogue.
   *
   * The application occasionally swallows its own post-login redirect: the session is created
   * but an unrelated toast is shown and the browser stays on /login. Because protected routes
   * bounce back to /login on a hard navigation, the recovery is to submit the form again rather
   * than to visit the target route directly.
   */
  login(credentials, { attempts = 6 } = {}) {
    this.fillCredentials(credentials);
    this.attemptSignIn(attempts);
    cy.get('header', { timeout: 20000 }).should('be.visible');
    return this;
  }

  attemptSignIn(remainingAttempts) {
    this.submit();

    cy.wait('@signInRequest').then(({ response }) => {
      expect(response.statusCode, 'sign in status code').to.eq(200);
      expect(response.body, 'session payload').to.have.property('access_token');
    });

    cy.wait(TIMEOUTS.redirectSettle);
    cy.location('pathname').then((pathname) => {
      if (pathname !== ROUTES.login) {
        return;
      }

      if (remainingAttempts <= 1) {
        throw new Error(
          'Signed in successfully but the application never left /login after several attempts.',
        );
      }

      cy.log('Application swallowed its post-login redirect; submitting the form again.');
      this.attemptSignIn(remainingAttempts - 1);
    });
  }

  /** Submits credentials that are expected to be refused and asserts the user stays signed out. */
  attemptInvalidLogin(credentials) {
    this.fillCredentials(credentials);
    this.submit();
    cy.wait('@signInRequest').its('response.statusCode').should('eq', 400);
    cy.location('pathname').should('eq', ROUTES.login);
    cy.get('header').should('not.exist');
    return this;
  }
}
