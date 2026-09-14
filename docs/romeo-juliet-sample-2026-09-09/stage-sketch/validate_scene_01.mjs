import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateDocument } from "../../../mcp-server/src/stage-model.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, "scene-01-stage-sketch-v3.json");
const document = JSON.parse(fs.readFileSync(file, "utf8"));
const result = validateDocument(document);
const project = document.project;
const cueScenes = project.scenes.filter((scene) => scene.kind === "scene");
const sectionScenes = project.scenes.filter((scene) => scene.kind === "section");

if (!result.valid) throw new Error(result.errors.join("\n"));
if (document.version !== 3) throw new Error("Stage Sketch version must be 3.");
if (project.cast.length !== 10) throw new Error("Cast count must be 10.");
if (cueScenes.length !== 4 || sectionScenes.length !== 1) throw new Error("Expected one section and four cue scenes.");
if (cueScenes.some((scene) => scene.pieces.length !== 10)) throw new Error("Every cue must place all 10 performers.");
if (cueScenes.some((scene) => scene.pieces.some((piece) => piece.type !== "performer"))) throw new Error("Scene 1 draft must contain performers only.");
if (cueScenes.some((scene) => scene.pieces.some((piece) => piece.u < 0 || piece.u > 1 || piece.v < 0 || piece.v > 1))) throw new Error("All positions must be normalized.");
if (cueScenes.reduce((sum, scene) => sum + scene.rehearsal.holdDurationSeconds, 0) !== 180) throw new Error("Cue holds must total 180 seconds.");

const finalCue = cueScenes.at(-1);
if (finalCue.lightingIntent.transition.triggerType !== "action"
  || finalCue.lightingIntent.transition.change !== "blackout"
  || finalCue.lightingIntent.transition.tempo !== "instant") {
  throw new Error("Final cue must be an action-triggered instant blackout.");
}

const centerNames = new Set(["ベンヴォーリオ", "ティボルト"]);
for (const scene of cueScenes) {
  const center = scene.pieces.filter((piece) => centerNames.has(piece.name));
  if (center.length !== 2 || center.some((piece) => Math.abs(piece.v - 0.5) > 0.001)) {
    throw new Error(`${scene.title}: center pair placement is invalid.`);
  }
}

console.log(JSON.stringify({
  valid: true,
  version: document.version,
  projectId: project.id,
  castCount: project.cast.length,
  sectionCount: sectionScenes.length,
  cueCount: cueScenes.length,
  cueHoldTotalSeconds: 180,
  routeWarning: result.warnings,
  importStatus: "generated_validated_not_imported",
}, null, 2));
