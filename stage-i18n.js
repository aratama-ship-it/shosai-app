/* 舞台スケッチの英語表示
 *
 * 二本立てで持つ。
 *   TEXT … 画面に固定で置いてある文言。日本語そのものを鍵にして引く。
 *           HTMLへ data-i18n を撒く代わりに、切り替えのときだけ文字を差し替える。
 *           静的な文言は書き換わらないので、この方式で足りる。
 *   MAPS … 中で組み立てる名前（姿勢・道具・劇場・席など）。こちらは id を鍵にする。
 *           作るたびに言語を見て名前を選ぶので、一覧を組み直せば追随する。
 *
 * 訳語の方針: サーカス／劇場の現場で通じる語を採る。
 *   吊物=flown、転がし=footlight、SS=side light、前明かり=front light、
 *   間口=proscenium width、袖=wing、ツラ=downstage edge。
 */
(function () {
  "use strict";

  const TEXT = {
    /* ---- 見出し・パネル ---- */
    "舞台スケッチ": "Stage Sketch",
    "ショー": "Show",
    "劇場を選ぶ": "Venue",
    "出るもの": "Cast & set",
    "装置の型": "Set presets",
    "照明": "Lights",
    "背景": "Backdrop",
    "場面スタディ": "SceneStudy",
    "場面": "Scenes",
    "選んだもの": "Selection",
    "保存": "Saving",
    "左の道具列": "Left column",
    "右の道具列": "Right column",
    "舞台面": "Stage",
    "場面の一覧": "Scene list",
    "固定の場面スタディを読み込んでいます。": "Loading the fixed SceneStudy.",

    /* ---- 上部 ---- */
    "使い方": "Guide",
    "使い方をひととおり見る": "Take the quick tour",
    "一つ戻す": "Undo",
    "やり直す": "Redo",
    "画像を書き出す": "Export image",
    "⌘Z（WindowsはCtrl+Z）": "⌘Z (Ctrl+Z on Windows)",
    "⇧⌘Z（WindowsはCtrl+Shift+Z）": "⇧⌘Z (Ctrl+Shift+Z on Windows)",

    /* ---- ショー ---- */
    "無題のショー": "Untitled show",
    "ショーの名前": "Show name",
    "バージョン名": "Version name",
    "複製": "Duplicate",
    "ショー一覧": "All shows",
    "新しいショー": "New show",
    "書き出す": "Export",
    "読み込む": "Import",

    /* ---- 劇場 ---- */
    "形式": "Form",
    "規模": "Size",
    "間口": "Width",
    "奥行": "Depth",
    "高さ": "Height",
    "規模のとおりに戻す": "Reset to preset",

    /* ---- 出るもの・光 ---- */
    "名前を入れて追加": "Name, then add",
    "名前を入れて残す": "Name, then save",
    "追加": "Add",
    "残す": "Save",
    "種類": "Kind",
    "名前": "Name",
    "寸法": "Size",
    "演者": "Performer",
    "台・箱": "Platform / box",
    "テーブル": "Table",
    "椅子": "Chair",
    "ベンチ": "Bench",
    "スツール": "Stool",
    "壁": "Wall",
    "球": "Sphere",
    "トラピーズ（吊物）": "Trapeze (flown)",
    "シルホイール": "Cyr wheel",
    "チャイニーズポール": "Chinese pole",
    "ティーターボード": "Teeterboard",
    "エアリアルティシュー（吊物）": "Aerial silks (flown)",
    "綱渡り": "Tightwire",
    "スーツケース": "Suitcase",
    "トランポリン": "Trampoline",
    "ハンドバランス用cane": "Handbalancing canes",
    "車": "Car",
    "照明の名前": "Light name",
    "照明の種類": "Light type",
    "吊り（バトンから真下へ）": "Overhead (straight down from the bar)",
    "SS（袖から横切って）": "Side light (across from the wing)",
    "前明かり（客席の上から顔へ）": "Front light (from over the house)",
    "転がし（床置きから体へ）": "Footlight (from the floor)",
    "まだ何も登録していません。名前と種類を選んで追加してください。":
      "Nothing registered yet. Enter a name, pick a kind, and add it.",
    "この舞台に出る演者と舞台セットを、まとめてここに登録します。 寸法や色はここで決め、場面ごとに舞台の上か裏かを切り替えます。明かりは別の項目です。追加したものはその場面の舞台に出ます。":
      "Register the performers and set pieces for this show here. Sizes and colours are decided here; each scene decides what is on stage. Lights have their own panel. Anything you add goes on stage in the current scene.",
    "いまの舞台装置の並びに名前をつけて残します。別の場面で呼び出したり、いまの並びへ足したりできます。演者は含みません。":
      "Save the current set layout under a name. You can recall it in another scene, or add it to what is already there. Performers are not included.",
    "照明は、どこから出てどこへ落ちるかを持ちます。 種類ごとに仕込む場所と当てる高さの既定値が入ります。 「照明を動かす」に切り替えると、灯体の丸い印と、当たる輪をそれぞれ掴んで動かせます。動線を引くと、灯体はそのままで当たる先だけが動きます。":
      "A light holds where it comes from and where it lands. Each type starts from its usual rig position and target height. Switch to “Move lights” to drag the fixture dot and the pool ring separately. Draw a route and the fixture stays put while the target travels.",
    "装置の型の名前": "Preset name",

    /* ---- 道具バー ---- */
    "操作を選ぶ": "Choose a tool",
    "動かす": "Move",
    "背景を塗る": "Paint backdrop",
    "照明を動かす": "Move lights",
    "塗りを消す": "Erase paint",
    "メモを貼る": "Add note",
    "動線を描く": "Draw route",
    "動線を消す": "Clear route",
    "演者名": "Performer names",
    "装置名": "Set names",
    "正面と平面を入れ替える": "Swap front and plan",
    "いまの道具の説明": "About this tool",
    "いまの道具の説明を出す": "Show the tool description",
    "演者や物を選び、舞台の上で動かします。": "Select a performer or object and move it on stage.",
    "上下で奥行き、左右で立ち位置を決めます。選択中は矢印キーでも動かせます。":
      "Up and down sets depth, left and right sets position. Arrow keys nudge the selection.",

    /* ---- 絵の枠 ---- */
    "正面": "Front",
    "平面（上から）": "Plan (from above)",
    "見る位置の図": "Seat map",
    "両方": "Both",
    "どの絵を出すか": "Which view to show",
    "等倍に戻す": "Reset zoom",
    "吊物": "Flown",
    "宙に吊ってあるものも平面に出す": "Show flown pieces in the plan too",
    "奥・背景": "Upstage / backdrop",
    "手前・客席側": "Downstage / house",
    "奥（背面）": "Upstage",
    "手前（客席側）": "Downstage (house)",
    "正面の絵を閉じる": "Collapse the front view",
    "平面の絵を閉じる": "Collapse the plan view",
    "客席の位置": "Seat",
    "演者と物を配置し、背景を塗れる正面から見た舞台": "Front view of the stage: place people and objects, paint the backdrop",
    "舞台と客席を上から見た平面図": "Plan view of the stage and house",

    /* ---- 場面 ---- */
    "◀ 前の場面": "◀ Previous",
    "次の場面 ▶": "Next ▶",
    "前の場面へ（↑）": "Previous scene (↑)",
    "次の場面へ（↓）": "Next scene (↓)",
    "転換を動かす": "Animate changes",
    "次の場面へ進むとき、動線に沿って動かして見せます": "When moving to the next scene, pieces travel along their routes",
    "転換にかける時間": "Transition time",
    "0.6秒": "0.6 s",
    "場面を足す": "Add scene",
    "装置ごと足す": "Add with set",
    "セクション": "Section",
    "削除": "Delete",
    "場面の欄の高さを変える": "Resize the scene list",
    "上下に引くと高さが変わります": "Drag up or down to resize",

    /* ---- 選んだもの ---- */
    "姿勢": "Pose",
    "向き": "Facing",
    "客席": "House",
    "背中": "Back",
    "地上高": "Trim height",
    "照明の直径": "Beam diameter",
    "照明の位置": "Fixture position",
    "左右": "Across",
    "奥行き": "Depth",
    "灯体の高さ": "Fixture height",
    "当たる高さ": "Target height",
    "床": "Floor",
    "奥から4.5m": "4.5 m from upstage",
    "真上から落とす": "Reset to straight down",
    "動かないようにする": "Lock in place",
    "舞台から外す": "Remove from stage",
    "舞台の上で選ぶと、姿勢・向き・重なりを変えられます。名前・色・寸法は「出るもの」の一覧で決めます。":
      "Select something on stage to change its pose, facing and stacking. Name, colour and size are set in the Cast & set list.",
    "立つ": "Stand",

    /* ---- 背景 ---- */
    "地の色": "Base colour",
    "塗る色": "Brush colour",
    "筆の太さ": "Brush size",
    "背景の塗りだけ消す": "Clear painted strokes",
    "背景の地の色": "Backdrop base colour",
    "背景を塗る色": "Backdrop brush colour",
    "背景の色見本": "Backdrop swatches",
    "筆の色見本": "Brush swatches",
    "焦げ茶": "Dark brown",
    "灰褐色": "Taupe",
    "濃い青灰色": "Slate blue",
    "夜の青": "Night blue",
    "苔色": "Moss",
    "錆色": "Rust",
    "生成り": "Ecru",
    "明るい生成り": "Light ecru",
    "中央": "Centre",


    /* ---- 窓（モーダル） ---- */
    "姿勢を選ぶ": "Choose a pose",
    "絵は斜め前から見たところです。舞台での見え方は、向きによって変わります。":
      "Drawn from a three-quarter view. On stage it depends on which way the figure faces.",
    "演者プロフィール": "Performer profile",
    "身長": "Height",
    "色": "Colour",
    "メモ": "Notes",
    "役どころ、得意な技、注意点など": "Role, signature skills, things to watch",
    "舞台の上での見え方に効きます。同じ舞台でも、身長が違えば大きさが変わります。":
      "This changes how large the figure reads on stage. Same stage, different height, different size.",
    "舞台セット": "Set piece",
    "出し入れの段取り、重さ、注意点など": "Handling, weight, things to watch",
    "寸法は実寸です。床の1m枡と同じものさしで描かれます。":
      "Sizes are real. They are drawn on the same scale as the 1 m floor grid.",
    "吊物（天井から吊る）": "Flown (hung from above)",
    "吊物は何かの上に乗りません。高さは地上高で決めます。平面図では既定で隠れます。":
      "A flown piece never rests on anything. Its height is the trim height. The plan hides it by default.",
    "フレームにする（穴の空いた壁）": "Make it a frame (wall with an opening)",
    "ワイヤーの本数": "Number of wires",
    "1本（中央から吊る）": "One (from the centre)",
    "2本（両端から吊る）": "Two (from both ends)",
    "種類を変えると、これから舞台へ出す分の仕込み位置が変わります。すでに出ているものはそのままです。":
      "Changing the type changes where new ones are rigged. Ones already on stage stay as they are.",
    "名前を変える": "Rename",
    "この名前にする": "Use this name",
    "どの絵を": "Which view",
    "どの絵を書き出すか": "Which view to export",
    "平面": "Plan",
    "両方": "Both",
    "どの場面を": "Which scenes",
    "どの場面を書き出すか": "Which scenes to export",
    "いまの場面": "Current scene",
    "このセクションの中": "This section",
    "全部の場面": "All scenes",
    "この端末のブラウザに置いてあるショーです。保存は自動。別の端末へ持っていくときは「書き出す」を使ってください。":
      "These shows live in this browser. Saving is automatic. Use Export to carry one to another device.",
    "閉じる": "Close",

    /* ---- 保存 ---- */
    "変更はこの端末のブラウザ内へ自動保存します。": "Changes are saved automatically in this browser.",
    "この端末に保存した前回のスケッチを開きました。": "Opened the sketch saved in this browser.",
    "舞台を空にする": "Clear the stage",
    "これは構図・色・距離感を考えるための2D習作です。舞台機構、リギング、安全距離、施工寸法を決める図面ではありません。":
      "This is a 2D study for composition, colour and distance. It is not a drawing for stage machinery, rigging, safety distances or construction dimensions.",
  };

  /* 中で組み立てる名前。id を鍵にする */
  const MAPS = {
    pose: {
      stand: "Stand", walk: "Walk", reach: "Both arms up", open: "Arms open",
      sit: "Sit", crouch: "Crouch", kneel: "Kneel", handstand: "Handstand",
      run: "Run", backflip: "Back handspring", hat: "Wearing a hat",
      sideflip: "Side somersault",
      sing: "Sing (mic)", juggle: "Juggling", guitar: "Guitar", trumpet: "Trumpet",
      dance1: "Dance · arms up", dance2: "Dance · lunge", dance3: "Dance · low and open",
      dance4: "Dance · jump", dance5: "Dance · twist",
      windmill: "Windmill", skate: "Roller skates", unicycle: "Unicycle",
      skateboard: "Skateboard", bicycle: "Bicycle",
      cyr: "Cyr wheel", tuck: "Tuck somersault",
      lie: "Face down", supine: "Face up", sidelie: "On the side",
    },
    setKind: {
      block: "Platform / box", table: "Table", chair: "Chair", bench: "Bench",
      stool: "Stool", wall: "Wall", sphere: "Sphere",
      trapeze: "Trapeze", cyrwheel: "Cyr wheel", pole: "Chinese pole",
      teeter: "Teeterboard", tissue: "Aerial silks", wire: "Tightwire",
      suitcase: "Suitcase", trampoline: "Trampoline", cane: "Handbalancing canes",
      car: "Car", light: "Light",
    },
    pieceType: {
      performer: "Performer", block: "Platform / box", table: "Table", chair: "Chair",
      bench: "Bench", stool: "Stool", wall: "Wall", sphere: "Sphere",
      trapeze: "Trapeze", cyrwheel: "Cyr wheel", pole: "Chinese pole",
      teeter: "Teeterboard", tissue: "Aerial silks", wire: "Tightwire",
      suitcase: "Suitcase", trampoline: "Trampoline", cane: "Handbalancing canes",
      car: "Car", light: "Light",
    },
    lightKind: {
      hang: "Overhead", ss: "Side light", front: "Front light", floor: "Footlight",
    },
    lightNote: {
      hang: "straight down from the bar",
      ss: "across the stage from the wing",
      front: "from over the house onto the face",
      floor: "from the floor onto the body",
    },
    dim: {
      w: "Width", d: "Depth", h: "Height", dia: "Diameter", lift: "Height above floor",
    },
    dimBy: {
      "chair.h": "Size (to the top of the back)",
      "bench.h": "Seat height",
      "stool.h": "Seat height",
      "wall.w": "Width", "wall.h": "Height",
      "trapeze.w": "Bar width",
      "pole.h": "Pole height",
      "teeter.w": "Board length", "teeter.h": "Fulcrum height",
      "tissue.h": "Drop length", "tissue.w": "Gap between drops",
      "wire.w": "Span", "wire.h": "Wire height",
      "trampoline.h": "Bed height",
      "cane.w": "Gap", "cane.h": "Cane height",
      "light.dia": "Diameter (pool on the floor)",
    },
    tool: {
      select: "Select a performer or object and move it on stage.",
      paint: "Paint the upstage backdrop with a finger or the mouse.",
      erase: "Erase only the strokes painted on the backdrop.",
      route: "Grab a performer, object or light in the plan; where you let go is the destination. Drag the middle dot to bend the route.",
      note: "Press an empty spot to pin a note. Pinned notes can be dragged.",
      light: "Move lights only. The dot is the fixture, the bright ring is where it lands.",
    },
    venue: {
      proscenium: "Proscenium", thrust: "Thrust", arena: "Big top", outdoor: "Outdoor stage", blackbox: "Black box",
    },
    venueShort: {
      proscenium: "framed stage", thrust: "three sides", arena: "in the round", outdoor: "temporary", blackbox: "flexible",
    },
    venueNote: {
      proscenium: "The house is on one side. The frame separates stage from house, so backdrop and scenery carry weight.",
      thrust: "The stage juts into the house and is surrounded on three sides. Someone always sees your back.",
      arena: "The house surrounds the whole ring. With no front, it has to work from every angle.",
      outdoor: "No house to contain it. The front barrier and the distance to front-of-house set the scale.",
      blackbox: "A box where the house position is decided each time. The form itself is a variable.",
    },
    size: {
      small: "Small", mid: "Medium", large: "Large",
      onering: "One ring", grand: "Grand chapiteau",
      sl100: "Small 7×6m", sl260: "Medium 10×7m", sl320: "Large 12×12m",
    },
    seat: {
      front: "Front row", center: "Stalls centre", rear: "Stalls rear",
      side: "Stalls side", balcony: "Balcony",
    },
    seatShort: { front: "front", center: "centre", rear: "rear", side: "side", balcony: "balcony" },
    seatNote: {
      front: "Eye level is almost the stage floor. A strong look up, with near and far wildly different (an ultra-wide view).",
      center: "A slightly low seat. Near and far open up and the stage is gently looked up at.",
      rear: "The reference seat. Depth and height read plainly.",
      side: "Seen at an angle. One wing shows and front-facing composition breaks down.",
      balcony: "Looking down. The floor becomes the picture, and spacing reads clearly.",
    },
    misc: {
      onStage: "On stage", offStage: "Off stage", on: "ON", off: "OFF",
      turnOff: "TURN OFF", lock: "Lock in place", unlock: "Unlock",
      duplicate: "Duplicate", profile: "Height", dims: "Size",
      house: "House", back: "Back", floor: "Floor", centre: "Centre",
      sceneNoteHint: "What happens in this scene",
      applyRoute: "Make a scene at the end of the routes",
      seats: "seats", crowd: "crowd", width: "Width", depth: "Depth", height: "Height",
      diameter: "Diameter", ring: "Ring",
    },
  };

  window.SHOSAI_I18N = { text: TEXT, maps: MAPS };
})();
