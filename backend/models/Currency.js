const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    length: 3
  },
  name: {
    type: String,
    required: true
  },
  symbol: String,
  country: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  exchangeRates: [{
    toCurrency: {
      type: String,
      required: true,
      uppercase: true
    },
    rate: {
      type: Number,
      required: true
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

currencySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

currencySchema.index({ country: 1 });

module.exports = mongoose.model('Currency', currencySchema);
