'use strict';

/*
 * Stage Sketch v4 export + companion workflow + annotation layer の読み取り専用アダプタ。
 * 製品データを書き換えず、annotationRevision も project の revision とは分離する。
 */
(function registerBridge(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.STAGE_SKETCH_WORKFLOW_ANNOTATION_BRIDGE = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, () => {
  const CHIEF_DEPARTMENTS = new Set(['音響', '照明']);

  const asArray = (value) => Array.isArray(value) ? value : [];
  const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
  const projectOf = (stageExport) => stageExport && stageExport.project && typeof stageExport.project === 'object'
    ? stageExport.project : null;
  const participantsOf = (annotations) => asArray(annotations && annotations.participants);
  const participantById = (annotations, id) => participantsOf(annotations).find((item) => item.id === id) || null;
  const sourceKey = (participant) => ({ 音響: 'sound', 照明: 'lighting', 制作: 'production', 演者: 'performers' }[participant && participant.department] || 'production');
  const sourceLabel = (participant) => participant ? participant.department : '不明な部門';
  const visibilityLabel = (value) => ({ private: '自分だけ', department: '部門内', team: '制作チーム' }[value] || '不明');

  function referencedSceneIds(workflow, annotations) {
    const ids = new Set();
    asArray(workflow && workflow.script && workflow.script.anchors).forEach((anchor) => {
      if (anchor && anchor.target && anchor.target.kind === 'scene' && hasText(anchor.target.id)) ids.add(anchor.target.id);
    });
    asArray(workflow && workflow.coordination && workflow.coordination.activities).forEach((activity) => {
      asArray(activity && activity.sceneRefs).forEach((sceneId) => { if (hasText(sceneId)) ids.add(sceneId); });
    });
    asArray(annotations && annotations.sceneMarkups).forEach((markup) => {
      if (markup && hasText(markup.sceneId)) ids.add(markup.sceneId);
    });
    return [...ids];
  }

  function validateBinding({ stageExport, workflow, annotations, expectedSnapshotHash }) {
    const errors = [];
    const project = projectOf(stageExport);
    if (!stageExport || stageExport.kind !== 'shosai-stage-sketch') errors.push('基礎ファイルのkindがStage Sketch書き出しではありません。');
    if (!stageExport || stageExport.version !== 4) errors.push('基礎ファイルは現在確認したv4書き出しとして扱えません。');
    if (!project || !hasText(project.id)) errors.push('基礎projectにproject.idがありません。');
    if (!Array.isArray(project && project.scenes)) errors.push('基礎projectにscenes配列がありません。');
    const binding = workflow && workflow.projectBinding;
    if (!binding || !hasText(binding.projectId)) errors.push('workflowにprojectBinding.projectIdがありません。');
    if (binding && binding.baseExportKind !== 'shosai-stage-sketch') errors.push('workflowの基礎kindが一致しません。');
    if (binding && binding.baseExportVersion !== 4) errors.push('workflowの基礎versionがv4ではありません。');
    if (binding && !/^sha256:[0-9a-f]{64}$/.test(binding.baseSnapshotHash || '')) errors.push('workflowのbaseSnapshotHashがSHA-256形式ではありません。');
    if (expectedSnapshotHash && binding && binding.baseSnapshotHash !== expectedSnapshotHash) errors.push('workflowのbaseSnapshotHashが基礎projectと一致しません。');
    if (project && binding && binding.projectId !== project.id) errors.push('workflowのprojectIdが基礎projectと一致しません。');
    if (!annotations || annotations.projectId !== (project && project.id)) errors.push('注釈レイヤーのprojectIdが基礎projectと一致しません。');

    const sceneIds = new Set(asArray(project && project.scenes).map((scene) => scene && scene.id).filter(hasText));
    referencedSceneIds(workflow, annotations).forEach((sceneId) => {
      if (!sceneIds.has(sceneId)) errors.push(`参照先のsceneIdが基礎projectにありません: ${sceneId}`);
    });

    const cueIds = new Set(asArray(workflow && workflow.script && workflow.script.cues).map((cue) => cue && cue.id).filter(hasText));
    asArray(annotations && annotations.workflowNotes).forEach((note) => {
      if (!cueIds.has(note && note.cueId)) errors.push(`QメモのcueIdがworkflowにありません: ${note && note.cueId || '未指定'}`);
    });
    return { ok: errors.length === 0, errors, project, sceneIds: [...sceneIds], cueIds: [...cueIds] };
  }

  function canView(annotation, annotations, viewerId) {
    const viewer = participantById(annotations, viewerId);
    const author = participantById(annotations, annotation && annotation.authorParticipantId);
    if (!viewer || !author || !annotation) return false;
    if (annotation.visibility === 'team') return true;
    if (annotation.authorParticipantId === viewerId) return true;
    if (annotation.visibility !== 'department') return false;
    return author.department === viewer.department || Boolean(viewer.chief && CHIEF_DEPARTMENTS.has(author.department));
  }

  function visibleAnnotations(annotations, viewerId) {
    return [...asArray(annotations && annotations.sceneMarkups), ...asArray(annotations && annotations.workflowNotes)]
      .filter((annotation) => canView(annotation, annotations, viewerId));
  }

  function labelForPiece(piece, project) {
    const cast = asArray(project && project.cast).find((item) => item.id === piece.castId);
    const set = asArray(project && project.sets).find((item) => item.id === piece.setId);
    return (cast && cast.name) || (set && set.name) || piece.name || '名称未設定';
  }

  function cueModel(workflow, cueId) {
    const cues = asArray(workflow && workflow.script && workflow.script.cues);
    return cues.find((cue) => cue.id === cueId) || cues[0] || null;
  }

  function buildReadModel({ stageExport, workflow, annotations, expectedSnapshotHash, viewerId, sceneId, cueId }) {
    const binding = validateBinding({ stageExport, workflow, annotations, expectedSnapshotHash });
    const project = binding.project;
    const selectedSceneId = sceneId || (project && project.activeSceneId);
    const scene = asArray(project && project.scenes).find((item) => item.id === selectedSceneId) || null;
    const cue = cueModel(workflow, cueId);
    const visible = visibleAnnotations(annotations, viewerId);
    const sceneMarkups = visible.filter((item) => item.sceneId === selectedSceneId);
    const workflowNotes = visible.filter((item) => item.cueId === (cue && cue.id));
    const activities = asArray(workflow && workflow.coordination && workflow.coordination.activities)
      .filter((activity) => asArray(activity.sceneRefs).includes(selectedSceneId));
    const cueActivities = activities.filter((activity) => {
      const refs = asArray(workflow && workflow.script && workflow.script.anchors)
        .filter((anchor) => anchor && anchor.target && anchor.target.id === (cue && cue.id))
        .flatMap((anchor) => asArray(anchor.activityRefs));
      return refs.includes(activity.id);
    });
    return {
      binding, project, scene, cue, activities, cueActivities, sceneMarkups, workflowNotes,
      viewer: participantById(annotations, viewerId),
      participants: participantsOf(annotations),
    };
  }

  return Object.freeze({
    validateBinding, visibleAnnotations, canView, buildReadModel,
    participantById, sourceKey, sourceLabel, visibilityLabel, labelForPiece, referencedSceneIds,
  });
});
