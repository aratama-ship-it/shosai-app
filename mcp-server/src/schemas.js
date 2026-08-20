import { z } from "zod";
import { POSES, SET_KINDS, VENUES, VENUE_SIZES } from "./stage-model.js";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
  .describe("#RRGGBB形式の色。省略時は舞台スケッチの既定色");

export const routeSchema = z.object({
  u: z.number().min(0).max(1).describe("動線の終点。0=画像左、1=画像右"),
  v: z.number().min(0).max(1).describe("動線の終点。0=舞台奥、1=舞台前"),
  bu: z.number().min(-0.2).max(1.2).optional().describe("曲線制御点の左右"),
  bv: z.number().min(-0.2).max(1.2).optional().describe("曲線制御点の奥行"),
});

export const projectRehearsalSchema = z.object({
  version: z.literal(1).optional(),
  primaryMode: z.literal("ordered").optional(),
  soundtrack: z.enum(["bundled-demo"]).nullable().optional(),
}).optional();

export const sceneRehearsalSchema = z.object({
  holdDurationSeconds: z.number().min(0).max(86400).nullable().optional(),
  transitionToNextSeconds: z.number().min(0).max(86400).nullable().optional(),
}).optional();

export const sceneBeatSchema = z.object({
  role: z.string().max(160).optional()
    .describe("構成テンプレート由来の短い役割。具体的な技や装置は書かない"),
  energy: z.number().int().min(1).max(5).nullable().optional()
    .describe("1=静止・余白、5=最大密度／最大緊張。未設定はnull"),
}).optional();

const lightingLayerSchema = z.object({
  intent: z.enum([
    "unspecified", "reveal", "soften", "conceal", "silhouette", "separate", "transform",
  ]).optional(),
  note: z.string().max(160).optional(),
});

export const lightingIntentSchema = z.object({
  version: z.literal(1).optional(),
  objective: z.string().max(160).optional()
    .describe("機材名ではなく、光が場面に起こす演出上の変化"),
  audienceFocus: z.string().max(160).optional()
    .describe("観客に見せたい対象と、まだ見せない対象"),
  layers: z.object({
    performer: lightingLayerSchema.optional(),
    background: lightingLayerSchema.optional(),
    space: lightingLayerSchema.optional(),
  }).optional(),
  transition: z.object({
    triggerType: z.enum([
      "unknown", "scene-start", "action", "line", "music", "time", "manual",
    ]).optional(),
    triggerNote: z.string().max(160).optional(),
    change: z.enum([
      "unknown", "hold", "fade-in", "fade-out", "snap", "crossfade", "blackout",
    ]).optional(),
    tempo: z.enum([
      "unspecified", "instant", "quick", "breathe", "slow", "hold",
    ]).optional(),
  }).optional(),
  mood: z.string().max(80).optional(),
  referenceNote: z.string().max(200).optional(),
  implementationNote: z.string().max(300).optional()
    .describe("未承認の具体化候補。技術指示や安全承認として扱わない"),
  safetyStatus: z.literal("not-assessed").optional(),
  sourceRefs: z.array(z.object({
    kind: z.enum(["book", "research", "user"]),
    label: z.string().min(1).max(120),
    locator: z.string().max(200).optional(),
  })).max(8).optional(),
});

