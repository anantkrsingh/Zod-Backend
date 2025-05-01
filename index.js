const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");

app.use(cors());
app.set("view engine", "ejs");
app.set("views", "./views");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const authRoutes = require("./routes/auth");
const creationsRoutes = require("./routes/creations");
const avatarRoutes = require("./routes/avatar");
const notificationRoutes = require("./routes/notification");
const adminRoutes = require("./routes/adminRoutes");
const handleRoutes = require("./routes/handleRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/creations", creationsRoutes);
app.use("/api/avatars", avatarRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/handles", handleRoutes);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
