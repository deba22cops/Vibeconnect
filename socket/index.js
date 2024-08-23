const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { getUser, createMessage, getChat } = require('../db/index')


const maxAge = 3 * 60 * 60;
const jwtSecret = '4715aed3c946f7b0a38e6b534a9583628d84e96d10fbc04700770d572af3dce43625dd';

const UserStore = (function () {
    const _data = {};
    const addOnlineUser = (key, val) => {
        _data[key] = val;
        return val
    }

    const getOnlineUser = (key) => {
        return _data[key]
    }

    const deleteOnlineUser = (key) => {
        const val = _data[key]
        delete _data[key]
        return val
    }

    const getAllOnlineUsers = () => {
        return Object.keys(_data)
    }

    return {
        addOnlineUser,
        getOnlineUser,
        deleteOnlineUser,
        getAllOnlineUsers
    };
}());

exports.UserStore = UserStore

exports.renderChatWithData = async (req, res) => {
    const otherUser = await getUser(req.params.id)
    const token = req.cookies.jwt
    if (token) {
        jwt.verify(token, jwtSecret, async (err, decodedToken) => {
            if (err) {
                return res.status(401).json({ message: "Not authorized" })
            } else {
                const currUser = await getUser(decodedToken.id)
                const chats = await getChat({fromId: currUser.id, toId: otherUser.id})
                otherUser.isOnline = !!UserStore.getOnlineUser(otherUser.id)
                res.render("chat", { currUser, otherUser, chats })
            }
        })
    } else {
        return res
            .status(401)
            .json({ message: "Not authorized, token not available" })
    }
}

const getUserInfo = async (cookie, socket) => {
    // Extract the token from the cookie
    const token = cookie ? cookie.split('jwt=')[1] : null;

    // Log the token to check its value
    console.log(token);

    // Verify the token if it exists
    if (token) {
        jwt.verify(token, jwtSecret, async (err, decodedToken) => {
            if (err) {
                console.error('JWT verification failed:', err);
                return;
            }

            const user = await getUser(decodedToken.id);
            socket.data = user;
            UserStore.addOnlineUser(user.id, socket.id);
        });
    } 
};


exports.creatSocket = (app) => {
    const io = new Server(app);
    io.use((socket, next) => {
        getUserInfo(socket.handshake.headers.cookie, socket)
        next()
    });
    io.on('connection', (socket) => {
        socket.on("private message", (msg) => {
            const anotherSocketId = UserStore.getOnlineUser(msg.to)
            socket.to(anotherSocketId).emit("private message", { ...msg, from: socket.data });
            createMessage({fromId: socket?.data?.id, toId: msg.to, message: msg.message})
        });
        socket.on('disconnect', () => {
            let disconnected
            try {
                disconnected = UserStore.deleteOnlineUser(socket?.data?.id)
            } catch (e) {
                console.log("User is already disconnected", e)
            }
            console.log(socket?.data?.id, 'user disconnected', disconnected);
        });
    });
}
