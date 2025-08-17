import swaggerJsdoc from 'swagger-jsdoc';
import { version } from './package.json';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nuvanta Nurse Management API',
      version,
      description: `
        A comprehensive API for nurse management, staffing analysis, AI-powered assistance, and healthcare administrative tasks.
        
        ## Features
        - **Staff Management**: Nurse staffing data and burnout risk analysis
        - **AI Copilot**: Intelligent assistant for healthcare management queries  
        - **Task Management**: Follow-up task tracking and completion
        - **Calendar Integration**: Reminders and event management
        - **Email Notifications**: Staff communication and alerts
        - **Compliance Tracking**: Administrative reporting and compliance management
        
        ## Authentication
        Most endpoints require authentication. Use the /api/auth/login endpoint to authenticate.
      `,
      contact: {
        name: 'Nuvanta API Support',
        email: 'support@nuvanta.com'
      },
      license: {
        name: 'Private',
        url: 'https://nuvanta.com/license'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.nuvanta.com',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'User ID' },
            username: { type: 'string', description: 'Username' },
            fullName: { type: 'string', description: 'Full name' },
            role: { 
              type: 'string', 
              enum: ['nurse', 'manager', 'admin'],
              description: 'User role' 
            },
            unit: { type: 'string', description: 'Hospital unit', nullable: true },
            shift: { 
              type: 'string', 
              enum: ['day', 'night'],
              description: 'Work shift', 
              nullable: true 
            },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { 
              type: 'string', 
              minLength: 1, 
              maxLength: 50,
              description: 'Username for authentication' 
            },
            password: { 
              type: 'string', 
              minLength: 6, 
              maxLength: 100,
              description: 'User password' 
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['username', 'password', 'fullName', 'role'],
          properties: {
            username: { 
              type: 'string', 
              minLength: 3, 
              maxLength: 50,
              pattern: '^[a-zA-Z0-9._-]+$',
              description: 'Username (letters, numbers, dots, underscores, hyphens only)' 
            },
            password: { 
              type: 'string', 
              minLength: 6, 
              maxLength: 100,
              description: 'User password' 
            },
            fullName: { 
              type: 'string', 
              minLength: 1, 
              maxLength: 100,
              description: 'Full name' 
            },
            role: { 
              type: 'string', 
              enum: ['nurse', 'manager', 'admin'],
              description: 'User role' 
            },
            unit: { 
              type: 'string', 
              maxLength: 50,
              description: 'Hospital unit (optional)' 
            },
            shift: { 
              type: 'string', 
              enum: ['day', 'night'],
              description: 'Work shift (optional)' 
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            user: { $ref: '#/components/schemas/User' }
          }
        },
        StaffingData: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Overall staffing status' },
            onDuty: { type: 'integer', description: 'Number of nurses currently on duty' },
            total: { type: 'integer', description: 'Total number of nurses' },
            dayShift: { type: 'integer', description: 'Number of day shift nurses' },
            nightShift: { type: 'integer', description: 'Number of night shift nurses' }
          }
        },
        BurnoutData: {
          type: 'object',
          properties: {
            count: { type: 'integer', description: 'Number of staff at high burnout risk' },
            staff: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' }
                }
              }
            },
            lastUpdated: { type: 'string', description: 'Last update time' }
          }
        },
        CopilotRequest: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: { 
              type: 'string', 
              minLength: 1, 
              maxLength: 2000,
              description: 'Query or instruction for the AI assistant' 
            },
            conversationId: { 
              type: 'integer', 
              minimum: 1,
              description: 'Existing conversation ID (optional, for continuing conversations)' 
            }
          }
        },
        CopilotResponse: {
          type: 'object',
          properties: {
            response: { type: 'string', description: 'HTML response from the AI assistant' },
            conversationId: { type: 'integer', description: 'Conversation ID for follow-up messages' }
          }
        },
        CalendarEvent: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            eventDate: { type: 'string', format: 'date-time' },
            reminder: { type: 'boolean' },
            reminderSent: { type: 'boolean' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            relatedTo: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        CreateCalendarEvent: {
          type: 'object',
          required: ['title', 'eventDate'],
          properties: {
            title: { 
              type: 'string', 
              minLength: 1, 
              maxLength: 200,
              description: 'Event title' 
            },
            description: { 
              type: 'string', 
              maxLength: 1000,
              description: 'Event description (optional)' 
            },
            eventDate: { 
              type: 'string', 
              format: 'date-time',
              description: 'Event date and time (ISO 8601 format)' 
            },
            priority: { 
              type: 'string', 
              enum: ['low', 'medium', 'high'],
              description: 'Event priority (optional, defaults to medium)' 
            },
            relatedTo: { 
              type: 'string', 
              maxLength: 200,
              description: 'Related person or department (optional)' 
            },
            reminder: { 
              type: 'boolean',
              description: 'Enable reminder (optional, defaults to true)' 
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number', description: 'Server uptime in seconds' },
            version: { type: 'string' },
            environment: { type: 'string' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', enum: [false] },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                  value: { type: 'string' }
                }
              }
            },
            timestamp: { type: 'string', format: 'date-time' },
            path: { type: 'string' },
            method: { type: 'string' }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad Request - Validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        Unauthorized: {
          description: 'Unauthorized - Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        NotFound: {
          description: 'Not Found - Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        TooManyRequests: {
          description: 'Too Many Requests - Rate limit exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        },
        InternalServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Server health and status endpoints'
      },
      {
        name: 'Authentication',
        description: 'User authentication and registration'
      },
      {
        name: 'Staffing',
        description: 'Nurse staffing data and burnout analysis'
      },
      {
        name: 'AI Copilot',
        description: 'AI-powered healthcare management assistant'
      },
      {
        name: 'Tasks',
        description: 'Follow-up task management'
      },
      {
        name: 'Calendar',
        description: 'Calendar events and reminders'
      },
      {
        name: 'Email',
        description: 'Email notifications and communications'
      },
      {
        name: 'Compliance',
        description: 'Compliance reporting and tracking'
      }
    ]
  },
  apis: [
    './routes/*.ts',
    './index.ts'
  ]
};

export const specs = swaggerJsdoc(options);
