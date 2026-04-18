const request = require('supertest');

// Mock mongoose
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue(true),
    model: jest.fn().mockReturnValue({
      find: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(true),
      findByIdAndUpdate: jest.fn().mockResolvedValue(null),
    }),
    Schema: actual.Schema,
  };
});

// Mock axios so booking service doesn't call real station service
jest.mock('axios');
const axios = require('axios');

const app = require('./server');

describe('Booking Service', () => {
  let server;

  beforeAll((done) => {
    server = app.listen(0, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  it('GET /health returns ok', async () => {
    const res = await request(server).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /bookings/:userId returns array', async () => {
    const res = await request(server).get('/bookings/user123');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});