const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: No authentication token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized: User belonging to this token no longer exists',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    let message = 'Not authorized: Invalid token';
    if (error.name === 'TokenExpiredError') {
      message = 'Not authorized: Token has expired. Please log in again.';
    }
    return res.status(401).json({
      success: false,
      message,
    });
  }
};

module.exports = { protect };
