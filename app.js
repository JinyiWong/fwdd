// 1. Import Dependencies:
const express = require("express");
const path = require("path");

//2. Initialize the App:
const app = express();

//3. Set Up Middleware:
app.use(express.static(path.join(__dirname, "public")));

//4. Set Up View Engine:
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

//5. Define Routes:
app.get("/", function (req, res) {
res.render("index", { title: "Hey", message: "Hello there!" });
});

app.get("/about", function (req, res) {
res.render("about", { title: "About Us", message: "Learn more about our platform." });
});

app.get("/signin", function (req, res) {
res.render("signin", { title: "Sign In", message: "Access your account." });
});

app.get("/register", function (req, res) {
res.render("register");
});

app.get("/dashboard", function (req, res) {
res.render("dashboard");
});

app.get("/leaderboard", function (req, res) {
res.render("leaderboard");
});

app.get("/history", function (req, res) {
res.render("history");
});

app.get("/results", function (req, res) {
res.render("results");
});

app.get("/lobby", function (req, res) {
res.render("lobby");
});

app.get("/room", function (req, res) {
res.render("room");
});

app.get("/question", function (req, res) {
res.render("question");
});

//6. Start the Server:
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Example app listening on http://localhost:${PORT}`);
});

