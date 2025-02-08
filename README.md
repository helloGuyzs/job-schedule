
# Distributed Job Scheduler

A robust, distributed job scheduling system built with Node.js that supports cron expressions and one-time scheduled tasks.

## Features

- **Flexible Job Scheduling**: Supports both cron expressions and one-time scheduled tasks
- **Distributed Architecture**: Handles job distribution across multiple server instances
- **Fault Tolerance**: Automatically reassigns jobs from failed servers
- **Concurrency Control**: Prevents duplicate job execution through distributed locking
- **Retry Mechanism**: Configurable retry attempts for failed jobs
- **Scalability**: Efficiently handles large numbers of scheduled jobs
- **Real-time Job Status**: Track job execution status and history
- **Job Priority**: Support for prioritizing critical jobs
- **Job Dependencies**: Define job execution order and dependencies
- **Persistent Storage**: Jobs and states stored in Redis for reliability
- **REST API**: Full-featured API for job management
- **Monitoring**: Built-in metrics and health monitoring
- **Logging**: Comprehensive logging of job execution and errors
- **Security**: Role-based access control for job management
- **Multi-tenant**: Support for multiple isolated job queues
- **Resource Management**: CPU and memory usage controls

## Installation


## Configuration Options

## API Reference

### JobScheduler Class

#### Constructor

#### Methods

- **scheduleCron(jobId: string, cronExpression: string, handler: Function)**
  - Schedule a recurring job using cron expression
  - Returns: Promise<void>

- **scheduleOnce(jobId: string, date: Date, handler: Function)**
  - Schedule a one-time job
  - Returns: Promise<void>

- **cancelJob(jobId: string)**
  - Cancel a scheduled job
  - Returns: Promise<boolean>

- **pauseJob(jobId: string)**
  - Temporarily pause a job
  - Returns: Promise<boolean>

- **resumeJob(jobId: string)**
  - Resume a paused job
  - Returns: Promise<boolean>

## Error Handling

## Distributed Architecture

The scheduler uses Redis for coordination between multiple instances:

- **Leader Election**: Ensures only one instance processes each job
- **Job Distribution**: Automatically balances jobs across available instances
- **Fault Detection**: Monitors instance health through heartbeats
- **State Management**: Maintains job states and execution history

## Best Practices

1. **Unique Job IDs**: Use descriptive, unique identifiers for jobs
2. **Error Handling**: Implement proper error handling in job handlers
3. **Timeout Settings**: Set appropriate timeout values based on job complexity
4. **Monitoring**: Use event listeners for monitoring and logging
5. **Resource Management**: Consider job concurrency and server capacity

## Monitoring and Metrics

The scheduler exposes various metrics:

- Active jobs count
- Failed jobs count
- Average execution time
- Server health status
- Resource utilization

Access metrics through the API:

