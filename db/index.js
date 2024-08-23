// db.js
const User = require("../model/user");
const Chat = require("../model/chat");

const Mongoose = require("mongoose")
const localDB = `mongodb://localhost:27017/role_auth`
exports.connectDB = async () => {
  await Mongoose.connect(localDB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  console.log("MongoDB Connected")
}

exports.getUser = async (id) => {
  const user = await User.findById(id)
  const container = {}
  container.username = user.username
  container.role = user.role
  container.id = user.id
  return container
} 

exports.createMessage = async ({fromId, toId, message}) => {
  await Chat.create({userFrom: fromId, userTo: toId, message})
  console.log("creat")
} 

exports.getChat = async ({fromId, toId}) => {
  const promise1 = new Promise((resolve, reject) => {
    try{
      resolve(Chat.find({userFrom: fromId, userTo: toId}))
    } catch (e) {
      reject(e)
    }
  });
  const promise2 = new Promise((resolve, reject) => {
    try{
      resolve(Chat.find({userFrom: toId, userTo: fromId}))
    } catch (e) {
      reject(e)
    }
  });
  
  const [ chatList1, chatList2 ] = await Promise.all([promise1, promise2])
  if(!Array.isArray(chatList1) || !Array.isArray(chatList2)) {
    console.log("ERROR: getChat not working::", chatList1, chatList2)
    return []
  }
  const container = [...chatList1, ...chatList2].reduce((container, {userFrom, userTo, message, sentOn}) => {
    container.push({userFrom, userTo, message, sentOn})
    return container
  }, [])
  console.log("container::", container)
  return container.sort(function(a,b) {
      return new Date(a.sentOn) - new Date(b.sentOn);
  });
} 



