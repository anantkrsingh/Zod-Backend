const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { createNotification } = require("./notification");

const likeCreation = async (req, res) => {
  try {
    const { creationId } = req.params;
    const userId = req.user.userId;

    const creation = await prisma.creation.findUnique({
      where: { id: creationId },
      include: { createdBy: true },
    });

    if (!creation) {
      return res.status(404).json({ message: "Creation not found" });
    }

    const existingLike = await prisma.creation.findFirst({
      where: {
        id: creationId,
        likes: {
          some: {
            id: userId,
          },
        },
      },
    });

    if (existingLike) {
      await prisma.creation.update({
        where: { id: creationId },
        data: {
          likes: {
            disconnect: {
              id: userId,
            },
          },
        },
      });
      return res.status(200).json({ message: "Creation unliked successfully" });
    }

    await prisma.creation.update({
      where: { id: creationId },
      data: {
        likes: {
          connect: {
            id: userId,
          },
        },
      },
    });

    const liker = await prisma.user.findUnique({
      where: { id: userId },
    });

    // if (userId === creation.userId) {
    //   return res.status(200).json({ message: "Creation liked successfully" });
    // }

    await createNotification(
      creation.userId,
      "New Love on Creation",
      `${liker.name} Has Loved Your Creation ❤️`,
      "heart"
    );

    res.status(200).json({ message: "Creation liked successfully" });
  } catch (error) {
    console.error("Like creation error:", error);
    res.status(500).json({ message: "Error processing like" });
  }
};

module.exports = {
  likeCreation,
};
