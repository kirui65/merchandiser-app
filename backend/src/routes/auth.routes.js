const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { listDocs, getDoc, updateDoc } = require('../services/firestore.service');
const { requireAuth } = require('../middleware/auth.middleware');
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

/**
 * Changes the password for the currently authenticated account. The current
 * password is required so a stolen dashboard session cannot silently take
 * over an account.
 */
router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      throw new ApiError(400, 'currentPassword and newPassword are required');
    }
    if (newPassword.length < 8) {
      throw new ApiError(400, 'New password must be at least 8 characters');
    }

    const rep = await getDoc('reps', req.user.uid);
    if (!rep || !rep.active) throw new ApiError(401, 'Account is not active');
    if (!(await bcrypt.compare(currentPassword, rep.passwordHash))) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    await updateDoc('reps', rep.id, { passwordHash: await bcrypt.hash(newPassword, 12) });
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
