import { describe, expect, it } from "vitest";
import { evaluateRules, levelFor } from "../../src/server/engine/rules";
import { FINANCE_RULES, buildInvoiceContext } from "../../src/server/engine/finance-rules";
import { matchTransaction } from "../../src/server/engine/reconcile";
import { SUPPLIERS, generateDemo } from "../../prisma/demo-data";

describe("levelFor", () => {
  it("applies thresholds 30 / 70", () => {
    expect(levelFor(0)).toBe("low");
    expect(levelFor(29)).toBe("low");
    expect(levelFor(30)).toBe("medium");
    expect(levelFor(69)).toBe("medium");
    expect(levelFor(70)).toBe("high");
  });
});

describe("evaluateRules", () => {
  it("sums the weights of triggered rules", () => {
    const rules = [
      { id: "a", label: "A", weight: 40, logic: { var: "x" } },
      { id: "b", label: "B", weight: 35, logic: { ">": [{ var: "n" }, 5] } },
      { id: "c", label: "C", weight: 10, logic: { var: "nope" } },
    ];
    const r = evaluateRules(rules, { x: true, n: 9 });
    expect(r.score).toBe(75);
    expect(r.level).toBe("high");
    expect(r.flags.map((f) => f.id)).toEqual(["a", "b"]);
  });
  it("never throws on bad logic", () => {
    const r = evaluateRules([{ id: "z", label: "Z", weight: 99, logic: { bogus: [1] } }], {});
    expect(r.score).toBe(0);
  });
});

describe("demo data against the finance rules", () => {
  const now = new Date("2026-11-08T10:00:00Z");
  const demo = generateDemo(now);

  it("every invoice gets the expected level, processed in order", () => {
    const seen: { supplierKey: number; number: string; amountCents: number; issueDate: Date }[] = [];
    const levels = { low: 0, medium: 0, high: 0 };
    for (const inv of demo.invoices) {
      const s = SUPPLIERS[inv.supplierKey];
      const po = inv.poKey === null ? null : demo.pos.find((p) => p.key === inv.poKey)!;
      const ctx = buildInvoiceContext({
        invoice: inv,
        supplier: {
          status: s.status,
          avgInvoiceCents: s.avgInvoiceCents,
          bankChangedAt: s.bankChangedDaysAgo === null ? null : new Date(now.getTime() - s.bankChangedDaysAgo * 86400000),
        },
        po,
        others: seen.filter((o) => o.supplierKey === inv.supplierKey),
        now,
      });
      const r = evaluateRules(FINANCE_RULES, ctx);
      if (!inv.planted) expect(r.flags, `normal ${inv.number}`).toEqual([]);
      expect(r.level, `${inv.number} ${inv.planted ?? "normal"}`).toBe(inv.expect);
      levels[r.level] += 1;
      seen.push(inv);
    }
    expect(levels.high).toBe(4);
    expect(levels.medium).toBe(4);
  });
});

describe("matchTransaction", () => {
  const invs = [
    { id: "1", number: "INV-1", amountCents: 1000, status: "approved", paymentStatus: "scheduled" },
    { id: "2", number: "INV-2", amountCents: 2000, status: "blocked", paymentStatus: "unpaid" },
  ];
  it("matched: amount + reference + approved", () => {
    expect(matchTransaction({ amountCents: 1000, reference: "INV-1", label: "x" }, invs)).toEqual({ status: "matched", invoiceId: "1" });
  });
  it("partial: invoice is blocked", () => {
    expect(matchTransaction({ amountCents: 2000, reference: "INV-2", label: "x" }, invs).status).toBe("partial");
  });
  it("partial: amount only", () => {
    expect(matchTransaction({ amountCents: 1000, reference: null, label: "Wire" }, invs).status).toBe("partial");
  });
  it("unmatched", () => {
    expect(matchTransaction({ amountCents: 5, reference: null, label: "?" }, invs).status).toBe("unmatched");
  });
});
