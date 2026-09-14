/* レーザー設定UIの語彙。DOM部品は試作本体の既存トークンを再利用する。 */
(function (root) {
  "use strict";
  const EFFECT_ORDER = ["beam", "fan", "sheet", "tunnel", "liquid", "audience"];
  const SPEEDS = Object.freeze([["slow", "ゆっくり"], ["normal", "普通"], ["fast", "速い"]]);
  root.LASER_EFFECTS_UI = Object.freeze({
    EFFECT_ORDER,
    SPEEDS,
    heading: "レーザー（案）",
    warning: "客席スキャンは案の表示だけです。実施には専門の安全管理が要ります。",
    visibilityHelp: "もやの量ではなく、線の見やすさの目安です",
    unconfigured: "未設定のレーザー",
  });
})(window);
