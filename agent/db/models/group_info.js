var mongoose = require('mongoose');
const collection = "group_info";

var GroupInfoSchema = new mongoose.Schema({
    id: {
        type: String,
        index: true
    },
    round: {
        type: Number,
    },
    selfPk: {
        type: String
    },
    selfAddress: {
        type: String
    },
    curves: {
        type: Array,
        default: []
    },
    rounds: {
        type: Array,
        default: []
    }
}, {
    id: false
});

module.exports = mongoose.model(collection, GroupInfoSchema, collection);
