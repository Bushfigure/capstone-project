const request = require('supertest');

// Mock the DB module
jest.mock('../src/db', () => ({
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [{ count: '5' }, { id: 1 }] }),
  },
  initDb: jest.fn().mockResolvedValue(),
}));

const app = require('../src/server');

describe('App endpoints', () => {
  test('GET /health returns healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  test('GET /ready returns ready when DB reachable', async () => {
    const res = await request(app).get('/ready');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  test('GET /metrics returns Prometheus format', async () => {
    const res = await request(app).get('/metrics');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('app_http_requests_total');
  });

  test('POST /api/visit records a visit', async () => {
    const res = await request(app).post('/api/visit');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
