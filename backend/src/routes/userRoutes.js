const express = require('express');
const { body, query } = require('express-validator');
const {
  getMyProfile,
  updateMyProfile,
  getUserById,
  getUsers,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

const router = express.Router();

const getUsersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('role')
    .optional()
    .isIn(['learner', 'teacher', 'both'])
    .withMessage('Role must be one of: learner, teacher, both'),
];

const updateProfileValidation = [

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),
  body('avatar')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  body('role')
    .optional()
    .isIn(['learner', 'teacher', 'both'])
    .withMessage('Role must be one of: learner, teacher, both'),
  body('skillsToTeach')
    .optional()
    .isArray()
    .withMessage('skillsToTeach must be an array of skill names'),
  body('skillsToLearn')
    .optional()
    .isArray()
    .withMessage('skillsToLearn must be an array of skill names'),
  body('availability')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Availability cannot exceed 100 characters'),
];

// All user profile routes require authentication
router.use(protect);

router.get('/me', getMyProfile);
router.put('/me', validate(updateProfileValidation), updateMyProfile);
router.get('/', validate(getUsersValidation), getUsers);
router.get('/:id', getUserById);


module.exports = router;
