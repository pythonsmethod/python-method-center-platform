import { beforeEach, describe, expect, it, vi } from "vitest";

// Storage behaviour of the founder gap centre, against a scripted Supabase
// client: what is written, what is deliberately not written, and that no
// failure here can reach the person waiting for an answer.

const state = vi.hoisted(() => ({
  recentEvent: { data: null as { id: string } | null, error: null as unknown },
  existingDraft: { data: null as { id: string } | null, error: null as unknown },
  draftInsert: { data: { id: "draft-1" } as { id: string } | null, error: null as unknown },
  eventInsert: { error: null as unknown },
  listRows: { data: [] as unknown[], error: null as unknown },
  readRows: { data: [] as unknown[], error: null as unknown },
  singleEvent: { data: null as unknown, error: null as unknown },
  rpc: { data: 0 as unknown, error: null as unknown },
  deleteResult: { error: null as unknown },
  upsertResult: { error: null as unknown },
  inserts: [] as { table: string; payload: Record<string, unknown> }[],
  upserts: [] as { table: string; payload: Record<string, unknown> }[],
  deletes: [] as { table: string; filters: Record<string, unknown> }[],
  rpcCalls: [] as { name: string; args: Record<string, unknown> }[],
  clientAvailable: true,
  throwOnFrom: false,
  throwOnRpc: false
}));

function makeQuery(table: string) {
  const filters: Record<string, unknown> = {};
  let mode: "read" | "insert" | "upsert" | "delete" = "read";

  const query: Record<string, unknown> = {
    select: () => query,
    order: () => query,
    limit: () => query,
    gte: () => query,
    in: () => query,
    eq: (column: string, value: unknown) => {
      filters[column] = value;
      return query;
    },
    insert: (payload: Record<string, unknown>) => {
      mode = "insert";
      state.inserts.push({ table, payload });
      return query;
    },
    upsert: (payload: Record<string, unknown>) => {
      mode = "upsert";
      state.upserts.push({ table, payload });
      return query;
    },
    delete: () => {
      mode = "delete";
      return query;
    }
  };

  const settle = () => {
    if (mode === "insert") {
      return table === "assistant_knowledge" ? state.draftInsert : state.eventInsert;
    }
    if (mode === "upsert") return state.upsertResult;
    if (mode === "delete") {
      state.deletes.push({ table, filters });
      return state.deleteResult;
    }
    if (table === "assistant_gap_reads") return state.readRows;
    return state.listRows;
  };

  query.maybeSingle = async () => {
    if (mode === "insert") {
      return table === "assistant_knowledge" ? state.draftInsert : state.eventInsert;
    }
    if (table === "assistant_gap_events") return state.recentEvent;
    if (table === "assistant_knowledge") return state.existingDraft;
    return { data: null, error: null };
  };
  query.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(settle()).then(resolve);

  return query;
}

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => {
    if (!state.clientAvailable) return null;
    return {
      from: (table: string) => {
        if (state.throwOnFrom) throw new Error("database unreachable");
        return makeQuery(table);
      },
      rpc: async (name: string, args: Record<string, unknown>) => {
        if (state.throwOnRpc) throw new Error("database unreachable");
        state.rpcCalls.push({ name, args });
        return state.rpc;
      }
    };
  }
}));

import {
  captureKnowledgeGap,
  getGapUnreadCount,
  listGapEvents,
  markGapRead,
  markGapUnread,
  recordKnowledgeGap
} from "@/lib/assistant/escalation-store";
import { unconfirmedReply } from "@/lib/assistant/factual-honesty";

const GAP_SIGNAL = {
  topic: "pricing_and_plans",
  audience: "client",
  escalationTarget: "team",
  locale: "ru"
} as const;

function reset() {
  state.recentEvent = { data: null, error: null };
  state.existingDraft = { data: null, error: null };
  state.draftInsert = { data: { id: "draft-1" }, error: null };
  state.eventInsert = { error: null };
  state.listRows = { data: [], error: null };
  state.readRows = { data: [], error: null };
  state.rpc = { data: 0, error: null };
  state.deleteResult = { error: null };
  state.upsertResult = { error: null };
  state.inserts = [];
  state.upserts = [];
  state.deletes = [];
  state.rpcCalls = [];
  state.clientAvailable = true;
  state.throwOnFrom = false;
  state.throwOnRpc = false;
}

