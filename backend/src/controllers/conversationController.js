const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Request = require('../models/Request');

const userSummaryFields = 'name email avatar role skillsToTeach skillsToLearn location availability';

/**
 * @desc    Create or retrieve existing conversation for an accepted skill exchange request
 * @route   POST /api/conversations
 * @access  Private
 */
const createOrGetConversation = async (req, res, next) => {
  try {
    const { requestId } = req.body;

    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid exchange request ID is required',
      });
    }

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Exchange request not found',
      });
    }

    // Must be genuinely accepted
    if (request.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: `Conversations can only be initiated for accepted skill exchange requests. Current status: ${request.status}`,
      });
    }

    const currentUserId = req.user._id.toString();
    const senderId = request.sender.toString();
    const recipientId = request.recipient.toString();

    // Must be sender or recipient
    if (currentUserId !== senderId && currentUserId !== recipientId) {
      return res.status(403).json({
        success: false,
        message: 'You are not an authorized participant in this exchange request',
      });
    }

    // Idempotency: return existing conversation if already created
    const existingConversation = await Conversation.findOne({ request: requestId })
      .populate('participants', userSummaryFields)
      .populate('request')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: userSummaryFields },
      });

    if (existingConversation) {
      return res.status(200).json({
        success: true,
        message: 'Existing conversation retrieved',
        conversation: existingConversation,
      });
    }

    // Create new conversation
    try {
      const newConversation = await Conversation.create({
        participants: [request.sender, request.recipient],
        request: request._id,
        lastMessageAt: new Date(),
      });

      const populatedConversation = await Conversation.findById(newConversation._id)
        .populate('participants', userSummaryFields)
        .populate('request');

      return res.status(201).json({
        success: true,
        message: 'Conversation initiated successfully',
        conversation: populatedConversation,
      });
    } catch (createErr) {
      // In case of race condition on unique request index, retrieve existing
      if (createErr.code === 11000) {
        const raceExisting = await Conversation.findOne({ request: requestId })
          .populate('participants', userSummaryFields)
          .populate('request');
        return res.status(200).json({
          success: true,
          message: 'Existing conversation retrieved',
          conversation: raceExisting,
        });
      }
      throw createErr;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all conversations for the current authenticated user
 * @route   GET /api/conversations
 * @access  Private
 */
const getConversations = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;

    const query = { participants: req.user._id };

    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .populate('participants', userSummaryFields)
        .populate('request')
        .populate({
          path: 'lastMessage',
          populate: { path: 'sender', select: userSummaryFields },
        })
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Conversation.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: conversations.length,
      total,
      page,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
      conversations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single conversation details by ID
 * @route   GET /api/conversations/:id
 * @access  Private
 */
const getConversationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID format',
      });
    }

    const conversation = await Conversation.findById(id)
      .populate('participants', userSummaryFields)
      .populate('request')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: userSummaryFields },
      });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const currentUserId = req.user._id.toString();
    const isParticipant = conversation.participants.some(
      (p) => (p._id || p).toString() === currentUserId
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this conversation',
      });
    }

    return res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get paginated messages in a conversation (oldest-to-newest in returned page)
 * @route   GET /api/conversations/:id/messages
 * @access  Private
 */
const getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID format',
      });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const currentUserId = req.user._id.toString();
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === currentUserId
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access messages in this conversation',
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({ conversation: id })
        .populate('sender', userSummaryFields)
        .sort({ createdAt: 1 }) // oldest-to-newest order
        .skip(skip)
        .limit(limit),
      Message.countDocuments({ conversation: id }),
    ]);

    return res.status(200).json({
      success: true,
      count: messages.length,
      total,
      page,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
      messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send a message in a conversation
 * @route   POST /api/conversations/:id/messages
 * @access  Private
 */
const sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID format',
      });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const currentUserId = req.user._id.toString();
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === currentUserId
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages in this conversation',
      });
    }

    const trimmedText = (text || '').trim();
    if (!trimmedText) {
      return res.status(400).json({
        success: false,
        message: 'Message text cannot be empty',
      });
    }

    if (trimmedText.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Message text cannot exceed 5000 characters',
      });
    }

    // Server enforces the authenticated user as the sender
    const newMessage = await Message.create({
      conversation: id,
      sender: req.user._id,
      text: trimmedText,
      readAt: null,
    });

    // Update conversation lastMessage and activity timestamp
    await Conversation.findByIdAndUpdate(id, {
      lastMessage: newMessage._id,
      lastMessageAt: newMessage.createdAt,
    });

    const populatedMessage = await Message.findById(newMessage._id).populate(
      'sender',
      userSummaryFields
    );

    return res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark unread messages in conversation as read (only messages sent by the other party)
 * @route   PATCH /api/conversations/:id/read
 * @access  Private
 */
const markConversationAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID format',
      });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const currentUserId = req.user._id.toString();
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === currentUserId
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update read status in this conversation',
      });
    }

    const now = new Date();

    // Mark as read only messages sent by the OTHER participant that have not yet been read
    const updateResult = await Message.updateMany(
      {
        conversation: id,
        sender: { $ne: req.user._id },
        readAt: null,
      },
      {
        $set: { readAt: now },
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Eligible messages marked as read',
      readCount: updateResult.modifiedCount,
      readAt: now,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrGetConversation,
  getConversations,
  getConversationById,
  getMessages,
  sendMessage,
  markConversationAsRead,
};
