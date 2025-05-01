const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getComments = async (req, res) => {
  try {
    const { creationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const comments = await prisma.comment.findMany({
      where: {
        creationId: parseInt(creationId),
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileUrl: true,
          },
        },
      },
    });

    const totalComments = await prisma.comment.count({
      where: {
        creationId: parseInt(creationId),
      },
    });

    return res.status(200).json({
      comments,
      currentPage: page,
      totalPages: Math.ceil(totalComments / limit),
      totalComments,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const createComment = async (req, res) => {
  try {
    const { creationId } = req.params;
    const { content } = req.body;
    const { userId } = req.user;

    // Check if creation exists
    const creation = await prisma.creation.findUnique({
      where: { id: parseInt(creationId) },
    });

    if (!creation) {
      return res.status(404).json({
        message: "Creation not found",
      });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        creationId: parseInt(creationId),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileUrl: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: "Comment created successfully",
      comment,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  getComments,
  createComment,
}; 