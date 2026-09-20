/**
 * Temporal-shaped durable execution, in-process.
 * Event-sourced, keyed, replayable. One intent → one effect.
 */

export type EventType =
  | "WorkflowStarted"
  | "SlotSelected"
  | "ActivityScheduled"
  | "ActivityCompleted"
  | "ActivityFailed"
  | "VerdictRecorded"
  | "CompositionAttempted"
  | "WorkflowCompleted";

export interface WorkflowEvent {
  id: string;
  ts: number;
  type: EventType;
  runId: string;
  payload: Record<string, unknown>;
}

export interface WorkflowRun {
  runId: string;
  workflow: "JevCorrectness";
  status: "running" | "completed" | "failed";
  startedAt: number;
  events: WorkflowEvent[];
}

let seq = 0;
function eid() {
  seq += 1;
  return `evt_${seq.toString(36)}_${Date.now().toString(36)}`;
}

export function startRun(runId: string): WorkflowRun {
  const startedAt = Date.now();
  const run: WorkflowRun = {
    runId,
    workflow: "JevCorrectness",
    status: "running",
    startedAt,
    events: [],
  };
  append(run, "WorkflowStarted", { workflow: "JevCorrectness" });
  return run;
}

export function append(run: WorkflowRun, type: EventType, payload: Record<string, unknown>) {
  run.events.push({
    id: eid(),
    ts: Date.now(),
    type,
    runId: run.runId,
    payload,
  });
}

export function replay(events: WorkflowEvent[]): {
  verdict?: string;
  composed?: boolean;
  lastActivity?: string;
} {
  let verdict: string | undefined;
  let composed = false;
  let lastActivity: string | undefined;
  for (const e of events) {
    if (e.type === "ActivityScheduled") lastActivity = String(e.payload.activity ?? "");
    if (e.type === "VerdictRecorded") verdict = String(e.payload.verdict ?? "");
    if (e.type === "CompositionAttempted") composed = Boolean(e.payload.ok);
  }
  return { verdict, composed, lastActivity };
}
