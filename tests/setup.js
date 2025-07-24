const { v4: uuidv4 } = require('uuid');

// Mock database with proper promise returns
const mockDb = {
  // Mock Knex query builder methods that return promises
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  first: jest.fn().mockResolvedValue(null),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([{ id: uuidv4() }]),
  transaction: jest.fn().mockImplementation(async (callback) => {
    // Create a transaction function that can be called like trx('table')
    const trx = jest.fn((tableName) => {
      const queryBuilder = {
        first: jest.fn().mockResolvedValue(null),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: uuidv4() }]),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([])
      };
      
      // Make all methods chainable
      Object.keys(queryBuilder).forEach(key => {
        if (typeof queryBuilder[key] === 'function' && !['first', 'returning', 'then'].includes(key)) {
          queryBuilder[key] = jest.fn().mockReturnValue(queryBuilder);
        }
      });
      
      return queryBuilder;
    });
    
    // Add transaction methods
    trx.rollback = jest.fn().mockResolvedValue();
    trx.commit = jest.fn().mockResolvedValue();
    
    // Handle both callback and non-callback patterns
    if (callback && typeof callback === 'function') {
      return await callback(trx);
    }
    return trx;
  }),
  rollback: jest.fn().mockResolvedValue(),
  commit: jest.fn().mockResolvedValue(),
  raw: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  andOn: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  groupByRaw: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  count: jest.fn().mockResolvedValue([{ count: '0' }]),
  then: jest.fn().mockImplementation((callback) => {
    // Make the query builder thenable
    return Promise.resolve([]).then(callback);
  })
};

// Create table-specific mock functions
const createTableMock = (tableName) => {
  const tableMock = jest.fn(() => mockDb);
  
  // Set up table-specific default responses
  switch (tableName) {
    case 'users':
      tableMock.mockImplementation(() => ({
        ...mockDb,
        first: jest.fn().mockResolvedValue(null),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis()
      }));
      break;
    case 'schools':
      tableMock.mockImplementation(() => ({
        ...mockDb,
        first: jest.fn().mockResolvedValue(null),
        where: jest.fn().mockReturnThis()
      }));
      break;
    case 'messages':
      tableMock.mockImplementation(() => ({
        ...mockDb,
        first: jest.fn().mockResolvedValue(null),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        join: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([])
      }));
      break;
    default:
      tableMock.mockImplementation(() => ({
        ...mockDb,
        first: jest.fn().mockResolvedValue(null),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([])
      }));
  }
  
  return tableMock;
};

// Mock all tables
['users', 'schools', 'classes', 'messages', 'class_updates', 'user_classes', 'class_update_comments', 'message_attachments'].forEach(table => {
  mockDb[table] = createTableMock(table);
});

// Mock JWT utilities
const mockJwt = {
  generateTokenPair: jest.fn().mockReturnValue({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token'
  }),
  verifyRefreshToken: jest.fn().mockReturnValue({
    userId: uuidv4(),
    exp: Date.now() + 3600000
  }),
  verifyAccessToken: jest.fn().mockReturnValue({
    id: uuidv4(),
    email: 'test@example.com',
    exp: Date.now() + 3600000
  }),
  extractToken: jest.fn().mockReturnValue('mock-token')
};

// Mock bcryptjs
const mockBcrypt = {
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true)
};

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Test data factories
const createMockUser = (overrides = {}) => ({
  id: uuidv4(),
  email: 'test@example.com',
  password_hash: 'hashed-password',
  first_name: 'John',
  last_name: 'Doe',
  user_type: 'teacher',
  school_id: uuidv4(),
  phone: '+1234567890',
  date_of_birth: '1990-01-01',
  student_id: null,
  employee_id: 'EMP001',
  avatar_url: null,
  is_active: true,
  is_verified: true,
  last_login_at: new Date(),
  created_at: new Date(),
  updated_at: new Date(),
  school_name: 'Test School',
  school_address: '123 Test St',
  ...overrides
});

const createMockMessage = (overrides = {}) => ({
  id: uuidv4(),
  sender_id: uuidv4(),
  receiver_id: uuidv4(),
  content: 'Test message content',
  message_type: 'text',
  reply_to_id: null,
  is_read: false,
  is_edited: false,
  edited_at: null,
  is_deleted: false,
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  sender_first_name: 'John',
  sender_last_name: 'Doe',
  sender_avatar: null,
  ...overrides
});

const createMockClassUpdate = (overrides = {}) => ({
  id: uuidv4(),
  class_id: uuidv4(),
  author_id: uuidv4(),
  title: 'Test Update',
  content: 'Test update content',
  update_type: 'announcement',
  attachments: [],
  reactions: {},
  is_pinned: false,
  is_edited: false,
  edited_at: null,
  is_deleted: false,
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  author_name: 'John Doe',
  author_email: 'john@example.com',
  author_avatar: null,
  ...overrides
});

const createMockConversation = (overrides = {}) => ({
  other_user_id: uuidv4(),
  other_user_first_name: 'Jane',
  other_user_last_name: 'Smith',
  other_user_avatar: null,
  other_user_type: 'student',
  other_user_is_active: true,
  last_message_content: 'Last message',
  last_message_type: 'text',
  last_message_at: new Date(),
  last_message_sender_id: uuidv4(),
  unread_count: '2',
  ...overrides
});

// Mock Express request/response objects
const createMockReq = (overrides = {}) => ({
  user: createMockUser(),
  body: {},
  params: {},
  query: {},
  headers: {},
  ...overrides
});

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const createMockNext = () => jest.fn();

// Authentication middleware mock
const mockAuthenticate = (req, res, next) => {
  req.user = createMockUser();
  next();
};

// Validation middleware mock
const mockValidate = (schema) => (req, res, next) => {
  // Simple validation mock - in real tests you might want to actually validate
  next();
};

// Reset all mocks
const resetMocks = () => {
  // Reset database mocks
  Object.entries(mockDb).forEach(([key, mock]) => {
    if (typeof mock === 'function') {
      mock.mockClear();
      // Restore default implementations
      if (key === 'first') {
        mock.mockResolvedValue(null);
      } else if (key === 'returning') {
        mock.mockResolvedValue([{ id: uuidv4() }]);
      } else if (key === 'count') {
        mock.mockResolvedValue([{ count: '0' }]);
      } else if (['rollback', 'commit'].includes(key)) {
        mock.mockResolvedValue();
      } else if (!['transaction', 'then'].includes(key)) {
        mock.mockReturnThis();
      }
    }
  });
  
  // Reset table mocks
  ['users', 'schools', 'classes', 'messages', 'class_updates', 'user_classes', 'class_update_comments', 'message_attachments'].forEach(table => {
    if (mockDb[table]) {
      mockDb[table].mockClear();
    }
  });
  
  Object.values(mockJwt).forEach(mock => {
    if (typeof mock === 'function') {
      mock.mockClear();
    }
  });
  
  Object.values(mockBcrypt).forEach(mock => {
    if (typeof mock === 'function') {
      mock.mockClear();
    }
  });
  
  Object.values(mockLogger).forEach(mock => {
    if (typeof mock === 'function') {
      mock.mockClear();
    }
  });
};

module.exports = {
  mockDb,
  mockJwt,
  mockBcrypt,
  mockLogger,
  createMockUser,
  createMockMessage,
  createMockClassUpdate,
  createMockConversation,
  createMockReq,
  createMockRes,
  createMockNext,
  mockAuthenticate,
  mockValidate,
  resetMocks
}; 