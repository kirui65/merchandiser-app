const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { SaleCreateSchema, SaleUpdateSchema, SaleVoidSchema } = require('../models/sale.model');
const { createSale, listSales, getSale, updateSale, voidSale } = require('../controllers/sales.controller');
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
router.patch('/:id', validateBody(SaleUpdateSchema), updateSale);
router.post('/:id/void', validateBody(SaleVoidSchema), voidSale);
router.get('/:id', getSale);

module.exports = router;