describe("founder gap store", () => {
  beforeEach(reset);

  it("sends only enumerated metadata and generic draft seed copy to one atomic RPC", async () => {
    state.rpc = {
      data: [{ record_status: "recorded", event_id: "event-1", knowledge_draft_id: "draft-1" }],
      error: null
    };
    expect(await recordKnowledgeGap({ ...GAP_SIGNAL })).toEqual({ status: "recorded" });

    expect(state.rpcCalls).toHaveLength(1);
    expect(state.rpcCalls[0].name).toBe("record_assistant_gap_event");
    expect(Object.keys(state.rpcCalls[0].args).sort()).toEqual([
      "p_audience",
      "p_draft_content",
      "p_draft_title",
      "p_escalation_target",
      "p_locale",
      "p_topic"
    ]);
    for (const forbidden of ["question", "profile_id", "case_id", "content", "text", "email"]) {
      expect(state.rpcCalls[0].args).not.toHaveProperty(forbidden);
    }
    expect(state.inserts).toHaveLength(0);
  });

  it("maps the RPC deduplication result", async () => {
    state.rpc = {
      data: [{ record_status: "deduplicated", event_id: "already-there", knowledge_draft_id: "draft-1" }],
      error: null
    };

    expect(await recordKnowledgeGap({ ...GAP_SIGNAL })).toEqual({ status: "deduplicated" });
    expect(state.inserts).toHaveLength(0);
  });

  it("never throws and never records when the database is unreachable", async () => {
    state.throwOnRpc = true;
    expect(await recordKnowledgeGap({ ...GAP_SIGNAL })).toEqual({ status: "skipped" });

    state.throwOnRpc = false;
    state.clientAvailable = false;
    expect(await recordKnowledgeGap({ ...GAP_SIGNAL })).toEqual({ status: "skipped" });
    expect(state.inserts).toHaveLength(0);
  });

  it("captures from a delivered escalation reply and ignores ordinary answers", async () => {
    const question = "Когда вернутся деньги за отменённую оплату?";
    state.rpc = {
      data: [{ record_status: "recorded", event_id: "event-1", knowledge_draft_id: "draft-1" }],
      error: null
    };

    await captureKnowledgeGap({
      reply: unconfirmedReply("ru", "support", "client"),
      question,
      audience: "client",
      locale: "ru"
    });
    const recorded = state.rpcCalls.find((row) => row.name === "record_assistant_gap_event");
    expect(recorded).toBeDefined();
    expect(recorded!.args.p_topic).toBe("payment_or_refund");
    expect(recorded!.args.p_escalation_target).toBe("support");

    reset();
    await captureKnowledgeGap({
      reply: "Возврат занимает до десяти рабочих дней.",
      question,
      audience: "client",
      locale: "ru"
    });
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("captures a provider-authored factual refusal", async () => {
    state.rpc = {
      data: [{ record_status: "recorded", event_id: "event-1", knowledge_draft_id: "draft-1" }],
      error: null
    };

    await captureKnowledgeGap({
      reply: "I won't reply with that sentence. There's no tool here that submits refund requests, and no confirmed system result showing one was sent.",
      question: "When will the refund be completed?",
      audience: "staff",
      locale: "en"
    });

    expect(state.rpcCalls).toHaveLength(1);
    expect(state.rpcCalls[0].args).toMatchObject({
      p_topic: "payment_or_refund",
      p_audience: "staff",
      p_escalation_target: "support",
      p_locale: "en"
    });
  });

  it("keeps read state per founder and never edits the event", async () => {
    expect(await markGapRead("event-1", "founder-a")).toBe(true);
    expect(state.upserts).toEqual([
      {
        table: "assistant_gap_reads",
        payload: { gap_event_id: "event-1", founder_profile_id: "founder-a" }
      }
    ]);

    expect(await markGapUnread("event-1", "founder-a")).toBe(true);
    expect(state.deletes).toEqual([
      {
        table: "assistant_gap_reads",
        filters: { gap_event_id: "event-1", founder_profile_id: "founder-a" }
      }
    ]);

    // Neither direction touches the append-only event table.
    expect(state.upserts.some((row) => row.table === "assistant_gap_events")).toBe(false);
    expect(state.deletes.some((row) => row.table === "assistant_gap_events")).toBe(false);
  });

  it("marks one founder's list without affecting another's", async () => {
    state.listRows = {
      data: [
        {
          id: "event-1",
          topic: "pricing_and_plans",
          audience: "client",
          escalation_target: "team",
          locale: "ru",
          knowledge_draft_id: null,
          created_at: "2026-09-09T10:00:00.000Z"
        }
      ],
      error: null
    };

    state.readRows = { data: [{ gap_event_id: "event-1" }], error: null };
    const forReader = await listGapEvents("founder-a");
    expect(forReader.status).toBe("ready");
    expect(forReader.status === "ready" && forReader.events[0].read).toBe(true);

    state.readRows = { data: [], error: null };
    const forOther = await listGapEvents("founder-b");
    expect(forOther.status === "ready" && forOther.events[0].read).toBe(false);
  });

  it("asks the unread counter for the caller's own profile and fails soft", async () => {
    state.rpc = { data: 4, error: null };
    expect(await getGapUnreadCount("founder-a")).toBe(4);
    expect(state.rpcCalls).toEqual([
      { name: "assistant_gap_unread_count", args: { p_founder_profile_id: "founder-a" } }
    ]);

    state.rpc = { data: null, error: { message: "denied" } };
    expect(await getGapUnreadCount("founder-a")).toBe(0);
  });
});
