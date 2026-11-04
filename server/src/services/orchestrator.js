import { askGroq, parseJson } from "./groq.js";

// this is the orchestrator that runs the multi-agent workflow for a given run
const AGENTS = [
  { name: "Research Agent", task: "Gather relevant background, facts, market/context information, and clearly label assumptions or unknowns." },
  { name: "Analysis Agent", task: "Analyse the research, identify patterns, opportunities, risks, trade-offs and useful conclusions." },
  { name: "Execution Agent", task: "Turn the analysis into a practical, prioritised action plan with steps, owners/roles, timelines and measurable outcomes." }
];

function emit(io, runId, event, payload) {
  io.to(runId).emit(event, { runId, ...payload, at: new Date().toISOString() });
}

async function runAgent({ io, run, agent, input, task, index }) {
  const startedAt = new Date();
  run.steps[index].status = "running";
  run.steps[index].startedAt = startedAt;
  await run.save();
  emit(io, String(run._id), "agent:update", {
    agent: agent.name, status: "running", task
  });

  try {
    const output = await askGroq({
      system: `You are the ${agent.name} in NEXUS, a collaborative multi-agent problem-solving system.
Your responsibility: ${agent.task}
Use only the supplied context and your general model knowledge. Do not pretend you browsed the web, accessed private databases, or verified live facts. Mark uncertain or time-sensitive claims as needing external verification. Be specific and structured.`,
      user: `USER OBJECTIVE:\n${run.prompt}\n\nASSIGNED TASK:\n${task}\n\nSHARED CONTEXT FROM PREVIOUS AGENTS:\n${JSON.stringify(input, null, 2)}\n\nReturn a useful, detailed result that the next agent can use.`
    });

    run.steps[index].status = "completed";
    run.steps[index].output = output;
    run.steps[index].finishedAt = new Date();
    await run.save();
    emit(io, String(run._id), "agent:update", {
      agent: agent.name, status: "completed", task, output
    });
    return output;
  } catch (error) {
    run.steps[index].status = "failed";
    run.steps[index].error = error.message;
    run.steps[index].finishedAt = new Date();
    await run.save();
    emit(io, String(run._id), "agent:update", {
      agent: agent.name, status: "failed", task, error: error.message
    });
    throw error;
  }
}

export async function executeWorkflow({ io, run }) {
  try {
    emit(io, String(run._id), "workflow:status", { status: "planning" });

    const plannerText = await askGroq({
      system: "You are the NEXUS Planner Agent. Decompose the user's objective into 3 to 6 clear, ordered subtasks. Return valid JSON only with keys: objective, complexity, tasks (array of objects with id, title, assignedAgent, description, dependsOn). Use agent names Research Agent, Analysis Agent, Execution Agent, Critic Agent, Final Writer Agent where appropriate.",
      user: run.prompt,
      json: true
    });
    const plan = parseJson(plannerText);
    run.plan = Array.isArray(plan.tasks) ? plan.tasks : [];
    run.steps = AGENTS.map((a, i) => ({
      agent: a.name, status: "pending", task: a.task
    }));
    await run.save();
    emit(io, String(run._id), "planner:complete", { plan });

    const research = await runAgent({
      io, run, agent: AGENTS[0], index: 0,
      task: "Research the objective and provide relevant context, facts, assumptions and unknowns.",
      input: { plan }
    });

    const analysis = await runAgent({
      io, run, agent: AGENTS[1], index: 1,
      task: "Analyse the Research Agent's findings. Identify opportunities, risks and conclusions.",
      input: { plan, research }
    });

    const execution = await runAgent({
      io, run, agent: AGENTS[2], index: 2,
      task: "Create a practical action plan based on the research and analysis.",
      input: { plan, research, analysis }
    });

    emit(io, String(run._id), "workflow:status", { status: "verifying" });
    const criticText = await askGroq({
      system: "You are the NEXUS Critic / Verification Agent. Critically review agent outputs. Identify unsupported claims, gaps, contradictions, risky assumptions and improvements. Do not claim external fact-checking. Return valid JSON with keys: score (0-100), verdict, issues (array), improvements (array), limitations.",
      user: `Original request:\n${run.prompt}\n\nResearch:\n${research}\n\nAnalysis:\n${analysis}\n\nExecution plan:\n${execution}`,
      json: true
    });
    const verification = parseJson(criticText);
    run.verification = verification;
    emit(io, String(run._id), "verification:complete", { verification });

    emit(io, String(run._id), "workflow:status", { status: "writing" });
    const finalAnswer = await askGroq({
      system: "You are the NEXUS Final Writer Agent. Produce a polished, actionable report using the supplied multi-agent work. Include executive summary, findings, analysis, recommended actions, risks, assumptions and next steps. Be honest about limitations and do not invent citations.",
      user: `USER REQUEST:\n${run.prompt}\n\nRESEARCH:\n${research}\n\nANALYSIS:\n${analysis}\n\nACTION PLAN:\n${execution}\n\nCRITIC REVIEW:\n${JSON.stringify(verification, null, 2)}`
    });

    run.finalAnswer = finalAnswer;
    run.status = "completed";
    await run.save();
    emit(io, String(run._id), "workflow:complete", { run });
    return run;
  } catch (error) {
    run.status = "failed";
    await run.save();
    emit(io, String(run._id), "workflow:error", { error: error.message });
    throw error;
  }
}