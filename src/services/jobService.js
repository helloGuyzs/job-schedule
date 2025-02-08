const Job = require('../models/job');
const RedisService = require('./redisService');
const logger = require('../utils/logger');

class JobService {
    async createJob(jobData) {
        try {
            const job = new Job(jobData);
            await RedisService.saveJob(job);
            logger.info(`Job created successfully: ${job.id}`);
            return job;
        } catch (error) {
            logger.error('Error creating job:', error);
            throw error;
        }
    }

    async getJob(jobId) {
        try {
            const job = await RedisService.getJob(jobId);
            return job;
        } catch (error) {
            logger.error('Error getting job:', error);
            throw error;
        }
    }

    async executeJob(jobId) {
        try {
            const job = await this.getJob(jobId);
            if (!job) {
                throw new Error('Job not found');
            }
            await job.execute(RedisService.client, process.pid.toString());
            await RedisService.updateJob(job);
            return job;
        } catch (error) {
            logger.error(`Error executing job ${jobId}:`, error);
            throw error;
        }
    }
}

module.exports = new JobService();