import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

// Generic validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? error.value : undefined
      }))
    });
  }
  next();
};

// Authentication validation rules
export const validateLogin = [
  body('username')
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Username must be between 1 and 50 characters')
    .trim(),
  body('password')
    .isString()
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be between 6 and 100 characters'),
  handleValidationErrors
];

export const validateRegister = [
  body('username')
    .isString()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('Username can only contain letters, numbers, dots, underscores, and hyphens')
    .trim(),
  body('password')
    .isString()
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be between 6 and 100 characters'),
  body('fullName')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Full name must be between 1 and 100 characters')
    .trim(),
  body('role')
    .isIn(['nurse', 'manager', 'admin'])
    .withMessage('Role must be one of: nurse, manager, admin'),
  body('unit')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Unit must be a string with max 50 characters')
    .trim(),
  body('shift')
    .optional()
    .isIn(['day', 'night'])
    .withMessage('Shift must be either "day" or "night"'),
  handleValidationErrors
];

// Copilot validation rules
export const validateCopilotRequest = [
  body('prompt')
    .isString()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Prompt must be between 1 and 2000 characters')
    .trim(),
  body('conversationId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Conversation ID must be a positive integer'),
  handleValidationErrors
];

// Task validation rules
export const validateTaskCompletion = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Task ID must be a positive integer'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Notes must be a string with max 500 characters')
    .trim(),
  body('userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  handleValidationErrors
];

// Calendar validation rules
export const validateCalendarEvent = [
  body('title')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .trim(),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Description must be a string with max 1000 characters')
    .trim(),
  body('eventDate')
    .isISO8601()
    .withMessage('Event date must be a valid ISO 8601 date'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be one of: low, medium, high'),
  body('relatedTo')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Related to must be a string with max 200 characters')
    .trim(),
  body('reminder')
    .optional()
    .isBoolean()
    .withMessage('Reminder must be a boolean'),
  handleValidationErrors
];

export const validateCalendarEventId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Event ID must be a positive integer'),
  handleValidationErrors
];

// Email validation rules
export const validateEmail = [
  body('to')
    .custom((value) => {
      if (typeof value === 'string') {
        return body('to').isEmail().run({ body: { to: value } });
      } else if (Array.isArray(value)) {
        return value.every(email => typeof email === 'string' && /\S+@\S+\.\S+/.test(email));
      }
      return false;
    })
    .withMessage('To must be a valid email or array of valid emails'),
  body('subject')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject must be between 1 and 200 characters')
    .trim(),
  body('text')
    .optional()
    .isString()
    .isLength({ max: 10000 })
    .withMessage('Text must be a string with max 10000 characters'),
  body('html')
    .optional()
    .isString()
    .isLength({ max: 50000 })
    .withMessage('HTML must be a string with max 50000 characters'),
  handleValidationErrors
];

export const validateScheduleNotification = [
  body('to')
    .isEmail()
    .withMessage('To must be a valid email address'),
  body('nurseName')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nurse name must be between 1 and 100 characters')
    .trim(),
  body('scheduleDetails')
    .isString()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Schedule details must be between 1 and 2000 characters'),
  body('startDate')
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Start date must be between 1 and 50 characters')
    .trim(),
  body('endDate')
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('End date must be between 1 and 50 characters')
    .trim(),
  body('additionalMessage')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Additional message must be a string with max 1000 characters')
    .trim(),
  handleValidationErrors
];

export const validateAlertNotification = [
  body('to')
    .isEmail()
    .withMessage('To must be a valid email address'),
  body('alertType')
    .isIn(['Critical', 'Important', 'Informational'])
    .withMessage('Alert type must be one of: Critical, Important, Informational'),
  body('alertDetails')
    .isString()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Alert details must be between 1 and 2000 characters'),
  body('actionRequired')
    .optional()
    .isBoolean()
    .withMessage('Action required must be a boolean'),
  body('actionText')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Action text must be a string with max 500 characters')
    .trim(),
  body('dueDate')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Due date must be a string with max 50 characters')
    .trim(),
  handleValidationErrors
];

export const validateBatchEmail = [
  body('recipients')
    .isArray({ min: 1, max: 100 })
    .withMessage('Recipients must be an array with 1-100 items'),
  body('recipients.*.email')
    .isEmail()
    .withMessage('Each recipient must have a valid email address'),
  body('subject')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject must be between 1 and 200 characters')
    .trim(),
  body('messageContent')
    .isString()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Message content must be between 1 and 50000 characters'),
  handleValidationErrors
];
