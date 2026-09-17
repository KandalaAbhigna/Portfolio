// All site content lives here. Adding a project = adding an object.
// Rule: nothing goes in this file that Abhigna cannot defend in an interview.
// A missing `href` renders as a disabled pill, never a broken link.

export interface Link {
  label: string;
  href?: string;
}

export interface Metric {
  value: string;
  label: string;
}

export interface Featured {
  id: string;
  kind: string;
  title: string;
  story: string;
  metrics: Metric[];
  ownership: string;
  stack: string[];
  links: Link[];
  diagram: "pipeline" | "k8s" | "rag";
}

export interface DepthArea {
  name: string;
  claim: string;
  points: string[];
}

export interface Job {
  role: string;
  company: string;
  location: string;
  period: string;
  points: string[];
}

export const featured: Featured[] = [
  {
    id: "t20",
    kind: "Flagship · Cloud, backend, data pipeline, ML inference",
    title: "T20 Predictor — Cloud-Native Stock Prediction Platform",
    story:
      "A production-style stock-intelligence platform that scores about 4,500 equities across five market universes every trading day and publishes Top-20 predictions to a live dashboard.",
    metrics: [
      { value: "~4,500", label: "tickers scored daily" },
      { value: "5", label: "market universes" },
      { value: "135,000+", label: "feature rows added" },
      { value: "4", label: "interns supervised" },
    ],
    ownership:
      "One of two engineers, reporting to the tech lead. I owned the pipeline automation, the Flask API and Lambda serving layer, the React/TypeScript dashboard, the Russell 1000 expansion, the swing-strategy backtest, and the intern program.",
    stack: ["Python", "Flask", "LightGBM", "AWS ECS Fargate", "Step Functions", "EventBridge", "Lambda", "S3", "RDS", "React", "TypeScript"],
    links: [
      { label: "Read the case study", href: "/case-studies/t20-predictor.html" },
      { label: "Scale it to 100k assets", href: "/lab.html" },
      { label: "Private client repo" },
    ],
    diagram: "pipeline",
  },
  {
    id: "terrapin",
    kind: "API design, auth, testing, CI/CD, Kubernetes",
    title: "Terrapin Events — Campus Event Management System",
    story:
      "Organizers submit events for admin approval, participants register with an automated waitlist, and the system emails confirmations, QR-code tickets, and feedback requests.",
    metrics: [
      { value: "27", label: "REST endpoints" },
      { value: "3", label: "RBAC roles" },
      { value: "204", label: "automated tests" },
      { value: "87%", label: "backend coverage" },
    ],
    ownership:
      "Graduate software design team project. My work spanned the FastAPI backend, JWT role-based access control, the Vitest and Pytest suites, and the GitHub Actions to Docker to Kubernetes deployment path.",
    stack: ["FastAPI", "React", "TypeScript", "MongoDB", "JWT", "Pytest", "Vitest", "Docker", "Kubernetes", "GitHub Actions"],
    links: [
      { label: "Read the case study", href: "/case-studies/terrapin-events.html" },
      { label: "GitHub" },
    ],
    diagram: "k8s",
  },
  {
    id: "concierge",
    kind: "AI engineering · Retrieval-augmented generation",
    title: "Ask Abhigna AI — Portfolio RAG Assistant",
    story:
      "The assistant in the corner of this page. Every answer is grounded in a curated knowledge base, ranked with a BM25 implementation written from scratch, answered with the best-matching sentences quoted verbatim, and returned with citations to the sections it used. No paid AI API; in local development it can hand the same context to an open-weight model through Ollama.",
    metrics: [
      { value: "BM25", label: "retrieval, from scratch" },
      { value: "top-5", label: "sections per answer" },
      { value: "$0", label: "AI API cost" },
      { value: "SSE", label: "streamed responses" },
    ],
    ownership:
      "Solo. Knowledge base, chunking, BM25 retrieval, extractive answer composition, guardrails, streaming function, rate limiting, local-model option, and the chat UI.",
    stack: ["TypeScript", "Vercel Functions", "BM25", "Extractive QA", "Ollama (local)", "Server-sent events"],
    links: [
      { label: "Try it", href: "#chat-open" },
      { label: "Read the code", href: "https://github.com/KandalaAbhigna/Portfolio/tree/main/api" },
    ],
    diagram: "rag",
  },
];

