const config = {
    port: process.env.PORT || 3000,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    heartbeatInterval: 5000,
    jobCheckInterval: 1000,
    workerTimeout: 10000,   
    logger: {
        level: process.env.LOG_LEVEL || 'info'
    }
};

module.exports = config;