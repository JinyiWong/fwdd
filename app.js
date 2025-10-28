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

//6. Start the Server:
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Example app listening on http://localhost:${PORT}`);
});

