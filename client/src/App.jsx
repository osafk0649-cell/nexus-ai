import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { Activity, Bot, BrainCircuit, CheckCircle2, Clock3, FileText, Network, Play, Search, ShieldCheck, Sparkles, Terminal, Zap } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
const agents = [
  { name: "Planner Agent", icon: BrainCircuit, detail: "Breaks the objective into tasks" },
  { name: "Research Agent", icon: Search, detail: "Collects context and evidence" },
  { name: "Analysis Agent", icon: Activity, detail: "Finds insights, risks and opportunities" },
  { name: "Execution Agent", icon: Zap, detail: "Creates practical action plans" },
  { name: "Critic Agent", icon: ShieldCheck, detail: "Reviews quality and limitations" },
  { name: "Final Writer Agent", icon: FileText, detail: "Combines the verified solution" }
];

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [runId, setRunId] = useState("");
  const [run, setRun] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);

  const addEvent = (message) => setEvents(prev => [{ ...message, key: `${Date.now()}-${Math.random()}` }, ...prev].slice(0, 40));

  useEffect(() => {
    axios.get(`${API}/api/runs`).then(r => setHistory(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!runId) return;
    const socket = io(API);
    socket.emit("workflow:join", runId);
    socket.on("agent:update", data => {
      addEvent(data);
      setRun(prev => {
        if (!prev) return prev;
        const steps = [...(prev.steps || [])];
        const idx = steps.findIndex(s => s.agent === data.agent);
        if (idx >= 0) steps[idx] = { ...steps[idx], ...data };
        else steps.push({ agent: data.agent, status: data.status, task: data.task, output: data.output, error: data.error });
        return { ...prev, steps };
      });
    });
    socket.on("planner:complete", data => {
      addEvent({ agent: "Planner Agent", status: "completed", task: "Execution plan created", output: data.plan });
      setRun(prev => prev ? { ...prev, plan: data.plan.tasks || [] } : prev);
    });
    socket.on("verification:complete", data => {
      addEvent({ agent: "Critic Agent", status: "completed", task: "Verification finished", output: data.verification });
      setRun(prev => prev ? { ...prev, verification: data.verification } : prev);
    });
    socket.on("workflow:status", data => setRun(prev => prev ? { ...prev, status: data.status } : prev));
    socket.on("workflow:complete", data => {
      setRun(data.run);
      setBusy(false);
      addEvent({ agent: "NEXUS Orchestrator", status: "completed", task: "Workflow completed" });
      axios.get(`${API}/api/runs`).then(r => setHistory(r.data));
    });
    socket.on("workflow:error", data => { setError(data.error); setBusy(false); });
    return () => socket.disconnect();
  }, [runId]);

  const start = async () => {
    if (prompt.trim().length < 15) return setError("Please describe your problem in at least 15 characters.");
    setBusy(true); setError(""); setRun(null); setEvents([]);
    try {
      const { data } = await axios.post(`${API}/api/runs`, { prompt });
      setRunId(data.runId);
      setRun({ _id: data.runId, prompt, status: "running", steps: [] });
    } catch (e) {
      setBusy(false);
      setError(e.response?.data?.message || "Could not connect to the backend. Check that the server is running.");
    }
  };

  const loadRun = async id => {
    try {
      const { data } = await axios.get(`${API}/api/runs/${id}`);
      setRun(data); setRunId(id); setPrompt(data.prompt); setEvents([]);
      setBusy(data.status === "running");
    } catch { setError("Could not load this workflow."); }
  };

  const statusFor = name => run?.steps?.find(s => s.agent === name)?.status || (name === "Planner Agent" && run?.plan?.length ? "completed" : "pending");
  const completed = (run?.steps || []).filter(s => s.status === "completed").length + (run?.plan?.length ? 1 : 0);
  const progress = run?.status === "completed" ? 100 : Math.min(95, Math.round(completed / 6 * 100));

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Network size={21}/></div><div><b>NEXUS</b><small>INTELLIGENCE OS</small></div></div>
      <div className="side-label">WORKSPACE</div>
      <div className="nav-item active"><Activity size={17}/> Overview</div>
      <div className="nav-item"><Bot size={17}/> AI Orchestrator</div>
      <div className="nav-item"><FileText size={17}/> Reports</div>
      <div className="side-label recent-label">RECENT WORKFLOWS</div>
      {history.slice(0, 7).map(item => <button className="history-item" key={item._id} onClick={() => loadRun(item._id)}>{item.prompt.slice(0, 35)}{item.prompt.length > 35 ? "…" : ""}</button>)}
      <div className="sidebar-bottom"><div className="online-dot"/> System ready <span>v1.0</span></div>
    </aside>

    <main className="main">
      <header className="topbar"><div><span className="breadcrumb">Workspace</span><span className="slash">/</span><b>Overview</b></div><div className="top-right"><span className="live-pill"><i/> SYSTEM ONLINE</span><div className="avatar">N</div></div></header>
      <section className="hero">
        <div className="eyebrow"><Sparkles size={14}/> AUTONOMOUS MULTI-AGENT SYSTEM</div>
        <h1>Complex problems.<br/><span>Collective intelligence.</span></h1>
        <p>Deploy specialised AI agents that think, collaborate, execute and verify — turning complex objectives into actionable outcomes.</p>
      </section>

      <section className="stats">
        <div className="stat-card"><div className="stat-icon blue"><Bot size={18}/></div><div><small>Specialised agents</small><strong>06</strong><em>Collaborative roles</em></div></div>
        <div className="stat-card"><div className="stat-icon purple"><Network size={18}/></div><div><small>Orchestration</small><strong>Live</strong><em>Task-driven workflow</em></div></div>
        <div className="stat-card"><div className="stat-icon green"><ShieldCheck size={18}/></div><div><small>Verification</small><strong>Enabled</strong><em>Critic review layer</em></div></div>
        <div className="stat-card"><div className="stat-icon orange"><Clock3 size={18}/></div><div><small>Execution mode</small><strong>Adaptive</strong><em>Sequential + dependencies</em></div></div>
      </section>

      <section className="workspace-grid">
        <div className="panel input-panel">
          <div className="panel-heading"><div><div className="eyebrow">01 / DEFINE OBJECTIVE</div><h2>What should NEXUS solve?</h2></div><span className="subtle-tag">NATURAL LANGUAGE</span></div>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe a complex problem… e.g. Research the Indian AI education market, identify competitors, analyse opportunities and risks, and create a 90-day startup launch roadmap." />
          <div className="prompt-footer"><span>{prompt.length} characters · Be specific for better results</span><button className="run-btn" onClick={start} disabled={busy}><Play size={15} fill="currentColor"/>{busy ? "Running agents…" : "Run NEXUS"}</button></div>
          {error && <div className="error-box">{error}</div>}
          <div className="examples"><small>TRY AN EXAMPLE</small><button onClick={() => setPrompt("I want to launch an AI-powered education startup in India. Research the market, identify competitors, analyse opportunities and risks, suggest a business model with budget assumptions, and create a practical 90-day launch roadmap.")}>AI education startup strategy <span>↗</span></button><button onClick={() => setPrompt("Create a software development plan for a secure real-time collaboration platform. Identify core features, architecture, technology choices, security risks, milestones and testing strategy.")}>Software product planning <span>↗</span></button></div>
        </div>

        <div className="panel progress-panel">
          <div className="panel-heading"><div><div className="eyebrow">02 / LIVE EXECUTION</div><h2>Orchestration status</h2></div><span className={`status-tag ${run?.status === "completed" ? "done" : ""}`}>{run?.status || "IDLE"}</span></div>
          <div className="progress-number">{progress}<small>%</small></div><div className="progress-track"><div style={{ width: `${progress}%` }}/></div>
          <div className="progress-meta"><span>Workflow progress</span><span>{completed}/6 stages</span></div>
          <div className="mini-flow"><div className="flow-node"><BrainCircuit size={17}/><span>Plan</span></div><div className="flow-line"/><div className="flow-node"><Search size={17}/><span>Research</span></div><div className="flow-line"/><div className="flow-node"><ShieldCheck size={17}/><span>Verify</span></div></div>
          <div className="execution-note"><div className="pulse"/> {run ? `Current state: ${run.status}` : "Waiting for your objective"} </div>
        </div>
      </section>

      <section className="panel agents-panel">
        <div className="panel-heading"><div><div className="eyebrow">03 / SPECIALISED INTELLIGENCE</div><h2>Agent network</h2></div><span className="subtle-tag">6 AGENTS</span></div>
        <div className="agent-grid">{agents.map(agent => {
          const Icon = agent.icon; const status = statusFor(agent.name);
          return <div className={`agent-card ${status}`} key={agent.name}><div className="agent-top"><div className="agent-icon"><Icon size={18}/></div><span className={`agent-status ${status}`}>{status}</span></div><b>{agent.name}</b><p>{agent.detail}</p><div className="agent-bottom"><span className="status-dot"/> {status === "pending" ? "Awaiting task" : status}</div></div>;
        })}</div>
      </section>

      <section className="lower-grid">
        <div className="panel">
          <div className="panel-heading"><div><div className="eyebrow">04 / TASK BREAKDOWN</div><h2>Planner output</h2></div></div>
          {run?.plan?.length ? <div className="task-list">{run.plan.map((task, i) => <div className="task-row" key={task.id || i}><span className="task-index">0{i+1}</span><div><b>{task.title}</b><small>{task.assignedAgent || "Specialist agent"} · {task.description}</small></div><CheckCircle2 size={16}/></div>)}</div> : <div className="empty-state">The Planner Agent will create a task plan when you run a workflow.</div>}
        </div>
        <div className="panel">
          <div className="panel-heading"><div><div className="eyebrow">05 / AGENT COMMUNICATION</div><h2>Execution timeline</h2></div><Terminal size={17}/></div>
          <div className="timeline">{events.length ? events.map(e => <div className="event" key={e.key}><span className={`event-dot ${e.status}`}/><div><b>{e.agent || "NEXUS"}</b><small>{e.task || e.status}</small></div><span className="event-status">{e.status}</span></div>) : <div className="empty-state">Live agent events and task handoffs will appear here.</div>}</div>
        </div>
      </section>

      {run?.verification && <section className="panel verification-panel"><div className="panel-heading"><div><div className="eyebrow">06 / QUALITY CONTROL</div><h2>Critic verification report</h2></div><span className="score">{run.verification.score ?? "—"}/100</span></div><p>{run.verification.verdict}</p><div className="verify-columns"><div><b>Issues identified</b><ul>{(run.verification.issues || []).map((x,i)=><li key={i}>{typeof x === "string" ? x : JSON.stringify(x)}</li>)}</ul></div><div><b>Suggested improvements</b><ul>{(run.verification.improvements || []).map((x,i)=><li key={i}>{typeof x === "string" ? x : JSON.stringify(x)}</li>)}</ul></div></div><small className="muted">{run.verification.limitations}</small></section>}

      {run?.finalAnswer && <section className="panel final-panel"><div className="panel-heading"><div><div className="eyebrow">07 / COLLABORATIVE RESULT</div><h2>Final solution</h2></div><button className="copy-btn" onClick={() => navigator.clipboard.writeText(run.finalAnswer)}>Copy report</button></div><article className="final-answer">{run.finalAnswer}</article></section>}
      <footer> NEXUS AI <span>·</span> Autonomous Multi-Agent Intelligence <span>·</span> Built for innovation</footer>
    </main>
  </div>;
}