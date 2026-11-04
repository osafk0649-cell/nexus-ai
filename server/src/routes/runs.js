import { Router } from "express";
import Run from "../models/Run.js";
import { executeWorkflow } from "../services/orchestrator.js";

export default function runRoutes(io) {
  const router = Router();

  router.post("/", async (req, res) => {
    try {
      const prompt = String(req.body.prompt || "").trim();
      if (prompt.length < 15) {
        return res.status(400).json({ message: "Please enter a problem statement with at least 15 characters." });
      }
      const run = await Run.create({ prompt, status: "running" });
      res.status(202).json({ runId: String(run._id), status: run.status });
      executeWorkflow({ io, run }).catch(err => console.error("Workflow failed:", err.message));
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  router.get("/", async (_req, res) => {
    const runs = await Run.find().sort({ createdAt: -1 }).limit(20).select("prompt status createdAt verification");
    res.json(runs);
  });

  router.get("/:id", async (req, res) => {
    const run = await Run.findById(req.params.id);
    if (!run) return res.status(404).json({ message: "Run not found" });
    res.json(run);
  });

  return router;
}