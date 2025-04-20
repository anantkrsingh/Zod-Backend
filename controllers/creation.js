const { PrismaClient } = require("@prisma/client");
const { generateImage } = require("./image");

const prisma = new PrismaClient();

const newCreation = async (req, res) => {
  try {
    const { prompt } = req.body;
    const { userId } = req.user;
    console.log(userId)
    const image = await prisma.image.create({
      data: {
        prompt,
        userId,
        imageURL: "",
      },
    });
    const creation = await prisma.creation.create({
      data: {
        userId: userId,
        imageId: image.id,
      },
    });
    const imageUrl = await generateImage({ prompt });
    await prisma.image.update({
      where: { id: image.id },
      data: { imageURL: imageUrl },
    });
    return res.status(201).json({
      message: "Creation created successfully",
      imageUrl,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  newCreation,
};
