const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { generateImage } = require("./image");

const generateAvatar = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const imageUrl = await generateImage({ prompt });

    const avatar = await prisma.avatar.create({
      data: {
        imageUrl,
      },
    });

    return res.status(201).json({
      message: "Avatar generated successfully",
      avatar,
    });
  } catch (error) {
    console.error("Error generating avatar:", error);
    return res.status(500).json({
      message: "Failed to generate avatar",
      error: error.message,
    });
  }
};

const getAvatars = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const [avatars, totalAvatars] = await Promise.all([
      prisma.avatar.findMany({
        skip,
        take: limit,
        orderBy: {
          id: "desc",
        },
      }),
      prisma.avatar.count(),
    ]);

    return res.status(200).json({
      avatars,
      currentPage: page,
      totalPages: Math.ceil(totalAvatars / limit),
      totalAvatars,
    });
  } catch (error) {
    console.error("Error getting avatars:", error);
    return res.status(500).json({
      message: "Failed to get avatars",
      error: error.message,
    });
  }
};

module.exports = {
  generateAvatar,
  getAvatars,
};
