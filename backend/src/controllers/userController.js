const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Helper to normalize and deduplicate skill tags
 * Trims whitespace, removes empty strings, and prevents duplicates
 */
const normalizeSkills = (skills) => {
  if (!Array.isArray(skills)) return [];
  const seen = new Set();
  const normalized = [];

  for (const item of skills) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        normalized.push(trimmed);
      }
    }
  }
  return normalized;
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/users/me
 * @access  Private
 */
const getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current authenticated user's profile
 * @route   PUT /api/users/me
 * @access  Private
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    // Whitelist allowed fields only - never allow password, email, or internal fields to be modified
    const {
      name,
      bio,
      location,
      avatar,
      role,
      skillsToTeach,
      skillsToLearn,
      availability,
    } = req.body;

    if (name !== undefined) user.name = name.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (location !== undefined) user.location = location.trim();
    if (avatar !== undefined) user.avatar = avatar.trim();
    if (role !== undefined) user.role = role;
    if (availability !== undefined) user.availability = availability.trim();

    if (skillsToTeach !== undefined) {
      user.skillsToTeach = normalizeSkills(skillsToTeach);
    }
    if (skillsToLearn !== undefined) {
      user.skillsToLearn = normalizeSkills(skillsToLearn);
    }

    const updatedUser = await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get public profile of another user by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Safely escape string for use in RegExp to prevent ReDoS
 */
const escapeRegex = (string) => {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * @desc    Discover and list user profiles with multi-criteria skill search and pagination
 * @route   GET /api/users
 * @access  Private
 */
const getUsers = async (req, res, next) => {
  try {
    const {
      search,
      teach,
      skillsToTeach,
      learn,
      skillsToLearn,
      role,
      location,
      excludeMe,
    } = req.query;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    const query = {};

    // 1. Exclude currently authenticated user by default (unless excludeMe=false)
    if (excludeMe !== 'false' && req.user && req.user._id) {
      query._id = { $ne: req.user._id };
    }

    // 2. Role filter
    if (role) {
      const normalizedRole = role.toLowerCase().trim();
      query.role = normalizedRole;
    }

    // 3. Location filter (case-insensitive partial match)
    if (location && location.trim()) {
      query.location = { $regex: escapeRegex(location.trim()), $options: 'i' };
    }

    // 4. Skills to teach filter (case-insensitive partial match)
    const teachFilter = teach || skillsToTeach;
    if (teachFilter && teachFilter.trim()) {
      query.skillsToTeach = { $regex: escapeRegex(teachFilter.trim()), $options: 'i' };
    }

    // 5. Skills to learn filter (case-insensitive partial match)
    const learnFilter = learn || skillsToLearn;
    if (learnFilter && learnFilter.trim()) {
      query.skillsToLearn = { $regex: escapeRegex(learnFilter.trim()), $options: 'i' };
    }

    // 6. Free-text search across name, bio, skillsToTeach, and skillsToLearn
    if (search && search.trim()) {
      const searchRegex = { $regex: escapeRegex(search.trim()), $options: 'i' };
      query.$or = [
        { name: searchRegex },
        { bio: searchRegex },
        { skillsToTeach: searchRegex },
        { skillsToLearn: searchRegex },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
      users,
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getMyProfile,
  updateMyProfile,
  getUserById,
  getUsers,
  normalizeSkills,
};
