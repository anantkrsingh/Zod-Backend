const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const addLike = async (req, res) => {
  try {
    const { creationId } = req.body;
  } catch (error) {
    console.log(error);
  }
};
