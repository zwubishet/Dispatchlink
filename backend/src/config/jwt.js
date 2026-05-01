const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Build a Hasura-compatible JWT payload.
 * Hasura reads claims from the "https://hasura.io/jwt/claims" namespace.
 */
function buildHasuraToken(user) {
  const payload = {
    sub: user.id,
    name: user.name,
    role: user.role,
    'https://hasura.io/jwt/claims': {
      'x-hasura-allowed-roles': [user.role, 'anonymous'],
      'x-hasura-default-role': user.role,
      'x-hasura-user-id': user.id,
    },
  };
  return signToken(payload);
}

module.exports = { signToken, verifyToken, buildHasuraToken };
