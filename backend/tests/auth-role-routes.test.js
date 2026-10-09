const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'role-route-test-secret';

const express = require('express');
const bcrypt = require('bcryptjs');
const firestore = require('../src/services/firestore.service');
const rep = {
  id: 'rep-test',
  name: 'Test Merchandiser',
  email: 'rep@example.test',
  passwordHash: 'test-hash',
  role: 'rep',
  active: true,
};
firestore.listDocs = async () => [rep];
firestore.createDoc = async () => ({ id: 'event-test' });
bcrypt.compare = async () => true;

const authRoutes = require('../src/routes/auth.routes');
const { errorHandler } = require('../src/middleware/errorHandler');

async function withServer(run) {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    const address = server.address();
    return await run(`http://127.0.0.1:${address.port}/api/auth/login`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('login rejects a mismatched picked role without issuing a token', async () => {
  await withServer(async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: rep.email, password: 'valid', role: 'admin' }),
    });
    const body = await response.json();
    assert.equal(response.status, 403);
    assert.equal(body.error.message, 'This account is not registered as admin');
    assert.equal('token' in body, false);
  });
});

test('login accepts a matching picked role and returns the stored server role', async () => {
  await withServer(async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: rep.email, password: 'valid', role: 'merchandiser' }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.user.role, 'rep');
    assert.equal(typeof body.token, 'string');
  });
});

test('dashboard login remains valid when no role is supplied', async () => {
  await withServer(async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: rep.email, password: 'valid' }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.user.role, 'rep');
  });
});
