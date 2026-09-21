const express = require('express');
const { z } = require('zod');
const { requireAuth, requireManager } = require('../middleware/auth.middleware');
const { getDoc, listDocs, setDoc } = require('../services/firestore.service');
const { ApiError } = require('../middleware/errorHandler');

const TargetSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be YYYY-MM'),
  amount: z.number().nonnegative(),
});

const router = express.Router();

function monthRange(month) {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

async function salesTotal(repId, month) {
  const { from, to } = monthRange(month);
  const sales = await listDocs('sales', {
    where: [['repId', '==', repId], ['timestamp', '>=', from], ['timestamp', '<', to]],
    orderBy: { field: 'timestamp', direction: 'desc' },
  });
  return Number(sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0).toFixed(2));
}

router.use(requireAuth);

router.get('/me', async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new ApiError(400, 'Month must be YYYY-MM');
    const target = await getDoc('salesTargets', `${req.user.uid}_${month}`);
    const current = await salesTotal(req.user.uid, month);
    return res.json({ month, current, target: Number(target?.amount || 0) });
  } catch (err) {
    return next(err);
  }
});

router.get('/', requireManager, async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new ApiError(400, 'Month must be YYYY-MM');
    const targets = await listDocs('salesTargets', { where: [['month', '==', month]] });
    return res.json({ month, targets });
  } catch (err) {
    return next(err);
  }
});

router.put('/:repId', requireManager, async (req, res, next) => {
  try {
    const parsed = TargetSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'Invalid sales target', parsed.error.flatten());
    const rep = await getDoc('reps', req.params.repId);
    if (!rep) throw new ApiError(404, 'Rep not found');
    const { month, amount } = parsed.data;
    const id = `${req.params.repId}_${month}`;
    const existing = await getDoc('salesTargets', id);
    const target = await setDoc('salesTargets', id, {
      repId: req.params.repId,
      month,
      amount,
      ...(existing?.createdAt ? { createdAt: existing.createdAt } : {}),
    });
    return res.json({ target });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
