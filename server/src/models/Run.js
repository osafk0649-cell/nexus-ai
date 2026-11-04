import mongoose from "mongoose";

const AgentStepSchema = new mongoose.Schema({
  agent: String,
  status: { type: String, default: "pending" },
  task: String,
  output: mongoose.Schema.Types.Mixed,
  startedAt: Date,
  finishedAt: Date,
  error: String
}, { _id: false });

const RunSchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  status: { type: String, default: "running" },
  plan: [mongoose.Schema.Types.Mixed],
  steps: [AgentStepSchema],
  finalAnswer: String,
  verification: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Run", RunSchema);