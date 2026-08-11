const { defineConfig } = require('cypress');
const { allureCypress } = require('allure-cypress/reporter');
const os = require('node:os');

module.exports = defineConfig({
  projectId: 'techmart-add-to-cart',
  e2e: {
    baseUrl: 'https://j-mg6317frew-ecommv01-shv02.lovable.app',
    specPattern: 'cypress/e2e/**/*.cy.js',
    // Executable bug reports for defects in the application; run them on demand
    // with `npm run cy:run:defects` instead of failing the regression suite.
    excludeSpecPattern: 'cypress/e2e/defects/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    fixturesFolder: 'cypress/fixtures',
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    defaultCommandTimeout: 12000,
    requestTimeout: 20000,
    responseTimeout: 30000,
    pageLoadTimeout: 60000,
    viewportWidth: 1440,
    viewportHeight: 900,
    video: true,
    screenshotOnRunFailure: true,
    retries: {
      runMode: 1,
      openMode: 0,
    },
    setupNodeEvents(on, config) {
      allureCypress(on, config, {
        resultsDir: 'allure-results',
        environmentInfo: {
          app_under_test: config.baseUrl,
          supabase_url: config.env.supabaseUrl,
          os_platform: os.platform(),
          os_release: os.release(),
          node_version: process.version,
          cypress_version: require('cypress/package.json').version,
        },
      });

      return config;
    },
  },
});
