const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const handleAvailable = async (req, res) => {
  try {
    const { handle } = req.body;

    if (!handle) {
      return res.status(400).json({ error: "Handle is required" });
    }

    const existingHandle = await prisma.handle.findUnique({
      where: { handle },
    });

    res.json({ available: !existingHandle });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createHandle = async (req, res) => {
  try {
    const { handle } = req.body;
    const userId = req.user.userId;

    if (!handle) {
      return res.status(400).json({ error: "Handle is required" });
    }

    const existingHandle = await prisma.handle.findUnique({
      where: { handle },
    });

    if (existingHandle) {
      return res.status(400).json({ error: "Handle already exists" });
    }

    const newHandle = await prisma.handle.create({
      data: {
        handle,
        userId,
      },
    });


    res.status(201).json(newHandle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};






module.exports = {
  handleAvailable,
  createHandle,

};
