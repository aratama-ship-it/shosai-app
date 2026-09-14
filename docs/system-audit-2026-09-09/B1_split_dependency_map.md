# B-1 stage-sketch.js 分割候補の依存マップ（2026-09-09 機械抽出）

各候補ブロックが、ブロック外で定義されたトップレベル識別子（IIFE直下の関数・定数）をいくつ参照しているか。参照が少ない順に切り出しやすい。`state`/`els`/`render` 等は「共有の文脈」なので、切り出し先には引数か `window.SHOSAI_STAGE_*` 経由で渡す。

## a 会場描画（合計 920 行）

- 範囲: `drawFrontVenue` 8810〜9356行（547行）／`drawPlanVenue` 9433〜9580行（148行）／`drawStage` 10210〜10434行（225行）
- 外部参照する識別子: 63 個
- 一覧: `H`, `VENUES`, `W`, `anyRoutesShown`, `backAreaRect`, `backdropRect`, `backstageGhosts`, `buildPaintLayer`, `canvas`, `clamp`, `ctx`, `drawArrows`, `drawCustomPlanVenue`, `drawHeldFrontPiece`, `drawLightIntentOverlay`, `drawNotes`, `drawPlanPiece`, `drawRoutes`, `drawSceneCaption`, `drawScreenTexts`, `drawSeatMap`, `drawSelection`, `drawStageAskOverlay`, `drawStagePiece`, `effectivelyPlacedPiece`, `featureOn`, `finite`, `floorPoint`, `isFlown`, `label`, `layout`, `lightIntentOverlayOn`, `normalizePiece`, `onStageArea`, `paintCanvas`, `paintPhoto`, `pieceLabel`, `pieceScale`, `pieceTopLocal`, `pieceU`, `pieceV`, `pitchStyle`, `place`, `placePiece`, `planBounds`, `presenting`, `refreshBases`, `restore`, `rgba`, `ringEllipse`, `ringLabel`, `sc`, `sceneAnim`, `selectedId`, `selectionBounds`, `seriStraddlers`, `sightLabel`, `stagePoint`, `state`, `supportFootprint`, `tx`, `venue`, `zoomOf`

## b スマホ/iPad作業面（合計 464 行）

- 範囲: `initPhoneViewerWorkspace` 11229〜11552行（324行）／`initTabletPwaWorkspace` 11746〜11885行（140行）
- 外部参照する識別子: 46 個
- 一覧: `TABLET_MENU_GROUPS`, `applyCanvasSize`, `applyLayout`, `applyPhoneViewerLang`, `canvas`, `closeNoteEditor`, `closePhoneSceneList`, `closeTabletDrawer`, `els`, `enforcePhoneViews`, `enforceTabletSingleView`, `exportProject`, `history`, `importProject`, `isEn`, `label`, `makePhoneButton`, `makePhoneIconButton`, `makeTabletButton`, `openPhoneSceneList`, `openReachTable`, `openSampleShow`, `openSeamGardenSampleShow`, `openTabletGroup`, `persistSoon`, `phoneOrientation`, `phoneUi`, `phoneViewerActive`, `prepareTabletPanelPages`, `prepareTabletSpecialPage`, `render`, `renderVenueControls`, `sc`, `setLang`, `showTabletDrawerPage`, `state`, `stepScene`, `syncPhoneViewer`, `syncSceneDesc`, `syncTabletWorkspace`, `syncViewSwitch`, `tabletOrientation`, `tabletPwaActive`, `tabletUi`, `tool`, `tx`

## c 印刷・ピッチ書き出し（合計 287 行）

- 範囲: `openPrintPage` 16439〜16607行（169行）／`runPitchExport` 22213〜22330行（118行）
- 外部参照する識別子: 50 個
- 一覧: `H`, `PITCH_SIZE_SCALE`, `PITCH_STYLE_PARAMS`, `W`, `announce`, `buildPitchPrompt`, `canvas`, `closeExport`, `dataUrlToBytes`, `downloadBlob`, `drawStage`, `els`, `ensurePitchLanguages`, `escapeHtml`, `exportFailureNotice`, `featureOn`, `finishPitchCanvas`, `finite`, `isEn`, `label`, `lang`, `makePitchCanvas`, `makeZipBlob`, `onStageArea`, `pieceLabel`, `pitchStyle`, `prefs`, `promptI18n`, `propHolderName`, `propMovesBetweenScenes`, `propPlotState`, `propPlotStateChanged`, `propSceneSummary`, `registeredProps`, `render`, `safeName`, `savePrefs`, `sc`, `selectedId`, `selectedPitchLangs`, `selectedPitchSize`, `selectedPitchStyle`, `stampNow`, `state`, `stopSceneAnim`, `twinOf`, `venue`, `venueSize`, `zoomOf`, `zoomState`

## d 体モデル（合計 443 行）

- 範囲: `pieceParts` 6920〜7190行（271行）／`buildRig` 6399〜6510行（112行）／`drawPerformer` 6757〜6789行（33行）／`poseExtent` 2128〜2154行（27行）
- 外部参照する識別子: 23 個
- 一覧: `CHAIR_D`, `CHAIR_W`, `H`, `NECK_RINGS`, `TORSO_RINGS`, `clamp`, `cross3`, `drawSolid`, `finite`, `mountKindOf`, `norm3`, `paintBody`, `performerRig`, `pieceDims`, `pieceSet`, `poseById`, `resolveLook`, `restore`, `rgba`, `scaledPropShape`, `stageModel`, `state`, `torsoOutline`

