const express = require("express");
require("dotenv").config();
const app = express();

app.set("view engine", "ejs");
app.set("views", "./views");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Routes
const authRoutes = require("./routes/auth");
const creationsRoutes = require("./routes/creations");
app.use("/api/auth", authRoutes);
app.use("/api/creations", creationsRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
