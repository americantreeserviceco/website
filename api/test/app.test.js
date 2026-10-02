const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const { createApp } = require('../src/app');

class FakeDatabase {
  constructor() {
    this.tables = new Map();
  }

  from(table) {
    if (!this.tables.has(table)) this.tables.set(table, []);
    const rows = this.tables.get(table);
    const query = { operation: 'select', filters: [], payload: null };
    const builder = {
      select() { return builder; },
      order() { return builder; },
      limit() { return builder; },
      eq(column, value) { query.filters.push([column, value]); return builder; },
      insert(payload) { query.operation = 'insert'; query.payload = payload; return builder; },
      update(payload) { query.operation = 'update'; query.payload = payload; return builder; },
      delete() { query.operation = 'delete'; return builder; },
      async single() { return { data: execute()[0] || null, error: null }; },
      async maybeSingle() { return { data: execute()[0] || null, error: null }; },
      then(resolve, reject) { return Promise.resolve({ data: execute(), error: null }).then(resolve, reject); },
    };

    function execute() {
      const matching = rows.filter((row) => query.filters.every(([key, value]) => row[key] === value));
      if (query.operation === 'insert') {
        const record = { id: randomUUID(), created_at: new Date().toISOString(), ...query.payload };
        rows.push(record);
        return [record];
      }
      if (query.operation === 'update') {
        for (const row of matching) Object.assign(row, query.payload);
        return matching;
      }
      if (query.operation === 'delete') {
        for (const row of matching) rows.splice(rows.indexOf(row), 1);
        return matching;
      }
      return matching;
    }

    return builder;
  }
}

async function withApi(t, options = {}) {
  const db = options.db || new FakeDatabase();
  const getUserForToken = options.getUserForToken || (async (token) => ({
    data: { user: token === 'staff-token' ? { app_metadata: { role: 'staff' } } : { app_metadata: {} } },
    error: null,
  }));
  const server = createApp({ db, getUserForToken }).listen(0);
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  return { db, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

const staffHeaders = { authorization: 'Bearer staff-token', 'content-type': 'application/json' };

test('health is public and data routes require authentication', async (t) => {
  const { baseUrl } = await withApi(t);
  const health = await fetch(`${baseUrl}/health`);
  const customers = await fetch(`${baseUrl}/api/customers`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
  assert.equal(customers.status, 401);
});

test('authenticated users without a staff app-metadata role are denied', async (t) => {
  const { baseUrl } = await withApi(t);
  const response = await fetch(`${baseUrl}/api/customers`, { headers: { authorization: 'Bearer customer-token' } });
  assert.equal(response.status, 403);
});

test('staff can create, read, update, list, and delete customer records', async (t) => {
  const { baseUrl } = await withApi(t);
  const createdResponse = await fetch(`${baseUrl}/api/customers`, {
    method: 'POST',
    headers: staffHeaders,
    body: JSON.stringify({ first_name: 'Ada', last_name: 'Arborist', email: 'ada@example.com' }),
  });
  assert.equal(createdResponse.status, 201);
  const { data: created } = await createdResponse.json();

  const readResponse = await fetch(`${baseUrl}/api/customers/${created.id}`, { headers: staffHeaders });
  assert.equal(readResponse.status, 200);
  assert.equal((await readResponse.json()).data.email, 'ada@example.com');

  const updateResponse = await fetch(`${baseUrl}/api/customers/${created.id}`, {
    method: 'PATCH',
    headers: staffHeaders,
    body: JSON.stringify({ city: 'Golden' }),
  });
  assert.equal(updateResponse.status, 200);
  assert.equal((await updateResponse.json()).data.city, 'Golden');

  const listResponse = await fetch(`${baseUrl}/api/customers`, { headers: staffHeaders });
  assert.equal((await listResponse.json()).data.length, 1);

  const deleteResponse = await fetch(`${baseUrl}/api/customers/${created.id}`, {
    method: 'DELETE',
    headers: staffHeaders,
  });
  assert.equal(deleteResponse.status, 200);
  const missingResponse = await fetch(`${baseUrl}/api/customers/${created.id}`, { headers: staffHeaders });
  assert.equal(missingResponse.status, 404);
});

test('invalid request bodies and ids are rejected before database access', async (t) => {
  const { baseUrl } = await withApi(t);
  const invalidBody = await fetch(`${baseUrl}/api/customers`, {
    method: 'POST',
    headers: staffHeaders,
    body: JSON.stringify({ first_name: 'Ada' }),
  });
  const invalidId = await fetch(`${baseUrl}/api/customers/not-a-uuid`, { headers: staffHeaders });
  assert.equal(invalidBody.status, 400);
  assert.equal(invalidId.status, 400);
});

test('staff CRUD routes are registered for trees, catalogs, and observations', async (t) => {
  const { baseUrl } = await withApi(t);
  const records = [
    ['trees', { customer_id: randomUUID(), common_name: 'Blue spruce' }],
    ['pests', { name: 'Ips beetle' }],
    ['diseases', { name: 'Cytospora canker' }],
    ['tree-pest-observations', { tree_id: randomUUID(), pest_id: randomUUID() }],
    ['tree-disease-observations', { tree_id: randomUUID(), disease_id: randomUUID() }],
  ];
  for (const [route, body] of records) {
    const response = await fetch(`${baseUrl}/api/${route}`, {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 201, `${route} should accept a valid record`);
  }
});