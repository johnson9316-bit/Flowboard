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
};
