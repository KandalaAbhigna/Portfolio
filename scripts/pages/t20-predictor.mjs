import { page, section, callout, stats } from "./_layout.mjs";

const pipelineSvg = `
<svg class="diagram diagram-wide" viewBox="0 0 760 250" role="img" aria-label="Architecture: EventBridge schedule triggers a Step Functions state machine that runs five ECS Fargate tasks in sequence (download, dataset, features, predict, stats); tasks read from the Alpha Vantage API and write to S3 and RDS MySQL; a Lambda-hosted Flask API reads small precomputed JSON and CSV artifacts and serves the React/TypeScript dashboard.">
  <g class="node-g"><rect class="node" x="10" y="20" width="120" height="44" rx="8"/><text class="label" x="20" y="38">EventBridge</text><text x="20" y="54">daily schedule</text></g>
  <g class="node-g"><rect class="node hot" x="160" y="20" width="130" height="44" rx="8"/><text class="label" x="170" y="38">Step Functions</text><text x="170" y="54">state machine</text></g>
  <g class="node-g"><rect class="node" x="320" y="20" width="120" height="44" rx="8"/><text class="label" x="330" y="38">Alpha Vantage</text><text x="330" y="54">150 req/min cap</text></g>
  <path class="edge" d="M130 42 L160 42"/>
  <path class="edge" d="M290 42 L320 42"/>

  <g class="node-g"><rect class="node hot" x="10" y="110" width="86" height="44" rx="8"/><text class="label" x="18" y="128">Download</text><text x="18" y="144">ECS task</text></g>
  <g class="node-g"><rect class="node hot" x="106" y="110" width="86" height="44" rx="8"/><text class="label" x="114" y="128">Dataset</text><text x="114" y="144">8 GB task</text></g>
  <g class="node-g"><rect class="node hot" x="202" y="110" width="86" height="44" rx="8"/><text class="label" x="210" y="128">Features</text><text x="210" y="144">ECS task</text></g>
  <g class="node-g"><rect class="node hot" x="298" y="110" width="86" height="44" rx="8"/><text class="label" x="306" y="128">Predict</text><text x="306" y="144">LightGBM</text></g>
  <g class="node-g"><rect class="node hot" x="394" y="110" width="86" height="44" rx="8"/><text class="label" x="402" y="128">Stats</text><text x="402" y="144">ECS task</text></g>
  <path class="edge" d="M96 132 L106 132"/><path class="edge" d="M192 132 L202 132"/><path class="edge" d="M288 132 L298 132"/><path class="edge" d="M384 132 L394 132"/>
  <path class="edge" d="M225 64 C 225 90, 53 84, 53 110"/>

  <g class="node-g"><rect class="node" x="520" y="110" width="120" height="44" rx="8"/><text class="label" x="530" y="128">S3 + RDS MySQL</text><text x="530" y="144">parquet, tables</text></g>
  <path class="edge" d="M480 132 L520 132"/>

  <g class="node-g"><rect class="node acc" x="520" y="190" width="110" height="44" rx="8"/><text class="label" x="530" y="208">Lambda API</text><text x="530" y="224">reads JSON</text></g>
  <g class="node-g"><rect class="node" x="650" y="190" width="100" height="44" rx="8"/><text class="label" x="660" y="208">Dashboard</text><text x="660" y="224">React / TS</text></g>
  <path class="edge" d="M575 154 L575 190"/>
  <path class="edge" d="M630 212 L650 212"/>
</svg>`;

const body = `
${section("problem", "Problem", `
        <p>T20 Predictor is a quantitative stock-intelligence platform. LightGBM models score about 4,500 tickers across five market universes (Russell 2000, Russell 1000, S&amp;P 500, S&amp;P 600, plus indexes and sector ETFs) and the platform publishes daily Top-20 picks to a web dashboard.</p>
        <p>The daily run was a sequence of scripts that had to be started by hand, in order. That has three costs: a missed morning means no picks, a partial failure can leave the dashboard showing stale data with no signal that it is stale, and the person running it is the single point of failure. The job was to turn a manual workflow into a scheduled, observable pipeline without rewriting the modeling code.</p>`)}

${section("architecture", "Architecture", `
        ${pipelineSvg}
        <p>Five stages (download, dataset build, feature engineering, prediction, statistics) run as containerized <strong>ECS Fargate</strong> tasks orchestrated by an <strong>AWS Step Functions</strong> state machine and scheduled by <strong>EventBridge</strong>. Artifacts land in <strong>S3</strong> (parquet datasets) and <strong>RDS MySQL</strong> (prediction and stats tables). The API is a <strong>Flask</strong> app served through <strong>Lambda</strong>, and it powers a <strong>React/TypeScript</strong> dashboard.</p>
        <p>Two decisions shaped the design. First, containers for the batch stages: the dataset build needs about 8 GB of memory, which rules out Lambda, and Fargate costs nothing between scheduled runs. Second, a precompute pattern for reads: Lambda cannot load large parquet files without a heavy dependency footprint, so the pipeline writes small JSON and CSV artifacts that the API reads directly. The dashboard never triggers computation.</p>`)}

${section("ownership", "My ownership", `
        <p>Team of two engineers reporting to a tech lead who set technical direction. My areas:</p>
        <ul>
          <li>The pipeline automation: task definitions, the state machine, the schedule, and the dry-run validation of each stage.</li>
          <li>The Flask REST API over S3 and RDS, the Lambda serving layer, and the React/TypeScript dashboard it powers, including fault-tolerant error handling and optimized data fetching.</li>
          <li>Integration with the Alpha Vantage market-data API under its 150 requests-per-minute limit.</li>
          <li>Expanding coverage from three to five universes and adding the Russell 1000: 135,000+ feature rows across 451 tickers, 2018 to 2026.</li>
          <li>The swing-trading backtest and the recommendation that came out of it.</li>
          <li>Supervising and code-reviewing four software interns building a React-Admin front end and a backend REST API.</li>
        </ul>
