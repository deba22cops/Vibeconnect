const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require("../model/user");
const { UserStore } = require("../socket")

const maxAge = 3 * 60 * 60;
const jwtSecret = '4715aed3c946f7b0a38e6b534a9583628d84e96d10fbc04700770d572af3dce43625dd';

exports.adminAuth = (req, res, next) => {
    const token = req.cookies.jwt
    if (token) {
        jwt.verify(token, jwtSecret, (err, decodedToken) => {
            if (err) {
                return res.status(401).json({ message: "Not authorized" })
            } else {
                if (decodedToken.role !== "admin") {
                    return res.status(401).json({ message: "Not authorized" })
                } else {
                    next()
                }
            }
        })
    } else {
        return res
            .status(401)
            .json({ message: "Not authorized, token not available" })
    }
}

// auth.js
exports.register = async (req, res, next) => {
    console.log(req.body);
    const { username, password } = req.body;
    if (password.length < 6) {
        return res.status(400).json({ message: "Password less than 6 characters" });
    }
    try {
        console.log(username, 'string', password);
        bcrypt.hash(password, 10).then(async (hash) => {
            await User.create({
                username,
                password: hash,
            })
                .then((user) => {
                    const token = jwt.sign(
                        { id: user._id, username: user.username, role: user.role },
                        jwtSecret,
                        {
                            expiresIn: maxAge, // 3hrs in sec
                        }
                    );
                    res.cookie("jwt", token, {
                        httpOnly: true,
                        maxAge: maxAge * 1000, // 3hrs in ms
                    });
                    res.status(201).json({
                        message: "User successfully created",
                        user: user._id,
                    });
                })
                .catch((error) =>
                    res.status(400).json({
                        message: "User not successful created",
                        error: error.message,
                    })
                );
        });
    } catch (err) {
        res.status(401).json({
            message: "User not successful created",
            err: err.message,
        });
    }
}

exports.login = async (req, res, next) => {
    const { username, password } = req.body;
    // Check if username and password is provided
    console.log('username::', username)
    if (!username || !password) {
        return res.status(400).json({
            message: "Username or Password not present",
        });
    }
    try {
        const user = await User.findOne({ username });
        if (!user) {
            res.status(400).json({
                message: "Login not successful",
                error: "User not found",
            });
        } else {
            // comparing given password with hashed password
            bcrypt.compare(password, user.password).then(function (result) {
                if(result) {
                    const token = jwt.sign(
                        { id: user._id, username: user.username, role: user.role },
                        jwtSecret,
                        {
                            expiresIn: maxAge, // 3hrs in sec
                        }
                    );
                    res.cookie("jwt", token, {
                        httpOnly: true,
                        maxAge: maxAge * 1000, // 3hrs in ms
                    });
                    res.status(200).json({
                        message: "Login successful",
                        user,
                    })
                } else {
                    res.status(400).json({ message: "Login not successful" });
                }
            });
        }
    } catch (error) {
        res.status(400).json({
            message: "An error occurred",
            error: error.message,
        });
    }
}

exports.update = async (req, res, next) => {
    const { role, id } = req.body;
    // Verifying if role and id is present
    if (role && id) {
        // Verifying if the value of role is admin
        if (role === "admin") {
            await User.findById(id)
                .then((user) => {
                    // Third - Verifies the user is not an admin
                    if (user.role !== "admin") {
                        user.role = role;
                        user.save()
                            .then((savedUser) => {
                                res.status(201).json({ message: "Update successful", user: savedUser });
                            })
                            .catch((err) => {
                                res.status(400).json({ message: "An error occurred", error: err.message });
                            });

                    } else {
                        res.status(400).json({ message: "User is already an Admin" });
                    }
                })
                .catch((error) => {
                    res.status(400).json({ message: "An error occurred", error: error.message });
                });
        } else {
            res.status(400).json({
                message: "Role is not admin",
            });
        }
    } else {
        res.status(400).json({ message: "Role or Id not present" });
    }
}

exports.deleteUser = async (req, res, next) => {
    const { id } = req.body;
    await User.findById(id)
        .then(user => User.deleteOne({ _id: id }))
        .then(user => {
            res.cookie("jwt", "", { maxAge: "1" })
            res.status(201).json({ message: "User successfully deleted", user })
        })
        .catch(error =>
            res.status(400).json({ message: "An error occurred", error: error.message })
        );
}
exports.userAuth = (req, res, next) => {
    const token = req.cookies.jwt
    if (token) {
        jwt.verify(token, jwtSecret, (err, decodedToken) => {
            if (err) {
                return res.status(401).json({ message: "Not authorized" })
            } else {
                if (decodedToken.role !== "Basic") {
                    return res.status(401).json({ message: "Not authorized" })
                } else {
                    next()
                }
            }
        })
    } else {
        return res
            .status(401)
            .json({ message: "Not authorized, token not available" })
    }
}
exports.getUsers = async (req, res) => {
    const token = req.cookies.jwt
    let id

    jwt.verify(token, jwtSecret, (err, decodedToken) => {
        if (err) {
            return res.status(401).json({ message: "Not authorized" })
        } else {
            id = decodedToken.id 
        }
    })
    await User.find({})
        .then(users => {
            const userFunction = users.reduce((allUsers, user) => {
                if(user.id == id) return allUsers
                const container = {}
                container.isOnline = false
                container.username = user.username
                container.role = user.role
                container.id = user.id
                container.isOnline = !!UserStore.getOnlineUser(user.id)
                allUsers.push(container)
                return allUsers
            }, [])
            res.status(200).json({ user: userFunction })
        })
        .catch(err =>
            res.status(401).json({ message: "Not successful", error: err.message })
        )
}