export const depth: DepthArea[] = [
  {
    name: "Backend",
    claim: "APIs that survive real clients.",
    points: [
      "27-endpoint FastAPI service with JWT auth and three-role RBAC (Admin, Organizer, Participant) on Terrapin Events.",
      "JSON-schema validation across five MongoDB collections on Digital Time Capsule so bad writes fail at the boundary.",
      "Pagination, sort, and filter contracts in the strict-TypeScript reference implementation I wrote for T20's admin API.",
    ],
  },
  {
    name: "Cloud",
    claim: "Pick the compute that fits the job.",
    points: [
      "Containers for batch: T20's dataset build needs 8 GB RAM, so it runs as ECS Fargate tasks on a schedule and costs nothing between runs.",
      "Serverless for reads: the API is a Lambda that reads small precomputed JSON, because Lambda cannot load large parquet files cheaply.",
      "S3 for artifacts, RDS MySQL for relational state, ECR for container images, IAM for access.",
    ],
  },
  {
    name: "Reliability",
    claim: "Verify, do not assume.",
    points: [
      "Found that Step Functions reported SUCCEEDED when a step failed (error branch ended with End: true, not a Fail state). Fixed across three pipelines.",
      "Smoke-test small before running big; confirm S3 timestamps, exit codes, and row counts before calling a task done.",
      "Strict dev/prod separation; never push to main; commit before long runs so the ECR image matches the code.",
    ],
  },
  {
    name: "DevOps",
    claim: "A deploy path someone else can run.",
    points: [
      "GitHub Actions builds and pushes Docker images and deploys to Kubernetes with Nginx ingress, cert-manager TLS, secrets, and pod autoscaling (2–10 replicas).",
      "Multi-arch awareness: Apple Silicon builds need --platform linux/amd64 for Fargate, a lesson learned in production.",
      "Known gap on T20, and the first thing I would fix: Step Functions, ECS task definitions, and EventBridge rules live only in the console. They belong in version control.",
    ],
  },
  {
    name: "Testing",
    claim: "Tests as a CI gate, not a checkbox.",
    points: [
      "110 Vitest and 94 Pytest tests on Terrapin Events, 87% backend coverage, run on every push.",
      "Unit tests for data-structure modules at Skolar; backtest harnesses on T20 that turned a strategy proposal into a measurable no-go.",
      "Code review as a habit: GitHub PR reviews at Firstsource; a prioritized 10-item review for four interns on T20.",
    ],
  },
  {
    name: "AI engineering",
    claim: "A language model is a component, not a product.",
    points: [
      "This site's assistant: BM25 retrieval over a curated knowledge base, sentence-level extractive answers so nothing is invented, citations shown to the visitor, optional local model via Ollama.",
      "Guardrails in code and prompt: input caps, per-IP rate limiting, refusal of personal and salary questions, safe fallback when retrieval is weak.",
      "Next: an evaluation set with retrieval hit-rate and answer-faithfulness scores, so the assistant itself becomes a measurable case study.",
    ],
  },
];

export const jobs: Job[] = [
  {
    role: "Data Analyst Intern",
    company: "Firstsource Solutions Ltd.",
    location: "Remote",
    period: "May 2024 – Dec 2024",
    points: [
      "Python automation for recurring data-processing workflows used by analysts and ML engineers; improved reliability of scheduled jobs.",
      "Code review on GitHub pull requests and technical documentation that improved consistency and handoffs.",
    ],
  },
  {
    role: "Software Development Engineer Intern",
    company: "Savart",
    location: "Hyderabad, India",
    period: "Jun 2023 – Nov 2023",
    points: [
      "Built an internal research web interface from scratch; developed REST APIs with TypeScript and Node.js over MySQL.",
      "Agile sprints with a distributed team: planning, standups, code review.",
    ],
  },
  {
    role: "Software Engineering Intern",
    company: "Skolar",
    location: "Remote",
    period: "Oct 2022 – Dec 2022",
    points: [
      "Implemented and documented Python data-structure and algorithm modules on Linux; TypeScript with unit tests and Docker containers.",
    ],
  },
];

export const suggestedQuestions = [
  "What did she own on T20 Predictor?",
  "How does this assistant work?",
  "What was the hardest production bug she fixed?",
  "What testing and CI/CD has she set up?",
  "When is she available to start?",
];
