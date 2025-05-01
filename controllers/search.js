const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


const search = async (req, res) => {
  try {
    const { query } = req.query;
    const searchingUserId = req.user.userId; // Get the searching user's ID
    
    if (!query) {
      return res.status(400).json({ 
        message: "Search query is required",
        error: true 
      });
    }

    const searchQuery = query.toLowerCase();

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                name: {
                  contains: searchQuery,
                  mode: 'insensitive'
                }
              },
              {
                handles: {
                  some: {
                    handle: {
                      contains: searchQuery,
                      mode: 'insensitive'
                    }
                  }
                }
              }
            ]
          },
          {
            id: {
              not: searchingUserId // Exclude the searching user
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        handles: {
          select: {
            handle: true
          }
        },
        profileUrl: true,
        createdAt: true
      },
      take: 5
    });

    const creations = await prisma.creation.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                createdBy: {
                  OR: [
                    {
                      name: {
                        contains: searchQuery,
                        mode: 'insensitive'
                      }
                    },
                    {
                      handles: {
                        some: {
                          handle: {
                            contains: searchQuery,
                            mode: 'insensitive'
                          }
                        }
                      }
                    }
                  ]
                }
              },
              {
                image: {
                  prompt: {
                    contains: searchQuery,
                    mode: 'insensitive'
                  }
                }
              }
            ]
          },
          {
            createdBy: {
              id: {
                not: searchingUserId
              }
            }
          },
          {
            displayImage: {
              not: null 
            }
          }
        ]
      },
      select: {
        id: true,
        displayImage: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            handles: {
              select: {
                handle: true
              }
            },
            profileUrl: true
          }
        },
        image: {
          select: {
            prompt: true
          }
        }
      },
      take: 5
    });

    // Return combined results
    res.status(200).json({
      message: "Search completed successfully",
      data: {
        users,
        creations
      }
    });

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ 
      message: "Error performing search",
      error: true 
    });
  }
};

module.exports = {
  search
}; 