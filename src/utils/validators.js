const { body } = require('express-validator');
const cron = require('node-cron');

const jobValidators = {
    createJob: [
        body('name').trim().notEmpty().withMessage('Job name is required'),
        body('schedule').custom(schedule => {
            if (!schedule) {
                throw new Error('Schedule is required');
            }
            if (!cron.validate(schedule) && isNaN(new Date(schedule).getTime())) {
                throw new Error('Invalid schedule format');
            }
            return true;
        }),
        body('taskFunction').notEmpty().withMessage('Task function is required'),
        body('maxRetries').optional().isInt({ min: 0 })
    ]
};

module.exports = {
    jobValidators
};