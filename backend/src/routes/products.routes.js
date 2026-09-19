const express = require('express');
const { z } = require('zod');
const { requireAuth, requireManager } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { createDoc, listDocs, updateDoc } = require('../services/firestore.service');

const ProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  defaultPrice: z.number().nonnegative(),
  category: z.string().min(1),
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
    const product = await createDoc('products', req.body);
    return res.status(201).json({ product });
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id', requireManager, async (req, res, next) => {
  try {
    const product = await updateDoc('products', req.params.id, req.body);
    return res.json({ product });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
