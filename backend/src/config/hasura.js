const axios = require('axios');

const HASURA_URL = process.env.HASURA_GRAPHQL_URL;
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;

/**
 * Execute a GraphQL query or mutation against Hasura.
 * @param {string} query - GraphQL query/mutation string
 * @param {object} variables - Variables object
 * @param {string} [role] - Optional Hasura role header
 * @param {string} [userId] - Optional user ID for x-hasura-user-id
 */
async function gql(query, variables = {}, role = null, userId = null) {
  const headers = {
    'Content-Type': 'application/json',
    'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
  };

  if (role) headers['x-hasura-role'] = role;
  if (userId) headers['x-hasura-user-id'] = userId;

  const response = await axios.post(
    HASURA_URL,
    { query, variables },
    { headers }
  );

  if (response.data.errors) {
    const msg = response.data.errors.map((e) => e.message).join(', ');
    throw new Error(`GraphQL error: ${msg}`);
  }

  return response.data.data;
}

module.exports = { gql };