`)}

${section("hardest", "Hardest technical challenges", `
        <h3>The pipeline that reported success while failing</h3>
        <p>Step Functions executions were reporting <code>SUCCEEDED</code> even when a step had failed. The cause: the failure branch ended in a notification state with <code>"End": true</code> instead of a <code>Fail</code> state, so the state machine treated the error path as a normal completion. The failure notification fired and the execution still turned green. I fixed it across all three pipelines. The lesson I keep: verify the execution history and the outputs, not the status badge.</p>
        <h3>Configuration that worked everywhere except in ECS</h3>
        <p>Task definitions that referenced Secrets Manager failed with <code>ResourceNotFoundException</code> even though the secrets existed; plain environment variables worked. Local Docker builds on Apple Silicon produced images Fargate would not run until built with <code>--platform linux/amd64</code>. The container's entrypoint was already <code>python</code>, so task commands that also started with <code>python</code> broke. None of these are exotic, but each one costs an afternoon if you guess instead of reading the actual error.</p>
        <h3>Scaling the universes</h3>
        <p>Adding the Russell 1000 meant a full feature rebuild over 451 tickers. Two latent bugs surfaced only at that scale: a sort that crashed on NaN ticker values, and a multiprocessing pickle error caused by a nested function. Both were fixed in the shared code, so every universe benefited.</p>`)}

${section("decision", "An engineering decision: the backtest that said no", `
        <p>A swing-trading strategy (a Minervini-style volatility-contraction system) was proposed as the next build-out. Before engineering time went into productionizing it, the strategy was backtested on historical data.</p>
        ${stats([["0.84", "profit factor"], ["32.7%", "win rate"], ["negative", "expectancy"]])}
        <p>The result was a clear no-go, and I reported it as such, with the numbers, rather than softening it. The tech lead accepted the finding and stopped the build-out. The engineering lesson: the cheapest code is the code you measured your way out of writing.</p>`)}

${section("reliability", "Reliability and operations", `
        <ul>
          <li><strong>Scheduled execution.</strong> EventBridge triggers the state machine; each stage is a separate task with its own exit code, so a failure stops the chain at the failing stage.</li>
          <li><strong>Failure handling.</strong> Real <code>Fail</code> states after the fix; execution history reviewed on every change.</li>
          <li><strong>Verification before "done".</strong> S3 object timestamps, task exit codes, and output row counts are checked before a run is declared successful. Smoke-test small before running big.</li>
          <li><strong>Data integrity.</strong> When a downstream consumer exposed a bad upstream column, I flagged it for a full data audit rather than patching around it where it surfaced.</li>
          <li><strong>Change discipline.</strong> Strict dev/prod separation, no direct pushes to main, and commit before long runs so the ECR image matches the code being tested.</li>
        </ul>`)}

${section("v2", "What I would build in V2", `
        ${callout("Honest gap", `<p>The Step Functions definitions, ECS task definitions, EventBridge rules, and IAM configuration exist only in the AWS console. They are not version-controlled. This is the first thing I would fix.</p>`)}
        <ol>
          <li><strong>Infrastructure as code.</strong> Export the orchestration to Terraform or CDK in an <code>infra/</code> directory, reviewed like any other code.</li>
          <li><strong>Observability.</strong> Structured logs per stage with run IDs, CloudWatch alarms on missing daily output, and a single "last successful run" indicator on the dashboard so stale data is visible.</li>
          <li><strong>Model evaluation as a stage.</strong> A held-out evaluation step that records precision of Top-20 picks over time, so model drift is a number, not a feeling.</li>
          <li><strong>Queue-based fan-out.</strong> Per-ticker work distributed through SQS to horizontally scaled workers instead of one large task per stage. The full design is in the <a href="/lab.html">engineering lab</a>.</li>
          <li><strong>Caching.</strong> Precomputed API responses in Redis or CloudFront with short TTLs, so dashboard traffic never touches storage.</li>
          <li><strong>Split the dashboard.</strong> The front end is a 14,000-line single file that two engineers share. It needs modules and a build step.</li>
        </ol>`)}
`;

export default page({
  title: "T20 Predictor case study",
  description: "How T20 Predictor's five-stage stock-scoring pipeline runs on AWS ECS Fargate, Step Functions, and Lambda; what I owned; the silent failure I found; and what I would change.",
  kicker: "Case study 01 · Jan – Jun 2026",
  heading: "T20 Predictor — Cloud-Native Stock Prediction Platform",
  lede: "A production-style stock-intelligence platform that scores about 4,500 equities across five market universes and publishes daily Top-20 predictions.",
  meta: [
    ["Role", "One of two engineers, reporting to the tech lead"],
    ["Stack", "Python, Flask, LightGBM, AWS ECS Fargate, Step Functions, EventBridge, Lambda, S3, RDS MySQL, React, TypeScript"],
    ["Scale", "~4,500 tickers · 5 universes · 135,000+ feature rows added · 451 Russell 1000 tickers"],
    ["Code", "Private client repository"],
  ],
  body,
});
