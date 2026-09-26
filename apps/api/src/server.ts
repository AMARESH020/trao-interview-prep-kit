import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import MongoStore from "connect-mongo";

import { connectDatabase } from "./config/database.js";
import authRoutes from "./routes/auth.routes.js";
import kitRoutes from "./routes/kit.routes.js";

const app = express();

const PORT = Number(process.env.PORT) || 5000;

const frontendUrl =
  process.env.FRONTEND_URL || "http://localhost:3000";

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error("SESSION_SECRET is not defined");
}

app.use(helmet());

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
    }),

    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.get("/", (_req, res) => {
  res.send("Trao AI Interview Prep Kit API is running");
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Trao API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/kits", kitRoutes);

async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(
        `API running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Failed to start server:",
      error
    );

    process.exit(1);
  }
}

startServer();