export const placementSchema = z.object({
  assetType: z.enum(["performer", "set"])
    .describe("演者はperformer、道具・装置・照明はset"),
  assetName: z.string().min(1).max(24).optional()
    .describe("省略時は手動追加と同じ自動名。同じ名前と種類はショー内で同じ演者・セットとして再利用する"),
  language: z.enum(["ja", "en"]).optional()
    .describe("自動名の言語。省略時ja。enではPerformer 1のように語と数字の間を空ける"),
  kind: z.enum(SET_KINDS).optional()
    .describe("assetType=setの形。照明はlight。省略時block"),
  u: z.number().min(0).max(1).optional()
    .describe("0=画像左、1=画像右。省略時は手動追加と同じ並び位置"),
  v: z.number().min(0).max(1).optional()
    .describe("0=舞台奥、1=舞台前。省略時は手動追加と同じ並び位置"),
  size: z.number().min(55).max(180).optional().describe("省略時100"),
  color,
  facing: z.number().min(0).max(359).optional()
    .describe("演者の向き。0=客席、90=画像右、180=舞台奥。省略時0"),
  pose: z.enum(POSES).optional().describe("演者の姿勢。省略時stand"),
  heightCm: z.number().min(120).max(210).optional().describe("演者の身長。省略時165"),
  assetNote: z.string().max(200).optional(),
  route: routeSchema.optional(),
  dims: z.record(z.string(), z.number().min(0).max(60)).optional()
    .describe("セットの概略寸法m。種別に必要なキーだけを指定"),
  flown: z.boolean().optional().describe("吊物候補。安全の承認ではない"),
  wires: z.union([z.literal(1), z.literal(2)]).optional(),
  framed: z.boolean().optional(),
  lightKind: z.enum(["hang", "ss", "front", "floor"]).optional(),
});

export const sceneSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/).optional(),
  kind: z.enum(["scene", "section"]).optional(),
  depth: z.number().int().min(0).max(4).optional(),
  title: z.string().min(1).max(80),
  studyBeatId: z.string().min(1).max(64).optional(),
  note: z.string().max(2000).optional()
    .describe("目的・障害・変化・観客へ見せる情報を簡潔に記録"),
  background: color,
  beat: sceneBeatSchema,
  rehearsal: sceneRehearsalSchema,
  lightingIntent: lightingIntentSchema.nullable().optional(),
  placements: z.array(placementSchema).max(80).optional(),
});

export const createProjectSchema = {
  title: z.string().min(1).max(60),
  projectId: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/).optional(),
  versionLabel: z.string().min(1).max(32).optional(),
  branchReason: z.string().max(300).optional(),
  venue: z.enum(VENUES).optional(),
  venueSize: z.enum(VENUE_SIZES).optional(),
  rehearsal: projectRehearsalSchema,
  sourcePrompt: z.string().max(4000).optional()
    .describe("元の依頼。未発表内容を外部へ送るかはAIクライアント側で判断する"),
  scenes: z.array(sceneSchema).max(60).optional(),
};

export const projectIdSchema = {
  projectId: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/),
};

export const mutationBaseSchema = {
  ...projectIdSchema,
  expectedRevision: z.number().int().min(1)
    .describe("stage_sketch_read_projectで得た現在revision。古い値なら更新を拒否する"),
};

const assetReferenceSchema = z.object({
  assetType: z.enum(["performer", "set"]),
  assetName: z.string().min(1).max(24).optional()
    .describe("assetIdを使わない場合に指定する演者・セット名"),
  assetId: z.string().min(1).max(96).optional()
    .describe("assetNameを使わない場合に指定する演者・セットID"),
}).refine(
  (value) => Boolean(value.assetName) !== Boolean(value.assetId),
  { message: "assetNameまたはassetIdのどちらか一方を指定してください。" },
);

const placementTargetSchema = z.object({
  assetType: z.enum(["performer", "set"]),
  assetName: z.string().min(1).max(24).optional(),
  assetId: z.string().min(1).max(96).optional(),
  occurrence: z.number().int().min(1).optional()
    .describe("同じ資産が一場面に複数ある場合の1始まりの出現番号。省略時は全件"),
}).refine(
  (value) => Boolean(value.assetName) !== Boolean(value.assetId),
  { message: "assetNameまたはassetIdのどちらか一方を指定してください。" },
);

const replaceSceneAssetSchema = z.object({
  op: z.literal("replace_scene_asset"),
  sceneId: z.string(),
  from: assetReferenceSchema,
  to: assetReferenceSchema,
  preservePlacement: z.boolean().optional().default(true),
});

