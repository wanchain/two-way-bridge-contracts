var mongoose = require('mongoose');
const collection = "context";

var ContextSchema = new mongoose.Schema({
    key: {
        type: String,
        unique: true,
        index: true
    },
    value: {
        type: Object
    }
}, {
    id: false
});

module.exports = mongoose.model(collection, ContextSchema, collection);
