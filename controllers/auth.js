const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { OAuth2Client } = require("google-auth-library");
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");
const { Storage } = require("@google-cloud/storage");

const authClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);
const storage = new Storage();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const checkUsers = async () => {
  try {
    const allUsers = await prisma.user.findMany();
    console.table(
      allUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        tokens: user.tokens,
        provider: user.provider,
        createdAt: user.createdAt.toLocaleString(),
        profileUrl: user.profileUrl,
      }))
    );
  } catch (err) {
    console.error("Error checking users:", err);
  }
};

const checkCreations = async () => {
  try {
    const allCreations = await prisma.creation.findMany();
    console.table(
      allCreations.map((creation) => ({
        displayURL: creation.displayImage,
      }))
    );
  } catch (err) {
    console.error("Error checking creations:", err);
  }
};

const checkImages = async () => {
  try {
    const allImages = await prisma.image.findMany();
    console.table(allImages);
  } catch (err) {
    console.error("Error checking images:", err);
  }
};

// setInterval(checkUsers, 2000);

const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hashSync(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Error creating user" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const isValidPassword = await bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Error logging in" });
  }
};

const googleLogin = async (req, res) => {
  try {
    const token = req.body.authToken;
    const ticket = await authClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_WEB_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      const token = jwt.sign(
        { userId: existingUser.id },
        process.env.JWT_SECRET
      );
      return res.status(200).json({
        message: "Login success ...",
        token,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
        },
      });
    } else {
      const user = await prisma.user.create({
        data: {
          email,
          profileUrl: picture,
          name: name,
        },
      });

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
      res.status(201).json({
        message: "Login success",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal error" });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        message: "Email is required",
        error: true,
      });
    }
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(200).json({
        message:
          "If an account exists with this email, a reset link will be sent.",
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET
    );

    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password/${token}`;

    const emailTemplate = await ejs.renderFile(
      path.join(__dirname, "../views/reset-password-email.ejs"),
      { resetLink }
    );

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      html: emailTemplate,
    });

    res.status(200).json({
      message: "Password reset link has been sent to your email.",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    res.status(500).json({
      message: "An error occurred. Please try again later.",
      error: true,
    });
  }
};
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.render("reset-password-form", {
        token,
        message: "Passwords do not match",
        error: true,
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hashedPassword = await bcrypt.hashSync(password, 10);

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword },
    });

    res.render("reset-password-form", {
      token,
      message:
        "Password has been reset successfully. You can now login with your new password.",
      error: false,
    });
  } catch (error) {
    console.error("Password reset error:", error);
    if (error.name === "TokenExpiredError") {
      return res.render("reset-password-form", {
        token: req.params.token,
        message: "Reset link has expired. Please request a new one.",
        error: true,
      });
    }
    res.render("reset-password-form", {
      token: req.params.token,
      message: "An error occurred. Please try again.",
      error: true,
    });
  }
};

const showResetPasswordForm = async (req, res) => {
  try {
    const { token } = req.params;
    jwt.verify(token, process.env.JWT_SECRET);
    res.render("reset-password-form", {
      token,
      message: "",
      error: false,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.render("reset-password-request", {
      message: "Invalid or expired reset link. Please request a new one.",
      error: true,
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        profileUrl: true,
        createdAt: true,
        handle: true,
        premiumTokens: true,
        tokens: true,
        creations: {
          where: {
            displayImage: {
              not: null,
            },
          },
          select: {
            displayImage: true,
            createdAt: true,
            image: {
              select: {
                prompt: true,
                isPremium: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    console.log(user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let handle;
    if (user.handle) {
      handle = await prisma.handle.findUnique({
        where: {
          id: user.handle,
        },
        select: {
          handle: true,
        },
      });
      handle = handle?.handle;
    }



    res.status(200).json({
      user: {
        ...user,
        handle,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Error fetching profile" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, profileUrl, image, handle } = req.body;

    if (!name && !profileUrl && !image && !handle) {
      return res.status(400).json({
        message:
          "At least one field (name, profileUrl, or image) must be provided for update",
        error: true,
      });
    }

    const updateData = {};
    if (name) updateData.name = name;

    if (handle) {
      console.log(handle);
      const existingHandle = await prisma.handle.findFirst({
        where: {
          id: handle,
          userId: userId,
        },
      });
      if (existingHandle) {
      } else {
        return res.status(401).json({ message: "Auth issues" });
      }

      updateData.handle = handle;
    }
    if (image) {
      const bucketName = process.env.GCP_BUCKET_NAME;
      const fileName = `profile-images/${userId}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.png`;

      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");

      await storage
        .bucket(bucketName)
        .file(fileName)
        .save(imageBuffer, {
          metadata: {
            contentType: "image/png",
          },
        });

      const [url] = await storage
        .bucket(bucketName)
        .file(fileName)
        .getSignedUrl({
          action: "read",
          expires: "03-01-2500",
        });

      updateData.profileUrl = url;
    } else if (profileUrl) {
      updateData.profileUrl = profileUrl;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        profileUrl: true,
        createdAt: true,
        handles: {
          select: {
            handle: true,
          },
        },
      },
    });

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      message: "Error updating profile",
      error: true,
    });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        profileUrl: true,
        createdAt: true,
        handle: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let handle;
    if (user.handle) {
      handle = await prisma.handle.findUnique({
        where: {
          id: user.handle,
        },
        select: {
          handle: true,
        },
      });
      handle = handle?.handle;
    }

    const creations = await prisma.creation.findMany({
      where: { userId, displayImage: { not: null } },
      select: {
        id: true,
        displayImage: true,
        createdAt: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        image: {
          select: {
            prompt: true,
            isPremium: true,
          },
        },
        createdBy: {
          select: {
            profileUrl: true,
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      user: {
        ...user,
        handle,
      },
      creations,
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({ message: "Error fetching user profile" });
  }
};

module.exports = {
  signup,
  login,
  googleLogin,
  requestPasswordReset,
  resetPassword,
  showResetPasswordForm,
  getProfile,
  updateProfile,
  getUserProfile,
};
