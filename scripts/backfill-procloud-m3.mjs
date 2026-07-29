import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PROJECT_ID = "procloud";
const PLANNING_ROOT = "/home/john/src/lz/procloud/.planning";
const DOCS_ROOT = "/home/john/src/lz/procloud/docs";
const MILESTONES = {
  v10: "2b110fa4-65b6-4616-9b35-8ff5cfc9c281",
  v11: "4c9a875c-e12c-4c57-878c-3db989ff3781",
  ipDiff: "2ba5b009-07c0-4d37-a5a9-b003dc5f84a8",
};

const written = {
  cards: [],
  sourceReferences: [],
  documentsUpdated: [],
  documentsDeleted: [],
};

const delivery = ({
  objective,
  deliverySummary,
  openItems,
  implementationState,
  verificationState,
  releaseState,
}) => ({
  objective,
  deliverySummary,
  openItems,
  implementationState,
  verificationState,
  releaseState,
});

const reference = (label, target, note) => ({ label, target, note });

const V10_CLOSEOUT_REFERENCES = [
  reference(
    "v1.0 milestone closeout",
    `${PLANNING_ROOT}/milestones/v1.0-ROADMAP.md`,
    "Records the 16 v1.0 phases as completed and launched.",
  ),
  reference(
    "v1.0 archived state",
    `${PLANNING_ROOT}/STATE.md`,
    "The v1.0 closeout states that all 16 phases were completed and live by 2026-07-17.",
  ),
];

const V10_DELIVERY = delivery({
  objective: "Complete the v1.0 subtask acceptance and launch scope.",
  deliverySummary:
    "Historical v1.0 closeout records this work as delivered and launched with the milestone on 2026-07-17.",
  openItems:
    "No active v1.0 delivery work is recorded. Card notes retain the historical implementation detail.",
  implementationState: "code_complete",
  verificationState: "passed",
  releaseState: "released",
});

const V10_CARD_IDS = [
  "aa724311-6f8f-4840-8f28-1a0580117b79",
  "a613b7ae-a657-4edb-9919-2b19da3a2759",
  "f4b8f132-8c91-40f6-a1e4-beeae9628129",
  "b601867e-008b-420e-9313-88bac7e56e57",
  "02e9a790-fb91-451f-9489-cc80841923cb",
  "130b4162-84dc-4d65-a086-42cfc241f184",
  "88891f6f-a23b-429e-9264-e7fc8e7594c9",
  "2c128b9f-aacb-4a31-8c35-0cb7d045469c",
  "38cabd61-8015-42bc-a7fa-08fa4d01412e",
  "a5582aff-169c-46fd-83b4-766d00f3a35d",
  "79fccdf0-c49e-4696-b7c6-2f3803b0431e",
  "60f5ada1-b186-4e38-938d-3d6c26708646",
  "c845c444-0406-46d6-bc2b-07ebfe61ea73",
  "edca37f0-5d1a-453a-853d-f5b1d5b7a965",
  "0cdeb869-5c42-4a43-8bb1-c3527d411628",
  "f67c73b6-0d34-4dc5-ab61-d0cb2a7301af",
  "b540928a-1f2a-4cde-b302-526faeb8d5ad",
  "db83437e-b249-4a9b-b776-0f4a1689e295",
  "4afba37c-bf35-4e72-97f3-46547c81c3d0",
  "c7994ea5-31f0-46e2-b24a-ea1109c03732",
  "c09c8bbd-29e5-4f90-8b18-4c6c004a2a4c",
  "1a3c859c-2f3e-48b8-9701-e4cd92d8057d",
  "98443b9d-f9fb-468b-95d9-fe4fa36817c3",
  "a073dac0-cba2-4114-8212-b5db82999bba",
  "7b018a29-4d82-4f85-b134-a71c29f7e982",
  "b7d1d02f-c954-4d77-8882-9733ae466960",
  "5baa29cc-5916-4280-9602-c1c1bcb16ada",
  "2ed5303d-f4c2-457f-84ed-5fec6e73963d",
  "f8b3617c-dbf6-4a2f-860c-288e5c787470",
  "59640e4b-03ac-4e4d-81b7-0f25b9c99668",
  "2dc42915-ae3c-4ee0-bd04-7768b1ee199f",
  "4637761f-044c-4f8d-9451-b75397ded4be",
  "4fe90e4a-3c9d-47db-a65a-4acc84c41747",
  "2d6ca5e0-a0e2-40c6-8a7e-72e134392f8b",
  "749771db-953f-4949-ac52-ee32f32fa1b1",
  "b0a6245f-3ed0-46fd-a7f0-b8d5be084d6c",
  "896e70e6-4b9f-4473-a7c4-de2f877cfe7f",
  "b5ee5f1e-e253-40ce-bc5f-0ff6e27aef05",
  "b2fd55b0-1388-43fd-9a36-7ac113df3192",
  "517155ee-2bca-4070-a751-e0a03852f1ff",
  "64fa3669-e00c-4529-8eb2-aaad0a9c8d1d",
  "2d8d06b4-f06f-45cb-bdf0-cfb2127bb1e8",
  "366adec3-0b50-4147-b39f-d5b23a152df4",
  "6fb5c11e-415e-44e0-8a16-3f72681fea2a",
  "c4a9f54a-cd1f-4580-a5ff-c83ceec0f29d",
  "df0ad4ff-663a-4795-a272-c31855590e05",
  "9c07b59a-e2bd-43a1-8955-c18c4b00c522",
  "0104be72-1b09-4378-a25c-3be577861521",
  "128cde66-492f-40cb-9e65-acd9405de0b4",
  "0d6f4942-f967-49e0-b274-28c214b06db5",
];

