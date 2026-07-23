// 制作の書斎 — Phase 0 固定サンプルデータ
// このファイルの内容はすべてUI確認用の固定サンプル。検索・AI・保存は未実装。
// リファレンスの記述は「事実」「解釈」「未確認」を分けて持つ。確信度は正本DB接続前の仮値。

const SHOSAI = {
  project: {
    id: "prj_tokihodoku",
    title: "時をほどく研究室",
    subtitle: "未来サンプル場面",
    lastScene: "場面3「呼び出しの反転」",
    nextThought: "装置を出さずに「命令」を観客へ感じさせる方法を3つ試す",

    question: {
      previous: "未来の研究室で、時間を呼び出す装置をどう見せるか",
      current:
        "未来を呼び出したつもりが、ディアボロと自分の身体が装置の命令へ従って見え始める場面を、1人で成立させる",
    },

    sceneLine: "未来を呼ぶほど、研究者の身体の主導権がディアボロへ移って見える。",

    constraints: [
      { label: "1人で演じる", hard: true },
      { label: "大きな装置を使わない", hard: true },
      { label: "ディアボロを使う", hard: true },
      { label: "会場は小〜中劇場", hard: false },
    ],

    scene: {
      audience:
        "「便利な未来」への安心が、途中から「誰が操作しているのか」という不安へ裏返る。",
      entry: "研究者がディアボロを「起動」し、未来の助手として使い始める。",
      exit: "動きを止めたのは研究者ではなくディアボロだった、と観客が気づく。",
      relations: [
        ["人物", "研究者1人。演技は最小限、テンポの変化だけで語る"],
        ["物", "ディアボロ1つ。装置の「末端」として振る舞う"],
        ["光", "机上だけの局所光。後半、人物より物のほうが明るくなる"],
        ["音", "反復するクリック音。人ではなく音がテンポを支配する"],
        ["背景", "暗転した研究室。机だけが残る"],
      ],
      removed: "巨大装置、歯車・真鍮のレトロ意匠、群像による規格化の表現",
      undecided: "終幕で音を切るか、音だけを残すか",
      next:
        "机上のディアボロの反復を、テンポを半分に落として30秒試す（動きが「命令」に見える最低速度を確かめる）",
    },

    transformation: {
      from: "ref_cirkopolis",
      fromLabel: "Cirkopolis の構造から",
      rows: [
        ["元の構造", "機械的な都市の規律が、身体を規格化していく"],
        ["残す機能", "見えない命令に身体が従って見える不穏さ"],
        ["変更する条件", "1人・机上・ディアボロのみ。セットも群像も使わない"],
        ["避ける表面", "工場的なセット、灰色の制服的衣装、群像の隊列"],
        ["生まれた案", "机上のディアボロの回転数に、身体のテンポが同期していく"],
      ],
    },
  },

  references: [
    {
      id: "ref_cirkopolis",
      type: "near",
      title: "Cirkopolis",
      company: "Cirque Éloize",
      year: "2012",
      kind: "舞台サーカス",
      reason:
        "機械的な都市の規律に身体が従わされ、そこから個人の色が漏れ出す構造が、「装置に従う身体」という今の問いと重なる。",
      difference:
        "群像と大型セット・映像投影が前提。1人・机上・小道具中心の本企画とは規模の方向が逆。",
      familiarRisk:
        "高 — 出演経験があり、動きの癖まで無意識に再現しやすい。構造だけを取り出す。",
      evidence: {
        sources: ["本人の出演経験", "公式作品ページ"],
        confidence: "高",
        unverified: "なし",
      },
    },
    {
      id: "ref_kurios",
      type: "near",
      title: "KURIOS: Cabinet of Curiosities",
      company: "Cirque du Soleil",
      year: "2014",
      kind: "ツアーショー",
      reason:
        "「装置への好奇心と信頼」が世界を反転させる導入の作り方。信頼が反転する瞬間の置き方が参考になる。",
      difference:
        "レトロ機械の意匠（真鍮・歯車）が世界観の主役。本企画では表層をそのまま持ち込まない。",
      familiarRisk: "中 — 意匠の印象が強く、雰囲気ごと引き寄せられやすい。",
      evidence: {
        sources: ["観劇の記憶", "公式資料"],
        confidence: "高（会社・年）／中（演出意図の解釈）",
        unverified: "演出意図の言語化は資料での裏取り未実施",
      },
    },
    {
      id: "ref_smashed",
      type: "near",
      title: "Smashed",
      company: "Gandini Juggling",
      year: "2010",
      kind: "ジャグリング舞台",
      reason:
        "反復されるジャグリングの秩序が、少しずつ崩壊へ転じる時間構造。「反復が命令に見える」ための手がかり。",
      difference:
        "群像（複数人）と、リンゴ・陶器という日用品。ユーモアと暴力性の配合も本企画とは異なる。",
      familiarRisk: "低",
      evidence: {
        sources: ["映像資料"],
        confidence: "中",
        unverified: "初演年・出演人数は正本データで要確認",
      },
    },
    {
      id: "ref_quidam",
      type: "contrast",
      title: "Quidam（ディアボロのアクト）",
      company: "Cirque du Soleil",
      year: "1996",
      kind: "ツアーショー内の演目",
      reason:
        "同じ道具で、主導権が反対側にある例。人がディアボロを遊び道具として快活に従えている。",
      difference: "複数人・遊戯的・明るい気分。不穏さはない。",
      axis: {
        name: "主導権",
        current: "物が人を操る（不穏）",
        opposite: "人が物を従える（快活）",
        why:
          "反対側の動きを見ると、「操られて見える」ために何を変えればよいか（速度・視線・姿勢）が浮かぶ。",
      },
      familiarRisk: "低",
      evidence: {
        sources: ["映像資料", "公式資料"],
        confidence: "高（事実）／中（解釈）",
        unverified: "アクトの初出版・改訂の経緯は未確認",
      },
    },
    {
      id: "ref_slava",
      type: "contrast",
      title: "Slava's Snowshow",
      company: "Slava Polunin",
      year: "1993",
      kind: "クラウン舞台",
      reason:
        "観客が紙吹雪と風船の中で「体験の当事者」になる終幕。観客との距離が本企画と正反対。",
      difference: "客席全体を包み込む祝祭。観察や実験の視線はない。",
      axis: {
        name: "観客との関係",
        current: "観客は実験の観察者",
        opposite: "観客が体験の当事者",
        why:
          "終幕で観客を巻き込むかどうか、巻き込むならどの質でかを決める判断材料になる。",
      },
      familiarRisk: "低",
      evidence: {
        sources: ["観劇の記憶", "公式資料"],
        confidence: "高",
        unverified: "なし",
      },
    },
  ],

  // 種火: 0→1をシステム側が担う「未完成の一行場面」。
  // 条件: 出演者・物・動作・変化・観客への作用のうち3つ以上が見え、介入できる余白を1つ残す。
  // dist: near=近い / mid=少し遠い / alien=異物枠（趣味の反響室化を防ぐため毎回混ぜる）
  seeds: [
    { recipe: "機能保存・手段交換", dist: "near",
      text: "糸を張り直すたびに舞台の「重力の向き」が変わって見え、最後は床に置いた物が落ちない。何で見せるかは決めていない。" },
    { recipe: "時間再編集", dist: "near",
      text: "同じ10秒の技を5回繰り返すが、毎回どこかが1つ欠けていき、観客は5回目に「最初から欠けていた」と気づく。" },
    { recipe: "素材起点", dist: "near",
      text: "濡れた糸は重く、技が遅い。乾くにつれ速くなり、乾き切った瞬間に音が消える。" },
    { recipe: "関係再配線", dist: "near",
      text: "演者がディアボロを操るのではなく、客席の咳や衣擦れの音にディアボロが同期して動いているように見える。" },
    { recipe: "結果先出し", dist: "near",
      text: "開演時、床に散らばった百個の白い破片。60分かけて、それが「何の結果だったのか」へ観客が遡っていく。" },
    { recipe: "制約強化", dist: "near",
      text: "両手を使えない。顎と肩と膝だけで一つの技を完成させ、その不自由さが途中から「祈り」に見え始める。" },
    { recipe: "認識遅延", dist: "mid",
      text: "舞台上の「助手」が実は主役だった。観客がそれに気づくのは、助手が退場した後。" },
    { recipe: "機能の継承", dist: "mid",
      text: "音楽が途中で完全に止まる。以後は演者の呼吸と足音が「楽譜」の役割を引き継ぐ。" },
    { recipe: "異種衝突（橋=蓄積）", dist: "mid",
      text: "賽銭箱に硬貨が落ちる音と、ジャグリングの落下音が同じリズムで蓄積し、失敗が「奉納」に変わっていく。" },
    { recipe: "軸反転（観客との関係）", dist: "mid",
      text: "観客が懐中電灯を持ち、演者は照らされた場所でしか技ができない。誰も照らさない時間が生まれたら、どうする。" },
    { recipe: "時間再編集（逆順）", dist: "mid",
      text: "終演の挨拶から始まり、開演前の袖の緊張で終わる45分。" },
    { recipe: "機能保存・手段交換", dist: "mid",
      text: "大観衆のウェーブが持つ「参加の伝播」を、客席30人の指先だけで起こす。" },
    { recipe: "素材起点", dist: "alien",
      text: "氷でできた道具。溶けるほど技が変わり、終演後は水たまりの反射だけが「演目の記録」として残る。" },
    { recipe: "異種衝突（橋=隠す）", dist: "alien",
      text: "手品の「隠す」技術で、サーカスの「見せる」技を一つずつ隠していき、最後は音だけの技になる。" },
    { recipe: "関係再配線", dist: "alien",
      text: "照明オペレーターが舞台上にいて、演者は照明の「機嫌」に合わせて演目を変える。どちらが主導かは最後まで曖昧。" },
    { recipe: "結果先出し", dist: "alien",
      text: "千秋楽にしか完成しない絵。毎公演、演者の動線がペンキの足跡として床に1層ずつ重なっていく。" },
    { recipe: "認識遅延", dist: "alien",
      text: "「通訳です」と紹介された人物が演者の動きを手話に訳し続けるが、途中から動きのほうが手話に従い始める。" },
    { recipe: "制約強化", dist: "alien",
      text: "舞台は畳一枚。そこから一歩も出ない60分のうちに、畳の縁が「国境」に見えてくる。" },
  ],

  // 場面問答: 実例を反転させた判断のエクササイズ。
  // 先に自分で答える→匿名の解法→条件→出典の順に開く。採点はしない。
  // reconstructed: true = 資料を基に再構成した出題（因果は推測を含む）
  mondo: [
    {
      id: "m1",
      type: "一場面判断型",
      title: "転換の90秒",
      situation:
        "中規模のツアーショー。空中演目が終わった直後、次の演目のためにリギング転換が必要で、舞台上に約90秒の空白が生まれる。幕はなく、転換作業は隠せない。観客はまだ空中演目の余韻の中にいる。",
      hard: ["転換は省略できない", "暗転で完全に隠すことはできない", "追加の大道具は使えない"],
      conflict: "空白を感じさせたくない ⇄ 余韻を壊したくない",
      assumption: "「90秒」「幕なし」は出題用の仮定。実作品の実測値ではない。",
      solutions: [
        {
          effect: "世界の継続",
          mechanism: "道化の小さな一幕を舞台前面に置き、観客の視線を転換から引き取る。",
          cost: "余韻は笑いに上書きされる。",
          conditions: "大型ツアー。専任のクラウンがいる。転換位置が舞台奥。",
          source: {
            work: "KOOZA", workId: "show_cds_kooza",
            company: "Cirque du Soleil", year: "2007",
            note: "クラウンの幕間が演目間をつなぐ構成（観劇の記憶＋公式資料からの解釈）。",
            confidence: "高（構成）／中（転換目的という因果は推測）",
            reconstructed: true,
          },
        },
        {
          effect: "転換の見せ物化",
          mechanism: "転換作業そのものを振付に取り込み、クルーと道具の移動を世界の景として照明で整える。",
          cost: "「作業」が世界観へ入り込む。稽古コストが増える。",
          conditions: "群像作品。クルーが出演者を兼ねる。",
          source: {
            work: "Cirkopolis", workId: "show_eloize_cirkopolis",
            company: "Cirque Éloize", year: "2012",
            note: "道具の移動が群舞に溶けている（出演経験からの解釈）。",
            confidence: "高（体験）／中（意図の言語化）",
            reconstructed: true,
          },
        },
      ],
    },
    {
      id: "m2",
      type: "効果から逆算型",
      title: "隣の観客",
      situation:
        "小劇場のソロ公演の終盤。観客一人ひとりに「隣の人も同じものを見ていた」と意識させたい。仕込みの追加はできないが、客電は操作できる。",
      hard: ["演者は1人", "追加の仕込みはできない", "残り時間は約5分"],
      conflict: "観客同士を意識させたい ⇄ 没入を切りたくない",
      assumption: "「小劇場」「残り5分」は出題用の仮定。",
      solutions: [
        {
          effect: "共有の可視化（祝祭）",
          mechanism: "客席全体を巻き込む物理現象を起こし、観客の反応そのものを見せ物にする。",
          cost: "静かな余韻は消える。撤収も大仕事になる。",
          conditions: "客席の安全と清掃体制。祝祭で終われる作品であること。",
          source: {
            work: "Slava's Snowshow", company: "Slava Polunin", year: "1993",
            note: "紙吹雪と巨大風船が客席を包む終幕。",
            confidence: "高",
            reconstructed: false,
          },
        },
        {
          effect: "静かな共有",
          mechanism: "客電をわずかに上げ、演者が客席を見渡す長い沈黙を置く。観客は明るさの中で互いの存在に気づく。",
          cost: "気まずさと紙一重。沈黙の長さの設計が難しい。",
          conditions: "客席規模が小さい。それまでに信頼が築けている。",
          source: {
            work: null, company: null, year: null,
            note: "特定作品に帰属しない一般技法からの再構成。",
            confidence: "—",
            reconstructed: true,
          },
        },
      ],
    },
    {
      id: "m3",
      type: "匿名二例比較型",
      title: "落下の世界",
      situation:
        "落下（ドロップ）が現実的に起こりうる技を含む演目を作る。失敗が起きた瞬間に、作品世界が壊れないようにしたい。参照実例には、失敗の扱いが正反対の二例がある。どの条件ならどちらを選ぶか。今のあなたの企画なら？　第三の道はあるか。",
      hard: ["技の難度は下げない", "失敗の可能性はゼロにできない"],
      conflict: "失敗を織り込みたい ⇄ 失敗を目立たせたくない",
      assumption: "出題は二例の対比のために再構成している。",
      solutions: [
        {
          effect: "失敗の儀式化",
          mechanism: "物が落ち、壊れること自体を反復の構造へ織り込む。落下は事故ではなく進行になる。",
          cost: "常に緊張と暴力性が漂う。",
          conditions: "群像。消耗品の道具。世界観がそれを許すこと。",
          source: {
            work: "Smashed", workId: "show_gandini_smashed",
            company: "Gandini Juggling", year: "2010",
            note: "リンゴの落下と破壊が演出の一部（映像資料からの解釈）。",
            confidence: "中",
            reconstructed: true,
          },
        },
        {
          effect: "失敗の遊戯化",
          mechanism: "世界全体を快活な遊びにし、落下は「もう一回」の合図としてリカバリーが振付に含まれる。",
          cost: "不穏さ・緊張の演出はできない。",
          conditions: "明るい世界観。観客との距離が近い。",
          source: {
            work: "Quidam（ディアボロのアクト）", workId: "show_cds_quidam",
            company: "Cirque du Soleil", year: "1996",
            note: "遊戯的な世界での道具扱い（映像資料からの解釈）。",
            confidence: "中",
            reconstructed: true,
          },
        },
      ],
    },
    {
      id: "m4",
      type: "時間設計比較型",
      title: "一日が始まり、終わる",
      situation:
        "同じ舞台空間のまま、約60分の上演で「夕暮れから夜を通り、朝へ戻った」と感じさせたい。時計、時刻の字幕、説明台詞は使わない。観客に時間の経過は伝えたいが、場面転換のたびに物語を止めたくはない。",
      hard: ["時計・時刻表示を使わない", "舞台装置は同じ", "説明台詞を使わない"],
      conflict: "長い時間を明確に伝えたい ⇄ 夢や連続性を切りたくない",
      assumption: "「約60分」「同じ舞台」は出題用の仮定。参照3作品の実際の尺・媒体・上演条件は異なる。",
      basis: "DB内の3作品に、一日または夕暮れから夜明けまでを、時間変化として構成する記録があります。",
      solutions: [
        {
          effect: "時間帯を旅の骨格にする",
          mechanism: "黄昏・夜・夜明けを、場所の説明ではなく、音、集団の密度、身体の高さの変化へ配分する。",
          cost: "正確な時刻や因果は曖昧になり、夢の時間として受け取られる。",
          conditions: "音楽・照明・複数の身体が、同じ時間の規則を共有できること。",
          source: {
            work: "Nomade", workId: "show_eloize_nomade",
            company: "Cirque Éloize", year: "2002",
            note: "公式は旅を黄昏から夜明けへ運ぶ。音・密度・身体の高さへの配分はDB内の制作分析。",
            confidence: "高（時間枠）／中（配分方法は解釈）",
            reconstructed: true,
          },
        },
        {
          effect: "同じ行為のまま世界だけを通過させる",
          mechanism: "演奏者とピアノの行為を固定し、流れる都市背景を昼から夜へ変え、最後に出発地点へ戻す。",
          cost: "移動する背景・カメラ・安全設計が必要になり、舞台上だけでは置換が要る。",
          conditions: "中心人物が時間をまたいで続けられる、一つの強い行為を持つこと。",
          source: {
            work: "Vanessa Carlton - A Thousand Miles (Music Video)",
            workId: "show_mv_vanessa_carlton_a_thousand_miles",
            company: "A&M Records", year: "2002",
            note: "ピアノが昼の都市と夜の道路を移動し、同じガレージへ戻る映像構造。",
            confidence: "高（映像と本人回顧）／中（時間設計としての整理）",
            reconstructed: true,
          },
        },
        {
          effect: "実時間の蓄積で街の見え方を変える",
          mechanism: "一日を通じて身体的な記号や行為を少しずつ都市へ出現させ、通行者の注意を観客の注意へ変える。",
          cost: "一人の観客が全体を見られず、許可・導線・拒否の自由・安全の設計が増える。",
          conditions: "実際の一日と公共空間を使い、断片だけでも変化が伝わること。",
          source: {
            work: "Les Escapades", workId: "show_baro_les_escapades",
            company: "Baro d'evel", year: "2014",
            note: "公式は一日限りの公共空間作品として、奇妙な世界が都市に徐々に現れると説明する。",
            confidence: "高（公式の形式）／中（観客の注意変化は解釈）",
            reconstructed: true,
          },
        },
      ],
    },
    {
      id: "m5",
      type: "開幕設計比較型",
      title: "最初の3分が取扱説明書になる",
      situation:
        "物語を始める前に、観客へ「この世界では何を本物として見ればよいか」を渡したい。説明役は置かず、最初の3分で人物、空間、観客の役割まで知らせる。最大の見せ場を使うか、後半のために温存するか。",
      hard: ["説明台詞を使わない", "3分以内", "人物・空間・観客の関係を示す"],
      conflict: "世界の規則を早く渡したい ⇄ 見せ場と謎を後半へ残したい",
      assumption: "「3分」は比較用の仮定。参照作品の実測時間ではない。",
      basis: "DB内の3作品が、開幕に作品全体の規則・時間枠・既知の結末を置いています。",
      solutions: [
        {
          effect: "劇場全体を一度で世界にする",
          mechanism: "客席通路から動物たちを登場させ、操演者と仕掛けも見せたまま、舞台へ生命が集まる一枚の儀式を作る。",
          cost: "開幕から最大規模を見せるため、その後は別の質で強度を上げる必要がある。",
          conditions: "客席通路、安全な大型造形、全員が共有できる音楽的合図。",
          source: {
            work: "The Lion King", workId: "show_musical_lion_king",
            company: "Disney Theatrical Productions", year: "1997",
            note: "開幕「Circle of Life」で客席通路から動物が行進し、劇場全体をサバンナにする。",
            confidence: "高（公式資料）／中（取扱説明書という機能整理）",
            reconstructed: true,
          },
        },
        {
          effect: "時間旅行を一つの機構で成立させる",
          mechanism: "廃墟での競売から、音楽とシャンデリアの復活、劇場全体の変貌を同期させ、過去へ巻き戻す。",
          cost: "装置、音楽、照明の同期が崩れると、導入全体が成立しにくい。",
          conditions: "観客が変化前後を比較できる空間と、中心となる一つの物。",
          source: {
            work: "The Phantom of the Opera（オペラ座の怪人）",
            workId: "show_musical_phantom_of_the_opera",
            company: null, year: "1986",
            note: "競売のシャンデリアが序曲とともに蘇り、廃墟のオペラ座が全盛期へ巻き戻る。",
            confidence: "高（公式資料）",
            reconstructed: false,
          },
        },
        {
          effect: "既知の結末を疑問へ変える",
          mechanism: "魔女の死を祝う群衆を先に見せ、「なぜこの人物は悪とされたのか」を問いとして回想へ入る。",
          cost: "結末を伏せる驚きは使えず、観客の既有知識への依存が強くなる。",
          conditions: "観客が知っている評価や結末を、別の視点から更新する物語であること。",
          source: {
            work: "Wicked", workId: "show_musical_wicked",
            company: null, year: "2003",
            note: "開幕で魔女の死を祝う場面を置き、出会いへ遡る枠構造。",
            confidence: "高（公式・上演資料）／中（疑問化という整理）",
            reconstructed: true,
          },
        },
      ],
    },
    {
      id: "m6",
      type: "反復設計比較型",
      title: "同じことが、同じに見えない",
      situation:
        "同じ動作または約1分の場面を、上演中に3回以上繰り返す。新しい大道具も説明台詞も足さず、反復するほど意味や緊張が進むようにしたい。毎回どこを変え、どこを変えないか。",
      hard: ["核となる動作は同じ", "3回以上反復する", "説明台詞を足さない"],
      conflict: "反復で強度を積みたい ⇄ 停滞や既視感にしたくない",
      assumption: "反復回数と約1分は出題用の仮定。",
      basis: "DB内の3作品が、反復を感情の蓄積、観客の探索戦略、集団規則の変化へ使っています。",
      solutions: [
        {
          effect: "変えずに感情だけを積む",
          mechanism: "抱擁の組み直しや家具を避ける行為をほぼ同じ形で反復し、崩壊を予測できること自体を苦しさへ変える。",
          cost: "変化が小さいため、演者の精度と時間の耐久力が要る。",
          conditions: "観客が一回目の型を記憶でき、わずかな遅れや疲労を読める距離。",
          source: {
            work: "カフェ・ミュラー", workId: "show_tanztheater_cafe_muller",
            company: "Tanztheater Wuppertal Pina Bausch", year: "1978",
            note: "抱擁の崩壊と組み直し、家具を除け続ける行為が反復される。",
            confidence: "高（財団公式と上演記録）／中（感情機能は解釈）",
            reconstructed: true,
          },
        },
        {
          effect: "同じ時間を別の探索へ変える",
          mechanism: "約1時間の物語ループを反復し、観客側が追う人物や待つ場所を変えることで、別の断片を得る。",
          cost: "一回で全体を理解できず、見逃しが不満にも動機にもなる。",
          conditions: "複数の場面が同時進行し、観客が経路を選べる空間。",
          source: {
            work: "Sleep No More（スリープ・ノー・モア）",
            workId: "show_immersive_sleep_no_more",
            company: "Punchdrunk / Emursive", year: "2003",
            note: "約1時間の物語ループを反復し、観客ごとに異なる断片が生成される。",
            confidence: "高（公式・主要媒体）",
            reconstructed: false,
          },
        },
        {
          effect: "集団の規則が壊れる過程にする",
          mechanism: "同じ物とジャグリングのパターンを共有し、誰が渡す、拒む、規則から外れるかを変えて関係を進める。",
          cost: "個人技の難度より、全員のタイミングと関係の可読性が優先される。",
          conditions: "共通の物、反復可能なパターン、外れた一人が読める群像。",
          source: {
            work: "Smashed", workId: "show_gandini_smashed",
            company: "Gandini Juggling", year: "2010",
            note: "100個の赤いリンゴ、ソロとアンサンブルの精密なパターン、ジェスチャー振付を組み合わせる。",
            confidence: "高（公式説明）／中（規則の崩壊としての整理）",
            reconstructed: true,
          },
        },
      ],
    },
    {
      id: "m7",
      type: "観客関係比較型",
      title: "観客を、どこまで中へ入れるか",
      situation:
        "観客に「自分もこの世界の一部だ」と感じてほしい。ただし全員を舞台へ上げることはできず、参加を望まない人もいる。座ったまま、自由回遊、終盤だけ参加という三つの深さのうち、今の作品にはどこまで必要か。",
      hard: ["参加を拒める", "全員を舞台へ上げない", "鑑賞だけでも体験が成立する"],
      conflict: "当事者性を渡したい ⇄ 安全・自由・物語の焦点を守りたい",
      assumption: "三段階は比較のための整理。各作品の参加規則を同一とみなすものではない。",
      basis: "DB内の3作品に、着席のまま包む、自由回遊させる、終幕で参加へ招くという異なる深さがあります。",
      solutions: [
        {
          effect: "座ったまま世界に包む",
          mechanism: "登場を客席通路へ通し、観客の身体を動かさずに、劇場の境界だけを作品世界へ広げる。",
          cost: "観客に選択権は少なく、参加は想像力と視線に留まる。",
          conditions: "客席通路の安全、全方向から読める造形、鑑賞席の安心を保てること。",
          source: {
            work: "The Lion King", workId: "show_musical_lion_king",
            company: "Disney Theatrical Productions", year: "1997",
            note: "開幕の動物行進が客席通路を通り、劇場ごと作品世界に包む。",
            confidence: "高（公式資料）",
            reconstructed: false,
          },
        },
        {
          effect: "観客へ探索の主導権を渡す",
          mechanism: "マスク、沈黙、撮影禁止という規則を置き、席と順路を外して、観客が追う人物と部屋を選ぶ。",
          cost: "見逃し、迷い、観客から演者への加害リスクが生まれ、運用対策が不可欠。",
          conditions: "行動規則、退出経路、監視、安全スタッフ、接触と同意の設計。",
          source: {
            work: "Sleep No More（スリープ・ノー・モア）",
            workId: "show_immersive_sleep_no_more",
            company: "Punchdrunk / Emursive", year: "2003",
            note: "白いマスクと沈黙の規則のもと、観客が複数階を自由回遊する。",
            confidence: "高（公式・主要媒体）",
            reconstructed: false,
          },
        },
        {
          effect: "観察から参加へ終盤で移す",
          mechanism: "土地の日常を身体で少しずらす場面を見せた後、参加的な大きなフィナーレを終点に置く。",
          cost: "最後だけ参加するため、同意、導線、アクセス、保安を別途設計する必要がある。",
          conditions: "参加しない人の観覧位置と、参加方法を理解できる明確な合図。",
          source: {
            work: "Les Voyages", workId: "show_xy_les_voyages",
            company: "Collectif XY", year: null,
            note: "公式は土地へ一週間入り、最後に参加的な大きなフィナーレへ招くと説明する。",
            confidence: "高（公式の形式）／低〜中（参加の具体は未確認）",
            reconstructed: true,
          },
        },
      ],
    },
    {
      id: "m8",
      type: "空間条件比較型",
      title: "三つの距離から同じショーを見る",
      situation:
        "屋外の水上ショーを、遊歩道の近距離、レストランの横方向、ホテル客室の遠景から同時に見せる。観客は途中から見始めてもよい。視点ごとの別演出は作れない。どの瞬間を三方向すべての核にするか。",
      hard: ["三つの視点で同時上演", "途中参加できる", "視点別の別バージョンは作らない"],
      conflict: "遠くから一目で読ませたい ⇄ 近くで細部と人間味を残したい",
      assumption: "三視点と同時上演は出題用の統合条件。参照作品の実際の眺望・運用はそれぞれ異なる。",
      basis: "DB内の3つの大型噴水ショーが、遊歩道、客室、飲食、回遊という複数の観覧文脈を持っています。",
      solutions: [
        {
          effect: "抽象媒体の輪郭をランドマークにする",
          mechanism: "横幅の同期と建築に競う垂直噴射を大きな句読点にし、曲が変わっても遠景の輪郭を保つ。",
          cost: "近距離で人物の物語を読む体験は弱い。",
          conditions: "大きな水面、建築と比較できる高さ、曲単位で完結する短編。",
          source: {
            work: "Fountains of Bellagio — Bellagio",
            workId: "show_casino_bellagio_fountains_1998",
            company: "Bellagio / WET", year: "1998",
            note: "歩道、客室、飲食から同じ水景を見せ、横幅と垂直噴射を大きな造形にする。",
            confidence: "高（公式・WET）／中（視点価値の整理）",
            reconstructed: true,
          },
        },
        {
          effect: "短い曲を待てる環境にする",
          mechanism: "曲単位の独立した短編を高頻度で反復し、到着、食事、客室のどこからでも途中参加と次の曲待ちを成立させる。",
          cost: "長編の因果や一度きりのクライマックスは持ちにくい。",
          conditions: "短い周期、複数の曲目、次回が予測できる運用。",
          source: {
            work: "Performance Lake — Wynn Macau",
            workId: "show_casino_wynn_macau_performance_lake_2006",
            company: "Wynn Macau", year: "2006",
            note: "20〜30分間隔の曲別プログラムを、到着・食事・客室へ組み込む。",
            confidence: "高（現行形式・公式スケジュール）／中（環境レパートリーという整理）",
            reconstructed: true,
          },
        },
        {
          effect: "巨大景観へ人間の焦点を重ねる",
          mechanism: "噴水を背景プラットフォームとして残し、歌手、演奏者、ダンサー、専門アクトを特定回に重ねる。",
          cost: "遠景では人の身体が小さくなり、水景に負ける可能性がある。",
          conditions: "人の位置を示す音・光の焦点と、通常回／ライブ回を分ける運用。",
          source: {
            work: "The Fountain / Symphony — Okada Manila",
            workId: "show_casino_okada_fountain_symphony_2017",
            company: "Okada Manila / WET", year: "2017",
            note: "大型噴水にライブ歌手、ヴァイオリン、ダンサー、専門アクトを重ねる現行形式。",
            confidence: "高（噴水と現行形式）／中（ライブ版初演時期・機能分析）",
            reconstructed: true,
          },
        },
      ],
    },
    {
      id: "m9",
      type: "版設計比較型",
      title: "昼と夜で、同じ作品を作り直す",
      situation:
        "同じ出演者、同じ会場、同じ基本構成で昼版と夜版を作る。昼は照明効果に頼れず、夜は単に明るくするだけでは別版にならない。観客が「同じ作品」と分かる核を残しながら、終わり方を変える。",
      hard: ["出演者と会場は同じ", "基本構成を共有する", "夜版は照明追加だけにしない"],
      conflict: "作品の同一性を保ちたい ⇄ 時間帯固有の体験へ作り直したい",
      assumption: "出演者・全構成が同一という条件は出題用。参照作品の版差すべてを確認したものではない。",
      basis: "DB内の2作品に、昼夜で異なる終結、または共通骨格を保って夜の終点を拡張する記録があります。",
      solutions: [
        {
          effect: "共通の装置と出演者から結末だけを変える",
          mechanism: "複数種の登場と360度の水装置を共通核にし、昼夜で終結の構成を変える。",
          cost: "動物、照明、スモーク、水の同期条件が増え、版ごとの安全確認が要る。",
          conditions: "昼でも成立する身体・水の核と、夜にだけ読める光の終点。",
          source: {
            work: "Animal Life Live!", workId: "show_jp_aqua1_seaparadise_animal_life_live",
            company: "横浜・八景島シーパラダイス", year: "2024",
            note: "公式で設備、出演種、昼夜差を確認。DBは昼夜で異なる終結として整理する。",
            confidence: "高（公式の開始・設備・昼夜差）／中（構成分析）",
            reconstructed: true,
          },
        },
        {
          effect: "同じ旅を夜の祝祭へ延長する",
          mechanism: "旅立ち、仲間、フロートの連続、到着という骨格を保ち、夜はフロートの発光と花火へ終点を接続する。",
          cost: "夜版の印象が終盤の花火だけに支配される危険がある。",
          conditions: "昼でも読める旅程と、夜だけ追加される明確な到着の合図。",
          source: {
            work: "エスパーニャカーニバル “ブエン ビアへ”",
            workId: "show_jp_theme1_shima_buen_viaje_2024",
            company: "株式会社志摩スペイン村", year: "2024",
            note: "公式資料で昼のパレードと、発光フロートから花火へつなぐ季節夜間版を確認。",
            confidence: "高（公式の前提・夜間版）／中（旅程構造の整理）",
            reconstructed: true,
          },
        },
      ],
    },
    {
      id: "m10",
      type: "可視化判断型",
      title: "必要な作業を、消さない",
      situation:
        "操演、道具移動、安全確保など、上演に必要な作業が客席から見える。黒子化して目立たなくするのではなく、その作業を作品の意味へ変えたい。作業者を世界の住人、緊張の源、集団の規律のどれにするか。",
      hard: ["作業者を隠さない", "必要な作業は省略しない", "作業の安全性を損なわない"],
      conflict: "仕組みを見せたい ⇄ 物語への集中を壊したくない",
      assumption: "三つの役割は比較のための整理。参照作品の全転換・安全仕様を同一視しない。",
      basis: "DBと既存の場面問答に、仕掛けの公開、家具を除ける役、道具移動を群舞へ入れるという近い条件があります。",
      solutions: [
        {
          effect: "仕組みの公開を想像力への招待にする",
          mechanism: "操演者、ロープ、滑車を見せ、観客が人間と動物像を同時に見る二重の出来事を作る。",
          cost: "写実的な幻覚ではなく、仕組みを含めて信じる見方を観客へ要求する。",
          conditions: "操演者の身体と造形物の焦点が競合せず、同じリズムを共有すること。",
          source: {
            work: "The Lion King", workId: "show_musical_lion_king",
            company: "Disney Theatrical Productions", year: "1997",
            note: "操演者と仕掛けを隠さず見せる「ダブル・イベント」の設計。",
            confidence: "高（公式スタディガイド）",
            reconstructed: false,
          },
        },
        {
          effect: "安全作業そのものを緊張にする",
          mechanism: "目を閉じて進む踊り手の前から、別の人物が椅子とテーブルをぎりぎりで除け続ける。",
          cost: "役の感情より機能が前面に出て、失敗が実際の危険へ直結する。",
          conditions: "家具配置、速度、担当者の視界、毎回同じ安全精度。",
          source: {
            work: "カフェ・ミュラー", workId: "show_tanztheater_cafe_muller",
            company: "Tanztheater Wuppertal Pina Bausch", year: "1978",
            note: "家具を除ける男の役と原初演者はピナ・バウシュ財団公式で確認。",
            confidence: "高（事実）／中（安全作業という機能整理）",
            reconstructed: true,
          },
        },
        {
          effect: "道具移動を集団の規律として見せる",
          mechanism: "転換や反復動作を舞台上の群舞へ溶かし、都市の規則に従う身体として読ませる。",
          cost: "実務動線にも振付精度が必要になり、転換変更の影響が全体へ及ぶ。",
          conditions: "群像作品で、道具の置き場所と次の演目への導線を振付として固定できること。",
          source: {
            work: "Cirkopolis", workId: "show_eloize_cirkopolis",
            company: "Cirque Éloize", year: "2012",
            note: "既存問答の出演経験と、DBの管理都市・反復動作の記録を合わせた比較。",
            confidence: "高（体験・作品枠）／中（転換目的の因果）",
            reconstructed: true,
          },
        },
      ],
    },
  ],

  visuals: [
    {
      id: "vA",
      dir: "A",
      dirLabel: "人物と物の関係を中心にする",
      intent:
        "糸の張力だけで「引かれている」を見せる。表情の演技には頼らない。",
      structure: "変換メモ「回転数への同期」を、腕と糸の角度で画面化する。",
      avoided: "歯車・真鍮のレトロ意匠。装置そのものは描かない。",
      art: "svgA",
      derived: {
        id: "vA2",
        dir: "A′",
        branchNote: "案Aから派生｜身体の傾きをさらに強めるため",
        intent: "重心を糸の側へ崩し、「立たされている」姿勢に近づける。",
        art: "svgA2",
      },
    },
    {
      id: "vB",
      dir: "B",
      dirLabel: "光と空間の変化を中心にする",
      intent:
        "人物を半影に沈め、机上の物だけが照らされる。主導権の移動を光量で語る。",
      structure: "場面の関係「後半、人物より物が明るい」を1枚に固定する。",
      avoided: "全景を見せる引きの構図。空間は光の外に沈めて説明しない。",
      art: "svgB",
    },
    {
      id: "vC",
      dir: "C",
      dirLabel: "観客の視点と発見を中心にする",
      intent:
        "観客を「記録装置」の位置に置く。枠の中の枠で、見ている自分に気づかせる。",
      structure: "出口「気づくのは観客」を、視点の設計そのもので先取りする。",
      avoided: "カメラやモニターの実物描写。枠は線だけで示す。",
      art: "svgC",
    },
  ],
};
