import swaggerJSDoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Durusuna Backend API',
    version: '1.0.0',
    description: 'Backend API for Durusuna school communication app',
    contact: {
      name: 'Durusuna Team',
      email: 'support@durusuna.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  tags: [
    {
      name: 'System',
      description: 'System health and status endpoints'
    },
    {
      name: 'Authentication',
      description: 'User authentication and authorization'
    },
    {
      name: 'Users',
      description: 'User management operations'
    },
    {
      name: 'Schools',
      description: 'School management operations'
    },
    {
      name: 'Classes',
      description: 'Class management operations'
    },
    {
      name: 'Class Updates',
      description: 'Class updates, announcements, and comments'
    },
    {
      name: 'Messages',
      description: 'Messaging and communication features'
    },
    {
      name: 'Uploads',
      description: 'File upload and management'
    }
  ],
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server'
    },
    {
      url: 'https://api.durusuna.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /api/auth/login'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'User ID'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          firstName: {
            type: 'string',
            description: 'User first name'
          },
          lastName: {
            type: 'string',
            description: 'User last name'
          },
          role: {
            type: 'string',
            enum: ['student', 'teacher', 'parent', 'admin'],
            description: 'User role'
          },
          schoolId: {
            type: 'integer',
            description: 'Associated school ID'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        }
      },
      School: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'School ID'
          },
          name: {
            type: 'string',
            description: 'School name'
          },
          address: {
            type: 'string',
            description: 'School address'
          },
          phone: {
            type: 'string',
            description: 'School phone number'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'School email address'
          }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Response message'
          },
          user: {
            $ref: '#/components/schemas/User'
          },
          accessToken: {
            type: 'string',
            description: 'JWT access token'
          },
          refreshToken: {
            type: 'string',
            description: 'JWT refresh token'
          },
          expiresIn: {
            type: 'integer',
            description: 'Token expiration time in seconds'
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error type'
          },
          message: {
            type: 'string',
            description: 'Error message'
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  description: 'Field that caused the error'
                },
                message: {
                  type: 'string',
                  description: 'Specific error message'
                }
              }
            },
            description: 'Validation errors'
          }
        }
      },
      HealthCheck: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Health status'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Check timestamp'
          },
          uptime: {
            type: 'number',
            description: 'Server uptime in seconds'
          },
          environment: {
            type: 'string',
            description: 'Current environment'
          }
        }
      },
      ClassUpdate: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Class update ID'
          },
          class_id: {
            type: 'string',
            format: 'uuid',
            description: 'Associated class ID'
          },
          author_id: {
            type: 'string',
            format: 'uuid',
            description: 'Author user ID'
          },
          title: {
            type: 'string',
            description: 'Update title'
          },
          content: {
            type: 'string',
            description: 'Update content'
          },
          update_type: {
            type: 'string',
            enum: ['announcement', 'homework', 'reminder', 'event'],
            description: 'Type of update'
          },
          is_pinned: {
            type: 'boolean',
            description: 'Whether the update is pinned'
          },
          is_deleted: {
            type: 'boolean',
            description: 'Whether the update is deleted'
          },
          attachments: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/ClassUpdateAttachment'
            },
            description: 'File attachments'
          },
          reactions: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                count: {
                  type: 'integer',
                  description: 'Number of reactions'
                },
                users: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid'
                  },
                  description: 'Users who reacted'
                }
              }
            },
            description: 'Emoji reactions'
          },
          comment_count: {
            type: 'integer',
            description: 'Number of comments'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp'
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          },
          author: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: 'Author ID'
              },
              first_name: {
                type: 'string',
                description: 'Author first name'
              },
              last_name: {
                type: 'string',
                description: 'Author last name'
              },
              email: {
                type: 'string',
                format: 'email',
                description: 'Author email'
              },
              avatar_url: {
                type: 'string',
                description: 'Author avatar URL'
              },
              user_type: {
                type: 'string',
                enum: ['student', 'teacher', 'parent', 'admin'],
                description: 'Author user type'
              },
              role: {
                type: 'string',
                enum: ['user', 'admin'],
                description: 'Author role'
              }
            }
          }
        }
      },
      ClassUpdateAttachment: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Attachment ID'
          },
          fileName: {
            type: 'string',
            description: 'File name'
          },
          originalName: {
            type: 'string',
            description: 'Original file name'
          },
          mimeType: {
            type: 'string',
            description: 'MIME type'
          },
          size: {
            type: 'integer',
            description: 'File size in bytes'
          },
          url: {
            type: 'string',
            format: 'uri',
            description: 'File URL'
          },
          key: {
            type: 'string',
            description: 'Storage key'
          },
          fileType: {
            type: 'string',
            enum: ['image', 'video', 'audio', 'document', 'other'],
            description: 'File type category'
          },
          isImage: {
            type: 'boolean',
            description: 'Whether file is an image'
          },
          isVideo: {
            type: 'boolean',
            description: 'Whether file is a video'
          },
          isAudio: {
            type: 'boolean',
            description: 'Whether file is audio'
          },
          isDocument: {
            type: 'boolean',
            description: 'Whether file is a document'
          },
          sizeFormatted: {
            type: 'string',
            description: 'Human-readable file size'
          },
          uploadedBy: {
            type: 'string',
            format: 'uuid',
            description: 'Uploader user ID'
          },
          uploadedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Upload timestamp'
          },
          metadata: {
            type: 'object',
            description: 'Additional metadata'
          }
        }
      },
      ClassUpdateComment: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Comment ID'
          },
          class_update_id: {
            type: 'string',
            format: 'uuid',
            description: 'Associated class update ID'
          },
          author_id: {
            type: 'string',
            format: 'uuid',
            description: 'Author user ID'
          },
          content: {
            type: 'string',
            description: 'Comment content'
          },
          reply_to_id: {
            type: 'string',
            format: 'uuid',
            description: 'Parent comment ID for replies'
          },
          is_deleted: {
            type: 'boolean',
            description: 'Whether the comment is deleted'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp'
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          },
          author: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                description: 'Author ID'
              },
              first_name: {
                type: 'string',
                description: 'Author first name'
              },
              last_name: {
                type: 'string',
                description: 'Author last name'
              },
              email: {
                type: 'string',
                format: 'email',
                description: 'Author email'
              },
              avatar_url: {
                type: 'string',
                description: 'Author avatar URL'
              },
              user_type: {
                type: 'string',
                enum: ['student', 'teacher', 'parent', 'admin'],
                description: 'Author user type'
              }
            }
          }
        }
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            description: 'Current page number'
          },
          limit: {
            type: 'integer',
            description: 'Items per page'
          },
          total: {
            type: 'integer',
            description: 'Total number of items'
          },
          hasMore: {
            type: 'boolean',
            description: 'Whether there are more pages'
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/server.ts'
  ]
};

export const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec; 