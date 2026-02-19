/**
 * Integration tests — these hit the LIVE backend API to verify it is running
 * and responding correctly. They require network access and an active backend.
 *
 * Runtime inputs (set on globalThis before running tests):
 * - FIREHAWK_TEST_API_BASE_URL (example: https://your-host/api)
 * - FIREHAWK_TEST_JWT
 *
 * Run with: npx ng test --watch=false
 */

const API_BASE_URL =
  (globalThis as { FIREHAWK_TEST_API_BASE_URL?: string }).FIREHAWK_TEST_API_BASE_URL ??
  'http://localhost:3000/api';
const API_BASE = `${API_BASE_URL}/v1/automobiles`;
const AUTH_TOKEN = (globalThis as { FIREHAWK_TEST_JWT?: string }).FIREHAWK_TEST_JWT;

const authHeaders = (): HeadersInit => {
  if (!AUTH_TOKEN) {
    return { 'Content-Type': 'application/json' };
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${AUTH_TOKEN}`,
  };
};

const ensureAuth = (): boolean => {
  if (AUTH_TOKEN) {
    return true;
  }

  console.warn('Skipping protected backend integration test because FIREHAWK_TEST_JWT is not set.');
  return false;
};

describe('Backend API Integration', () => {

  it('should return a list of automobiles from GET /all', async () => {
    if (!ensureAuth()) return;

    const response = await fetch(`${API_BASE}/all`, { headers: authHeaders() });
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    // Verify the shape of the first automobile
    const car = body.data[0];
    expect(car).toHaveProperty('id');
    expect(car).toHaveProperty('name');
    expect(car).toHaveProperty('mpg');
    expect(car).toHaveProperty('cylinders');
    expect(car).toHaveProperty('horsepower');
    expect(car).toHaveProperty('origin');
  });

  it('should return paginated results from GET /', async () => {
    if (!ensureAuth()) return;

    const response = await fetch(`${API_BASE}?page=1&limit=5`, { headers: authHeaders() });
    expect(response.ok).toBe(true);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(5);
  });

  it('should return 404 for a non-existent automobile ID', async () => {
    if (!ensureAuth()) return;

    const response = await fetch(`${API_BASE}/non-existent-id-12345`, { headers: authHeaders() });
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  it('should create and then verify a new automobile via POST', async () => {
    if (!ensureAuth()) return;

    const testCar = {
      name: `Integration Test Car ${Date.now()}`,
      mpg: 30,
      cylinders: 4,
      displacement: 120,
      horsepower: 95,
      weight: 2200,
      acceleration: 15,
      model_year: 82,
      origin: 'USA',
    };

    // Create
    const createRes = await fetch(API_BASE, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(testCar),
    });
    expect(createRes.ok).toBe(true);

    const createBody = await createRes.json();
    expect(createBody.success).toBe(true);
    expect(createBody.data.name).toBe(testCar.name);
    expect(createBody.data.id).toBeTruthy();

    // Fetch by ID to confirm it was persisted
    const fetchRes = await fetch(`${API_BASE}/${createBody.data.id}`, { headers: authHeaders() });
    expect(fetchRes.ok).toBe(true);

    const fetchBody = await fetchRes.json();
    expect(fetchBody.data.name).toBe(testCar.name);
    expect(fetchBody.data.mpg).toBe(30);

    // Cleanup: delete the test car
    const deleteRes = await fetch(`${API_BASE}/${createBody.data.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    expect(deleteRes.ok).toBe(true);
  });
});