const replaceAcrossScenesSchema = z.object({
  op: z.literal("replace_asset_across_scenes"),
  sceneIds: z.union([
    z.literal("all"),
    z.array(z.string()).min(1).max(60),
  ]),
  from: assetReferenceSchema,
  to: assetReferenceSchema,
  preservePlacement: z.boolean().optional().default(true),
});

const addPlacementSchema = z.object({
  op: z.literal("add_placement"),
  sceneId: z.string(),
  placement: placementSchema,
});

const removePlacementSchema = z.object({
  op: z.literal("remove_placement"),
  sceneId: z.string(),
  target: placementTargetSchema,
});

const updatePlacementSchema = z.object({
  op: z.literal("update_placement"),
  sceneId: z.string(),
  target: placementTargetSchema,
  changes: z.object({
    u: z.number().min(0).max(1).optional(),
    v: z.number().min(0).max(1).optional(),
    size: z.number().min(55).max(180).optional(),
    color,
    facing: z.number().min(0).max(359).optional(),
    pose: z.enum(POSES).optional(),
    heightCm: z.number().min(120).max(210).optional(),
    assetNote: z.string().max(200).optional(),
    route: routeSchema.optional(),
  }),
});

const updateSceneFieldsSchema = z.object({
  op: z.literal("update_scene_fields"),
  sceneId: z.string(),
  title: z.string().min(1).max(80).optional(),
  note: z.string().max(2000).optional(),
  background: color,
  beat: sceneBeatSchema,
  rehearsal: sceneRehearsalSchema,
  lightingIntent: lightingIntentSchema.nullable().optional(),
});

const addSceneSchema = z.object({
  op: z.literal("add_scene"),
  afterSceneId: z.string().optional(),
  scene: sceneSchema,
});

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeEditOperationInput(input, context) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const operation = { ...input };
  const hasOp = hasOwn(operation, "op");
  const hasType = hasOwn(operation, "type");

  if (hasOp && hasType && operation.op !== operation.type) {
    context.addIssue({
      code: "custom",
      message:
        `operationsのopとtypeが食い違っています（op=${String(operation.op)}, ` +
        `type=${String(operation.type)}）。操作の識別子はopにする必要があります。`,
    });
  } else if (!hasOp && hasType) {
    operation.op = operation.type;
  }

  if (!hasOwn(operation, "sceneId") && hasOwn(operation, "scene_id")) {
    operation.sceneId = operation.scene_id;
  }
  return operation;
}

const editOperationDiscriminatedUnion = z.discriminatedUnion("op", [
  replaceSceneAssetSchema,
  replaceAcrossScenesSchema,
  addPlacementSchema,
  removePlacementSchema,
  updatePlacementSchema,
  updateSceneFieldsSchema,
  addSceneSchema,
]);

export const editOperationSchema = z.preprocess(
  normalizeEditOperationInput,
  editOperationDiscriminatedUnion,
);

export const planEditSchema = {
  ...mutationBaseSchema,
  request: z.string().min(1).max(500),
  operations: z.array(editOperationSchema).min(1).max(40)
    .describe("編集操作。情報不足は配置の既定値で埋めるため、必ず1件以上指定する"),
  resolutions: z.array(z.object({
    assetType: z.enum(["performer", "set"]),
    assetName: z.string().min(1).max(24),
    assetId: z.string().min(1).max(96),
  })).max(20).optional()
    .describe("needs_clarificationで返した同名候補の選択回答。候補外のassetIdは採用しない"),
  questions: z.array(z.string().min(1).max(800)).max(10).optional()
    .describe("既存の同名候補が複数あり、取り違えると既存配置を壊す場合だけ使う確認質問"),
};

export const applyEditPlanSchema = {
  ...mutationBaseSchema,
  planId: z.string().regex(/^plan-[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/),
  confirmed: z.boolean().optional()
    .describe("本人が差分を確認した場合だけtrue。省略・falseでは適用しない"),
};
