# Task 02 — Workflow engine core (MOST IMPORTANT, go slowly, write tests first)
Goal: execute a workflow template step by step, resumable and idempotent.
Template format (JSON stored in `WorkflowTemplate.definition`):
```
{ "start": "extract",
  "steps": {
    "extract": { "type": "task", "handler": "invoice.extract", "next": "check" },
    "check":   { "type": "rules", "ruleset": "invoice_anomalies", "next": { "low": "pay", "medium": "review", "high": "block" } },
    "review":  { "type": "approval", "assigneeRole": "manager", "dueInHours": 24, "next": { "approved": "pay", "rejected": "block" } },
    "block":   { "type": "notify", "channels": ["announcement","notification"], "next": "end" },
    "pay":     { "type": "wait", "until": "context.dueDate", "next": "end" } } }
```
Step types: `task`, `rules`, `approval`, `notify`, `wait`, `branch`. `"end"` finishes the run.
Do:
1. `src/server/engine/types.ts`: Zod schemas for the template.
2. `src/server/engine/runner.ts`: `advance(runId)` — in ONE transaction: load run, read current step, execute handler (from a registry in `handlers/`), save a `StepRun` (unique runId+stepId+attempt => idempotent), compute next step, update run status/currentStepId, call `audit()`. Returns `{ nextJob?: {name, data, startAfter?} }` so the worker can enqueue it. The runner itself does NOT import pg-boss (keeps it testable).
3. Approval step: create an `Approval` row, set run `waiting_approval`, return no next job. `decide(approvalId, user, decision, comment)` records the decision and returns the next job.
4. Failure: handler throws -> StepRun `failed`, retry up to 3 attempts, then run `failed`.
5. `src/server/engine/templates/` with `invoice_processing.ts` and `ticket_handling.ts` (can be stubs now).
6. Tests in `tests/engine/`: branching, approval approved/rejected, idempotence (calling advance twice does not duplicate a StepRun), failure after 3 retries. Use fake handlers, a test database or a Prisma mock.
Done when: `npm test` passes all engine tests; `npm run build` passes.
