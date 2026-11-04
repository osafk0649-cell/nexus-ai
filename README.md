<<<<<<< HEAD
# NEXUS AI — Autonomous Multi-Agent Problem Solver

NEXUS is a hackathon-ready multi-agent AI prototype built with React, Node.js, Express, MongoDB, Socket.IO and Groq.

## What it does
1. Planner Agent decomposes the user's objective into subtasks.
2. Research Agent gathers relevant context using the LLM's knowledge (not live web browsing).
3. Analysis Agent consumes the research output and identifies opportunities/risks.
4. Execution Agent creates an actionable plan from the analysis.
5. Critic Agent reviews the outputs and returns a quality score, issues and improvements.
6. Final Writer Agent combines the work into a structured report.

The backend persists workflows in MongoDB and emits live agent status/output events over Socket.IO. Agent outputs are passed as context to subsequent agents; this is an actual sequential collaboration workflow, not independent chatbot personas.

## Requirements
- Node.js 18+
- MongoDB local or MongoDB Atlas
- Groq API key

## Setup
Open a terminal in the project root:

```bash
npm install
npm run install:all
```

Create `server/.env` from `server/.env.example` and add your values:

```env
PORT=8080
MONGODB_URI=mongodb://127.0.0.1:27017/nexus_ai
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
CLIENT_ORIGIN=http://localhost:5173
```

Run the app from the root:

```bash
npm run dev
```

Frontend: http://localhost:5173  
Backend health: http://localhost:8080/api/health

## Demo prompt
"I want to launch an AI-powered education startup in India. Research the market, identify competitors, analyse opportunities and risks, suggest a business model with budget assumptions, and create a practical 90-day launch roadmap."

## API
- `GET /api/health` — server health
- `POST /api/runs` — start a workflow. Body: `{ "prompt": "..." }`
- `GET /api/runs` — recent workflows
- `GET /api/runs/:id` — workflow details

Socket.IO:
- Client emits `workflow:join` with a run ID.
- Server emits `planner:complete`, `agent:update`, `verification:complete`, `workflow:status`, `workflow:complete`, `workflow:error`.

## Important limitations / hackathon notes
- Research currently uses the model's knowledge; it does **not** perform live web search or provide independently verified citations. Add a search API (such as Tavily or another approved provider) to the Research Agent if judges expect current external research.
- The workflow is sequential to keep the demo predictable and fit a short hackathon build. You can add parallel task execution for independent planner subtasks.
- The critic is an AI review layer, not a guarantee of factual correctness. Clearly disclose this during the demo.
- No authentication is included in this MVP. Do not expose it publicly with sensitive user data.
- API keys stay on the backend in `server/.env`; never put Groq keys in frontend environment variables.

## Suggested judge demo
1. Paste the sample education startup prompt.
2. Start NEXUS and show the planner's task breakdown.
3. Show each agent change from pending to running to completed.
4. Open the communication timeline to explain how outputs are handed off.
5. Show the critic score/issues and the final report.
6. Explain limitations honestly and describe how live search, parallel execution and human approval can extend it.
=======
# nexus-ai
>>>>>>> a34d5270a88a94360d9e9af9a64b7501b02acca1
