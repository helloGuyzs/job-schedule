const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

class RedisService {
    constructor() {
        this.client = new Redis(config.redisUrl);
        
        this.client.on('error', (error) => {
            logger.error('Redis connection error:', error);
        });

        this.client.on('connect', () => {
            logger.info('Redis connected successfully');
        });
    }

    async saveJob(job) {
        try {
            const key = `job:${job.id}`;
            const jobData = job.toJSON();
            
            // Use hmset instead of set
            await this.client.hmset(key, {
                data: JSON.stringify(jobData)
            });
            
            if (job.status === 'pending') {
                await this.client.sadd('pending_jobs', job.id);
            }
            
            logger.info(`Job saved successfully: ${job.id}`);
        } catch (error) {
            logger.error(`Error saving job ${job.id}:`, error);
            throw error;
        }
    }

    async getJob(jobId) {
        try {
            const key = `job:${jobId}`;
            // Use hget instead of get
            const jobData = await this.client.hget(key, 'data');
            
            if (!jobData) {
                return null;
            }

            try {
                return JSON.parse(jobData);
            } catch (parseError) {
                logger.error(`Error parsing job data for ${jobId}:`, parseError);
                return null;
            }
        } catch (error) {
            logger.error(`Error getting job ${jobId}:`, error);
            throw error;
        }
    }

    async updateJob(job) {
        try {
            const key = `job:${job.id}`;
            const jobData = job.toJSON();
            
            // Use hmset for update
            await this.client.hmset(key, {
                data: JSON.stringify(jobData)
            });
            
            if (job.status === 'pending') {
                await this.client.sadd('pending_jobs', job.id);
            } else {
                await this.client.srem('pending_jobs', job.id);
            }
            
            logger.info(`Job updated successfully: ${job.id}`);
        } catch (error) {
            logger.error(`Error updating job ${job.id}:`, error);
            throw error;
        }
    }

    async getPendingJobs() {
        try {
            const jobIds = await this.client.smembers('pending_jobs');
            const jobs = [];
            
            for (const jobId of jobIds) {
                const job = await this.getJob(jobId);
                if (job) {
                    jobs.push(job);
                }
            }
            
            return jobs;
        } catch (error) {
            logger.error('Error getting pending jobs:', error);
            throw error;
        }
    }

    async removeJob(jobId) {
        try {
            const key = `job:${jobId}`;
            await this.client.del(key);
            await this.client.srem('pending_jobs', jobId);
            logger.info(`Job removed successfully: ${jobId}`);
        } catch (error) {
            logger.error(`Error removing job ${jobId}:`, error);
            throw error;
        }
    }

    async clearAll() {
        try {
            await this.client.flushall();
            logger.info('All Redis data cleared');
        } catch (error) {
            logger.error('Error clearing Redis data:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            await this.client.quit();
            logger.info('Redis disconnected successfully');
        } catch (error) {
            logger.error('Error disconnecting from Redis:', error);
            throw error;
        }
    }
}

module.exports = new RedisService();