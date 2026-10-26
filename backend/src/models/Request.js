const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
      index: true,
    },
    skillWanted: {
      type: String,
      required: [true, 'Skill wanted is required'],
      trim: true,
      minlength: [1, 'Skill wanted cannot be empty'],
      maxlength: [100, 'Skill wanted cannot exceed 100 characters'],
    },
    skillOffered: {
      type: String,
      default: '',
      trim: true,
      maxlength: [100, 'Skill offered cannot exceed 100 characters'],
    },
    message: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'accepted', 'declined', 'cancelled'],
        message: '{VALUE} is not a valid request status',
      },
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for user requests lookup
requestSchema.index({ sender: 1, createdAt: -1 });
requestSchema.index({ recipient: 1, createdAt: -1 });
requestSchema.index({ sender: 1, recipient: 1, status: 1 });

const Request = mongoose.model('Request', requestSchema);

module.exports = Request;
