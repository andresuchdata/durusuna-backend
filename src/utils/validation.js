const Joi = require('joi');

// User registration validation
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'any.required': 'Password is required'
  }),
  first_name: Joi.string().min(2).max(50).required().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters',
    'any.required': 'First name is required'
  }),
  last_name: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters',
    'any.required': 'Last name is required'
  }),
  user_type: Joi.string().valid('parent', 'student', 'teacher').required().messages({
    'any.only': 'User type must be either parent, student, or teacher',
    'any.required': 'User type is required'
  }),
  school_id: Joi.string().uuid().required().messages({
    'string.guid': 'School ID must be a valid UUID',
    'any.required': 'School ID is required'
  }),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional().messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  date_of_birth: Joi.date().max('now').optional().messages({
    'date.max': 'Date of birth cannot be in the future'
  }),
  student_id: Joi.string().max(50).optional(),
  employee_id: Joi.string().max(50).optional()
});

// User login validation
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

// Password reset request validation
const passwordResetRequestSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  })
});

// Password reset validation
const passwordResetSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required'
  }),
  new_password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'any.required': 'New password is required'
  })
});

// Profile update validation
const profileUpdateSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).optional(),
  last_name: Joi.string().min(2).max(50).optional(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional().allow(''),
  date_of_birth: Joi.date().max('now').optional().allow(null),
  avatar_url: Joi.string().uri().optional().allow(''),
  preferences: Joi.object().optional()
});

// Message validation
const messageSchema = Joi.object({
  conversation_id: Joi.string().uuid().optional().messages({
    'string.guid': 'Conversation ID must be a valid UUID'
  }),
  receiver_id: Joi.string().uuid().optional().messages({
    'string.guid': 'Receiver ID must be a valid UUID'
  }),
  content: Joi.string().max(5000).optional().messages({
    'string.max': 'Message content cannot exceed 5000 characters'
  }),
  message_type: Joi.string().valid('text', 'image', 'video', 'audio', 'file', 'emoji').default('text'),
  reply_to_id: Joi.string().uuid().optional().messages({
    'string.guid': 'Reply to ID must be a valid UUID'
  }),
  metadata: Joi.object().optional()
}).or('conversation_id', 'receiver_id').messages({
  'object.missing': 'Either conversation_id or receiver_id is required'
});

// Attachment validation schema
const attachmentSchema = Joi.object({
  id: Joi.string().uuid().required(),
  fileName: Joi.string().required(),
  originalName: Joi.string().required(),
  mimeType: Joi.string().required(),
  size: Joi.number().integer().min(1).required(),
  url: Joi.string().uri().required(),
  key: Joi.string().required(),
  fileType: Joi.string().valid('image', 'video', 'audio', 'document', 'other').required(),
  isImage: Joi.boolean().required(),
  isVideo: Joi.boolean().required(),
  isAudio: Joi.boolean().required(),
  isDocument: Joi.boolean().required(),
  sizeFormatted: Joi.string().required(),
  uploadedBy: Joi.string().uuid().required(),
  uploadedAt: Joi.string().isoDate().required(),
  metadata: Joi.object().optional()
});

// Class update validation
const classUpdateSchema = Joi.object({
  class_id: Joi.string().uuid().required().messages({
    'string.guid': 'Class ID must be a valid UUID',
    'any.required': 'Class ID is required'
  }),
  title: Joi.string().max(255).optional(),
  content: Joi.string().max(10000).required().messages({
    'string.max': 'Content cannot exceed 10000 characters',
    'any.required': 'Content is required'
  }),
  update_type: Joi.string().valid('announcement', 'homework', 'reminder', 'event').default('announcement'),
  attachments: Joi.array().items(attachmentSchema).max(5).optional().messages({
    'array.max': 'Maximum 5 attachments allowed per update'
  })
});

// Comment validation
const commentSchema = Joi.object({
  content: Joi.string().max(2000).required().messages({
    'string.max': 'Comment cannot exceed 2000 characters',
    'any.required': 'Comment content is required'
  }),
  reply_to_id: Joi.string().uuid().optional().messages({
    'string.guid': 'Reply to ID must be a valid UUID'
  })
});

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details
      });
    }

    req.body = value;
    next();
  };
};

module.exports = {
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  profileUpdateSchema,
  messageSchema,
  attachmentSchema,
  classUpdateSchema,
  commentSchema,
  validate
}; 