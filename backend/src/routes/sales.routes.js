const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { SaleCreateSchema } = require('../models/sale.model');
const { createSale, listSales, getSale } = require('../controllers/sales.controller');
const { ApiError } = require('../middleware/errorHandler');

const router = express.Router();

router.use(requireAuth);

function requireSalesReader(req, res, next) {
  if (!['rep', 'manager', 'team_leader'].includes(req.user.role)) {
    return next(new ApiError(403, 'Sales access is not available for this role'));
  }
  return next();
}

router.use(requireSalesReader);
router.post('/', validateBody(SaleCreateSchema), createSale);
router.get('/', listSales);
router.get('/:id', getSale);

module.exports = router;
