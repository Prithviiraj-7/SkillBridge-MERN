const mongoose = require('mongoose');
const Request = require('../models/Request');
const User = require('../models/User');

const userSummaryFields = 'name email avatar role skillsToTeach skillsToLearn location availability';

/**
 * Helper to escape regex special characters
 */
const escapeRegex = (string) => {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * @desc    Create a new skill exchange request
 * @route   POST /api/requests
 * @access  Private
 */
const createRequest = async (req, res, next) => {
  try {
    const { recipient, skillWanted, skillOffered, message } = req.body;

    // Validate recipient ID format
    if (!recipient || !mongoose.Types.ObjectId.isValid(recipient)) {
      return res.status(400).json({
        success: false,
        message: 'A valid recipient user ID is required',
      });
    }

    // Disallow self-requests
    if (req.user._id.toString() === recipient.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send a skill exchange request to yourself',
      });
    }

    // Verify recipient user exists
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found',
      });
    }

    // Check for duplicate pending request for the same wanted skill between these users
    const trimmedSkillWanted = skillWanted.trim();
    const existingPending = await Request.findOne({
      sender: req.user._id,
      recipient,
      status: 'pending',
      skillWanted: {
        $regex: new RegExp(`^${escapeRegex(trimmedSkillWanted)}$`, 'i'),
      },
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message:
          'A pending request for this skill has already been sent to this user. Please wait for their response or cancel your previous request.',
      });
    }

    // Enforce server-assigned sender and initial status
    const newRequest = await Request.create({
      sender: req.user._id,
      recipient,
      skillWanted: trimmedSkillWanted,
      skillOffered: (skillOffered || '').trim(),
      message: (message || '').trim(),
      status: 'pending',
    });

    const populatedRequest = await Request.findById(newRequest._id).populate(
      'sender recipient',
      userSummaryFields
    );

    return res.status(201).json({
      success: true,
      message: 'Skill exchange request sent successfully',
      request: populatedRequest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get requests sent by the current authenticated user
 * @route   GET /api/requests/sent
 * @access  Private
 */
const getSentRequests = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { sender: req.user._id };

    if (req.query.status) {
      const normalizedStatus = req.query.status.toLowerCase().trim();
      if (['pending', 'accepted', 'declined', 'cancelled'].includes(normalizedStatus)) {
        query.status = normalizedStatus;
      }
    }

    const [requests, total] = await Promise.all([
      Request.find(query)
        .populate('recipient', userSummaryFields)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Request.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: requests.length,
      total,
      page,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
      requests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get requests received by the current authenticated user
 * @route   GET /api/requests/received
 * @access  Private
 */
const getReceivedRequests = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { recipient: req.user._id };

    if (req.query.status) {
      const normalizedStatus = req.query.status.toLowerCase().trim();
      if (['pending', 'accepted', 'declined', 'cancelled'].includes(normalizedStatus)) {
        query.status = normalizedStatus;
      }
    }

    const [requests, total] = await Promise.all([
      Request.find(query)
        .populate('sender', userSummaryFields)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Request.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: requests.length,
      total,
      page,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
      requests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single request by ID (sender or recipient only)
 * @route   GET /api/requests/:id
 * @access  Private
 */
const getRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format',
      });
    }

    const request = await Request.findById(id).populate(
      'sender recipient',
      userSummaryFields
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    const currentUserId = req.user._id.toString();
    const senderId = request.sender._id
      ? request.sender._id.toString()
      : request.sender.toString();
    const recipientId = request.recipient._id
      ? request.recipient._id.toString()
      : request.recipient.toString();

    // Only sender or recipient may view this request
    if (currentUserId !== senderId && currentUserId !== recipientId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this request',
      });
    }

    return res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update request status according to lifecycle rules
 * @route   PATCH /api/requests/:id/status
 * @access  Private
 */
const updateRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format',
      });
    }

    const validTargetStatuses = ['accepted', 'declined', 'cancelled'];
    if (!status || !validTargetStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validTargetStatuses.join(', ')}`,
      });
    }

    // Find the current request
    const existingRequest = await Request.findById(id);
    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    // Terminal state rule: Once accepted, declined, or cancelled, cannot change again
    if (existingRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot change status of a request that is already ${existingRequest.status}. Terminal states cannot be changed.`,
      });
    }

    const currentUserId = req.user._id.toString();
    const senderId = existingRequest.sender.toString();
    const recipientId = existingRequest.recipient.toString();

    // Permission rules:
    // Only recipient can accept or decline
    if (status === 'accepted' || status === 'declined') {
      if (currentUserId !== recipientId) {
        return res.status(403).json({
          success: false,
          message: 'Only the recipient can accept or decline this request',
        });
      }
    }

    // Only sender can cancel
    if (status === 'cancelled') {
      if (currentUserId !== senderId) {
        return res.status(403).json({
          success: false,
          message: 'Only the sender can cancel this request',
        });
      }
    }

    // Atomic update to guard against concurrent conflicting status modifications
    const updatedRequest = await Request.findOneAndUpdate(
      { _id: id, status: 'pending' },
      { status },
      { new: true }
    ).populate('sender recipient', userSummaryFields);

    if (!updatedRequest) {
      return res.status(409).json({
        success: false,
        message: 'Request status was modified concurrently by another operation',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Request ${status} successfully`,
      request: updatedRequest,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequest,
  getSentRequests,
  getReceivedRequests,
  getRequestById,
  updateRequestStatus,
};
