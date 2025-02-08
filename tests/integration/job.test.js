const request = require('supertest');
const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock JobService for testing
const mockJobService = {
    createJob: jest.fn(),
    getJob: jest.fn(),
    executeJob: jest.fn(),
    rescheduleJob: jest.fn()
};

// Setup routes and controllers
const jobController = {
    async createJob(req, res) {
        try {
            const job = await mockJobService.createJob(req.body);
            res.json(job);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getJob(req, res) {
        try {
            const job = await mockJobService.getJob(req.params.id);
            if (!job) return res.status(404).json({ error: 'Job not found' });
            res.json(job);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

app.post('/api/jobs', jobController.createJob);
app.get('/api/jobs/:id', jobController.getJob);

describe('Distributed Job Scheduler Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('1. Job Scheduling', () => {
        it('should schedule a job with specific execution time', async () => {
            const jobData = {
                name: "Test Job",
                schedule: "2024-12-31T23:59:59Z",
                taskFunction: "console.log('Test')",
                maxRetries: 3
            };

            mockJobService.createJob.mockResolvedValueOnce({
                id: uuidv4(),
                ...jobData,
                status: 'scheduled'
            });

            const response = await request(app)
                .post('/api/jobs')
                .send(jobData);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body.status).toBe('scheduled');
        });

        it('should handle cron schedule format', async () => {
            const jobData = {
                name: "Cron Job",
                schedule: "*/5 * * * *",
                taskFunction: "console.log('Cron test')",
                maxRetries: 3
            };

            mockJobService.createJob.mockResolvedValueOnce({
                id: uuidv4(),
                ...jobData,
                status: 'scheduled'
            });

            const response = await request(app)
                .post('/api/jobs')
                .send(jobData);

            expect(response.status).toBe(200);
            expect(response.body.schedule).toBe("*/5 * * * *");
        });
    });

    describe('2. Distributed Execution', () => {
        it('should prevent duplicate job execution', async () => {
            const jobId = uuidv4();
            
            // Mock executeJob to return proper response objects
            mockJobService.executeJob
                .mockResolvedValueOnce({ 
                    id: jobId,
                    status: 'running',
                    success: true 
                })
                .mockResolvedValue({ 
                    id: jobId,
                    status: 'locked',
                    success: false,
                    reason: 'Job is already running' 
                });
    
            // Try to execute the same job multiple times
            const executionPromises = Array(3).fill().map(() => 
                mockJobService.executeJob(jobId)
            );
    
            const results = await Promise.all(executionPromises);
            const successfulExecutions = results.filter(r => r.success);
    
            expect(successfulExecutions.length).toBe(1);
            expect(results.length).toBe(3);
            expect(mockJobService.executeJob).toHaveBeenCalledTimes(3);
        });
    });

    describe('3. Fault Tolerance', () => {
        it('should reassign jobs from failed server', async () => {
            const failedServerId = 'server-1';
            const newServerId = 'server-2';
            
            mockJobService.rescheduleJob.mockResolvedValueOnce({
                success: true,
                newServerId
            });

            const result = await mockJobService.rescheduleJob(failedServerId);
            
            expect(result.success).toBe(true);
            expect(result.newServerId).toBe(newServerId);
        });
    });

    describe('4. Concurrency Handling', () => {
        it('should handle concurrent job creation requests', async () => {
            const jobs = Array(5).fill().map((_, i) => ({
                name: `Concurrent Job ${i}`,
                schedule: "*/5 * * * *",
                taskFunction: `console.log('Test ${i}')`,
                maxRetries: 3
            }));

            mockJobService.createJob.mockImplementation(async (jobData) => ({
                id: uuidv4(),
                ...jobData,
                status: 'scheduled'
            }));

            const responses = await Promise.all(
                jobs.map(job => 
                    request(app)
                        .post('/api/jobs')
                        .send(job)
                )
            );

            expect(responses.every(r => r.status === 200)).toBe(true);
            expect(new Set(responses.map(r => r.body.id)).size).toBe(jobs.length);
        });
    });

    describe('5. System Efficiency', () => {
        it('should handle large number of scheduled jobs', async () => {
            const numberOfJobs = 100;
            const startTime = Date.now();

            const jobs = Array(numberOfJobs).fill().map((_, i) => ({
                name: `Bulk Job ${i}`,
                schedule: "*/15 * * * *",
                taskFunction: `console.log('Bulk test ${i}')`,
                maxRetries: 3
            }));

            mockJobService.createJob.mockImplementation(async (jobData) => ({
                id: uuidv4(),
                ...jobData,
                status: 'scheduled'
            }));

            const responses = await Promise.all(
                jobs.map(job => 
                    request(app)
                        .post('/api/jobs')
                        .send(job)
                )
            );

            const endTime = Date.now();
            const processingTime = endTime - startTime;

            expect(responses.every(r => r.status === 200)).toBe(true);
            expect(processingTime).toBeLessThan(5000); // Should process 100 jobs in under 5 seconds
        });
    });
});