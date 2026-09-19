const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { SaleCreateSchema } = require('../models/sale.model');
const { createSale, listSales, getSale } = require('../controllers/sales.controller');

const router = express.Router();

router.use(requireAuth);

router.post('/', validateBody(SaleCreateSchema), createSale);
router.get('/', listSales);
router.get('/:id', getSale);

module.exports = router;
