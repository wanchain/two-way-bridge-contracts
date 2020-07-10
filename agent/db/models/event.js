var mongoose = require('mongoose');
const collection = "eventTracker";

var EventSchema = new mongoose.Schema({
  tracker: {
    type: String,
    index: true
  },
  name: {
    type: String,
    index: true
  },
  chain: {
    type: String
  },
  blockNumber: {
    type: Number,
    index: true
  },
  txIndex: {
    type: Number
  },
  logIndex: {
    type: Number
  },
  txHash: {
    type: String,
    lowercase: true,
    index: true
  },
  topics: {
    type: Array
  },
  data: {
    type: String
  },
  parsed: {
    type: Object
  }
}, {
  id: false
});

module.exports = mongoose.model(collection, EventSchema, collection);
