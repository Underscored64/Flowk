# Task 04 — Finance vertical (P0)
Goal: invoice flow end to end.
Do:
1. Pages: `invoices` (table: supplier, number, amount, due date, status, risk badge), `invoices/new` (form: supplier, number, amount, dates, optional PO, optional raw text), `invoices/[id]` (details, risk score with the list of triggered rules, workflow timeline, audit history, approve/reject buttons for managers).
2. Creating an invoice creates a `WorkflowRun` from `invoice_processing` and enqueues `run.advance`.
3. Handlers: `invoice.extract` (if rawText: LLM extraction when enabled, else skip), rules step with ruleset `invoice_anomalies`.
4. Rules (seed them in `RuleSet`, weights adjustable): `dup_invoice` 60 (same supplier+number, or same amount ±1% within 30 days), `amount_outlier` 40 (> 3x supplier average), `unknown_supplier` 50, `po_mismatch` 35 (> 5% off PO), `bank_changed` 70 (supplier bank changed < 30 days ago), `date_incoherent` 20 (due before issue, or issue in the future).
5. Reconciliation page `reconciliation`: for each unmatched `BankTransaction` find unpaid invoices with equal amount within a date window. Same reference => `matched`; amount only => `partial`; else `unmatched`. Button to confirm a match (audit).
6. Payment reminders in `reminders.tick`: J-3, J0, J+7 -> create a `Notification` + draft message (template string; LLM optional later).
Done when: with seed data, the 6-8 planted anomalous invoices end in `high`, a normal invoice goes straight to `pay`, a medium one waits for approval, manager approval resumes the run; all steps visible in the timeline; `npm run build` passes.
