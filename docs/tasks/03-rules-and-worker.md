# Task 03 — Rules evaluator and worker
Part A — rules (`src/server/engine/rules.ts`):
- `evaluate(ruleSet, context) -> { score, level, flags[] }`. Each rule: `{id,label,logic,weight,severity}`; `logic` is json-logic evaluated on `context`. Score = sum of weights of triggered rules. Level from `thresholds` (default: <30 low, 30-69 medium, >=70 high). `flags` keeps `id` and `label` of each triggered rule (shown on screen).
- Tests: no rule triggered, one, several, threshold edges (29/30/69/70).
Part B — worker (`src/worker/index.ts`, separate process):
- Start pg-boss (v10: you must call `boss.createQueue(name)` for each queue; check the installed README if unsure).
- Queues: `run.advance` (calls `advance(runId)` then enqueues `nextJob`), `approval.timeout` (delayed; marks expired + escalates), `reminders.tick` (cron every minute: invoice reminders J-3/J0/J+7, ticket SLA watch).
- Graceful shutdown on SIGTERM. Log each job (name, runId, duration).
- API helper `enqueue(name, data, opts)` used by the web app (`src/server/queue.ts`).
Done when: `npm test` passes; `npm run worker` starts without error; starting a demo run from a script moves it to its next step.
