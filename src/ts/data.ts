// Content lives here. Adding a project = adding an object. No fabricated links:
// a missing `repo`/`live` renders as a disabled pill, never a broken link.

export interface Link {
  label: string;
  href?: string;
}

export interface AiApp {
  id: string;
  kind: string; // short category, e.g. "Retrieval-augmented generation"
  title: string;
  summary: string;
  points: string[];
  stack: string[];
  links: Link[];
  diagram: "rag" | "pipeline" | "generic";
  compact?: boolean;
}

export interface Project {
  id: string;
  title: string;
  subtitle: string;
  period: string;
  role: string;
  summary: string;
  points: string[];
  stack: string[];
  links: Link[];
}

export interface Job {
  role: string;
  company: string;
  location: string;
  period: string;
  points: string[];
}

export const aiApps: AiApp[] = [
  {
    id: "concierge",
    kind: "Retrieval-augmented generation",
    title: "AI Concierge for this portfolio",
    summary:
      "The assistant in the corner of this page. It does not free-associate about me: every answer is grounded in a markdown knowledge base that is chunked at build time, ranked with a BM25 implementation written from scratch, and handed to Claude with instructions to refuse anything outside the retrieved context.",
    points: [
      "Retrieval is visible: each reply lists the sections it was built from.",
      "Streams tokens over server-sent events from a Vercel Function; the browser never sees the API key.",
      "Guardrails in the prompt and the code: no personal or salary questions, short answers, rate limiting per IP.",
      "Zero runtime dependencies on the front end; the whole RAG loop is about 200 lines of TypeScript.",
    ],
    stack: ["TypeScript", "Vercel Functions", "Anthropic Claude API", "BM25", "SSE"],
    links: [
      { label: "Try it", href: "#chat-open" },
      { label: "Read the code", href: "https://github.com/KandalaAbhigna/Portfolio/tree/main/api" },
    ],
    diagram: "rag",
  },
  {
    id: "t20-ml",
    kind: "Machine learning in production",
    title: "T20 stock-scoring pipeline",
    summary:
      "The ML side of the Siddhantha T20 platform: LightGBM models scoring about 4,500 tickers every trading day, run as containerized tasks on AWS and served to a live dashboard. Built as one of two engineers.",
    points: [
      "Five-stage pipeline (download, dataset, features, predict, stats) on ECS Fargate, orchestrated by Step Functions and scheduled by EventBridge.",
      "Found a silent failure: Step Functions reported SUCCEEDED on failed steps because the error branch ended with End: true instead of a Fail state. Fixed across three pipelines.",
      "Backtested a proposed swing-trading strategy and delivered a no-go (profit factor 0.84, 32.7% win rate) that stopped further build-out.",
    ],
    stack: ["Python", "LightGBM", "AWS ECS Fargate", "Step Functions", "Lambda", "S3", "RDS"],
    links: [{ label: "Full project below", href: "#projects" }],
    diagram: "pipeline",
    compact: true,
  },
];

