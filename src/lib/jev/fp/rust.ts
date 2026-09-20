/**
 * Optional WASM twin of crates/jev-kernel.
 * Same integers, same pushout. Falls back silently to the TS kernel.
 */

export type Backend = "rust" | "ts";

type Exports = {
  memory: WebAssembly.Memory;
  jev_in_ptr: () => number;
  jev_out_ptr: () => number;
  jev_out_len: () => number;
  jev_pushout: (leftLen: number, rightLen: number, color: number) => number;
  jev_pullback: (leftLen: number, rightLen: number, color: number) => number;
  jev_score: (
    e: number,
    c: number,
    i: number,
    v: number,
    a: number,
    allowed: number,
    forbidden: number,
    green: number,
    toxin: number,
    red: number,
  ) => number;
};

let api: Exports | null = null;
let backend: Backend = "ts";
let loading: Promise<Backend> | null = null;

function readExports(instance: WebAssembly.Instance): Exports | null {
  const e = instance.exports as Record<string, unknown>;
  if (typeof e.jev_pushout !== "function") return null;
  return e as unknown as Exports;
}

function heap(): Uint8Array | null {
  if (!api) return null;
  return new Uint8Array(api.memory.buffer);
}

export function currentBackend(): Backend {
  return backend;
}

export function rustReady(): boolean {
  return api !== null;
}

function writeIn(left: number[], right: number[]): { leftLen: number; rightLen: number } | null {
  if (!api) return null;
  const mem = heap();
  if (!mem) return null;
  const ptr = api.jev_in_ptr();
  mem.set(left, ptr);
  mem.set(right, ptr + left.length);
  return { leftLen: left.length, rightLen: right.length };
}

function readOut(): number[] {
  if (!api) return [];
  const mem = heap();
  if (!mem) return [];
  const len = api.jev_out_len();
  const ptr = api.jev_out_ptr();
  return Array.from(mem.subarray(ptr, ptr + len));
}

export function rustPushout(left: number[], right: number[], color: number): number[] | null {
  const w = writeIn(left, right);
  if (!w || !api) return null;
  const status = api.jev_pushout(w.leftLen, w.rightLen, color);
  if (status !== 0) return null;
  return readOut();
}

export function rustPullback(left: number[], right: number[], color: number): number[] | null {
  const w = writeIn(left, right);
  if (!w || !api) return null;
  const status = api.jev_pullback(w.leftLen, w.rightLen, color);
  if (status !== 0) return null;
  return readOut();
}

export function loadRust(): Promise<Backend> {
  if (backend === "rust" && api) return Promise.resolve("rust");
  if (loading) return loading;
  if (typeof WebAssembly === "undefined") return Promise.resolve("ts");
  loading = (async () => {
    try {
      const res = await fetch("/jev_kernel.wasm");
      if (!res.ok) return "ts";
      const buf = await res.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(buf, {});
      const next = readExports(instance);
      if (!next) return "ts";
      api = next;
      backend = "rust";
      return "rust";
    } catch {
      backend = "ts";
      return "ts";
    }
  })();
  return loading;
}
