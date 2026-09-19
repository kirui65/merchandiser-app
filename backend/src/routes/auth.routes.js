const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { listDocs } = require('../services/firestore.service');
const { ApiError } = require('../middleware/errorHandler');
const env = require('../config/env');

const router = express.Router();

/**
 * POST /api/auth/login
 * body: { email, password }
 * Looks up the rep by email, verifies password against passwordHash,
 * issues a JWT carrying { uid, role }.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      throw new ApiError(400, 'email and password are required');
    }

    const matches = await listDocs('reps', { where: [['email', '==', email]], limit: 1 });
    const rep = matches[0];

    if (!rep || !rep.active) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const valid = await bcrypt.compare(password, rep.passwordHash);
    if (!valid) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const token = jwt.sign({ uid: rep.id, role: rep.role }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });

    return res.json({
      token,
      user: { id: rep.id, name: rep.name, email: rep.email, role: rep.role },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