export const projects: Project[] = [
  {
    id: "t20",
    title: "Siddhantha T20",
    subtitle: "Cloud-native stock prediction platform",
    period: "Jan – Jun 2026",
    role: "One of two engineers, reporting to the tech lead",
    summary:
      "Scores about 4,500 tickers across five market universes with LightGBM models and serves daily Top-20 picks to a live web dashboard.",
    points: [
      "Automated the end-to-end pipeline on ECS Fargate, Step Functions, and EventBridge, replacing manual daily runs.",
      "Built the Flask REST API over S3 and RDS MySQL, served through Lambda with a pre-compute pattern, and the React/TypeScript dashboard it powers.",
      "Extended coverage from 3 to 5 universes and added the Russell 1000 (135,000+ feature rows, 451 tickers), fixing two latent production bugs.",
      "Supervised and code-reviewed four interns: a prioritized 10-item review and a strict-TypeScript reference implementation with handover docs.",
    ],
    stack: ["Python", "Flask", "React", "TypeScript", "LightGBM", "AWS"],
    links: [{ label: "Private client repo" }],
  },
  {
    id: "terrapin",
    title: "Terrapin Events",
    subtitle: "Campus event management system",
    period: "Graduate software design project",
    role: "Full-stack, testing, and CI/CD",
    summary:
      "Organizers submit events for admin approval, participants register with an automated waitlist, and the system emails confirmations, QR-code tickets, and feedback requests.",
    points: [
      "FastAPI backend with 27 REST endpoints and JWT role-based access control (Admin, Organizer, Participant); 14-page React/TypeScript front end.",
      "110 Vitest and 94 Pytest tests (87% backend coverage).",
      "GitHub Actions CI/CD builds and pushes Docker images and deploys to Kubernetes with Nginx ingress, cert-manager TLS, secrets, and pod autoscaling (2–10 replicas).",
    ],
    stack: ["React", "TypeScript", "FastAPI", "MongoDB", "Docker", "Kubernetes", "GitHub Actions"],
    links: [{ label: "GitHub" }],
  },
  {
    id: "capsule",
    title: "Digital Time Capsule",
    subtitle: "Multimedia sharing web app",
    period: "MERN stack",
    role: "Solo, end to end",
    summary:
      "Create and share time capsules of photos, text, and music with friend requests, contributor permissions, and privacy controls.",
    points: [
      "25+ RESTful endpoints for authentication, capsule CRUD, friends, access control, and media storage; JSON schema validation across five MongoDB collections.",
      "8-page React front end with reusable components; deployed on AWS EC2 behind Nginx, owning the full release path on Linux.",
    ],
    stack: ["React", "Node.js", "Express.js", "MongoDB", "AWS EC2", "Nginx"],
    links: [{ label: "GitHub" }],
  },
];

export const jobs: Job[] = [
  {
    role: "Data Analyst Intern",
    company: "Firstsource Solutions Ltd.",
    location: "Remote",
    period: "May 2024 – Dec 2024",
    points: [
      "Developed Python scripts automating recurring data-processing workflows for a cross-functional team of analysts and ML engineers, cutting manual effort and improving the reliability of scheduled jobs.",
      "Led code reviews on GitHub pull requests with specific, actionable feedback aligned to team SDLC standards; authored technical documentation that shortened review cycles.",
    ],
  },
  {
    role: "Software Development Engineer Intern",
    company: "Savart",
    location: "Hyderabad, India",
    period: "Jun 2023 – Nov 2023",
    points: [
      "Built a complete internal research web page from scratch: layout, components, styling, form handling, and client-side state.",
      "Built RESTful APIs with TypeScript and Node.js, integrated with backend MySQL services, and delivered features on schedule in Agile sprints with a distributed team.",
    ],
  },
  {
    role: "Software Engineering Intern",
    company: "Skolar",
    location: "Remote",
    period: "Oct 2022 – Dec 2022",
    points: [
      "Implemented core data structures and algorithms in Python and integrated them into the project codebase.",
      "Wrote documented, unit-tested TypeScript following SDLC guidelines, using Docker containers and participating in code reviews.",
    ],
  },
];

export const skillGroups: { name: string; items: string[] }[] = [
  { name: "Languages", items: ["Python", "TypeScript", "JavaScript", "Java", "C++", "SQL", "HTML", "CSS"] },
  { name: "Backend & APIs", items: ["FastAPI", "Flask", "Node.js", "Express.js", "REST design", "JWT auth", "RBAC", "Microservices"] },
  { name: "Frontend", items: ["React", "TypeScript", "Vitest", "Accessible UI", "Responsive layout"] },
  { name: "Cloud & DevOps", items: ["AWS EC2", "ECS Fargate", "Lambda", "S3", "RDS", "Step Functions", "EventBridge", "IAM", "Docker", "Kubernetes", "GitHub Actions", "Linux"] },
  { name: "Data & ML", items: ["MySQL", "PostgreSQL", "MongoDB", "Pandas", "NumPy", "Scikit-Learn", "LightGBM", "PyTorch", "TensorFlow"] },
  { name: "AI engineering", items: ["Anthropic Claude API", "RAG", "Prompt design", "BM25 retrieval", "SSE streaming", "Claude Code"] },
];

export const suggestedQuestions = [
  "What did she build on AWS?",
  "How does this concierge work?",
  "Has she led or reviewed other engineers?",
  "What testing has she done?",
  "When is she available to start?",
];
