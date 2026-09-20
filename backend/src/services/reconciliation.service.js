const env = require('../config/env');
const { listDocs, updateDoc } = require('./firestore.service');

function toMillis(value) {
	if (value?.toMillis) return value.toMillis();
	return new Date(value).getTime();
}

function reconcileRecords(sales, transactions, windowMinutes = env.reconciliationWindowMinutes) {
	const windowMs = windowMinutes * 60 * 1000;
	const usedSales = new Set();
	const matches = [];
	const unmatchedTransactions = [];

	for (const transaction of transactions) {
		const candidates = sales
			.filter((sale) => !usedSales.has(sale.id) && sale.repId === transaction.repId && Number(sale.total) === Number(transaction.amount))
			.filter((sale) => Math.abs(toMillis(sale.timestamp) - toMillis(transaction.timestamp)) <= windowMs)
			.sort((a, b) => toMillis(a.timestamp) - toMillis(b.timestamp));
		const sale = candidates[0];
		if (!sale) unmatchedTransactions.push(transaction);
		else {
			usedSales.add(sale.id);
			matches.push({ transaction, sale });
		}
	}

	return { matches, unmatchedTransactions, unmatchedSales: sales.filter((sale) => !usedSales.has(sale.id)) };
}

async function reconcile({ repId, from, to }) {
	const salesWhere = repId ? [['repId', '==', repId]] : [];
	const transactionWhere = repId ? [['repId', '==', repId]] : [];
	const sales = await listDocs('sales', { where: salesWhere });
	const transactions = (await listDocs('mpesaTransactions', { where: transactionWhere })).filter((transaction) => transaction.status === 'completed');
	const filteredSales = sales.filter((sale) => (!from || toMillis(sale.timestamp) >= new Date(from).getTime()) && (!to || toMillis(sale.timestamp) <= new Date(to).getTime()));
	const filteredTransactions = transactions.filter((txn) => (!from || toMillis(txn.timestamp) >= new Date(from).getTime()) && (!to || toMillis(txn.timestamp) <= new Date(to).getTime()));
	const result = reconcileRecords(filteredSales, filteredTransactions);
	await Promise.all(result.matches.flatMap(({ transaction, sale }) => [
		updateDoc('mpesaTransactions', transaction.id, { matchedSaleId: sale.id, status: 'completed' }),
	]));
	return result;
}

module.exports = { reconcileRecords, reconcile };
