// chat.js
const Mongoose = require("mongoose")
const ChatSchema = new Mongoose.Schema({
  userFrom: {
    type: String,
    required: true,
  },
  userTo: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  sentOn: {
    type: Date,
    default: new Date(),
    require: true
  }
})
const Chat = Mongoose.model("chat", ChatSchema)
module.exports = Chat