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

const frontendUrl = (
  process.env.FRONTEND_URL || "http://localhost:3000"
).replace(/\/+$/, "");

const sessionSecret = process.env.SESSION_SECRET;
const mongoUri = process.env.MONGODB_URI;

if (!sessionSecret) {
  throw new Error("SESSION_SECRET is not defined");
}

if (!mongoUri) {
  throw new Error("MONGODB_URI is not defined");
}

const isProduction = process.env.NODE_ENV === "production";

// Render / reverse-proxy support.
// Required when using secure cookies behind Render's HTTPS proxy.
if (isProduction) {
  app.set("trust proxy", 1);
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
      mongoUrl: mongoUri,
      collectionName: "sessions",
    }),

    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
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

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();