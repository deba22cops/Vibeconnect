const express = require("express")
const cookieParser = require("cookie-parser");

const { connectDB } = require("./db/index.js");
const { adminAuth, userAuth } = require("./middleware/auth.js");
const {renderChatWithData, creatSocket} = require('./socket')

const PORT = 5000
const app = express()

connectDB();

app.use(express.json())
app.use(cookieParser());

app.use("/api/auth", require("./auth/route"))
app.use('/uploads', express.static('uploads'));


app.set("view engine", "ejs")
app.get("/", userAuth,  (req, res) => res.render("home"))
app.get("/chat/:id", userAuth, renderChatWithData)
app.get("/register", (req, res) => res.render("register"))
app.get("/login", (req, res) => res.render("login"))
app.get("/admin", adminAuth, (req, res) => res.render("admin"))
app.get("/basic", userAuth, (req, res) => res.render("user"))
app.get("/logout", (req, res) => {
  res.cookie("jwt", "", { maxAge: "1" })
  res.redirect("/views/home.ejs")
})

const server = app.listen(PORT, () =>
    console.log(`Server Connected to port ${PORT}`)
)

creatSocket(server)
// Handling Error
process.on("unhandledRejection", err => {
  console.log(`An error occurred: ${err.message}`)
  server.close(() => process.exit(1))
})