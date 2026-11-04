import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import { Server } from "socket.io";
import runRoutes from "./routes/runs.js";

const app = express();
const server = http.createServer(app);
const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const io = new Server(server, { cors: { origin, methods: ["GET", "POST"] } });

app.use(cors({ origin }));
app.use(express.json({ limit: "2mb" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "NEXUS AI API" }));
app.use("/api/runs", runRoutes(io));

io.on("connection", socket => {
  socket.on("workflow:join", runId => socket.join(String(runId)));
});

const port = process.env.PORT || 8080;
try {
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } else {
    console.warn("MONGODB_URI missing. Add it to server/.env");
  }
  server.listen(port, () => console.log(`NEXUS API running on http://localhost:${port}`));
} catch (error) {
  console.error("Server startup failed:", error.message);
  process.exit(1);
}