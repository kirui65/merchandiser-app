const express = require('express');
const { z } = require('zod');
const { requireAuth, requireManager } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { createDoc, listDocs, getDoc, updateDoc } = require('../services/firestore.service');
const { ApiError } = require('../middleware/errorHandler');

const ProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  defaultPrice: z.number().nonnegative(),
  category: z.string().min(1),
});

const ProductStatusSchema = z.object({
  active: z.boolean(),
});

const router = express.Router();

router.use(requireAuth);

// Products are read by all authenticated users (reps need the catalog for
// sale entry); only managers can create/edit.
router.get('/', async (req, res, next) => {
  try {
    const products = await listDocs('products');
    return res.json({ products });
  } catch (err) {
    return next(err);
  }
});

router.post('/', requireManager, validateBody(ProductSchema), async (req, res, next) => {
  try {
    const product = await createDoc('products', { ...req.body, active: true });
    return res.status(201).json({ product });
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id', requireManager, validateBody(ProductSchema), async (req, res, next) => {
  try {
    const existing = await getDoc('products', req.params.id);
    if (!existing) throw new ApiError(404, 'Product not found');
    const product = await updateDoc('products', req.params.id, req.body);
    return res.json({ product });
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id/status', requireManager, validateBody(ProductStatusSchema), async (req, res, next) => {
  try {
    const existing = await getDoc('products', req.params.id);
    if (!existing) throw new ApiError(404, 'Product not found');
    const product = await updateDoc('products', req.params.id, req.body);
    return res.json({ product });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
