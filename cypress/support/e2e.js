import 'allure-cypress';
import './commands';

// The application logs handled Supabase/React warnings to the console and can throw
// unhandled ResizeObserver noise from the UI library. Neither invalidates a test run.
Cypress.on('uncaught:exception', (error) => {
  if (/ResizeObserver loop/.test(error.message)) {
    return false;
  }

  return true;
});
