const request = require('supertest');

// Mock mongoose BEFORE requiring the app
// This prevents real MongoDB connection during tests
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue(true), // fake successful connection
    model: jest.fn().mockReturnValue({
      find: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(true),
      findByIdAndUpdate: jest.fn().mockResolvedValue(null),
      findByIdAndDelete: jest.fn().mockResolvedValue(null),
    }),
    Schema: actual.Schema,
  };
});

const app = require('./server');

describe('Station Service', () => {
  let server;

  // Start server before tests
  beforeAll((done) => {
    server = app.listen(0, done); // port 0 = random available port
  });

  // Close server after tests — fixes the "Jest did not exit" warning
  afterAll((done) => {
    server.close(done);
  });

  it('GET /health returns ok', async () => {
    const res = await request(server).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /stations returns array', async () => {
    const res = await request(server).get('/stations');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});