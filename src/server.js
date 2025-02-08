require('dotenv').config();
const express = require('express');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const config = require('./config');
const logger = require('./utils/logger');
const { jobValidators } = require('./utils/validators');
// Fix the path to match your file structure
const jobController = require('./controllers/jobController');  // Make sure this matches your file name exactly

// Rest of your server.js code...

// Cluster setup
if (cluster.isMaster) {
    logger.info(`Master ${process.pid} is running`);

    // Fork workers
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
        
        // Middleware
        app.use(express.json());

        // Health check
        app.get('/health', (req, res) => {
            res.status(200).json({ status: 'OK' });
        });

        // Routes
        app.post('/api/jobs', jobValidators.createJob, jobController.createJob);
        app.get('/api/jobs/:id', jobController.getJob);

        // Error handling middleware
        app.use((err, req, res, next) => {
            logger.error('Unhandled error:', err);
            res.status(500).json({ error: 'Internal server error' });
        });

        // Start server
        const PORT = config.port || 3000;
        app.listen(PORT, () => {
            logger.info(`Worker ${process.pid} listening on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Server startup error:', error);
        process.exit(1);
    }
}