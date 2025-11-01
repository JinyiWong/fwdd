// 1. Import Dependencies:
const express = require("express");
const path = require("path");
const session = require("express-session");
const mysql = require("mysql2");

// 2. Database Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "python_escape",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to the database");
  }
});

// 3. Initialize the App
const app = express();

// 4. Set Up Middleware (✅ order matters)
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true })); // parse form data
app.use(
  session({
    secret: "supersecretkey", // any string
    resave: false,
    saveUninitialized: true,
  })
);

// 5. Set Up View Engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// 6. Connect Routes (✅ after middleware)
const loginRoutes = require("./routes/login")(db);
const registerRoutes = require("./routes/register")(db);

app.use("/", registerRoutes);
app.use("/", loginRoutes);

// 7. Other Routes
app.get("/", (req, res) => {
  res.render("index", { title: "Hey", message: "Hello there!" });
});

app.get("/about", (req, res) => {
  res.render("about", { title: "About Us", message: "Learn more about our platform." });
});

app.get("/register", (req, res) => res.render("register"));
app.get("/dashboard", (req, res) => res.render("dashboard"));
app.get("/leaderboard", (req, res) => res.render("leaderboard"));
app.get("/history", (req, res) => res.render("history"));
app.get("/results", (req, res) => res.render("results"));
app.get("/lobby", (req, res) => res.render("lobby"));
app.get("/room", (req, res) => res.render("room"));
app.get("/question", (req, res) => res.render("question"));
app.get("/result_lobby", (req, res) => res.render("result_lobby"));
app.get("/question_recap", (req, res) => res.render("question_recap"));

// 8. Start Server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
