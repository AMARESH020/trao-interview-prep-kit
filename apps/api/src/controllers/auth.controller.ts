import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";

export async function register(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      res.status(400).json({
        message: "Email and password are required",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.includes("@")) {
      res.status(400).json({
        message: "Please provide a valid email",
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        message: "Password must contain at least 8 characters",
      });
      return;
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      res.status(409).json({
        message: "An account with this email already exists",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
    });

    req.session.userId = user._id.toString();

    res.status(201).json({
      user: {
        id: user._id.toString(),
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      message: "Unable to create account",
    });
  }
}

export async function login(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      res.status(400).json({
        message: "Email and password are required",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      res.status(401).json({
        message: "Invalid email or password",
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      res.status(401).json({
        message: "Invalid email or password",
      });
      return;
    }

    req.session.userId = user._id.toString();

    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Unable to log in",
    });
  }
}

export async function logout(
  req: Request,
  res: Response
): Promise<void> {
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error);

      res.status(500).json({
        message: "Unable to log out",
      });

      return;
    }

    res.clearCookie("connect.sid");

    res.json({
      message: "Logged out successfully",
    });
  });
}

export async function getCurrentUser(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.session.userId) {
      res.status(401).json({
        message: "Not authenticated",
      });
      return;
    }

    const user = await User.findById(
      req.session.userId
    ).select("_id email createdAt");

    if (!user) {
      req.session.destroy(() => undefined);

      res.status(401).json({
        message: "User no longer exists",
      });

      return;
    }

    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Current user error:", error);

    res.status(500).json({
      message: "Unable to retrieve user",
    });
  }
}