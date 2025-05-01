const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const adminController = {
  // Admin registration
  register: async (req, res) => {
    try {
      const { name, email, password } = req.body;
      
      // Check if admin already exists
      const existingAdmin = await prisma.admin.findUnique({
        where: { email }
      });
      
      if (existingAdmin) {
        return res.status(400).json({ error: 'Admin with this email already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create admin
      const admin = await prisma.admin.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'admin'
        }
      });
      
      // Generate token
      const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, {
        expiresIn: '7d'
      });
      
      res.status(201).json({ admin, token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Admin login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const admin = await prisma.admin.findUnique({ where: { email } });

      if (!admin) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, {
        expiresIn: '7d'
      });

      res.json({ admin, token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get dashboard analytics
  getDashboardStats: async (req, res) => {
    try {
      const [
        totalUsers,
        totalCreations,
        totalImages,
        totalComments,
        recentUsers,
        recentCreations
      ] = await Promise.all([
        prisma.user.count(),
        prisma.creation.count(),
        prisma.image.count(),
        prisma.comment.count(),
        prisma.user.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.creation.findMany({
          take: 5,
          include: {
            createdBy: true,
            image: true
          },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      res.json({
        stats: {
          totalUsers,
          totalCreations,
          totalImages,
          totalComments
        },
        recentUsers,
        recentCreations
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get all users with pagination
  getUsers: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                creations: true,
                comments: true,
                likedCreations: true
              }
            }
          }
        }),
        prisma.user.count()
      ]);

      res.json({
        users,
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get all creations with pagination
  getCreations: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const [creations, total] = await Promise.all([
        prisma.creation.findMany({
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: true,
            image: true,
            _count: {
              select: {
                likes: true,
                comments: true
              }
            }
          }
        }),
        prisma.creation.count()
      ]);

      res.json({
        creations,
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = adminController; 