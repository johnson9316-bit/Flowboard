import { randomUUID } from "node:crypto";
import type { FlowboardChange } from "../../contract/index.js";
import type { FlowboardKeyedStore } from "./persistence-types.js";

/**
 * Revisions reserved per round trip to the backing store. Large enough that a
 * busy Gateway rarely re-reserves, small enough that restarts do not skip far.
 */
const CHANGE_REVISION_BLOCK = 10_000;

export class FlowboardChangeTracker {
  private readonly epoch: string;
  private revision: number;
  private revisionCeiling: number;
  private latestChange: FlowboardChange | undefined;
  private mutationRevision = 0;
  private externalDataVersion: number | undefined;
  private readonly listeners = new Set<(change: FlowboardChange) => void>();
  private readonly reserveRevisions: (count: number) => number;

  constructor(
    private readonly readDataVersion?: () => number,
    epoch?: string,
    reserveRevisions?: (count: number) => number,
  ) {
    // A database-scoped epoch plus restart-monotonic revisions keep a connected
    // UI's long-wait cursor comparable across a Gateway restart. A per-process
    // epoch invalidated every cursor on each restart and forced a full reload.
    this.epoch = epoch ?? randomUUID();
    this.reserveRevisions = reserveRevisions ?? (() => 0);
    this.revision = this.reserveRevisions(CHANGE_REVISION_BLOCK);
    this.revisionCeiling = this.revision + CHANGE_REVISION_BLOCK;
    this.externalDataVersion = readDataVersion?.();
  }

  private nextRevision(): number {
    if (this.revision + 1 >= this.revisionCeiling) {
      const base = Math.max(this.reserveRevisions(CHANGE_REVISION_BLOCK), this.revision);
      this.revision = base;
      this.revisionCeiling = base + CHANGE_REVISION_BLOCK;
    }
    return ++this.revision;
  }

  track<T>(store: FlowboardKeyedStore<T>): FlowboardKeyedStore<T> {
    return {
      register: async (key, value) => {
        await store.register(key, value);
        this.mutationRevision += 1;
      },
      lookup: async (key) => await store.lookup(key),
      delete: async (key) => {
        const deleted = await store.delete(key);
        if (deleted) {
          this.mutationRevision += 1;
        }
        return deleted;
      },
      entries: async () => await store.entries(),
      ...(store.compareAndSwap
        ? {
            compareAndSwap: async (key: string, expectedRevision: number, value: T) => {
              const swapped = await store.compareAndSwap!(key, expectedRevision, value);
              if (swapped) {
                this.mutationRevision += 1;
              }
              return swapped;
            },
          }
        : {}),
    };
  }

  subscribe(listener: (change: FlowboardChange) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  announceEpoch(): void {
    this.emit();
  }

  current(): FlowboardChange | undefined {
    return this.latestChange;
  }

  reconcileExternalChanges(): boolean {
    if (!this.readDataVersion) {
      return false;
    }
    const current = this.readDataVersion();
    if (current === this.externalDataVersion) {
      return false;
    }
    this.externalDataVersion = current;
    this.emit();
    return true;
  }

  async runMutation<T>(run: () => Promise<T>): Promise<T> {
    const initialRevision = this.mutationRevision;
    try {
      return await run();
    } finally {
      if (this.mutationRevision !== initialRevision) {
        this.emit();
      }
    }
  }

  private emit(): void {
    const change = { epoch: this.epoch, revision: this.nextRevision() };
    this.latestChange = change;
    for (const listener of this.listeners) {
      try {
        listener(change);
      } catch {
        // Persistence already succeeded. Observers cannot turn it into a reported failure.
      }
    }
  }
}
