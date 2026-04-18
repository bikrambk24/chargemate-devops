const request = require('supertest');
const app = require('./server');

describe('Booking Service', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /bookings/:userId returns array', async () => {
    const res = await request(app).get('/bookings/user123');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});