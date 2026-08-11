/**
 * Central place for routes, expected business data and app-specific constants.
 * Keeping them out of the specs makes the suite readable and easy to retarget.
 */

export const ROUTES = {
  login: '/login',
  signup: '/signup',
  products: '/products',
  cart: '/cart',
  wishlist: '/wishlist',
  checkout: '/checkout',
  dashboard: '/dashboard',
};

export const CREDENTIALS = {
  get valid() {
    return {
      email: Cypress.env('userEmail'),
      password: Cypress.env('userPassword'),
    };
  },
  invalid: {
    email: 'not-a-user@example.com',
    password: 'WrongPassword!1',
  },
};

/** Product used across the Add to Cart journey. Priced and stocked in both the catalogue feed and the database. */
export const PRIMARY_PRODUCT = {
  id: 1,
  name: 'iPhone 14 Pro',
  price: 999.99,
  stock: 50,
  brand: 'Apple',
  category: 'smartphones',
};

/** Second and third products, used to prove the cart aggregates multiple line items. */
export const SECONDARY_PRODUCT = {
  id: 4,
  name: 'Sony WH-1000XM4',
  price: 349.99,
  stock: 75,
  brand: 'Sony',
  category: 'headphones',
};

export const THIRD_PRODUCT = {
  id: 5,
  name: 'iPad Air 5th Gen',
  price: 599.99,
  stock: 40,
  brand: 'Apple',
  category: 'tablets',
};

/** The two coupons the cart page advertises, with the discounts they promise. */
export const COUPONS = {
  percentage: {
    code: 'SAVE10',
    label: 'SAVE10 - 10% off orders over $100',
    type: 'percentage',
    amount: 10,
    minimumSpend: 100,
  },
  fixed: {
    code: 'WELCOME20',
    label: 'WELCOME20 - $20 off orders over $50',
    type: 'fixed',
    amount: 20,
    minimumSpend: 50,
  },
  invalid: 'NOT-A-REAL-COUPON',
};

export const discountFor = (coupon, subtotal) =>
  Number(
    (coupon.type === 'percentage' ? (subtotal * coupon.amount) / 100 : coupon.amount).toFixed(2),
  );

/**
 * Cart maths as implemented by the application:
 * - "Cart Subtotal" is the sum of price x quantity.
 * - "Shipping" is a hard-coded display value.
 * - "Grand Total" is subtotal + a flat 100 surcharge (it ignores the shipping figure it renders).
 */
export const CART_RULES = {
  displayedShipping: 7.99,
  grandTotalSurcharge: 100,
  /** The client blocks any quantity update of 3 or more, so 2 is the highest reachable quantity. */
  maxReachableQuantity: 2,
};

export const TIMEOUTS = {
  /** The login screen redirects client-side after the profile request resolves. */
  redirectSettle: 3000,
  apiRequest: 20000,
};

export const currency = (value) => `$${Number(value).toFixed(2)}`;

export const subtotalOf = (lines) =>
  Number(lines.reduce((total, line) => total + line.price * line.quantity, 0).toFixed(2));

export const grandTotalOf = (lines) =>
  Number((subtotalOf(lines) + CART_RULES.grandTotalSurcharge).toFixed(2));
