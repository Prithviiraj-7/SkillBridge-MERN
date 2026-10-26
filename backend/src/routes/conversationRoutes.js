const express = require('express');
const { body, query } = require('express-validator');
const {
  createOrGetConversation,
  getConversations,
  getConversationById,
  getMessages,
  sendMessage,
  markConversationAsRead,
} = require('../controllers/conversationController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

const router = express.Router();

const createConversationValidation = [
  body('requestId')
    .notEmpty()
    .withMessage('Exchange request ID is required')
    .isMongoId()
    .withMessage('Valid exchange request ID is required'),
];

const listPaginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];

const messagePaginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

const sendMessageValidation = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Message text cannot be empty')
    .isLength({ max: 5000 })
    .withMessage('Message text cannot exceed 5000 characters'),

];

// All conversation routes require authentication
router.use(protect);

router.post('/', validate(createConversationValidation), createOrGetConversation);
router.get('/', validate(listPaginationValidation), getConversations);
router.get('/:id', getConversationById);
router.get('/:id/messages', validate(messagePaginationValidation), getMessages);
router.post('/:id/messages', validate(sendMessageValidation), sendMessage);
router.patch('/:id/read', markConversationAsRead);

module.exports = router;
