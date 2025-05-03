const { PrismaClient } = require("@prisma/client");
const { generateImage, generateThumbnail } = require("./image");
const { createNotification } = require("./notification");

const prisma = new PrismaClient();

const modifyPrompt = (prompt, promptCategory) => {
  switch (promptCategory) {
    case "cartoon":
      return `A cartoonish image ${prompt}`;
    case "ghibli":
      return `Ghibli art of ${prompt}`;
    case "sketch":
      return `Sketch of ${prompt}`;
    case "3d-cartoon":
      return `3d cartoon image of ${prompt}`;
    default:
      return prompt;
  }
};

const newCreation = async (req, res) => {
  try {
    const { prompt, isPremium, category } = req.body;
    console.log(prompt, isPremium, category);
    const { userId } = req.user;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const modifiedPrompt = modifyPrompt(prompt, category);

    const image = await prisma.image.create({
      data: {
        prompt: prompt,
        userId,
        imageURL: "",
        isPremium,
      },
    });
    const creation = await prisma.creation.create({
      data: {
        userId: userId,
        imageId: image.id,
      },
    });
    const imageUrl = await generateImage({ prompt: modifiedPrompt });
    const thumbnailUrl = await generateThumbnail({
      imageUrl,
      avatarUrl: user.profileUrl,
    });
    await prisma.image.update({
      where: { id: image.id },
      data: { imageURL: imageUrl },
    });
    await prisma.creation.update({
      where: { id: creation.id },
      data: { displayImage: thumbnailUrl },
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

const getAllCreations = async (req, res) => {
  try {

    const creations = await prisma.creation.findMany(
      {
        where: {
          displayImage: {
            not: null
          }
        },
        include: {
          image: {
            select: {
              prompt: true,
            }
          },
          createdBy:
          {
            select: {
              id: true,
              name: true,
              profileUrl: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        }
      }
    )

    return res.status(200).json({
      creations,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};



const getCreations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const { userId } = req.user;

    const creations = await prisma.creation.findMany({
      skip,
      take: limit,

      orderBy: {
        likes: {
          _count: "desc",
        },
      },
      where: {
        displayImage: {
          not: null,
        },
      },
      include: {
        image: {
          select: {
            prompt: true,
            isPremium: true,
            imageURL: false,
            id: false,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            profileUrl: true,
          },
        },
        likes: {
          where: {
            id: userId,
          },
          select: {
            id: true,
          },
        },
      },
    });

    const transformedCreations = creations.map((creation) => ({
      ...creation,
      isLiked: creation.likes.length > 0,
      likes: undefined,
    }));

    const totalCreations = await prisma.creation.count();

    return res.status(200).json({
      creations: transformedCreations,
      currentPage: page,
      totalPages: Math.ceil(totalCreations / limit),
      totalCreations,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getCreation = async (req, res) => {
  try {
    const { creationId } = req.params;
    const creation = await prisma.creation.findUnique({
      where: { id: creationId },
      include: {
        image: {
          select: {
            prompt: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            profileUrl: true,
          },
        },


        _count: {
          select: {
            likes: true,
            comments: true
          }
        },

      },
    });
    return res.status(200).json({
      creation,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
const getUserCreations = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const creations = await prisma.creation.findMany({
      where: {
        userId: parseInt(userId),
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        image: true,
      },
    });

    const totalUserCreations = await prisma.creation.count({
      where: {
        userId: parseInt(userId),
      },
    });

    return res.status(200).json({
      creations,
      currentPage: page,
      totalPages: Math.ceil(totalUserCreations / limit),
      totalCreations: totalUserCreations,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};



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

    // Like the creation
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

    // Create notification for the creation owner
    const liker = await prisma.user.findUnique({
      where: { id: userId },
    });

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

const unlikeCreation = async (req, res) => {
  try {
    const { creationId } = req.params;
    const { userId } = req.user;

    const creation = await prisma.creation.findUnique({
      where: { id: creationId },
    });

    if (!creation) {
      return res.status(404).json({
        message: "Creation not found",
      });
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

    if (!existingLike) {
      return res.status(400).json({
        message: "You have not liked this creation",
      });
    }

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

    return res.status(200).json({
      message: "Like removed successfully",
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
  getAllCreations,
  getUserCreations,
  likeCreation,
  unlikeCreation,
  getCreations,
  getCreation
};