const V11_PHASES = [
  {
    name: "Phase 17",
    cardIds: [
      "c55ca6fb-cdd1-4d7b-b647-64c26b5e8efb",
      "ee11189b-4def-4d5e-a4c1-99a9dd44925c",
      "5fc10e14-8ffe-4a20-ac20-254394cc10f9",
      "664b92b9-d5ea-4bbf-a0d4-45bf41bf7e3b",
    ],
    delivery: delivery({
      objective: "Build the Feishu notification foundation, recipients, and durable message log.",
      deliverySummary:
        "The notification base, outbox, recipient configuration, and local stage verification are complete.",
      openItems:
        "Production app publication, recipient scope, and real-environment acceptance remain open.",
      implementationState: "code_complete",
      verificationState: "partial",
      releaseState: "pending",
    }),
    references: [
      reference(
        "Phase 17 verification",
        `${PLANNING_ROOT}/phases/17-feishu-notify-infra/17-VERIFICATION.md`,
        "Code and local verification evidence; production checks remain separately tracked.",
      ),
    ],
  },
  {
    name: "Phase 18",
    cardIds: [
      "278f8efb-b718-465e-a056-d3d4d2129923",
      "9cad2104-b8e9-4796-a133-562769aa0a80",
      "2b202fdf-4759-471c-838f-b9e76c903550",
      "c74c7153-60c4-4459-875a-d748fd270aae",
    ],
    delivery: delivery({
      objective: "Detect real ASN and asn.type changes and send traceable Feishu alerts.",
      deliverySummary:
        "Detection code and the transaction rollback harness are complete; the harness records 5/5 passing checks.",
      openItems:
        "Real-environment ASN/asn.type notification and MessageLog acceptance remain human work.",
      implementationState: "code_complete",
      verificationState: "human_required",
      releaseState: "pending",
    }),
    references: [
      reference(
        "Phase 18 verification",
        `${PLANNING_ROOT}/phases/18-asn-asn-type/18-VERIFICATION.md`,
        "Distinguishes code-level verification from the outstanding real-environment test.",
      ),
    ],
  },
  {
    name: "Phase 19",
    cardIds: ["4b061056-cc06-4a32-a443-e955cff54c6f", "9fcd064d-cfc0-4736-b77a-a7b8f00cd7c7"],
    delivery: delivery({
      objective: "Send a daily aggregate card for formal IP geography changes.",
      deliverySummary:
        "The aggregation command and local stage checks are complete, including the required code paths.",
      openItems:
        "The production cron must be mounted after the real sync-ip-geo schedule is confirmed.",
      implementationState: "code_complete",
      verificationState: "partial",
      releaseState: "pending",
    }),
    references: [
      reference(
        "Phase 19 verification",
        `${PLANNING_ROOT}/phases/19-geo-daily-summary/19-VERIFICATION.md`,
        "Records local verification and the remaining production cron confirmation.",
      ),
    ],
  },
  {
    name: "Phase 20",
    cardIds: [
      "517b1227-d40f-4ef0-b5ce-595955968f41",
      "41217e67-5050-4fef-b07e-c77b4fe75c8b",
      "f7002812-fd37-48e1-b926-918b078b89e0",
    ],
    delivery: delivery({
      objective: "Provide a read-only administration page for Feishu notification records.",
      deliverySummary:
        "The controller, list page, details view, and code-level 7/7 stage verification are complete.",
      openItems:
        "Menu registration, real browser behavior, failure-record visibility, and read-only endpoint checks remain.",
      implementationState: "code_complete",
      verificationState: "partial",
      releaseState: "pending",
    }),
    references: [
      reference(
        "Phase 20 verification",
        `${PLANNING_ROOT}/phases/20-feishu-notify-log-page/20-VERIFICATION.md`,
        "Separates code-level evidence from the remaining browser and production checks.",
      ),
    ],
  },
];

