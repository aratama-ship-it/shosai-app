import { z } from "zod";
import { POSES, SET_KINDS, VENUES, VENUE_SIZES } from "./stage-model.js";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
  .describe("#RRGGBB形式の色。省略時は舞台スケッチの既定色");

const route = z.object({
  u: z.number().min(0).max(1).describe("動線の終点。0=画像左、1=画像右"),
  v: z.number().min(0).max(1).describe("動線の終点。0=舞台奥、1=舞台前"),
  bu: z.number().min(-0.2).max(1.2).optional().describe("曲線制御点の左右"),
  bv: z.number().min(-0.2).max(1.2).optional().describe("曲線制御点の奥行"),
}).optional();

export const projectRehearsalSchema = z.object({
  version: z.literal(1).optional(),
  primaryMode: z.literal("ordered").optional(),
  soundtrack: z.enum(["bundled-demo"]).nullable().optional(),
}).optional();

export const sceneRehearsalSchema = z.object({
  holdDurationSeconds: z.number().min(0).max(86400).nullable().optional(),
  transitionToNextSeconds: z.number().min(0).max(86400).nullable().optional(),
}).optional();

export const placementSchema = z.object({
  assetType: z.enum(["performer", "set"])
    .describe("演者はperformer、道具・装置・照明はset"),
  assetName: z.string().min(1).max(24)
    .describe("同じ名前と種類はショー内で同じ演者・セットとして再利用する"),
  kind: z.enum(SET_KINDS).optional()
    .describe("assetType=setの形。照明はlight"),
  u: z.number().min(0).max(1).describe("0=画像左、1=画像右。客席から見た左右"),
  v: z.number().min(0).max(1).describe("0=舞台奥、1=舞台前"),
  size: z.number().min(55).max(180).optional(),
  color,
  facing: z.number().min(0).max(359).optional()
    .describe("演者の向き。0=客席、90=画像右、180=舞台奥"),
  pose: z.enum(POSES).optional().describe("演者の姿勢"),
  heightCm: z.number().min(120).max(210).optional(),
  assetNote: z.string().max(200).optional(),
  route,
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
  rehearsal: sceneRehearsalSchema,
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
