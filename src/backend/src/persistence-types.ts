// Flowboard plugin module implements persistence types behavior.
import type {
  FlowboardAttachment,
  FlowboardBoardMetadata,
  FlowboardCard,
  FlowboardMilestone,
  FlowboardNotificationSubscription,
  FlowboardProjectDocument,
} from "../../contract/index.js";

export type PersistedFlowboardCard = {
  version: 1;
  card: FlowboardCard;
};

export type PersistedFlowboardBoard = {
  version: 1;
  board: FlowboardBoardMetadata;
};

export type PersistedFlowboardMilestone = {
  version: 1;
  milestone: FlowboardMilestone;
};

export type PersistedFlowboardProjectDocument = {
  version: 1;
  document: FlowboardProjectDocument;
};

export type PersistedFlowboardNotificationSubscription = {
  version: 1;
  subscription: FlowboardNotificationSubscription;
};

export type PersistedFlowboardAttachment = {
  version: 1;
  attachment: FlowboardAttachment;
  contentBase64: string;
};

export type FlowboardKeyedStore<T = PersistedFlowboardCard> = {
  register(key: string, value: T): Promise<void>;
  lookup(key: string): Promise<T | undefined>;
  delete(key: string): Promise<boolean>;
  entries(): Promise<Array<{ key: string; value: T }>>;
  /**
   * Conditional write: persist `value` only if the stored row still carries
   * `expectedRevision`, and report whether it did. Backends that implement this
   * must perform the check and the write in one atomic unit so concurrent
   * processes cannot both win. Optional: callers fall back to a
   * read-compare-write guarded only by the in-process mutation queue.
   */
  compareAndSwap?(key: string, expectedRevision: number, value: T): Promise<boolean>;
};
