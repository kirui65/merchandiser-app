const { createDoc, getDoc, setDoc } = require('../services/firestore.service');
const { initiateStkPush, callbackIsAllowed, normalizePhone } = require('../services/mpesa.service');
const { reconcile } = require('../services/reconciliation.service');
const { ApiError } = require('../middleware/errorHandler');

async function initiatePayment(req, res, next) {
  try {
    const { phoneNumber, amount, outletId = null, accountReference = 'SALE', transactionDesc = 'Merchandiser sale' } = req.body;
    const amountKsh = Math.round(Number(amount));
    if (!phoneNumber || !Number.isFinite(Number(amount)) || amountKsh <= 0) throw new ApiError(400, 'phoneNumber and an amount of at least one shilling are required');
    const initiatedAt = new Date().toISOString();
    const response = await initiateStkPush({ phoneNumber, amount: amountKsh, accountReference, transactionDesc });
    const transaction = await setDoc('mpesaTransactions', response.CheckoutRequestID, {
      id: response.CheckoutRequestID,
      repId: req.user.uid,
      outletId,
      amount: amountKsh,
      phoneNumber: normalizePhone(phoneNumber),
      timestamp: initiatedAt,
      initiatedAt,
      status: 'pending',
      matchedSaleId: null,
      merchantRequestId: response.MerchantRequestID,
    });
    return res.status(202).json({ transaction, checkoutRequestId: response.CheckoutRequestID, customerMessage: response.CustomerMessage });
  } catch (err) {
    return next(err);
  }
}

async function callback(req, res, next) {
  try {
    if (!callbackIsAllowed(req)) throw new ApiError(401, 'Invalid callback token');
    const callbackData = req.body?.Body?.stkCallback;
    if (!callbackData?.CheckoutRequestID) throw new ApiError(400, 'Invalid Daraja callback');
    const existing = await getDoc('mpesaTransactions', callbackData.CheckoutRequestID);
    if (!existing) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    const metadata = Object.fromEntries((callbackData.CallbackMetadata?.Item || []).map((item) => [item.Name, item.Value]));
    const completed = callbackData.ResultCode === 0;
    const transactionDate = parseDarajaTransactionDate(metadata.TransactionDate);
    const callbackAt = new Date().toISOString();
    await setDoc('mpesaTransactions', callbackData.CheckoutRequestID, {
      ...existing,
      status: completed ? 'completed' : 'failed',
      amount: metadata.Amount ?? existing.amount,
      mpesaReceiptNumber: metadata.MpesaReceiptNumber || existing.mpesaReceiptNumber || null,
      phoneNumber: metadata.PhoneNumber || existing.phoneNumber,
      timestamp: transactionDate || existing.timestamp || callbackAt,
      callbackAt,
      resultCode: callbackData.ResultCode,
      resultDescription: callbackData.ResultDesc,
    });
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    return next(err);
  }
}

function parseDarajaTransactionDate(value) {
  const digits = String(value ?? '');
  if (!/^\d{14}$/.test(digits)) return null;
  const [, year, month, day, hour, minute, second] = digits.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  const utcMillis = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 3, Number(minute), Number(second));
  const date = new Date(utcMillis);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

async function getReconciliation(req, res, next) {
  try {
    const result = await reconcile({ repId: req.query.repId, from: req.query.from, to: req.query.to });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = { initiatePayment, callback, getReconciliation, parseDarajaTransactionDate };
