const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { ApiError } = require('./errorHandler');

/**
 * Verifies the JWT and attaches { uid, role } to req.user.
 * This is the REAL authorization boundary for the app (see shared/firestoreSchema.md
 * — firestore.rules is a backstop only, since all writes use the Admin SDK).
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Missing or malformed Authorization header'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { uid: payload.uid, role: payload.role };
    return next();
  } catch (err) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}

/**
 * Restricts a route to managers only. Use after requireAuth.
 */
function requireManager(req, res, next) {
  if (!req.user || req.user.role !== 'manager') {
    return next(new ApiError(403, 'Manager role required'));
  }
  return next();
}

/**
 * Scopes a rep-owned resource: a rep may only act on their own repId; a
 * manager may act on any repId. Expects the target repId to already be
 * resolved onto req (e.g. req.params.repId or the record just fetched) —
 * call scopeCheck(req.user, targetRepId) inside controllers doing per-doc
 * checks, e.g. after fetching a sale to confirm req.user.uid === sale.repId.
 */
function scopeCheck(user, targetRepId) {
  if (user.role === 'manager') return true;
  return user.uid === targetRepId;
}

module.exports = { requireAuth, requireManager, scopeCheck };
