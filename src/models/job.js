const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const logger = require('../utils/logger');

class Job {
    constructor(data = {}) {
        if (!data.name || !data.taskFunction) {
            throw new Error('Job name and taskFunction are required');
        }

        this.id = data.id || uuidv4();
        this.name = data.name;
        this.taskFunction = data.taskFunction;
        this.schedule = this.validateSchedule(data.schedule);
        
        this.status = 'pending';
        this.nextRunAt = this.calculateNextRun();
        this.lastRunAt = null;
        this.retryCount = 0;
        this.maxRetries = data.maxRetries || 3;
        
        this.serverId = null;
        this.lockKey = null;
    }

    validateSchedule(schedule) {
        if (!schedule) {
            throw new Error('Schedule is required');
        }

        if (cron.validate(schedule)) {
            return schedule;
        }

        const date = new Date(schedule);
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }

        throw new Error('Invalid schedule format');
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            schedule: this.schedule,
            taskFunction: this.taskFunction,
            status: this.status,
            maxRetries: this.maxRetries,
            retryCount: this.retryCount,
            lastRunAt: this.lastRunAt,
            nextRunAt: this.nextRunAt,
            serverId: this.serverId
        };
    }

    calculateNextRun() {
        try {
            if (!this.schedule) {
                return null;
            }
    
            if (cron.validate(this.schedule)) {
                const interval = cron.schedule(this.schedule, () => {});
                const next = interval.nextDate();
                interval.stop();
                return next;
            }
    
            const date = new Date(this.schedule);
            if (!isNaN(date.getTime())) {
                return date;
            }
    
            return null;
        } catch (error) {
            logger.error(`Error calculating next run for job ${this.id}:`, error);
            return null;
        }
    }

    async acquireLock(redis, serverId) {
        const lockKey = `job:${this.id}:lock`;
        const acquired = await redis.set(lockKey, serverId, 'NX', 'PX', 300000);
        
        if (acquired) {
            this.lockKey = lockKey;
            this.serverId = serverId;
            this.status = 'running';
            return true;
        }
        return false;
    }

    async releaseLock(redis) {
        if (this.lockKey) {
            await redis.del(this.lockKey);
            this.lockKey = null;
            this.serverId = null;
        }
    }

    async execute(redis, serverId) {
        try {
            const locked = await this.acquireLock(redis, serverId);
            if (!locked) return false;

            await this.taskFunction();
            
            this.status = 'completed';
            this.lastRunAt = new Date();
            this.nextRunAt = this.calculateNextRun();
            this.retryCount = 0;
            
            return true;
        } catch (error) {
            this.status = 'failed';
            this.retryCount++;
            
            if (this.retryCount < this.maxRetries) {
                this.status = 'pending';
                this.nextRunAt = new Date(Date.now() + 60000);
            }
            
            throw error;
        } finally {
            await this.releaseLock(redis);
        }
    }

    isReadyToRun() {
        return (
            this.status === 'pending' &&
            this.nextRunAt <= new Date() &&
            this.retryCount < this.maxRetries
        );  
    }
}

module.exports = Job;