const CHECKLIST = `${DOCS_ROOT}/feishu/上线前测试清单.md`;
const V11_ACCEPTANCE = [
  {
    id: "466eb2bb-6fb7-4209-a8dd-054d959d8181",
    objective: "Confirm BgpTools ASN production data and a geo_asn baseline.",
  },
  {
    id: "fea74595-5325-4f2a-8b92-8fb6d9f8debf",
    objective: "Confirm that the Feishu app is published and the intended recipient is in scope.",
  },
  {
    id: "f62ef456-5dae-4baa-b75a-d005fd19bf65",
    objective: "Confirm the actual production sync-ip-geo completion time.",
  },
  {
    id: "b6e7cc4f-0ec9-4a7d-b989-f00cd30b4b1f",
    objective: "Run the real ASN-change notification and MessageLog acceptance test.",
  },
  {
    id: "bf64f817-2bd3-4eb2-af2c-de3564d2abfa",
    objective: "Optionally run the real asn.type-change notification and MessageLog acceptance test.",
  },
  {
    id: "6ad0646e-f5f4-4053-8ae9-af6aa5aa2546",
    objective: "Mount the daily geographic-summary command in the production cron.",
  },
  {
    id: "a25b1d52-9bfa-4421-bd56-5fce122a3832",
    objective: "Register the BuildAdmin message-log menu entry before browser acceptance.",
  },
  {
    id: "6d1d65f4-cc69-4104-80cf-fcd114bed81f",
    objective: "Verify the real browser page rendering and combined filters.",
  },
  {
    id: "31d99fc8-55ba-456f-832b-3f51d5ec15cf",
    objective: "Verify failed MessageLog records and error-code filtering with real data.",
  },
  {
    id: "498b5d16-f4d0-445c-b5c7-e079aabecadc",
    objective: "Verify every message-log mutation endpoint remains read-only at runtime.",
  },
  {
    id: "3beceaf7-38f8-462c-8213-5c503a0f5dc9",
    objective: "Verify message-log details and clipboard behavior in a real browser.",
  },
  {
    id: "e0c30236-5aec-4283-9fbb-4f8487abc599",
    objective: "Create the single company-standard v1.1 submission after acceptance.",
  },
].map((entry) => ({
  ...entry,
  delivery: delivery({
    objective: entry.objective,
    deliverySummary: "No real-environment completion evidence has been recorded for this acceptance item.",
    openItems: "Complete the explicit checklist step and record the real result before release.",
    implementationState: "not_applicable",
    verificationState: "human_required",
    releaseState: "pending",
  }),
  references: [
    reference(
      "v1.1 pre-release checklist",
      CHECKLIST,
      "Explicit real-environment step; it is not inferred from completed code cards.",
    ),
  ],
}));

V11_ACCEPTANCE.push({
  id: "90df00fe-a0dd-4f69-b396-a70a7e71f269",
  delivery: delivery({
    objective: "Remove the one-off verify-attr-change-detection command registration after acceptance.",
    deliverySummary: "This cleanup has not started because the prerequisite real-environment acceptance is open.",
    openItems: "Complete the ASN/asn.type acceptance first, then remove and recheck the registration.",
    implementationState: "not_started",
    verificationState: "human_required",
    releaseState: "pending",
  }),
  references: [
    reference(
      "v1.1 pre-release checklist",
      CHECKLIST,
      "The cleanup is explicitly conditional on real-environment validation.",
    ),
  ],
});

