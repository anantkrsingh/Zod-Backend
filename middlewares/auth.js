const jwt = require("jsonwebtoken");

const verifyToken = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).json({ message: "Auth. Required" });
    }
    const token = authorization.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Auth. Required" });

    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal error ", error });
  }
};
module.exports = {
  verifyToken,
};
