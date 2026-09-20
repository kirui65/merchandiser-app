const env = require('../config/env');
const { ApiError } = require('../middleware/errorHandler');

function baseUrl() {
	return env.daraja.env === 'production'
		? 'https://api.safaricom.co.ke'
		: 'https://sandbox.safaricom.co.ke';
}

function normalizePhone(phoneNumber) {
	const digits = String(phoneNumber).replace(/\D/g, '');
	if (digits.startsWith('0')) return `254${digits.slice(1)}`;
	if (digits.startsWith('254')) return digits;
	throw new ApiError(400, 'phoneNumber must be a Kenyan number');
}

async function getAccessToken() {
	const credentials = Buffer.from(`${env.daraja.consumerKey}:${env.daraja.consumerSecret}`).toString('base64');
	const response = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
		headers: { Authorization: `Basic ${credentials}` },
	});
	if (!response.ok) throw new ApiError(502, `Daraja OAuth failed with HTTP ${response.status}`);
	const data = await response.json();
	return data.access_token;
}

function stkPassword(timestamp) {
	return Buffer.from(`${env.daraja.shortcode}${env.daraja.passkey}${timestamp}`).toString('base64');
}

async function initiateStkPush({ phoneNumber, amount, accountReference, transactionDesc }) {
	if (!env.daraja.consumerKey || !env.daraja.consumerSecret || !env.daraja.shortcode || !env.daraja.passkey || !env.daraja.callbackUrl) {
		throw new ApiError(503, 'M-Pesa is not configured');
	}
	const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
	const response = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${await getAccessToken()}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			BusinessShortCode: env.daraja.shortcode,
			Password: stkPassword(timestamp),
			Timestamp: timestamp,
			TransactionType: 'CustomerPayBillOnline',
			Amount: Math.round(amount),
			PartyA: normalizePhone(phoneNumber),
			PartyB: env.daraja.shortcode,
			PhoneNumber: normalizePhone(phoneNumber),
			CallBackURL: env.daraja.callbackUrl,
			AccountReference: accountReference,
			TransactionDesc: transactionDesc,
		}),
	});
	const data = await response.json();
	if (!response.ok || data.ResponseCode !== '0') throw new ApiError(502, data.errorMessage || data.ResponseDescription || 'Daraja STK push failed', data);
	return data;
}

function callbackIsAllowed(req) {
	return !env.daraja.callbackToken || req.get('x-callback-token') === env.daraja.callbackToken;
}

module.exports = { initiateStkPush, normalizePhone, callbackIsAllowed };