const IP_DIFF_ANALYSIS = `${PLANNING_ROOT}/notes/ip-diff-anomaly-monitoring-analysis.md`;
const IP_DIFF_STATE = `${PLANNING_ROOT}/STATE.md`;
const IP_DIFF_CARDS = [
  {
    id: "d5373c41-4883-408f-af7b-ffd394caeeb5",
    delivery: delivery({
      objective: "Classify missing PVE VM configuration errors separately from generic errors.",
      deliverySummary: "Tier 1 code is complete and awaiting production deployment and observation.",
      openItems: "Deploy and confirm the distinct production error group appears with the expected population.",
      implementationState: "code_complete",
      verificationState: "partial",
      releaseState: "pending",
    }),
  },
  {
    id: "e95ae0d5-3a4b-438b-9e68-4152c878044f",
    delivery: delivery({
      objective: "Use Guest Agent network-get-interfaces as a fallback for IP-difference collection.",
      deliverySummary: "Tier 2 fallback code is complete and has local evidence; production behavior is still open.",
      openItems: "Deploy, rescan, and confirm the fallback reduces the relevant collection failures.",
      implementationState: "code_complete",
      verificationState: "partial",
      releaseState: "pending",
    }),
  },
  {
    id: "d56a5791-2448-472a-aac8-72e173c49ffb",
    delivery: delivery({
      objective: "Validate the production effect of Tier 1 and Tier 2 after deployment.",
      deliverySummary: "No production validation result is recorded yet.",
      openItems: "Compare the error groups and collection fallback results after deployment.",
      implementationState: "not_started",
      verificationState: "not_started",
      releaseState: "not_started",
    }),
  },
  {
    id: "819c772e-82de-40a2-9675-5a345a4fa946",
    delivery: delivery({
      objective: "Reconcile the PVE node_id mappings behind missing VM configuration errors.",
      deliverySummary: "No operating reconciliation result is recorded yet.",
      openItems: "Use the PVE reconciliation center to verify mappings and correct or retire stale records.",
      implementationState: "not_started",
      verificationState: "not_started",
      releaseState: "not_started",
    }),
  },
  {
    id: "2bfc52af-3d88-4227-a1c6-c85e84667f04",
    delivery: delivery({
      objective: "Investigate the remaining real IP ledger drift with operations.",
      deliverySummary: "No operations outcome is recorded yet.",
      openItems: "Review only_cloud, only_db, and two-way differences and retain only justified exceptions.",
      implementationState: "not_started",
      verificationState: "not_started",
      releaseState: "not_started",
    }),
  },
].map((entry) => ({
  ...entry,
  references: [
    reference(
      "IP difference monitoring analysis",
      IP_DIFF_ANALYSIS,
      "Production diagnosis, Tier 1/2 design, and the operational follow-up population.",
    ),
    reference(
      "Current project state",
      IP_DIFF_STATE,
      "Tracks the code-complete versus deployment and operations boundary.",
    ),
  ],
}));

const DOCUMENT_UPDATES = [
  {
    id: "9608080d-ff3e-49a2-9bc5-4c37a25e8239",
    key: "notes",
    target: `${PLANNING_ROOT}/notes/feishu-ip-attr-notify-decisions.md`,
    summary: "v1.1 飞书 IP 属性通知的设计决策与边界。",
  },
  {
    id: "00565067-a600-4108-aee1-d61f017bc3e5",
    key: "todos",
    target: `${PLANNING_ROOT}/todos/pending/2026-07-17-confirm-feishu-app-publish-scope.md`,
    summary: "待确认的飞书应用发布与可用范围事项。",
  },
  {
    id: "1e802c0d-7d99-46d8-83ed-c86107b1f345",
    key: "seeds",
    target: `${PLANNING_ROOT}/seeds/mirror-table-single-id-consolidation.md`,
    summary: "镜像表单 ID 收敛的后续设计种子。",
  },
];

const DOCUMENT_DELETES = [
  { id: "6e3f70ba-1dff-4ce7-b870-702836c155fa", key: "config" },
  { id: "d4e6098b-58be-49d7-b2d7-5d59b858bcc3", key: "stack" },
  { id: "a81370d9-c346-44df-a9fe-aafac916d65c", key: "onboarding" },
];

const CARD_MUTATIONS = [
  ...V10_CARD_IDS.map((id) => ({
    id,
    milestoneId: MILESTONES.v10,
    expectedStatus: "done",
    delivery: V10_DELIVERY,
    references: V10_CLOSEOUT_REFERENCES,
  })),
  ...V11_PHASES.flatMap((phase) =>
    phase.cardIds.map((id) => ({
      id,
      milestoneId: MILESTONES.v11,
      expectedStatus: "done",
      delivery: phase.delivery,
      references: phase.references,
    })),
  ),
  ...V11_ACCEPTANCE.map((entry) => ({
    ...entry,
    milestoneId: MILESTONES.v11,
    expectedStatus: "todo",
  })),
  ...IP_DIFF_CARDS.map((entry) => ({
    ...entry,
    milestoneId: MILESTONES.ipDiff,
    expectedStatus:
      entry.id === "d5373c41-4883-408f-af7b-ffd394caeeb5" ||
      entry.id === "e95ae0d5-3a4b-438b-9e68-4152c878044f"
        ? "review"
        : "todo",
  })),
];

