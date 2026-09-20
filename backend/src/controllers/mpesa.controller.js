const { createDoc, getDoc, setDoc } = require('../services/firestore.service');
const { initiateStkPush, callbackIsAllowed, normalizePhone } = require('../services/mpesa.service');
const { reconcile } = require('../services/reconciliation.service');
const { ApiError } = require('../middleware/errorHandler');

async function initiatePayment(req, res, next) {
  try {
    const { phoneNumber, amount, outletId = null, accountReference = 'SALE', transactionDesc = 'Merchandiser sale' } = req.body;
    if (!phoneNumber || !Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new ApiError(400, 'phoneNumber and a positive amount are required');
    const response = await initiateStkPush({ phoneNumber, amount, accountReference, transactionDesc });
    const transaction = await setDoc('mpesaTransactions', response.CheckoutRequestID, {
      id: response.CheckoutRequestID,
      repId: req.user.uid,
      outletId,
      amount: Number(amount),
      phoneNumber: normalizePhone(phoneNumber),
      timestamp: new Date().toISOString(),
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
    await setDoc('mpesaTransactions', callbackData.CheckoutRequestID, {
      ...existing,
      status: completed ? 'completed' : 'failed',
      amount: metadata.Amount ?? existing.amount,
      mpesaReceiptNumber: metadata.MpesaReceiptNumber || existing.mpesaReceiptNumber || null,
      phoneNumber: metadata.PhoneNumber || existing.phoneNumber,
      timestamp: new Date().toISOString(),
      resultCode: callbackData.ResultCode,
      resultDescription: callbackData.ResultDesc,
    });
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    return next(err);
  }
}

async function getReconciliation(req, res, next) {
  try {
    const result = await reconcile({ repId: req.query.repId, from: req.query.from, to: req.query.to });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = { initiatePayment, callback, getReconciliation };
