const EventEmitter = require('events');

// Create a mock Redis client that extends EventEmitter
class MockRedis extends EventEmitter {
    constructor() {
        super();
        this.data = new Map();
    }

    connect() {
        return Promise.resolve();
    }

    disconnect() {
        return Promise.resolve();
    }

    flushall() {
        this.data.clear();
        return Promise.resolve('OK');
    }

    quit() {
        return Promise.resolve('OK');
    }

    set(key, value) {
        this.data.set(key, value);
        return Promise.resolve('OK');
    }

    get(key) {
        return Promise.resolve(this.data.get(key) || null);
    }

    del(key) {
        this.data.delete(key);
        return Promise.resolve(1);
    }

    srem(set, member) {
        return Promise.resolve(1);
    }
}

// Mock Redis
jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => new MockRedis());
});

// Suppress logs during tests
const logger = require('../src/utils/logger');
if (logger.transports) {
    logger.transports.forEach((t) => (t.silent = true));
}