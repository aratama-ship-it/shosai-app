/* 舞台スケッチへ同梱する固定 SceneStudy。
 *
 * 正本:
 *   ../direction-knowledge/examples/time_lab_future_scene_study.json
 *
 * 舞台スケッチは単独で動く道具なので、実行時に「制作の書斎」や知識ベースを読まない。
 * ここには、上記JSONから画面と8場面の初期化に必要な項目だけを写している。
 * 事実、制作上の解釈、未決定事項を混ぜないこと。
 */
(function () {
  "use strict";

  window.SHOSAI_SCENE_STUDIES = [
    {
      schemaVersion: "0.1",
      id: "scene_study_time_lab_future_reversal_v1",
      title: "時をほどく研究室：未来サンプルから時間の破綻へ",
      status: "fixed_data_rehearsal_proposal",
      sourceJson: "../direction-knowledge/examples/time_lab_future_scene_study.json",
      fixedInput: "研究者が未来を呼び出したつもりだったが、ディアボロと自分の身体が装置の命令へ従っているように見え始める。大きな装置は使わず、1人で成立させたい。",
      scope: {
        targetDurationSeconds: 75,
        performers: 1,
        objects: ["机", "ノート", "四拍ループ音", "ディアボロ", "小型ライトは任意"],
      },
      factsFromExistingPlan: [
        "未来サンプルではディアボロの回転が時間装置になる",
        "研究者は制御者から制御される側へ反転する",
        "大きな装置は使わない",
        "時間の破綻では過去・現在・未来が混線し、技術的クライマックスへ入る",
      ],
      creativeInterpretation: {
        objective: "未来の時間を四拍の実験手順へ固定し、観客に再現可能だと証明する",
        obstacle: "身体が命令より一拍早く動き、ディアボロを止めても四拍の運動だけが残る",
        conflict: "実験を中止して記録者に戻るか、制御を失ったまま身体で実験を続けるか",
        turningChoice: "研究者はノートを閉じるが退場せず、四拍目に自分から一歩踏み込み、時間の破綻へ入る",
      },
      selectedDirection: {
        id: "A_sound_loop_low_tech",
        label: "音と身体の一拍ずれ",
        reason: "ディアボロ、四拍ループ、身体の向きだけで成立し、映像遅延や大規模機構なしに制御反転を検証できる。第一稽古では最も可逆的。",
        notFinalArtisticDecision: true,
      },
      cardTitles: {
        dk_scene_objective_obstacle_conflict: "シーン間を目的・障害・葛藤で細分化する",
        dk_loop_with_one_mutation: "ループは一箇所だけ変えて進行させる",
        dk_acrobatics_as_metaphor: "技の物理条件を感情の条件へ翻訳する",
        dk_live_music_elastic_tempo: "生演奏を演者の時間へ追従する系として使う",
        dk_failure_recovery_stays_in_relationship: "失敗後は技でなく関係から再開する",
        dk_silence_before_peak: "見せ場の直前だけ情報を引く",
        dk_c3_projection_rule_before_content: "映像内容より先に反応規則を決める",
        dk_c3_transforming_floor_changes_rule: "舞台面の変形で世界の規則を変える",
        dk_final_image_transforms_origin: "終幕の像で冒頭の意味を変える",
        dk_hazardous_effects_ai_boundary: "危険を伴う演出は意図と実施仕様を分離する",
      },
      beats: [
        {
          id: "4-1",
          durationSeconds: 8,
          label: "校正",
          action: "ノートへ四つの目盛りを書き、四拍ループを開始。ディアボロを安定回転させる。",
          visibleRule: "拍1で見る、拍2で加速、拍3で姿勢を固定、拍4で記録する。",
          change: "研究者が完全に制御している。",
          appliedCardIds: ["dk_scene_objective_obstacle_conflict", "dk_acrobatics_as_metaphor"],
          placement: { performer: [0.46, 0.58, 0], table: [0.24, 0.33], note: [0.28, 0.34], diabolo: [0.57, 0.55] },
        },
        {
          id: "4-2",
          durationSeconds: 10,
          label: "規則の反復",
          action: "同じ四拍をもう一度、今度は観客にも順序が読める大きさで行う。",
          visibleRule: "第一ループと同じ。",
          change: "観客が次を予測できる。",
          appliedCardIds: ["dk_loop_with_one_mutation"],
          placement: { performer: [0.48, 0.57, 0], table: [0.24, 0.33], note: [0.28, 0.34], diabolo: [0.59, 0.53] },
        },
        {
          id: "4-3",
          durationSeconds: 9,
          label: "一拍早い身体",
          action: "三回目、身体だけが拍3の姿勢を拍2で先取りする。研究者は遅れて気づき、ノートへ訂正記号を書く。",
          visibleRule: "音は正常、身体だけ一拍早い。",
          change: "障害が外部装置でなく自分の身体へ移る。",
          appliedCardIds: ["dk_loop_with_one_mutation", "dk_live_music_elastic_tempo"],
          placement: { performer: [0.54, 0.55, 30], table: [0.24, 0.33], note: [0.28, 0.34], diabolo: [0.60, 0.52] },
        },
        {
          id: "4-4",
          durationSeconds: 10,
          label: "停止命令の不成立",
          action: "ディアボロを通常の安全手順で止める。しかし右肩、視線、足だけが四拍を続ける。",
          visibleRule: "物は止まったが身体のループは止まらない。",
          change: "研究者の目的が証明から中止へ変わる。",
          appliedCardIds: ["dk_acrobatics_as_metaphor", "dk_c3_transforming_floor_changes_rule"],
          placement: { performer: [0.60, 0.61, 45], table: [0.24, 0.33], note: [0.28, 0.34], diabolo: [0.52, 0.62] },
        },
        {
          id: "4-5",
          durationSeconds: 10,
          label: "回復の分岐",
          action: "ノートを開いて記録者へ戻ろうとする。身体が拍4でノートを閉じる。再開、別技、終了の安全な三分岐を稽古時に用意する。",
          visibleRule: "ノートを閉じる動作だけが装置命令に従う。",
          change: "葛藤が『止められるか』から『続けるか』へ変わる。",
          appliedCardIds: ["dk_failure_recovery_stays_in_relationship", "dk_scene_objective_obstacle_conflict"],
          placement: { performer: [0.36, 0.44, 330], table: [0.24, 0.33], note: [0.28, 0.34], diabolo: [0.52, 0.62] },
        },
        {
          id: "4-6",
          durationSeconds: 10,
          label: "身体が装置になる",
          action: "ディアボロを再び回すのではなく、腕と視線が回転面を描き、四拍ごとに正面が90度変わる。",
          visibleRule: "装置の命令は音から身体の向きへ移った。",
          change: "研究者が制御対象であることが明瞭になる。",
          appliedCardIds: ["dk_c3_transforming_floor_changes_rule", "dk_acrobatics_as_metaphor"],
          placement: { performer: [0.52, 0.50, 90], table: [0.24, 0.33], note: [0.28, 0.34], diabolo: [0.54, 0.64] },
        },
        {
          id: "4-7",
          durationSeconds: 6,
          label: "無音の選択",
          action: "伴奏を止める。ディアボロの回転音または呼吸だけを残す。研究者はノート、出口、ディアボロを見る。",
          visibleRule: "装置命令がなくても身体は一拍だけ続く。",
          change: "自動運動から本人の選択へ戻る余白ができる。",
          appliedCardIds: ["dk_silence_before_peak"],
          placement: { performer: [0.44, 0.59, 315], table: [0.24, 0.33], note: [0.28, 0.34], diabolo: [0.57, 0.60] },
        },
        {
          id: "4-8",
          durationSeconds: 12,
          label: "自分から四拍目へ入る",
          action: "ノートを閉じて机へ置く。四拍目を待たず、自分から一歩踏み込み、過去・現在・未来の道具が混線するScene 5を開始する。",
          visibleRule: "同じ四拍だが、初めて研究者が規則より先に選ぶ。",
          change: "制御の回復ではなく、制御できない時間を受け入れる。",
          appliedCardIds: ["dk_loop_with_one_mutation", "dk_final_image_transforms_origin"],
          placement: { performer: [0.68, 0.47, 90], table: [0.24, 0.33], note: [0.28, 0.34], diabolo: [0.55, 0.61] },
        },
      ],
      safetyBoundaries: [
        "ディアボロの技、器具、距離、ウォームアップ、停止判断は演者・コーチ・会場が決める。",
        "AIは高難度化、照明・電源仕様、吊り物、レーザー、煙霧を自動追加しない。",
        "これは構図の初期仮説であり、舞台機構・リギング・安全距離・施工寸法を決める図面ではない。",
      ],
      unknownsForUserReview: [
        "四拍ループを機械的で冷たい音にするか、人間の呼吸に近い音にするか。",
        "研究者がScene 5へ入る選択を、好奇心・諦め・解放のどれとして見せたいか。",
        "終幕までノートを閉じたままにするか、Scene 5中に一度だけ開くか。",
        "観客参加案を本編へ残すか、終幕専用として保留するか。",
      ],
    },
  ];
})();
