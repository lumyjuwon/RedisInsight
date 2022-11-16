import IORedis from 'ioredis';

export const mockIORedisClient = {
  ...Object.create(IORedis.prototype),
  sendCommand: jest.fn(),
  info: jest.fn(),
  monitor: jest.fn(),
  disconnect: jest.fn(),
  duplicate: jest.fn(),
  call: jest.fn(),
  subscribe: jest.fn(),
  psubscribe: jest.fn(),
  unsubscribe: jest.fn(),
  punsubscribe: jest.fn(),
  publish: jest.fn(),
  status: 'ready',
  options: {
    db: 0,
  },
};

export const mockIORedisCluster = {
  ...Object.create(IORedis.Cluster.prototype),
  isCluster: true,
  sendCommand: jest.fn(),
  info: jest.fn(),
  monitor: jest.fn(),
  disconnect: jest.fn(),
  duplicate: jest.fn(),
  call: jest.fn(),
  subscribe: jest.fn(),
  psubscribe: jest.fn(),
  unsubscribe: jest.fn(),
  punsubscribe: jest.fn(),
  publish: jest.fn(),
  status: 'ready',
  nodes: jest.fn().mockReturnValue([mockIORedisClient, mockIORedisClient]),
};

export const mockRedisService = jest.fn(() => ({
  createStandaloneClient: jest.fn(),
}));