async function gatewayCall(method, params) {
  const { stdout } = await execFileAsync(
    "openclaw",
    ["gateway", "call", method, "--params", JSON.stringify(params), "--json"],
    { maxBuffer: 8 * 1024 * 1024 },
  );
  const payload = JSON.parse(stdout);
  if (payload?.ok === false) {
    throw new Error(`${method}: ${payload.error?.message ?? "Gateway request failed."}`);
  }
  return payload;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sameDelivery(card, expected) {
  return [
    "objective",
    "deliverySummary",
    "openItems",
    "implementationState",
    "verificationState",
    "releaseState",
  ].every((key) => card.delivery?.[key] === expected[key]);
}

function hasReference(card, expected) {
  return (card.sourceReferences ?? []).some(
    (item) =>
      item.label === expected.label &&
      item.target === expected.target &&
      (item.note ?? "") === (expected.note ?? ""),
  );
}

async function main() {
  const { project } = await gatewayCall("flowboard.projects.get", { id: PROJECT_ID });
  assert(project.board.id === PROJECT_ID, "ProCloud project ID does not match.");
  assert(project.cards.length === 81, `Expected 81 ProCloud cards, found ${project.cards.length}.`);
  assert(project.milestones.length === 3, `Expected 3 milestones, found ${project.milestones.length}.`);
  assert(
    project.milestones.some((item) => item.id === MILESTONES.v10 && item.state === "completed"),
    "The v1.0 milestone must remain completed.",
  );
  assert(
    project.milestones.some((item) => item.id === MILESTONES.v11 && item.state === "active"),
    "The v1.1 milestone must remain active.",
  );
  assert(
    project.milestones.some((item) => item.id === MILESTONES.ipDiff && item.state === "active"),
    "The IP-difference milestone must remain active.",
  );
  assert(CARD_MUTATIONS.length === 81, `Manifest must cover 81 cards, found ${CARD_MUTATIONS.length}.`);
  assert(
    new Set(CARD_MUTATIONS.map((item) => item.id)).size === CARD_MUTATIONS.length,
    "Card manifest contains duplicate IDs.",
  );

  const cardsById = new Map(project.cards.map((card) => [card.id, card]));
  for (const mutation of CARD_MUTATIONS) {
    const card = cardsById.get(mutation.id);
    assert(card, `Manifest card does not exist: ${mutation.id}`);
    assert(card.milestoneId === mutation.milestoneId, `Card is in an unexpected milestone: ${card.title}`);
    assert(card.status === mutation.expectedStatus, `Card has an unexpected status: ${card.title}`);
  }

  const { documents } = await gatewayCall("flowboard.projects.documents.list", {
    boardId: PROJECT_ID,
    includeHidden: true,
  });
  const documentsById = new Map(documents.map((document) => [document.id, document]));
  for (const update of DOCUMENT_UPDATES) {
    const document = documentsById.get(update.id);
    assert(document?.key === update.key, `Document update target does not match: ${update.key}`);
  }
  for (const removal of DOCUMENT_DELETES) {
    const document = documentsById.get(removal.id);
    assert(document?.key === removal.key, `Document delete target does not match: ${removal.key}`);
  }

  for (const update of DOCUMENT_UPDATES) {
    const document = documentsById.get(update.id);
    if (document?.target === update.target && document.summary === update.summary && document.type === "path") {
      continue;
    }
    await gatewayCall("flowboard.projects.documents.update", {
      id: update.id,
      type: "path",
      target: update.target,
      summary: update.summary,
    });
    written.documentsUpdated.push(update.id);
  }

  for (const removal of DOCUMENT_DELETES) {
    if (!documentsById.has(removal.id)) {
      continue;
    }
    await gatewayCall("flowboard.projects.documents.delete", { id: removal.id });
    written.documentsDeleted.push(removal.id);
  }

  for (const mutation of CARD_MUTATIONS) {
    const card = cardsById.get(mutation.id);
    if (!card) {
      throw new Error(`Card disappeared before update: ${mutation.id}`);
    }
    let current = card;
    if (!sameDelivery(current, mutation.delivery)) {
      const result = await gatewayCall("flowboard.cards.update", {
        id: mutation.id,
        delivery: mutation.delivery,
      });
      current = result.card;
      written.cards.push(mutation.id);
    }
    for (const item of mutation.references) {
      if (hasReference(current, item)) {
        continue;
      }
      const result = await gatewayCall("flowboard.cards.sources.create", {
        id: mutation.id,
        ...item,
      });
      current = result.card;
      written.sourceReferences.push({ cardId: mutation.id, target: item.target });
    }
  }

  console.log(
    JSON.stringify(
      {
        status: "complete",
        cardsWithDelivery: CARD_MUTATIONS.length,
        documentsExpectedAfterCleanup: 19,
        written,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        written,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
