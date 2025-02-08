const JobService = require('../services/jobService');
const logger = require('../utils/logger');

const jobController = {
    async createJob(req, res) {
        try {
            const job = await JobService.createJob(req.body);
            res.json(job);
        } catch (error) {
            logger.error('Error creating job:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async getJob(req, res) {
        try {
            const job = await JobService.getJob(req.params.id);
            if (!job) {
                return res.status(404).json({ error: 'Job not found' });
            }
            res.json(job);
        } catch (error) {
            logger.error('Error getting job:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = jobController;
