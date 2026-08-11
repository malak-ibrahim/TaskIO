/**
 * Thin wrapper around the Supabase endpoints that back TechMart.
 *
 * The storefront talks to Supabase directly from the browser, so the same REST
 * surface is what the API specs assert against:
 *   POST   /auth/v1/token?grant_type=password   -> session + access token
 *   GET    /rest/v1/products                    -> catalogue
 *   CRUD   /rest/v1/cart_items                  -> cart contents (row level secured per user)
 */

const supabaseUrl = () => Cypress.env('supabaseUrl');
const anonKey = () => Cypress.env('supabaseAnonKey');

export const restUrl = (resource) => `${supabaseUrl()}/rest/v1/${resource}`;
export const authUrl = (path) => `${supabaseUrl()}/auth/v1/${path}`;

const baseHeaders = (accessToken) => ({
  apikey: anonKey(),
  'Content-Type': 'application/json',
  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
});

/** Sign a user in and return the raw response so specs can assert on status and body. */
export const authenticate = ({ email, password, failOnStatusCode = true }) =>
  cy.request({
    method: 'POST',
    url: `${authUrl('token')}?grant_type=password`,
    headers: baseHeaders(),
    body: { email, password },
    failOnStatusCode,
  });

export const getProducts = (accessToken, { select = '*', order = 'id.asc' } = {}) =>
  cy.request({
    method: 'GET',
    url: restUrl('products'),
    qs: { select, order },
    headers: baseHeaders(accessToken),
  });

export const getProductById = (accessToken, productId) =>
  cy.request({
    method: 'GET',
    url: restUrl('products'),
    qs: { select: '*', id: `eq.${productId}` },
    headers: baseHeaders(accessToken),
  });

/** Cart rows joined with their product, mirroring the select the storefront performs. */
export const getCartItems = (accessToken, userId) =>
  cy.request({
    method: 'GET',
    url: restUrl('cart_items'),
    qs: {
      select: 'id,product_id,quantity,selected_color,selected_size,products(name,price,images)',
      user_id: `eq.${userId}`,
    },
    headers: baseHeaders(accessToken),
  });

export const addCartItem = (
  accessToken,
  { userId, productId, quantity = 1, selectedColor = null, selectedSize = null, failOnStatusCode = true } = {},
) =>
  cy.request({
    method: 'POST',
    url: restUrl('cart_items'),
    headers: { ...baseHeaders(accessToken), Prefer: 'return=representation' },
    body: {
      user_id: userId,
      product_id: productId,
      quantity,
      selected_color: selectedColor,
      selected_size: selectedSize,
    },
    failOnStatusCode,
  });

export const updateCartItemQuantity = (accessToken, cartItemId, quantity) =>
  cy.request({
    method: 'PATCH',
    url: restUrl('cart_items'),
    qs: { id: `eq.${cartItemId}` },
    headers: { ...baseHeaders(accessToken), Prefer: 'return=representation' },
    body: { quantity },
  });

export const deleteCartItem = (accessToken, cartItemId) =>
  cy.request({
    method: 'DELETE',
    url: restUrl('cart_items'),
    qs: { id: `eq.${cartItemId}` },
    headers: { ...baseHeaders(accessToken), Prefer: 'return=representation' },
  });

export const clearCart = (accessToken, userId) =>
  cy.request({
    method: 'DELETE',
    url: restUrl('cart_items'),
    qs: { user_id: `eq.${userId}` },
    headers: { ...baseHeaders(accessToken), Prefer: 'return=representation' },
  });
