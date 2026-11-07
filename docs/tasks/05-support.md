# Task 05 — Support vertical (P0)
Goal: ticket flow with investigation, action, and escalation.
Do:
1. Pages: `tickets` (queue sorted by priority then SLA, badges), `tickets/new`, `tickets/[id]` (message, triage result, investigation results, proposed reply, timeline, escalate/resolve buttons).
2. Triage (rules by keywords, LLM optional later): category (billing, delivery, account, other), priority (low/normal/high/critical). `slaDueAt` from priority (critical 1 h, high 4 h, normal 24 h, low 72 h).
3. Connectors in `src/server/connectors/`: common interface `call(action, params)`; mock implementations: `orders` (get order status), `billing` (get invoices/refunds), `accounts` (get/reset account). Data from the DB or fixtures. Never real external calls.
4. Allowed actions (whitelist): `refund.small` (cap 50.00 = 5000 cents), `resend_confirmation`, `account.reset`. Above the cap => approval step.
5. Escalation rules: `critical`, `vip`, `refund_over_cap`, `angry_customer` (keywords), `sla_breached`, `action_failed`. On escalation: approval for the manager, a `Notification`, a summary (what was tried, why escalated; template first, LLM later) and a button "Start meeting" (Task 06).
Done when: a normal ticket resolves automatically; a VIP or critical ticket escalates with a summary; an SLA breach is detected by the worker; `npm run build` passes.
