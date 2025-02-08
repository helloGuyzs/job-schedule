const { v4: uuidv4 } = require('uuid');  // For generating unique IDs
const cron = require('node-cron');       // For handling cron schedules
const logger = require('../utils/logger'); // For logging

// Job class represents a scheduled task in the distributed job scheduler
class Job {
    constructor(data = {}) {
        // Basic validation to ensure required fields are present
        if (!data.name || !data.taskFunction) {
            throw new Error('Job name and taskFunction are required');
        }

        // Core properties initialization
        this.id = data.id || uuidv4();           // Generate unique ID if not provided
        this.name = data.name;                   // Name to identify the job
        this.taskFunction = data.taskFunction;   // Function that will be executed
        this.schedule = this.validateSchedule(data.schedule); // Validate and set schedule
        
        // Execution state properties
        this.status = 'pending';                 // Initial status is pending
        this.nextRunAt = this.calculateNextRun(); // Calculate first run time
        this.lastRunAt = null;                   // Track last execution time
        this.retryCount = 0;                     // Track failed attempts
        this.maxRetries = data.maxRetries || 3;  // Max retry attempts before permanent failure
        
        // Distributed execution properties
        this.serverId = null;                    // Track which server owns the job
        this.lockKey = null;                     // Redis lock for distributed coordination
    }

    // Validates schedule format - accepts cron expression or date
    validateSchedule(schedule) {
        if (!schedule) {
            throw new Error('Schedule is required');
        }

        // First try parsing as cron expression
        if (cron.validate(schedule)) {
            return schedule;
        }

        // If not cron, try parsing as date
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

    // Determines next execution time based on schedule type
    calculateNextRun() {
        try {
            if (!this.schedule) {
                return null;
            }
    
            // If it's a cron schedule
            if (cron.validate(this.schedule)) {
                const interval = cron.schedule(this.schedule, () => {});
                const next = interval.nextDate();
                interval.stop(); // Clean up the scheduled task
                return next;
            }
    
            // If it's a date string
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

    // Implements distributed locking using Redis
    async acquireLock(redis, serverId) {
        const lockKey = `job:${this.id}:lock`;
        // Set lock with 5-minute expiry to prevent deadlocks
        const acquired = await redis.set(lockKey, serverId, 'NX', 'PX', 300000);
        
        if (acquired) {
            // If lock acquired, update job state
            this.lockKey = lockKey;
            this.serverId = serverId;
            this.status = 'running';
            return true;
        }
        return false;
    }

    // Cleanup method to release distributed lock
    async releaseLock(redis) {
        if (this.lockKey) {
            // Remove lock from Redis and reset state
            await redis.del(this.lockKey);
            this.lockKey = null;
            this.serverId = null;
        }



    }

    // Main job execution logic with retry handling
    async execute(redis, serverId) {
        try {
            // Ensure exclusive execution with distributed lock
            const locked = await this.acquireLock(redis, serverId);
            if (!locked) return false;

            // Run the actual job function
            await this.taskFunction();
            
            // Update state after successful execution
            this.status = 'completed';
            this.lastRunAt = new Date();
            this.nextRunAt = this.calculateNextRun();
            this.retryCount = 0;
            
            return true;
        } catch (error) {
            // Handle execution failures
            this.status = 'failed';
            this.retryCount++;
            
            // Implement retry logic if attempts remain
            if (this.retryCount < this.maxRetries) {
                this.status = 'pending';
                this.nextRunAt = new Date(Date.now() + 60000); // Schedule retry after 1 minute
            }
            
            throw error;
        } finally {
            // Ensure lock is always released
            await this.releaseLock(redis);
        }
    }

    // Helper method to check if job should be executed
    isReadyToRun() {
        return (
            this.status === 'pending' &&          // Only run pending jobs
            this.nextRunAt <= new Date() &&       // Only if scheduled time has passed
            this.retryCount < this.maxRetries     // Only if retries not exhausted
        );  
    }
}

// Export Job class for use in other modules
module.exports = Job;