const express = require('express');
const { body, query } = require('express-validator');
const {
  createRequest,
  getSentRequests,
  getReceivedRequests,
  getRequestById,
  updateRequestStatus,
} = require('../controllers/requestController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

const router = express.Router();

const createRequestValidation = [
  body('recipient')
    .notEmpty()
    .withMessage('Recipient user ID is required')
    .isMongoId()
    .withMessage('A valid recipient user ID is required'),
  body('skillWanted')
    .trim()
    .notEmpty()
    .withMessage('Skill wanted is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Skill wanted must be between 1 and 100 characters'),
  body('skillOffered')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Skill offered cannot exceed 100 characters'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Message cannot exceed 1000 characters'),
];

const listRequestsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('status')
    .optional()
    .isIn(['pending', 'accepted', 'declined', 'cancelled'])
    .withMessage('Status filter must be pending, accepted, declined, or cancelled'),
];

const updateStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['accepted', 'declined', 'cancelled'])
    .withMessage('Status must be one of: accepted, declined, cancelled'),
];

// All request routes require authentication
router.use(protect);

router.post('/', validate(createRequestValidation), createRequest);
router.get('/sent', validate(listRequestsValidation), getSentRequests);
router.get('/received', validate(listRequestsValidation), getReceivedRequests);
router.get('/:id', getRequestById);
router.patch('/:id/status', validate(updateStatusValidation), updateRequestStatus);

module.exports = router;
