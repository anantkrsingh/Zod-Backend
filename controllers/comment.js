const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { createNotification } = require("./notification");

const getComments = async (req, res) => {
  try {
    const { creationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const comments = await prisma.comment.findMany({
      where: { creationId: creationId },
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
        creationId: creationId,
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
    const { text } = req.body;
    const { userId } = req.user;

    const creation = await prisma.creation.findUnique({
      where: { id: creationId },
    });

    if (!creation) {
      return res.status(404).json({
        message: "Creation not found",
      });
    }

    const comment = await prisma.comment.create({
      data: {
        comment: text,
        userId: userId,
        creationId: creationId,
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

    await createNotification(
      creation.userId,
      `${comment.user.name} Has Commented On Your Creation`,
      text,
      "comment"
    );

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
