require('dotenv').config();
const express = require('express');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const config = require('./config');
const logger = require('./utils/logger');
const { jobValidators } = require('./utils/validators');
const jobController = require('./controllers/jobController');

if (cluster.isMaster) {
    logger.info(`Master ${process.pid} is running`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        logger.warn(`Worker ${worker.process.pid} died. Starting new worker...`);
        cluster.fork();
    });
} else {
    try {
        const app = express();
        
        app.use(express.json());

        app.get('/health', (req, res) => {
            res.status(200).json({ status: 'OK' });
        });

        app.post('/api/jobs', jobValidators.createJob, jobController.createJob);
        app.get('/api/jobs/:id', jobController.getJob);

        app.use((err, req, res, next) => {
            logger.error('Unhandled error:', err);
            res.status(500).json({ error: 'Internal server error' });
        });

        const PORT = config.port || 3000;
        app.listen(PORT, () => {
            logger.info(`Worker ${process.pid} listening on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Server startup error:', error);
        process.exit(1);
    }
}