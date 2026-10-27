/* 兽耳工作室 · 参考「小初音工作室」的互动玩具
   Canvas 2D：Q 版角色 + 程序化五官 + 程序化兽耳兽尾 + 弹簧物理 + 语音 + 拆分 */
(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const DEG = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ================= 角色 ================= */
  // 初音未来放在第一个 = 默认打开看到的角色
  const CHARS = [
    {
      id: "miku",
      name: "初音未来",
      body: "assets/chr/char-miku-body.png",
      // 双马尾已经从底图上拆出去了，单独存一张，专门用来裁物理部件
      hairSrc: "assets/chr/miku-tails.png",
      face: { cx: 500, cy: 460, rx: 186, ry: 146, eye: "#2fbfb2", mouth: "#d4738a" },
      hair: "#8fe0d5",
      line: "#c9aab8",
      anchors: { earL: [408, 232], earR: [592, 232], tail: [700, 1140] },
      earW: 168,
      tailL: 370,
      animal: { ear: "none", tail: "none" },
      // 双马尾拆成独立部件，绕发根摆动（参考视频里的甩发效果）
      hairParts: [
        { name: "左马尾", rect: [0, 40, 300, 1170], anchor: [266, 112], z: -1, droopDir: -1, phys: 1 },
        { name: "右马尾", rect: [740, 40, 1002, 1170], anchor: [740, 112], z: -1, droopDir: 1, phys: 1 },
      ],
    },
    {
      id: "tangyuan",
      name: "粉绿汤圆",
      body: "assets/chr/char-a.png",
      face: { cx: 398, cy: 472, rx: 196, ry: 88, eye: "#5f8f7c", mouth: "#c0707a" },
      hair: "#f4ead2",
      line: "#d2b7c5",
      anchors: { earL: [300, 152], earR: [470, 152], tail: [540, 850] },
      earW: 196,
      tailL: 400,
      animal: { ear: "fox", tail: "fox" },
    },
  ];
  const DEFAULT_CHAR = "miku";

  /* ================= 兽耳兽尾 ================= */
  // ear: 耳朵高度比例 / 偏移 / 倾斜 / 旋转反向(rs)
  // tail: 尾巴形状 id；earColor / tailColor: 相对发色的额外色相·饱和·明度调整
  const ANIMALS = {
    fox: { label: "狐", ear: { h: 1.6, dx: 0, dy: 0, rot: 12 }, tail: "bushy", tdx: 0 },
    wolf: { label: "狼", ear: { h: 1.95, dx: -10, dy: -6, rot: 7 }, tail: "wolf", tdx: 0 },
    cat: { label: "猫", ear: { h: 0.92, dx: -34, dy: -4, rot: 22 }, tail: "slim", tdx: 0 },
    dog: { label: "狗", ear: { h: 1.3, dx: -58, dy: -46, rot: 32, rs: -1 }, tail: "curl", tdx: 0 },
    rabbit: { label: "兔", ear: { h: 2.0, dx: -6, dy: 8, rot: 9 }, tail: "puff", tdx: 22 },
    tiger: { label: "虎", ear: { h: 1.02, dx: -58, dy: -6, rot: 8 }, tail: "tiger", tdx: 8 },
    lion: { label: "狮", ear: { h: 0.95, dx: -62, dy: -4, rot: 4 }, tail: "lion", tdx: 10 },
    monkey: { label: "猴", ear: { h: 1.16, dx: -88, dy: 56, rot: 4 }, tail: "monkey", tdx: 0 },
    panda: { label: "熊猫", ear: { h: 1.0, dx: -56, dy: -12, rot: 0 }, tail: "panda", tdx: 84,
             earAbs: "#4b4149", tailAbs: "#4b4149" },
    deer: { label: "鹿", ear: { h: 1.55, dx: -46, dy: -22, rot: 30 }, tail: "deer", tdx: 112 },
    squirrel: { label: "松鼠", ear: { h: 1.1, dx: -30, dy: -16, rot: 14 }, tail: "squirrel", tdx: -56 },
    sheep: { label: "羊", ear: { h: 1.25, dx: -76, dy: 10, rot: 22, rs: -1 }, tail: "sheep", tdx: 74 },
    raccoon: { label: "浣熊", ear: { h: 1.02, dx: -56, dy: -8, rot: 6 }, tail: "raccoon", tdx: 74 },
    whale: { label: "鲸", ear: { h: 1.0, dx: -64, dy: -34, rot: 16 }, tail: "whale", tdx: 16,
             earAbs: "#8ec9e0", tailAbs: "#8ec9e0" },
  };
  const EAR_KINDS = [
    { id: "none", label: "无" },
    { id: "fox", label: "狐耳" },
    { id: "wolf", label: "狼耳" },
    { id: "cat", label: "猫耳" },
    { id: "dog", label: "狗耳" },
    { id: "rabbit", label: "兔耳" },
    { id: "tiger", label: "虎耳" },
    { id: "lion", label: "狮耳" },
    { id: "monkey", label: "猴耳" },
    { id: "panda", label: "熊猫耳" },
    { id: "deer", label: "鹿耳" },
    { id: "squirrel", label: "松鼠耳" },
    { id: "raccoon", label: "浣熊耳" },
    { id: "sheep", label: "羊耳" },
    { id: "whale", label: "鲸鳍" },
  ];
  const TAIL_KINDS = [
    { id: "none", label: "无" },
    { id: "fox", label: "狐尾" },
    { id: "wolf", label: "狼尾" },
    { id: "cat", label: "猫尾" },
    { id: "dog", label: "狗尾" },
    { id: "rabbit", label: "兔尾" },
    { id: "tiger", label: "虎尾" },
    { id: "lion", label: "狮尾" },
    { id: "monkey", label: "猴尾" },
    { id: "panda", label: "熊猫尾" },
    { id: "deer", label: "鹿尾" },
    { id: "squirrel", label: "松鼠尾" },
    { id: "raccoon", label: "浣熊尾" },
    { id: "sheep", label: "羊尾" },
    { id: "whale", label: "鲸尾" },
  ];

  /* ================= 表情库 ================= */
  const EYES = [
    { id: "happy", label: "开心" },
    { id: "open", label: "圆眼" },
    { id: "half", label: "鄙视" },
    { id: "dot", label: "呆萌" },
    { id: "star", label: "星星眼" },
    { id: "spiral", label: "晕晕眼" },
    { id: "side", label: "斜视" },
    { id: "smirk", label: "坏笑" },
    { id: "sharp", label: "热血" },
    { id: "heart", label: "爱心眼" },
    { id: "tear", label: "泪眼" },
    { id: "sleep", label: "睡觉" },
    { id: "angry", label: "生气" },
    { id: "shock", label: "震惊" },
    { id: "meh", label: "无语" },
    { id: "wink", label: "眨眼" },
  ];
  const LIPS = [
    { id: "closed", label: "闭嘴" },
    { id: "a", label: "啊(A)" },
    { id: "e", label: "一(E)" },
    { id: "u", label: "呜(U)" },
    { id: "eh", label: "诶(EH)" },
    { id: "o", label: "喔(O)" },
    { id: "grit", label: "咬牙" },
  ];
  const MOUTHS = [
    { id: "smile", label: "微笑" },
    { id: "big", label: "大笑" },
    { id: "cat", label: "猫嘴" },
    { id: "pout", label: "嘟嘴" },
    { id: "tongue", label: "吐舌" },
    { id: "smirkMouth", label: "坏笑嘴" },
    { id: "wave", label: "波浪嘴" },
    { id: "scream", label: "尖叫" },
    { id: "tiny", label: "抿嘴" },
  ];
  const EXPRS = [
    { id: "x1", label: "超开心", eye: "happy", mouth: "big" },
    { id: "x2", label: "猫猫卖萌", eye: "dot", mouth: "cat" },
    { id: "x3", label: "傲娇气鼓", eye: "half", mouth: "pout" },
    { id: "x4", label: "使坏搞怪", eye: "smirk", mouth: "tongue" },
    { id: "x5", label: "晕头转向", eye: "spiral", mouth: "o" },
    { id: "x6", label: "热血高燃", eye: "sharp", mouth: "grit" },
    { id: "x7", label: "俏皮眨眼", eye: "wink", mouth: "smile" },
    { id: "x8", label: "呆萌发呆", eye: "dot", mouth: "closed" },
    { id: "x9", label: "委屈要哭", eye: "tear", mouth: "wave" },
    { id: "x10", label: "花痴爱心", eye: "heart", mouth: "big" },
    { id: "x11", label: "睡着了", eye: "sleep", mouth: "tiny" },
    { id: "x12", label: "生气啦", eye: "angry", mouth: "pout" },
    { id: "x13", label: "吓一跳", eye: "shock", mouth: "scream" },
    { id: "x14", label: "无语凝噎", eye: "meh", mouth: "tiny" },
  ];

  /* ================= 眉毛库 ================= */
  const BROWS = [
    { id: "none", label: "无眉" },
    { id: "soft", label: "自然" },
    { id: "arch", label: "弯眉" },
    { id: "flat", label: "平眉" },
    { id: "thick", label: "粗眉" },
    { id: "angry", label: "怒眉" },
    { id: "sad", label: "八字眉" },
    { id: "smirk", label: "坏笑眉" },
    { id: "sharp", label: "热血眉" },
    { id: "dot", label: "豆豆眉" },
    { id: "sleep", label: "睡眉" },
    { id: "worried", label: "担忧眉" },
  ];
  // 每种眼型默认配的眉毛（「跟随表情」时使用）
  const EYE_BROW = {
    happy: "soft", open: "soft", half: "flat", dot: "dot", star: "arch",
    spiral: "arch", side: "soft", smirk: "smirk", sharp: "sharp", heart: "arch",
    tear: "sad", sleep: "sleep", angry: "angry", shock: "arch", meh: "flat", wink: "soft",
  };

  /* ================= 眼眶（眼睑 / 眼窝） ================= */
  const LIDS = [
    { id: "auto", label: "跟随眼型" },
    { id: "none", label: "无" },
    { id: "thin", label: "细眶" },
    { id: "round", label: "圆眶" },
    { id: "almond", label: "杏眼" },
    { id: "cat", label: "猫眼" },
    { id: "puppy", label: "下垂眼" },
    { id: "mono", label: "单眼皮" },
    { id: "double", label: "双眼皮" },
    { id: "long", label: "细长" },
    { id: "shadow", label: "眼窝阴影" },
    { id: "tear", label: "泪沟" },
  ];
  // 「跟随眼型」时每种眼睛默认配的眼眶
  const EYE_LID = {
    happy: "none", sleep: "none", wink: "none", smirk: "none", side: "none", meh: "none",
    spiral: "none", open: "thin", half: "double", dot: "round", star: "almond",
    sharp: "cat", heart: "almond", tear: "tear", angry: "cat", shock: "round",
  };

  /* ================= 物理类型 ================= */
  const TYPE = {
    none: { k: 0, c: 1, droop: 0, w: 0, sens: 0 },
    ear: { k: 1.9, c: 0.9, droop: 0.3, w: 1, sens: 2.4 },
    tail: { k: 0.65, c: 0.85, droop: 0.42, w: 0.8, sens: 1.5 },
    hair: { k: 0.5, c: 0.9, droop: 0.34, w: 1.4, sens: 1.1 },
    cloth: { k: 0.85, c: 0.95, droop: 0.15, w: 0.9, sens: 1.2 },
  };

  /* ================= 状态 ================= */
  const state = {
    chars: [],
    cur: 0,
    face: { eye: "happy", mouth: "smile" },
    faceSet: "expr",
    color: {
      link: true,
      target: "both",
      L: { c: "#5f8f7c", h: 0, s: 0, l: 0 },
      R: { c: "#5f8f7c", h: 0, s: 0, l: 0 },
      mouth: { c: "#c0707a", h: 0, s: 0, l: 0 },
      brow: { c: "", h: 0, s: 0, l: 0 },
    },
    off: {
      expr: { x: 0, y: 0, s: 1 },
      eye: { x: 0, y: 0, s: 1 },
      mouth: { x: 0, y: 0, s: 1 },
      ear: { x: 0, y: 0, s: 1, rot: 0 },
      tail: { x: 0, y: 0, s: 1, rot: 0 },
    },
    // 眉毛：id 为 "auto" 时跟随表情；L/R 分别可调 x / y / 倾斜 / 大小
    brow: {
      id: "auto",
      side: "both",
      L: { x: 0, y: 0, rot: 0, s: 1 },
      R: { x: 0, y: 0, rot: 0, s: 1 },
    },
    // 眼眶 / 眼睑：auto = 跟随眼型；c1/c2 为空时跟随眼睛颜色
    lid: { id: "none", hue: 0, sat: 0, light: 0, grad: true, c1: "", c2: "" },
    custom: { expr: [], eye: [], lip: [], mouth: [], brow: [], ear: [], tail: [] },
    // 动作：内置预设 + 自定义（上传视频学习）
    // id = 整体动作（单选）；extra = 局部动作（可叠加多选：扭头 / 扭腰 / 扭屁股 / 挥手…）
    dance: { id: "none", extra: [], speed: 1, amp: 1, custom: [] },
    physics: { on: true, k: 0.45, c: 0.1, g: 0.35, wind: 0.18, ms: 1, tr: 1 },
    look: {
      bg: "stage",
      bgColor: "#fff6ea",
      breath: true,
      shadow: true,
      zoom: 1,
      flip: false,
      touch: false,
      mode: "drag",
      music: false,
    },
    cropMode: false,
    cropRect: null,
    editFrame: false,
    sel: null,
    mouseWind: 0,
    t: 0,
    touched: null,
  };

  const cur = () => state.chars[state.cur];
  const freshOff = () => ({
    expr: { x: 0, y: 0, s: 1 },
    eye: { x: 0, y: 0, s: 1 },
    mouth: { x: 0, y: 0, s: 1 },
    ear: { x: 0, y: 0, s: 1, rot: 0 },
    tail: { x: 0, y: 0, s: 1, rot: 0 },
  });
  const freshLid = () => ({ id: "none", hue: 0, sat: 0, light: 0, grad: true, c1: "", c2: "" });
  const freshBrow = () => ({
    id: "auto",
    side: "both",
    L: { x: 0, y: 0, rot: 0, s: 1 },
    R: { x: 0, y: 0, rot: 0, s: 1 },
  });

  /* ================= 画布 ================= */
  const canvas = $("#stage");
  const ctx = canvas.getContext("2d");
  const wrap = $("#stageWrap");
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  const view = { w: 0, h: 0, scale: 1, cx: 0, cy: 0 };

  function resize() {
    const r = wrap.getBoundingClientRect();
    view.w = r.width;
    view.h = r.height;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout();
  }
  new ResizeObserver(resize).observe(wrap);

  function layout() {
    const c = cur();
    if (!c) return;
    // 按「身体 + 耳尾」的整体包围盒取景，耳尖和尾巴才不会被切掉
    const b = bodyBounds(c);
    const bw = Math.max(1, b.maxX - b.minX);
    const bh = Math.max(1, b.maxY - b.minY);
    const k = Math.min((view.h * 0.78) / bh, (view.w * 0.84) / bw) * state.look.zoom;
    view.scale = k;
    view.cx = view.w / 2 - ((b.minX + b.maxX) / 2 - c.w / 2) * k;
    view.cy = view.h * 0.5 - ((b.minY + b.maxY) / 2 - c.h / 2) * k;
  }

  /* ================= 颜色 ================= */
  function hexToHsl(hex) {
    // 也接受已经是 hsl() 的字符串（tint 会被链式调用）
    const raw = String(hex || "#888888").trim();
    const m = raw.match(/^hsla?\(\s*(-?[\d.]+)[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
    let n = raw.replace("#", "");
    if (n.length === 3) n = n.split("").map((x) => x + x).join("");
    const r = parseInt(n.slice(0, 2), 16) / 255;
    const g = parseInt(n.slice(2, 4), 16) / 255;
    const b = parseInt(n.slice(4, 6), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (mx === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [h * 360, s * 100, l * 100];
  }
  const hsl = (h, s, l) => `hsl(${((h % 360) + 360) % 360} ${clamp(s, 0, 100)}% ${clamp(l, 2, 98)}%)`;

  function tint(hex, dh, ds, dl) {
    const [h, s, l] = hexToHsl(hex);
    return hsl(h + dh, s + ds, l + dl);
  }
  function mix(hexA, hexB, t) {
    const a = hexToHsl(hexA), b = hexToHsl(hexB);
    return hsl(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  }
  // 带透明度的同色（做渐变、阴影用）
  function withAlpha(col, a) {
    const [h, s, l] = hexToHsl(col);
    return `hsl(${((h % 360) + 360) % 360} ${clamp(s, 0, 100)}% ${clamp(l, 2, 98)}% / ${clamp(a, 0, 1)})`;
  }
  function lighten(hex, t) {
    const [h, s, l] = hexToHsl(hex);
    return hsl(h, s, l + (100 - l) * t);
  }

  /* ================= 加载 ================= */
  const imgCache = new Map();
  function loadImage(src, useEmbedded = true) {
    if (imgCache.has(src)) return Promise.resolve(imgCache.get(src));
    const embedded = useEmbedded && window.ASSET_DATA && window.ASSET_DATA[src];
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => {
        imgCache.set(src, im);
        res(im);
      };
      im.onerror = () => {
        if (embedded) loadImage(src, false).then(res, rej);
        else rej(new Error("图片加载失败：" + src));
      };
      im.src = embedded || src;
    });
  }

  const loadErrors = [];
  async function boot() {
    for (const def of CHARS) {
      try {
        const img = await loadImage(def.body);
        const c = {
          id: def.id,
          name: def.name,
          img,
          w: img.naturalWidth,
          h: img.naturalHeight,
          face: def.face,
          hair: def.hair,
          line: def.line,
          anchors: def.anchors,
          earW: def.earW,
          tailL: def.tailL,
          animal: { ...def.animal, hue: 0, sat: 0, light: 0, earScale: 1, tailScale: 1 },
          parts: [],
          px: 0, py: 0, vx: 0, vy: 0, pop: 0,
        };
        state.chars.push(c);
        if (def.hairSrc) {
          try {
            c.hairSrc = await loadImage(def.hairSrc);
          } catch (err) {
            console.warn("[兽耳工作室] 马尾图层加载失败，退回底图裁切", err);
          }
        }
        if (def.hairParts && def.hairParts.length) {
          try {
            await buildHairParts(c, def.hairParts);
          } catch (err) {
            console.warn("[兽耳工作室] 头发部件跳过", err);
          }
        }
        buildAnimalParts(c);
      } catch (err) {
        console.error("[兽耳工作室] 角色加载失败", def.id, err);
        loadErrors.push(def.name);
      }
    }
    try {
      resize();
      applyFaceColorOf(cur());
      buildCharCards();
      const qs = new URLSearchParams(location.search);
      // ?char=miku / ?char=1 都支持；默认角色由 DEFAULT_CHAR 决定
      const defIdx = state.chars.findIndex((x) => x.id === DEFAULT_CHAR);
      if (defIdx >= 0) state.cur = defIdx;
      const qchar = qs.get("char");
      if (qchar) {
        const n = Number(qchar);
        if (Number.isFinite(n) && n >= 0 && n < state.chars.length) state.cur = n;
        else {
          const i = state.chars.findIndex((x) => x.id === qchar);
          if (i >= 0) state.cur = i;
        }
      }
      // 调试用：?ear=cat&tail=cat 直接看某种耳尾
      const qe = qs.get("ear"), qt = qs.get("tail");
      const cc = cur();
      if (cc && (qe || qt)) {
        if (qe) cc.animal.ear = qe;
        if (qt) cc.animal.tail = qt;
        buildAnimalParts(cc);
      }
      buildFaceGrid();
      refreshCharUI();
      renderLayers();
      fillInspector();
      syncTabExtra();
      // 自动恢复上次的本机存档（没有就跳过）
      await loadAll(true);
    } catch (err) {
      console.error("[兽耳工作室] 初始化异常", err);
    }
    if (!state.chars.length) showLoadTip();
    requestAnimationFrame(loop);
  }

  function showLoadTip() {
    const el = document.createElement("div");
    el.style.cssText =
      "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99;" +
      "padding:14px 18px;border-radius:14px;background:#fff;color:#8a5560;" +
      "font:13px/1.7 system-ui;box-shadow:0 10px 30px rgba(0,0,0,.14);max-width:78vw;text-align:center";
    el.textContent = "角色素材没有加载成功，请确认 assets/chr 与 src/assets.js 都在文件夹里";
    document.body.appendChild(el);
  }

  /* ================= 部件 ================= */
  function makePart(p) {
    const img = p.img || null;
    const w = p.w;
    const h = img ? w * (img.height / img.width) : p.h || w;
    return {
      kind: p.kind || (img ? "image" : "animal"),
      slot: p.slot || null,
      animal: p.animal || null,
      side: p.side || null,
      name: p.name,
      img,
      type: p.type || "none",
      ax: p.ax,
      ay: p.ay,
      w,
      h,
      phys: p.phys == null ? 1 : p.phys,
      rot: p.rot || 0,
      flip: !!p.flip,
      af: p.af || [0.5, 0.5],
      z: p.z == null ? 1 : p.z,
      visible: p.visible !== false,
      auto: !!p.auto,
      customAnimal: !!p.customAnimal,
      droopDir: p.droopDir || 1,
      seed: p.seed == null ? Math.random() : p.seed,
      hue: p.hue || 0,
      sat: p.sat || 0,
      light: p.light || 0,
      angle: 0,
      vel: 0,
    };
  }

  /* 从立绘上裁出长发部件（初音双马尾），挂 hair 物理，绕发根摆动 */
  async function buildHairParts(c, defs) {
    for (const d of defs) {
      const [x0, y0, x1, y1] = d.rect;
      const w = Math.max(8, Math.round(x1 - x0));
      const h = Math.max(8, Math.round(y1 - y0));
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      // 优先从「只有马尾」的图层裁，底图上的静态马尾已经抹掉了，不会出现两条
      const src = c.hairSrc || c.img;
      cv.getContext("2d").drawImage(src, x0, y0, w, h, 0, 0, w, h);
      let im;
      try {
        const url = cv.toDataURL("image/png");
        im = await new Promise((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = () => rej(new Error("hair crop"));
          i.src = url;
        });
      } catch (err) {
        console.warn("[兽耳工作室] 头发部件生成失败", d.name, err);
        continue;
      }
      const ax = d.anchor[0];
      const ay = d.anchor[1];
      c.parts.push(makePart({
        kind: "image", slot: "hair", name: d.name, img: im, type: "hair",
        ax, ay, w, af: [(ax - x0) / w, (ay - y0) / h],
        z: d.z == null ? -1 : d.z,
        droopDir: d.droopDir || 1,
        phys: d.phys || 1,
        auto: true,
        seed: d.seed == null ? 0.37 : d.seed,
      }));
    }
  }

  function findAnimalCustom(slot, id) {
    if (!id || !id.startsWith("c:")) return null;
    return (state.custom[slot] || []).find((it) => it.id === id.slice(2)) || null;
  }

  function buildAnimalParts(c) {
    c.parts = c.parts.filter((p) => p.kind !== "animal" && !p.customAnimal);
    const A = c.animal;
    const base = { hue: A.hue, sat: A.sat, light: A.light };
    // 偏移量以「粉绿汤圆」为基准等比缩放，换角色时耳朵不会跑到头发里
    const sx = c.w / 771;
    const sy = c.h / 1210;
    const OE = state.off.ear || { x: 0, y: 0, s: 1 };
    const OT = state.off.tail || { x: 0, y: 0, s: 1 };
    // 倾斜：两只耳朵朝同一方向倒；因为右耳是镜像的，角度要取反才同向
    const tiltE = OE.rot || 0;
    const tiltT = OT.rot || 0;

    if (A.ear !== "none") {
      const cu = findAnimalCustom("ear", A.ear);
      if (cu) {
        // 自定义耳朵：一张图做成左右一对，右边镜像
        const w = c.earW * A.earScale * (OE.s == null ? 1 : OE.s) * (cu.scale || 1);
        const ay = c.anchors.earL[1] + OE.y;
        c.parts.push(makePart({
          kind: "image", slot: "ear", customAnimal: true, name: "自定义左耳",
          img: cu.img, type: "ear", ax: c.anchors.earL[0] + OE.x, ay, w,
          af: [0.5, 0.96], z: 2, droopDir: -1, seed: 0.31, rot: -tiltE,
        }));
        c.parts.push(makePart({
          kind: "image", slot: "ear", customAnimal: true, name: "自定义右耳",
          img: cu.img, type: "ear", ax: c.anchors.earR[0] - OE.x, ay, w,
          af: [0.5, 0.96], z: 3, flip: true, droopDir: 1, seed: 0.77, rot: tiltE,
        }));
      } else if (ANIMALS[A.ear]) {
        const E = ANIMALS[A.ear].ear;
        const w = c.earW * A.earScale * (OE.s == null ? 1 : OE.s);
        const h = w * E.h;
        c.parts.push(makePart({
          kind: "animal", slot: "ear", animal: A.ear, side: "L", name: "左耳",
          ax: c.anchors.earL[0] + E.dx * sx + OE.x, ay: c.anchors.earL[1] + E.dy * sy + OE.y,
          w, h, rot: -E.rot * (E.rs || 1) - tiltE, flip: false,
          type: "ear", z: 2, droopDir: -1, seed: 0.31, ...base,
        }));
        c.parts.push(makePart({
          kind: "animal", slot: "ear", animal: A.ear, side: "R", name: "右耳",
          ax: c.anchors.earR[0] - E.dx * sx - OE.x, ay: c.anchors.earR[1] + E.dy * sy + OE.y,
          w, h, rot: E.rot * (E.rs || 1) + tiltE, flip: true,
          type: "ear", z: 3, droopDir: 1, seed: 0.77, ...base,
        }));
      }
    }
    if (A.tail !== "none") {
      const cu = findAnimalCustom("tail", A.tail);
      if (cu) {
        const w = c.tailL * A.tailScale * (OT.s == null ? 1 : OT.s) * (cu.scale || 1);
        c.parts.push(makePart({
          kind: "image", slot: "tail", customAnimal: true, name: "自定义尾巴",
          img: cu.img, type: "tail", ax: c.anchors.tail[0] + OT.x, ay: c.anchors.tail[1] + OT.y,
          w, af: [0.08, 0.9], z: -1, droopDir: 1, seed: 0.52, rot: tiltT,
        }));
      } else if (ANIMALS[A.tail]) {
        const T = ANIMALS[A.tail];
        c.parts.push(makePart({
          kind: "animal", slot: "tail", animal: A.tail, side: "R", name: "尾巴",
          ax: c.anchors.tail[0] + (T.tdx || 0) * sx + OT.x, ay: c.anchors.tail[1] + OT.y,
          w: c.tailL * A.tailScale * (OT.s == null ? 1 : OT.s), h: c.tailL * A.tailScale * (OT.s == null ? 1 : OT.s),
          rot: -8 + tiltT, flip: false,
          type: "tail", z: -1, droopDir: 1, seed: 0.52, ...base,
        }));
      }
    }
  }

  function partColor(p, c) {
    // 耳朵尾巴比发色稍深一点，才不会和头发糊在一起
    return tint(c.hair, p.hue, p.sat, p.light - 5);
  }

  /* ================= 兽耳兽尾绘制 ================= */
  // 所有耳型都以「基部中心 = (0,0)，向上为 -y」定义
  function earPath(c, kind, w, h) {
    const hw = w / 2;
    c.beginPath();
    switch (kind) {
      case "rabbit":
      case "deer":
        // 长椭圆：兔稍窄、鹿更瘦长
        c.ellipse(0, -h * 0.5, hw * (kind === "deer" ? 0.72 : 0.8), h * 0.5, 0, 0, Math.PI * 2);
        break;
      case "dog":
      case "sheep":
        // 垂耳：基部窄、下方宽圆的一瓣
        c.moveTo(-hw * 0.52, 0);
        c.bezierCurveTo(-hw * 1.05, h * 0.38, -hw * 0.92, h * 0.96, -hw * 0.14, h);
        c.bezierCurveTo(hw * 0.72, h * 1.02, hw * 0.98, h * 0.48, hw * 0.34, 0);
        c.closePath();
        break;
      case "cat":
        c.moveTo(-hw, 0);
        c.quadraticCurveTo(-hw * 0.95, -h * 0.65, -hw * 0.16, -h);
        c.quadraticCurveTo(hw * 0.9, -h * 0.55, hw, 0);
        c.closePath();
        break;
      case "tiger":
      case "panda":
      case "lion":
      case "monkey":
        // 圆耳：贴着头顶的圆盘
        c.ellipse(0, -h * 0.46, hw, h * 0.5, 0, 0, Math.PI * 2);
        break;
      case "raccoon":
        // 圆耳带一点尖
        c.moveTo(-hw, -h * 0.06);
        c.quadraticCurveTo(-hw * 1.04, -h * 0.72, -hw * 0.34, -h * 0.98);
        c.quadraticCurveTo(hw * 0.44, -h * 1.04, hw * 0.94, -h * 0.58);
        c.quadraticCurveTo(hw * 1.04, -h * 0.2, hw, -h * 0.04);
        c.closePath();
        break;
      case "whale":
        // 小鳍：向后掠的三角
        c.moveTo(-hw * 0.9, 0);
        c.quadraticCurveTo(-hw * 0.1, -h * 0.86, hw * 0.5, -h * 0.98);
        c.quadraticCurveTo(hw * 0.24, -h * 0.42, hw * 0.92, 0);
        c.closePath();
        break;
      case "wolf":
        // 狼耳：比狐更窄更直
        c.moveTo(-hw * 0.9, 0);
        c.quadraticCurveTo(-hw * 0.76, -h * 0.62, -hw * 0.14, -h);
        c.quadraticCurveTo(hw * 0.68, -h * 0.62, hw * 0.9, 0);
        c.closePath();
        break;
      default:
        // 狐耳：宽底、直边、尖顶
        c.moveTo(-hw, 0);
        c.quadraticCurveTo(-hw * 0.9, -h * 0.5, -hw * 0.2, -h * 0.96);
        c.quadraticCurveTo(-hw * 0.05, -h * 1.02, hw * 0.06, -h * 0.95);
        c.quadraticCurveTo(hw * 0.82, -h * 0.55, hw, 0);
        c.closePath();
    }
  }

  const EAR_INNER = {
    fox: "ellipse", wolf: "ellipse", cat: "ellipse", rabbit: "ellipse",
    deer: "ellipse", tiger: "ellipse", lion: "ellipse", monkey: "ellipse",
    raccoon: "ellipse", panda: "none", dog: "fold", sheep: "fold", whale: "fin",
  };
  const PINK_INNER = ["cat", "rabbit", "deer", "tiger", "lion", "monkey", "raccoon"];

  function drawEar(c, p, col, line) {
    const h = p.h;
    const lw = Math.max(2, p.w * 0.042);
    c.save();
    c.lineJoin = "round";
    c.lineWidth = lw;
    c.strokeStyle = line;
    // 外耳
    earPath(c, p.animal, p.w, h);
    c.fillStyle = col;
    c.fill();
    c.stroke();

    const inner = EAR_INNER[p.animal] || "ellipse";
    const hw = p.w / 2;
    c.save();
    if (inner === "fold") {
      // 垂耳：内侧一条浅色褶皱
      c.beginPath();
      c.ellipse(0, h * 0.58, p.w * 0.19, h * 0.3, 0, 0, Math.PI * 2);
      c.fillStyle = mix(lighten(col, 0.75), "#f0b9c8", 0.45);
      c.fill();
      c.restore();
      c.restore();
      return;
    }
    if (inner === "fin") {
      c.lineWidth = lw * 0.8;
      c.strokeStyle = mix(lighten(col, 0.4), "#ffffff", 0.35);
      c.beginPath();
      c.moveTo(-hw * 0.34, -h * 0.1);
      c.quadraticCurveTo(0, -h * 0.48, hw * 0.28, -h * 0.78);
      c.stroke();
      c.restore();
      c.restore();
      return;
    }
    if (inner === "ellipse") {
      c.translate(0, -h * 0.05);
      c.scale(0.54, 0.76);
      earPath(c, p.animal, p.w, h);
      c.fillStyle = PINK_INNER.includes(p.animal)
        ? mix(lighten(col, 0.7), "#f2a8bc", 0.55)
        : mix(lighten(col, 0.8), "#f7c2cf", 0.5);
      c.fill();
    }
    c.restore();
    c.restore();
  }

  function smoothLine(c, pts, move) {
    if (move) c.moveTo(pts[0][0], pts[0][1]);
    else c.lineTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    c.lineTo(last[0], last[1]);
  }

  function ribbon(c, pts, radii) {
    const n = pts.length;
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const len = Math.hypot(tx, ty) || 1;
      tx /= len; ty /= len;
      const nx = -ty, ny = tx;
      left.push([pts[i][0] + nx * radii[i], pts[i][1] + ny * radii[i]]);
      right.push([pts[i][0] - nx * radii[i], pts[i][1] - ny * radii[i]]);
    }
    c.beginPath();
    smoothLine(c, left, true);
    smoothLine(c, right.reverse(), false);
    c.closePath();
  }

  /* 沿脊线按弧长比例取点，用于画环纹 */
  function spineAt(pts, radii, f) {
    const seg = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      seg.push(d);
      total += d;
    }
    let want = total * clamp(f, 0, 1), acc = 0;
    for (let i = 0; i < seg.length; i++) {
      const last = i === seg.length - 1;
      if (acc + seg[i] >= want || last) {
        const t = seg[i] ? clamp((want - acc) / seg[i], 0, 1) : 0;
        const a = pts[i], b = pts[i + 1];
        return {
          x: a[0] + (b[0] - a[0]) * t,
          y: a[1] + (b[1] - a[1]) * t,
          ang: Math.atan2(b[1] - a[1], b[0] - a[0]),
          r: radii[i] + ((radii[i + 1] == null ? radii[i] : radii[i + 1]) - radii[i]) * t,
        };
      }
      acc += seg[i];
    }
    return { x: 0, y: 0, ang: 0, r: 0 };
  }

  const TAIL_SHAPES = {
    bushy: {
      spine: [[0, 0], [0.14, -0.05], [0.3, -0.01], [0.44, 0.14], [0.5, 0.34], [0.45, 0.52]],
      radii: [0.12, 0.19, 0.24, 0.25, 0.2, 0.12],
      tip: 0.14,
    },
    wolf: {
      spine: [[0, 0], [0.2, -0.1], [0.44, -0.08], [0.64, 0.06], [0.76, 0.28]],
      radii: [0.085, 0.1, 0.105, 0.088, 0.055],
      tip: 0.1,
    },
    slim: {
      spine: [[0, 0], [0.2, -0.14], [0.42, -0.16], [0.6, -0.02], [0.66, 0.2]],
      radii: [0.05, 0.062, 0.068, 0.062, 0.05],
    },
    curl: {
      spine: [[0, 0], [0.18, -0.06], [0.4, -0.02], [0.5, 0.2], [0.42, 0.4]],
      radii: [0.07, 0.115, 0.125, 0.1, 0.07],
    },
    tiger: {
      spine: [[0, 0], [0.14, 0.02], [0.26, 0.16], [0.3, 0.36], [0.26, 0.54], [0.16, 0.64]],
      radii: [0.07, 0.075, 0.07, 0.058, 0.045, 0.03],
      stripes: true,
    },
    lion: {
      spine: [[0, 0], [0.18, 0.02], [0.4, 0.12], [0.56, 0.3], [0.62, 0.46]],
      radii: [0.042, 0.046, 0.042, 0.034, 0.026],
      tuft: 0.078,
    },
    monkey: {
      spine: [[0, 0], [0.22, 0.06], [0.4, 0.24], [0.42, 0.44], [0.28, 0.56], [0.13, 0.5]],
      radii: [0.05, 0.055, 0.05, 0.045, 0.038, 0.03],
    },
    squirrel: {
      spine: [[0, 0], [0.16, -0.12], [0.38, -0.24], [0.56, -0.16], [0.6, 0.06], [0.5, 0.22]],
      radii: [0.1, 0.2, 0.26, 0.24, 0.17, 0.1],
    },
    // 浣熊：蓬松粗尾，向内上卷，带 4 道深色环纹 + 深色尾尖
    raccoon: {
      spine: [[0, 0], [0.18, -0.1], [0.4, -0.2], [0.62, -0.22], [0.76, -0.08], [0.8, 0.12]],
      radii: [0.05, 0.095, 0.12, 0.125, 0.1, 0.055],
      rings: [0.24, 0.44, 0.64, 0.84],
      bandW: 0.05,
      tipDark: true,
    },
    puff: { ball: 0.2, lobes: 3 },
    panda: { ball: 0.16, lobes: 1 },
    deer: { ball: 0.16, lobes: 1, spot: true },
    sheep: { ball: 0.23, lobes: 5 },
    whale: { fin: true },
  };

  function drawTail(c, p, col, line) {
    const L = p.w;
    const lw = Math.max(2, L * 0.016);
    // p.animal 是种类 id（cat / rabbit…），真正的造型名在 ANIMALS[种类].tail
    // 以前直接拿种类 id 查造型表，猫/狗/兔都查不到 → 全部回落到狐尾，看起来就是「名字反了 / 兔尾其实是狐尾」
    const conf = ANIMALS[p.animal] || {};
    const shape = TAIL_SHAPES[conf.tail || p.animal] || TAIL_SHAPES.bushy;
    c.save();
    c.lineJoin = "round";
    c.lineWidth = lw;
    c.strokeStyle = line;

    // 圆球尾（兔 / 熊猫 / 鹿 / 羊）
    if (shape.ball) {
      const r = Math.max(6, L * shape.ball);
      const cx = L * 0.16;
      const cy = L * 0.16;
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.fillStyle = col;
      c.fill();
      c.stroke();
      const n = shape.lobes || 1;
      if (n > 1) {
        c.save();
        c.lineWidth = lw * 0.85;
        c.strokeStyle = tint(col, 0, 0, -14);
        c.beginPath();
        for (let i = 0; i < n; i++) {
          const a = -Math.PI * 0.85 + (Math.PI * 1.7 * i) / n;
          c.moveTo(cx + Math.cos(a) * r * 0.1, cy + Math.sin(a) * r * 0.1);
          c.quadraticCurveTo(
            cx + Math.cos(a + 0.5) * r * 0.62, cy + Math.sin(a + 0.5) * r * 0.62,
            cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92
          );
        }
        c.stroke();
        c.restore();
      }
      if (shape.spot) {
        c.beginPath();
        c.arc(cx - r * 0.18, cy - r * 0.22, r * 0.44, 0, Math.PI * 2);
        c.fillStyle = lighten(col, 0.86);
        c.fill();
      }
      c.restore();
      return;
    }

    // 鲸尾：两片尾鳍
    if (shape.fin) {
      const s = L;
      c.beginPath();
      c.moveTo(s * 0.02, s * 0.26);
      c.quadraticCurveTo(s * 0.3, s * 0.28, s * 0.46, s * 0.22);
      c.quadraticCurveTo(s * 0.66, -s * 0.06, s * 0.84, s * 0.06);
      c.quadraticCurveTo(s * 0.72, s * 0.24, s * 0.52, s * 0.34);
      c.quadraticCurveTo(s * 0.72, s * 0.42, s * 0.86, s * 0.62);
      c.quadraticCurveTo(s * 0.54, s * 0.6, s * 0.3, s * 0.44);
      c.quadraticCurveTo(s * 0.14, s * 0.36, s * 0.02, s * 0.26);
      c.closePath();
      c.fillStyle = col;
      c.fill();
      c.stroke();
      c.restore();
      return;
    }

    const pts = shape.spine.map(([x, y]) => [x * L, y * L]);
    const radii = shape.radii.map((r) => r * L);

    // 末端补一个收拢点，让尾巴尖是圆头而不是切口
    const a = pts[pts.length - 2], b = pts[pts.length - 1];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    tx /= len; ty /= len;
    const lastR = radii[radii.length - 1];
    pts.push([b[0] + tx * lastR * 0.8, b[1] + ty * lastR * 0.8]);
    radii.push(lastR * 0.45);

    ribbon(c, pts, radii);
    c.fillStyle = col;
    c.fill();
    c.stroke();

    // 虎尾斑纹
    if (shape.stripes) {
      c.save();
      c.strokeStyle = tint(col, 0, 0, -32);
      c.lineWidth = lw * 1.2;
      c.lineCap = "round";
      for (let i = 1; i < pts.length - 2; i++) {
        const p0 = pts[i - 1], p1 = pts[i + 1];
        let vx = p1[0] - p0[0], vy = p1[1] - p0[1];
        const l2 = Math.hypot(vx, vy) || 1;
        vx /= l2; vy /= l2;
        const nx = -vy, ny = vx;
        const r0 = radii[i] * 0.9;
        c.beginPath();
        c.moveTo(pts[i][0] + nx * r0, pts[i][1] + ny * r0);
        c.lineTo(pts[i][0] - nx * r0, pts[i][1] - ny * r0);
        c.stroke();
      }
      c.restore();
    }

    // 浣熊尾：横向深色环纹（裁在尾巴轮廓里，两边不会溢出去）
    if (shape.rings) {
      c.save();
      ribbon(c, pts, radii);
      c.clip();
      c.strokeStyle = tint(col, 0, 4, -32);
      c.lineCap = "butt";
      c.lineWidth = (shape.bandW || 0.08) * L;
      for (const f of shape.rings) {
        const s = spineAt(pts, radii, f);
        const nx = -Math.sin(s.ang);
        const ny = Math.cos(s.ang);
        const ext = s.r * 1.15;
        c.beginPath();
        c.moveTo(s.x + nx * ext, s.y + ny * ext);
        c.lineTo(s.x - nx * ext, s.y - ny * ext);
        c.stroke();
      }
      c.restore();
    }
    // 深色尾尖（浣熊）
    if (shape.tipDark) {
      const e = pts[pts.length - 1];
      c.beginPath();
      c.arc(e[0], e[1], radii[radii.length - 1] * 1.35, 0, Math.PI * 2);
      c.fillStyle = tint(col, 0, 4, -30);
      c.fill();
    }

    if (shape.tip) {
      const e = pts[pts.length - 2];
      c.beginPath();
      c.arc(e[0], e[1], shape.tip * L, 0, Math.PI * 2);
      c.fillStyle = variantTip(col);
      c.fill();
    }
    // 狮尾：末端一撮毛
    if (shape.tuft) {
      const e = pts[pts.length - 2];
      c.beginPath();
      c.arc(e[0], e[1], shape.tuft * L, 0, Math.PI * 2);
      c.fillStyle = tint(col, 0, 4, -18);
      c.fill();
      c.strokeStyle = line;
      c.lineWidth = lw;
      c.stroke();
    }
    c.restore();
  }

  function variantTip(col) {
    return mix(lighten(col, 0.9), "#ffffff", 0.5);
  }

  function drawAnimalPart(c, p, ch) {
    let col = partColor(p, ch);
    const conf = ANIMALS[p.animal] || {};
    const abs = p.slot === "ear" ? conf.earAbs : conf.tailAbs;
    const adj = p.slot === "ear" ? conf.earColor : conf.tailColor;
    if (abs) col = abs;
    else if (adj) col = tint(col, adj[0], adj[1], adj[2]);
    c.save();
    c.translate(p.ax, p.ay);
    c.rotate((p.rot + p.angle / DEG) * DEG);
    if (p.flip) c.scale(-1, 1);
    if (p.slot === "ear") drawEar(c, p, col, ch.line);
    else drawTail(c, p, col, ch.line);
    c.restore();
  }

  /* ================= 五官绘制 ================= */
  function ell(c, x, y, rx, ry) {
    c.beginPath();
    c.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  }

  function starPath(c, x, y, rx, ry, n = 5) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (Math.PI / n) * i - Math.PI / 2;
      const rr = i % 2 ? 0.42 : 1;
      const px = x + Math.cos(a) * rx * rr;
      const py = y + Math.sin(a) * ry * rr;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath();
    c.fill();
  }

  function spiralPath(c, x, y, r) {
    c.beginPath();
    for (let i = 0; i <= 46; i++) {
      const t = i / 46;
      const a = t * Math.PI * 3.4;
      const rr = r * t;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * 0.92;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke();
  }

  /* 单只眼睛：dir=-1 左眼（画面左），dir=+1 右眼 */
  function eyeOne(c, id, x, y, w, h, dir, col, lw) {
    c.fillStyle = col;
    c.strokeStyle = col;
    const open = (k = 1) => {
      ell(c, x, y, w * k, h * k);
      c.fill();
      c.fillStyle = "#fff";
      ell(c, x - w * 0.3 * k, y - h * 0.34 * k, w * 0.3, h * 0.24);
      c.fill();
      c.fillStyle = col;
    };

    switch (id) {
      case "open":
        open();
        break;
      case "happy":
        c.beginPath();
        c.moveTo(x - w, y + h * 0.18);
        c.quadraticCurveTo(x, y - h * 0.68, x + w, y + h * 0.18);
        c.stroke();
        break;
      case "dot":
        ell(c, x, y + h * 0.06, w * 0.46, h * 0.36);
        c.fill();
        break;
      case "star":
        starPath(c, x, y, w * 1.25, h * 0.62, 5);
        break;
      case "spiral":
        c.lineWidth = lw * 0.8;
        spiralPath(c, x, y, w * 1.15);
        break;
      case "half":
        c.save();
        c.beginPath();
        c.rect(x - w * 1.5, y - h * 0.18, w * 3, h * 1.6);
        c.clip();
        ell(c, x, y, w, h * 1.02);
        c.fill();
        c.restore();
        c.lineWidth = lw * 0.85;
        c.beginPath();
        c.moveTo(x - w * 1.15, y - h * 0.16);
        c.lineTo(x + w * 1.15, y - h * 0.16);
        c.stroke();
        break;
      case "side":
        c.fillStyle = "#fff";
        ell(c, x, y, w, h);
        c.fill();
        c.fillStyle = col;
        ell(c, x + w * 0.34 * dir, y, w * 0.5, h * 0.7);
        c.fill();
        break;
      case "wink":
        if (dir < 0) {
          c.beginPath();
          c.moveTo(x - w, y);
          c.quadraticCurveTo(x, y - h * 0.85, x + w, y);
          c.stroke();
        } else {
          open();
        }
        break;
      case "smirk":
        // 挑眉坏笑：眉毛交给「眉毛」层，这里只画眼
        c.beginPath();
        if (dir < 0) {
          c.moveTo(x - w, y + h * 0.16);
          c.quadraticCurveTo(x, y - h * 0.52, x + w, y - h * 0.02);
        } else {
          c.moveTo(x - w, y - h * 0.06);
          c.quadraticCurveTo(x, y - h * 0.82, x + w, y - h * 0.3);
        }
        c.stroke();
        break;
      case "sharp":
        c.beginPath();
        c.moveTo(x - w * 1.2 * dir, y + h * 0.06);
        c.lineTo(x + w * 1.1 * dir, y - h * 0.6);
        c.lineTo(x + w * 0.85 * dir, y + h * 0.6);
        c.closePath();
        c.fill();
        break;
      case "heart": {
        const s = w * 0.62;
        c.beginPath();
        c.moveTo(x, y + s * 0.95);
        c.bezierCurveTo(x - s * 1.5, y - s * 0.1, x - s * 0.8, y - s * 1.35, x, y - s * 0.5);
        c.bezierCurveTo(x + s * 0.8, y - s * 1.35, x + s * 1.5, y - s * 0.1, x, y + s * 0.95);
        c.closePath();
        c.fill();
        c.fillStyle = "#fff";
        ell(c, x - s * 0.42, y - s * 0.42, s * 0.2, s * 0.15);
        c.fill();
        c.fillStyle = col;
        break;
      }
      case "tear":
        c.lineWidth = lw * 0.85;
        c.beginPath();
        c.moveTo(x - w * 1.05, y - h * 0.62);
        c.quadraticCurveTo(x, y - h * 1.02, x + w * 1.05, y - h * 0.55);
        c.stroke();
        c.fillStyle = col;
        ell(c, x, y + h * 0.06, w * 0.56, h * 0.5);
        c.fill();
        c.fillStyle = "#fff";
        ell(c, x - w * 0.16, y - h * 0.12, w * 0.2, h * 0.18);
        c.fill();
        c.fillStyle = "#8fd4f2";
        {
          const tx = x + dir * w * 0.85;
          const ty = y + h * 0.5;
          c.beginPath();
          c.moveTo(tx, ty - h * 0.62);
          c.quadraticCurveTo(tx + w * 0.4, ty + h * 0.12, tx, ty + h * 0.5);
          c.quadraticCurveTo(tx - w * 0.4, ty + h * 0.12, tx, ty - h * 0.62);
          c.closePath();
          c.fill();
        }
        c.fillStyle = col;
        break;
      case "sleep":
        c.lineWidth = lw * 0.95;
        c.beginPath();
        c.moveTo(x - w, y - h * 0.12);
        c.quadraticCurveTo(x, y + h * 0.46, x + w, y - h * 0.12);
        c.stroke();
        if (dir > 0) {
          c.lineWidth = lw * 0.6;
          const zx = x + w * 1.35;
          const zy = y - h * 1.4;
          for (const [i, sz] of [[0, 0.5], [1, 0.36], [2, 0.26]]) {
            const bx = zx + w * 0.55 * i;
            const by = zy - h * 0.5 * i;
            const s2 = w * sz;
            c.beginPath();
            c.moveTo(bx, by);
            c.lineTo(bx + s2, by);
            c.lineTo(bx, by + s2);
            c.lineTo(bx + s2, by + s2);
            c.stroke();
          }
        }
        break;
      case "angry":
        c.fillStyle = "#fff";
        ell(c, x, y + h * 0.1, w * 0.92, h * 0.82);
        c.fill();
        c.fillStyle = col;
        ell(c, x, y + h * 0.2, w * 0.5, h * 0.5);
        c.fill();
        break;
      case "shock":
        c.fillStyle = "#fff";
        ell(c, x, y, w * 1.05, h * 1.06);
        c.fill();
        c.fillStyle = col;
        ell(c, x, y + h * 0.06, w * 0.34, h * 0.34);
        c.fill();
        c.fillStyle = "#fff";
        ell(c, x - w * 0.34, y - h * 0.4, w * 0.16, h * 0.14);
        c.fill();
        break;
      case "meh":
        c.lineWidth = lw * 0.95;
        c.beginPath();
        c.moveTo(x - w * 1.05, y + h * 0.06);
        c.quadraticCurveTo(x, y - h * 0.14, x + w * 1.05, y + h * 0.06);
        c.stroke();
        break;
      default:
        open();
    }
  }

  /* 单条眉毛：以 (x,y) 为中心，w 为半宽，dir=-1 左眉 / +1 右眉
     眉型统一按「左眉视角」定义，右眉水平镜像 */
  function browOne(c, id, x, y, w, dir, col, lw, rot, s) {
    if (!id || id === "none") return;
    const isR = dir > 0;
    c.save();
    c.translate(x, y);
    c.rotate(rot * DEG);
    c.scale(s * dir, s);
    c.strokeStyle = col;
    c.fillStyle = col;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.lineWidth = lw;
    c.beginPath();
    switch (id) {
      case "arch":
        c.moveTo(-w, w * 0.22);
        c.quadraticCurveTo(-w * 0.1, -w * 0.74, w, w * 0.04);
        break;
      case "flat":
        c.moveTo(-w, w * 0.08);
        c.quadraticCurveTo(0, -w * 0.12, w, -w * 0.08);
        break;
      case "thick":
        c.lineWidth = lw * 1.9;
        c.moveTo(-w, w * 0.06);
        c.quadraticCurveTo(0, -w * 0.16, w, -w * 0.06);
        break;
      case "angry":
        c.lineWidth = lw * 1.25;
        c.moveTo(-w, -w * 0.36);
        c.lineTo(w, w * 0.34);
        break;
      case "sad":
        c.moveTo(-w, w * 0.44);
        c.quadraticCurveTo(0, -w * 0.06, w, -w * 0.3);
        break;
      case "smirk":
        // 一高一低才像坏笑：左眉压平、右眉挑起
        c.lineWidth = lw * 0.92;
        if (isR) {
          c.moveTo(-w, w * 0.34);
          c.lineTo(w * 1.05, -w * 0.5);
        } else {
          c.moveTo(-w, w * 0.2);
          c.lineTo(w, -w * 0.04);
        }
        break;
      case "sharp":
        c.lineWidth = lw * 1.15;
        c.moveTo(-w * 1.08, w * 0.32);
        c.lineTo(w * 1.02, -w * 0.36);
        break;
      case "dot":
        ell(c, 0, 0, w * 0.3, w * 0.26);
        c.fill();
        break;
      case "sleep":
        c.lineWidth = lw * 0.85;
        c.moveTo(-w, w * 0.12);
        c.quadraticCurveTo(0, w * 0.04, w, w * 0.14);
        break;
      case "worried":
        c.moveTo(-w, w * 0.3);
        c.quadraticCurveTo(-w * 0.2, -w * 0.22, w * 0.72, -w * 0.14);
        break;
      default: // soft 自然眉
        c.moveTo(-w, w * 0.14);
        c.quadraticCurveTo(-w * 0.1, -w * 0.52, w, w * 0.02);
    }
    if (id !== "dot") c.stroke();
    c.restore();
  }

  function browColor(side, colL, colR) {
    const B = state.color.brow || {};
    const base = B.c || (side === "L" ? colL : colR);
    // 没指定颜色时沿用「比眼睛深一点的同色系」
    if (B.c) return tint(base, B.h || 0, B.s || 0, B.l || 0);
    return tint(base, B.h || 0, 16 + (B.s || 0), -26 + (B.l || 0));
  }

  function drawBrows(c, b, id, colL, colR, ox, oy, sc) {
    if (!id || id === "none") return;
    const B = state.brow;
    // 默认细一点、小一点：宽度收 17%、线宽收 30%，仍可用「大小/倾斜」细调
    const w = b.rx * 0.25;
    const dx = b.rx * 0.4;
    const y = b.cy + oy - b.ry * 0.5 * (sc || 1);
    const lw = Math.max(1.5, b.rx * 0.05);
    const item = findCustom("brow", id);
    for (const side of ["L", "R"]) {
      const S = B[side] || { x: 0, y: 0, rot: 0, s: 1 };
      const bx = b.cx + (side === "L" ? -dx : dx) + ox + (S.x || 0);
      const by = y + (S.y || 0);
      if (item) {
        // 自定义眉毛图：左边原样、右边镜像
        const bw = b.rx * 0.55 * (S.s == null ? 1 : S.s) * (sc || 1);
        const bh = bw * (item.img.height / item.img.width);
        c.save();
        c.translate(bx, by);
        c.rotate((S.rot || 0) * DEG);
        if (side === "R") c.scale(-1, 1);
        c.drawImage(item.img, -bw / 2, -bh / 2, bw, bh);
        c.restore();
        continue;
      }
      browOne(c, id, bx, by, w, side === "L" ? -1 : 1, browColor(side, colL, colR),
        lw, S.rot || 0, S.s == null ? 1 : S.s);
    }
  }

  /* ================= 眼眶（眼睑 / 眼窝）绘制 ================= */
  const resolveLid = (eyeId) => {
    const L = state.lid;
    if (!L || L.id === "auto") return EYE_LID[eyeId] || "thin";
    return L.id;
  };

  // 单只眼眶：原点在眼睛中心，dir=1 时外眼角在 +X
  // 几何全部贴着真实眼睛轮廓（半宽 w、半高 h）走，避免和眉毛挤在一起
  function lidOne(c, id, x, y, w, h, dir, eyeCol, lw) {
    if (!id || id === "none") return;
    const L = state.lid;
    const W = w * 1.16;
    const H = h;
    // 自定义颜色也会跟着色相/对比度/明度一起偏，滑杆才不会失效
    const col1 = tint(L.c1 || eyeCol, L.hue, L.sat, L.light - 12);
    const col2 = tint(L.c2 || eyeCol, L.hue, L.sat + 10, L.light - 34);
    const A = L.grad ? col2 : col1;

    c.save();
    c.translate(x, y);
    c.scale(dir, 1);
    c.lineCap = "round";
    c.lineJoin = "round";

    const grad = (x0, y0, x1, y1, a0, a1) => {
      if (!L.grad) return withAlpha(col1, (a0 + a1) / 2);
      const g = c.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, withAlpha(col1, a0));
      g.addColorStop(1, withAlpha(A, a1));
      return g;
    };

    c.strokeStyle = grad(0, -H * 1.05, 0, H, 0.92, 0.5);
    c.fillStyle = grad(0, -H * 1.05, 0, H * 1.15, 0.85, 0.3);
    c.lineWidth = lw * 0.62;

    switch (id) {
      case "thin":
        c.beginPath();
        c.moveTo(-W, H * 0.12);
        c.quadraticCurveTo(-W * 0.12, -H * 1.04, W * 0.94, -H * 0.14);
        c.stroke();
        break;
      case "round":
        c.beginPath();
        c.ellipse(0, 0, W * 0.98, H * 1.02, 0, 0, Math.PI * 2);
        c.stroke();
        break;
      case "almond":
        c.beginPath();
        c.moveTo(-W, 0);
        c.quadraticCurveTo(-W * 0.12, -H * 1.08, W, -H * 0.04);
        c.quadraticCurveTo(-W * 0.12, H * 1.0, -W, 0);
        c.closePath();
        c.stroke();
        break;
      case "cat":
        c.beginPath();
        c.moveTo(-W, H * 0.14);
        c.quadraticCurveTo(-W * 0.12, -H * 1.02, W * 0.94, -H * 0.16);
        c.quadraticCurveTo(W * 1.06, -H * 0.3, W * 1.16, -H * 0.66);
        c.stroke();
        c.lineWidth = lw * 0.38;
        c.beginPath();
        c.moveTo(-W * 0.86, H * 0.55);
        c.quadraticCurveTo(0, H * 1.04, W * 0.86, H * 0.2);
        c.stroke();
        break;
      case "puppy":
        c.beginPath();
        c.moveTo(-W * 0.98, -H * 0.28);
        c.quadraticCurveTo(-W * 0.02, -H * 1.02, W * 0.98, H * 0.32);
        c.stroke();
        c.lineWidth = lw * 0.38;
        c.beginPath();
        c.moveTo(-W * 0.82, H * 0.62);
        c.quadraticCurveTo(0, H * 1.06, W * 0.9, H * 0.5);
        c.stroke();
        break;
      case "mono":
        c.lineWidth = lw * 0.42;
        c.beginPath();
        c.moveTo(-W, H * 0.06);
        c.quadraticCurveTo(-W * 0.1, -H * 1.03, W * 0.96, -H * 0.1);
        c.quadraticCurveTo(-W * 0.06, -H * 0.42, -W, H * 0.06);
        c.closePath();
        c.fill();
        break;
      case "double":
        c.beginPath();
        c.moveTo(-W, H * 0.12);
        c.quadraticCurveTo(-W * 0.12, -H * 1.03, W * 0.94, -H * 0.14);
        c.stroke();
        c.lineWidth = lw * 0.34;
        c.beginPath();
        c.moveTo(-W * 0.66, -H * 1.08);
        c.quadraticCurveTo(-W * 0.04, -H * 1.3, W * 0.64, -H * 1.04);
        c.stroke();
        break;
      case "long":
        c.beginPath();
        c.ellipse(0, 0, W * 1.12, H * 0.72, 0, 0, Math.PI * 2);
        c.stroke();
        break;
      case "shadow":
        c.beginPath();
        c.ellipse(0, -H * 0.92, W * 1.0, H * 0.5, 0, 0, Math.PI * 2);
        c.fillStyle = grad(0, -H * 1.42, 0, -H * 0.45, 0.78, 0.03);
        c.fill();
        c.lineWidth = lw * 0.36;
        c.strokeStyle = withAlpha(col2, 0.5);
        c.beginPath();
        c.moveTo(-W * 0.9, H * 0.1);
        c.quadraticCurveTo(-W * 0.1, -H * 1.02, W * 0.9, -H * 0.16);
        c.stroke();
        break;
      case "tear":
        c.lineWidth = lw * 0.42;
        c.beginPath();
        c.moveTo(-W * 0.88, H * 0.5);
        c.quadraticCurveTo(0, H * 1.06, W * 0.9, H * 0.36);
        c.stroke();
        c.beginPath();
        c.ellipse(0, H * 1.02, W * 0.8, H * 0.22, 0, 0, Math.PI * 2);
        c.fillStyle = grad(0, H * 0.82, 0, H * 1.24, 0.42, 0.03);
        c.fill();
        break;
      default:
        break;
    }
    c.restore();
  }

  function drawLids(c, b, id, colL, colR, ox, oy) {
    if (!id || id === "none") return;
    const w = b.rx * 0.2;
    const h = b.ry * 0.46;
    const dx = b.rx * 0.4;
    const y = b.cy - b.ry * 0.03 + oy;
    const lw = Math.max(2.4, b.rx * 0.075);
    lidOne(c, id, b.cx - dx + ox, y, w, h, -1, colL, lw);
    lidOne(c, id, b.cx + dx + ox, y, w, h, 1, colR, lw);
  }

  function drawEyes(c, b, id, colL, colR, ox, oy) {
    const w = b.rx * 0.2;
    const h = b.ry * 0.46;
    const dx = b.rx * 0.4;
    const y = b.cy - b.ry * 0.03 + oy;
    const lw = Math.max(2.4, b.rx * 0.072);
    c.save();
    c.lineCap = "round";
    c.lineJoin = "round";
    c.lineWidth = lw;
    eyeOne(c, id, b.cx - dx + ox, y, w, h, -1, colL, lw);
    eyeOne(c, id, b.cx + dx + ox, y, w, h, 1, colR, lw);
    c.restore();
  }

  function drawMouth(c, b, id, color, ox, oy) {
    const x = b.cx + ox;
    const y = b.cy + b.ry * 0.42 + oy;
    const w = b.rx * 0.3;
    const h = b.ry * 0.24;
    const lw = Math.max(2.4, b.rx * 0.05);
    const dark = tint(color, 0, 6, -14);
    c.save();
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.lineWidth = lw;

    switch (id) {
      case "closed":
        c.beginPath();
        c.moveTo(x - w * 0.5, y);
        c.quadraticCurveTo(x, y + h * 0.5, x + w * 0.5, y);
        c.stroke();
        break;
      case "smile":
        c.beginPath();
        c.moveTo(x - w, y - h * 0.12);
        c.quadraticCurveTo(x, y + h * 0.9, x + w, y - h * 0.12);
        c.stroke();
        break;
      case "big":
        c.beginPath();
        c.moveTo(x - w * 0.95, y - h * 0.22);
        c.quadraticCurveTo(x, y + h * 1.55, x + w * 0.95, y - h * 0.22);
        c.closePath();
        c.fillStyle = dark;
        c.fill();
        ell(c, x, y + h * 0.62, w * 0.42, h * 0.3);
        c.fillStyle = color;
        c.fill();
        break;
      case "a":
        ell(c, x, y, w * 0.7, h * 0.95);
        c.fillStyle = dark;
        c.fill();
        break;
      case "e":
        ell(c, x, y, w * 1.0, h * 0.4);
        c.fillStyle = dark;
        c.fill();
        break;
      case "u":
        ell(c, x, y, w * 0.42, h * 0.5);
        c.fillStyle = dark;
        c.fill();
        break;
      case "eh":
        ell(c, x, y, w * 0.8, h * 0.66);
        c.fillStyle = dark;
        c.fill();
        break;
      case "o":
        ell(c, x, y, w * 0.56, h * 0.8);
        c.fillStyle = dark;
        c.fill();
        break;
      case "grit":
        c.beginPath();
        c.roundRect(x - w * 0.86, y - h * 0.5, w * 1.72, h * 0.95, h * 0.3);
        c.fillStyle = "#fff";
        c.fill();
        c.stroke();
        c.beginPath();
        c.moveTo(x - w * 0.3, y - h * 0.5);
        c.lineTo(x - w * 0.3, y + h * 0.45);
        c.moveTo(x + w * 0.3, y - h * 0.5);
        c.lineTo(x + w * 0.3, y + h * 0.45);
        c.stroke();
        break;
      case "cat":
        c.beginPath();
        c.moveTo(x - w * 0.8, y);
        c.quadraticCurveTo(x - w * 0.4, y + h * 0.6, x, y);
        c.quadraticCurveTo(x + w * 0.4, y + h * 0.6, x + w * 0.8, y);
        c.stroke();
        break;
      case "pout":
        ell(c, x, y, w * 0.3, h * 0.42);
        c.fill();
        break;
      case "tongue":
        c.beginPath();
        c.moveTo(x - w * 0.78, y - h * 0.1);
        c.quadraticCurveTo(x, y + h * 0.52, x + w * 0.78, y - h * 0.1);
        c.stroke();
        ell(c, x + w * 0.04, y + h * 0.34, w * 0.34, h * 0.42);
        c.fill();
        break;
      case "smirkMouth":
        c.beginPath();
        c.moveTo(x - w * 0.8, y);
        c.quadraticCurveTo(x + w * 0.12, y + h * 0.55, x + w * 0.85, y - h * 0.2);
        c.stroke();
        break;
      case "wave":
        c.lineWidth = lw * 0.9;
        c.beginPath();
        c.moveTo(x - w, y);
        c.quadraticCurveTo(x - w * 0.5, y - h * 0.55, x, y);
        c.quadraticCurveTo(x + w * 0.5, y + h * 0.55, x + w, y);
        c.stroke();
        break;
      case "scream":
        c.beginPath();
        c.moveTo(x - w * 0.7, y - h * 0.45);
        c.quadraticCurveTo(x, y - h * 0.75, x + w * 0.7, y - h * 0.45);
        c.quadraticCurveTo(x + w * 0.55, y + h * 1.35, x, y + h * 1.35);
        c.quadraticCurveTo(x - w * 0.55, y + h * 1.35, x - w * 0.7, y - h * 0.45);
        c.closePath();
        c.fillStyle = dark;
        c.fill();
        ell(c, x, y + h * 1.0, w * 0.3, h * 0.24);
        c.fillStyle = color;
        c.fill();
        break;
      case "tiny":
        c.lineWidth = lw * 0.85;
        c.beginPath();
        c.moveTo(x - w * 0.26, y + h * 0.06);
        c.quadraticCurveTo(x, y - h * 0.1, x + w * 0.26, y + h * 0.06);
        c.stroke();
        break;
    }
    c.restore();
  }

  function drawBlush(c, b, dx, dy) {
    c.save();
    c.fillStyle = "rgba(255,150,160,0.30)";
    for (const s of [-1, 1]) {
      ell(c, b.cx + s * b.rx * 0.62 + dx, b.cy + b.ry * 0.3 + dy, b.rx * 0.18, b.ry * 0.16);
      c.fill();
    }
    c.restore();
  }

  function findCustom(set, id) {
    if (!id || !id.startsWith("c:")) return null;
    return (state.custom[set] || []).find((it) => it.id === id.slice(2)) || null;
  }

  function drawCustomImg(c, item, x, y, w) {
    const h = w * (item.img.height / item.img.width);
    c.drawImage(item.img, x - w / 2, y - h / 2, w, h);
  }

  function drawFace(c, b, cfg) {
    const off = cfg.off;
    const ex = off.expr.x, ey = off.expr.y;
    const es = off.expr.s == null ? 1 : off.expr.s;
    const eyeS = (off.eye.s == null ? 1 : off.eye.s) * es;
    const mouthS = (off.mouth.s == null ? 1 : off.mouth.s) * es;
    const eyeX = off.eye.x + ex, eyeY = off.eye.y + ey;
    const mouthX = off.mouth.x + ex, mouthY = off.mouth.y + ey;

    if (cfg.exprImg) {
      // 整脸表情图：整体做偏移 + 缩放
      const ix = b.cx + ex, iy = b.cy - b.ry * 0.1 + ey;
      c.save();
      c.translate(ix, iy);
      c.scale(es, es);
      c.translate(-ix, -iy);
      drawCustomImg(c, cfg.exprImg, ix, iy, b.rx * 2.2 * cfg.exprImg.scale);
      c.restore();
      return;
    }
    drawBlush(c, b, ex, ey);

    // 眉毛：独立一层，自动跟随表情或手动指定
    const browId = cfg.browId
      || (state.brow.id === "auto" ? EYE_BROW[cfg.eye] || "soft" : state.brow.id);
    drawBrows(c, b, browId, cfg.colL, cfg.colR, eyeX, eyeY, eyeS);

    // 眼睛（按自身中心缩放）
    const eyeCx = b.cx + eyeX;
    const eyeCy = b.cy - b.ry * 0.03 + eyeY;
    c.save();
    c.translate(eyeCx, eyeCy);
    c.scale(eyeS, eyeS);
    c.translate(-eyeCx, -eyeCy);
    if (cfg.eyeImg) {
      const w = b.rx * 0.46 * cfg.eyeImg.scale;
      const dx = b.rx * 0.4;
      for (const [x, dir] of [[b.cx - dx + eyeX, -1], [b.cx + dx + eyeX, 1]]) {
        c.save();
        c.translate(x, eyeCy);
        if (dir > 0) c.scale(-1, 1);
        drawCustomImg(c, cfg.eyeImg, 0, 0, w);
        c.restore();
      }
    } else {
      drawEyes(c, b, cfg.eye, cfg.colL, cfg.colR, eyeX, eyeY);
      // 眼眶（眼线）压在眼睛边缘上，才不会被眼白/瞳孔盖住
      const lidId = resolveLid(cfg.eye);
      if (lidId && lidId !== "none") drawLids(c, b, lidId, cfg.colL, cfg.colR, eyeX, eyeY);
    }
    c.restore();

    // 嘴巴（按自身中心缩放）
    const mouthCy = b.cy + b.ry * 0.42 + mouthY;
    c.save();
    c.translate(b.cx + mouthX, mouthCy);
    c.scale(mouthS, mouthS);
    c.translate(-(b.cx + mouthX), -mouthCy);
    if (cfg.mouthImg) {
      drawCustomImg(c, cfg.mouthImg, b.cx + mouthX, mouthCy, b.rx * 0.5 * cfg.mouthImg.scale);
    } else {
      drawMouth(c, b, cfg.mouth, cfg.mouthCol, mouthX, mouthY);
    }
    c.restore();
  }

  function faceColors() {
    const C = state.color;
    return {
      colL: tint(C.L.c, C.L.h, C.L.s, C.L.l),
      colR: tint(C.R.c, C.R.h, C.R.s, C.R.l),
      mouthCol: tint(C.mouth.c, C.mouth.h, C.mouth.s, C.mouth.l),
    };
  }

  function applyFaceColorOf(c) {
    if (!c) return;
    state.color.L = { c: c.face.eye, h: 0, s: 0, l: 0 };
    state.color.R = { c: c.face.eye, h: 0, s: 0, l: 0 };
    state.color.mouth = { c: c.face.mouth, h: 0, s: 0, l: 0 };
    state.color.brow = { c: "", h: 0, s: 0, l: 0 };
  }

  /* ================= 背景 ================= */
  function drawBG() {
    const { w, h } = view;
    const c = ctx;
    if (state.look.bg === "stage") {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#443567");
      g.addColorStop(0.55, "#2b2140");
      g.addColorStop(1, "#1e1730");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);

      const s = c.createRadialGradient(w * 0.5, h * 0.02, 6, w * 0.5, h * 0.1, h * 0.85);
      s.addColorStop(0, "rgba(255,255,255,0.30)");
      s.addColorStop(0.45, "rgba(255,255,255,0.08)");
      s.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = s;
      c.fillRect(0, 0, w, h);

      /* 舞台侧光：刻意做得很淡，只作氛围，不抢角色轮廓 */
      c.strokeStyle = "rgba(122,240,198,0.20)";
      c.lineWidth = Math.max(3, w * 0.009);
      for (const px of [0.14, 0.86]) {
        const x0 = w * px - w * 0.045;
        const x1 = x0 + w * 0.09;
        const top = h * 0.22;
        const bot = h * 0.68;
        const r = (x1 - x0) / 2;
        c.beginPath();
        c.moveTo(x0, bot);
        c.lineTo(x0, top + r);
        c.arc(x0 + r, top + r, r, Math.PI, 0);
        c.lineTo(x1, bot);
        c.stroke();
      }

      c.fillStyle = "rgba(255,255,255,0.07)";
      c.beginPath();
      c.ellipse(w * 0.5, h * 0.93, w * 0.46, h * 0.11, 0, 0, Math.PI * 2);
      c.fill();
      const fl = c.createRadialGradient(w * 0.5, h * 0.9, 4, w * 0.5, h * 0.9, w * 0.42);
      fl.addColorStop(0, "rgba(255,255,255,0.26)");
      fl.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = fl;
      c.fillRect(0, h * 0.62, w, h * 0.38);
    } else if (state.look.bg === "grad") {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(1, "#e9dffb");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    } else {
      c.fillStyle = state.look.bgColor;
      c.fillRect(0, 0, w, h);
    }
  }

  /* ================= 绘制角色 ================= */
  function drawShadow(c, x, y, sx, sy) {
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 2, x, y, sx);
    g.addColorStop(0, "rgba(20,10,35,0.42)");
    g.addColorStop(1, "rgba(20,10,35,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, sx, sy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPart(c, p) {
    if (p.kind === "animal" || !p.img) return;
    c.save();
    if (p.type === "hair" && p.auto) {
      // 长发用「切片弯折」代替整体旋转：发根完全不位移，越往下越弯。
      // 这样摆动时发根始终贴着头，不会在靠近头部的地方裂出缺口。
      c.translate(p.ax, p.ay);
      if (p.flip) c.scale(-1, 1);
      const img = p.img;
      const ih = img.height;
      const iw = img.width;
      const x0 = -p.af[0] * p.w;
      const yTop = -p.af[1] * p.h;
      const aTop = p.af[1] * ih;                       // 发根在源图里的行
      const span = Math.max(40, ih - aTop);
      const amp = clamp(p.angle, -0.75, 0.75) * 330;   // 发尾最大横移（像素）
      // 基本静止时整张画。切片每条都要多拉 0.5px 防缝，
      // 静止时这点拉伸会让描边和底图错开半像素，看着像描边外侧冒出毛刺。
      if (Math.abs(amp) < 1.2) {
        c.drawImage(img, 0, 0, iw, ih, x0, yTop, p.w, p.h);
        c.restore();
        return;
      }
      // 切片越薄台阶越细：18px 一片时相邻片横移差接近 5px，边缘会看出锯齿，
      // 6~7px 一片后差不到 2px，再叠半像素重叠就看不出接缝了。
      const N = clamp(Math.round(ih / 7), 32, 220);
      const sh = ih / N;
      for (let i = 0; i < N; i++) {
        const sy = i * sh;
        const t = clamp((sy + sh * 0.5 - aTop) / span, 0, 1);
        const dx = amp * t * t;
        c.drawImage(img, 0, sy, iw, sh,
          x0 + dx, yTop + (sy / ih) * p.h, p.w, (sh / ih) * p.h + 0.5);
      }
      c.restore();
      return;
    }
    c.translate(p.ax, p.ay);
    c.rotate((p.rot + p.angle / DEG) * DEG);
    if (p.flip) c.scale(-1, 1);
    c.drawImage(p.img, -p.af[0] * p.w, -p.af[1] * p.h, p.w, p.h);
    c.restore();
  }

  /* ================= 动作（简易舞蹈） ================= */
  // 角色是一张立绘，所以「跳舞」用整体位移 / 旋转 / 缩放 + 头发尾巴惯性来表现
  const DANCES = [
    { id: "none", label: "静止" },
    { id: "sway", label: "左右摇" },
    { id: "bounce", label: "蹦蹦跳" },
    { id: "spin", label: "转身" },
    { id: "nod", label: "点头" },
    { id: "hiphop", label: "律动" },
    { id: "wiggle", label: "扭一扭" },
    { id: "jump", label: "跳跃" },
  ];

  /* ---------- 局部动作：只扭动身体某一块，可以叠加 ---------- */
  // group 相同 = 互斥（比如挥手只能用一种），group 不同 = 可以同时开
  const SPOT_ACTIONS = [
    { id: "headturn", group: "head", label: "扭头", glyph: "↺" },
    { id: "twist", group: "waist", label: "扭腰", glyph: "⌒" },
    { id: "hip", group: "hip", label: "扭屁股", glyph: "◡" },
    { id: "waveL", group: "arm", label: "挥手(左)", glyph: "⤴" },
    { id: "waveR", group: "arm", label: "挥手(右)", glyph: "⤵" },
    { id: "waveB", group: "arm", label: "双手挥手", glyph: "⇈" },
  ];
  const spotGroupOf = (id) => (SPOT_ACTIONS.find((s) => s.id === id) || {}).group || "";
  const spotLabelOf = (id) => (SPOT_ACTIONS.find((s) => s.id === id) || {}).label || id;

  // 平滑过渡（0..1 的 S 形曲线）
  const smooth01 = (t) => {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  };

  // 各区域：shapes 是一串椭圆的并集（[cx, cy, rx, ry]，都按角色宽高的比例），
  // pivot 是转动支点；hinge = 铰接式（支点处不动、越往下偏移越大，手臂用）
  // feather 要小：椭圆边界一旦落在角色身上，柔边会让抹除只抹掉一部分，
  // 原地就留下半透明残影。这里的椭圆都比对应部位略大，硬边才干净。
  const SPOT_ZONES = {
    head: { shapes: [[0.5, 0.27, 0.375, 0.305]], feather: 0.06, pivot: [0.5, 0.52] },
    // 扭腰只动「领口到裙腰」这一段：早前的椭圆盖到了头上，
    // 一扭腰整个脑袋跟着平移几十像素，和双马尾完全错位
    torso: { shapes: [[0.5, 0.6, 0.355, 0.136]], feather: 0.06, pivot: [0.5, 0.72], noSkirt: true },
    hip: { shapes: [[0.5, 0.765, 0.235, 0.1]], feather: 0.12, pivot: [0.5, 0.7], skirtOnly: true },
    // 左臂：袖子是斜的，用三个椭圆串成一条「胶囊」贴着它。
    // 椭圆要比袖子略大一圈：这样遮罩边界落在角色外面（或者落在纯白衬衫里），
    // 抹除时才能把抗锯齿的边一起清干净，不会在原处留一条半透明残影。
    armL: {
      shapes: [
        [0.388, 0.542, 0.078, 0.064],
        [0.336, 0.612, 0.086, 0.076],
        [0.274, 0.69, 0.086, 0.09],
      ],
      feather: 0.05, pivot: [0.385, 0.505], noSkirt: true, noHair: true, hinge: true, inner: "right",
    },
    // 右臂：袖子 + 手 + 提包一起成组，包里那半截也跟着晃，不然挥手时手会和包脱开
    armR: {
      shapes: [
        [0.663, 0.542, 0.078, 0.064],
        [0.71, 0.62, 0.094, 0.084],
        [0.74, 0.7, 0.092, 0.074],
        [0.745, 0.755, 0.084, 0.059],
        [0.752, 0.828, 0.106, 0.07],
      ],
      feather: 0.05, pivot: [0.69, 0.505], noSkirt: true, noHair: true, hinge: true, inner: "left",
    },
  };
  // 由 shapes 统一算出外接框，后面取行列范围都用它
  for (const k in SPOT_ZONES) {
    const z = SPOT_ZONES[k];
    let x0 = 9, y0 = 9, x1 = -9, y1 = -9;
    for (const [cx, cy, rx, ry] of z.shapes) {
      x0 = Math.min(x0, cx - rx);
      x1 = Math.max(x1, cx + rx);
      y0 = Math.min(y0, cy - ry);
      y1 = Math.max(y1, cy + ry);
    }
    z.box = [x0, y0, x1, y1];
  }

  /* 每帧算出「要旋转的小片」列表；没有局部动作时返回空数组，走原来的直接绘制 */
  function spotWarps(t, c) {
    const ids = (state.dance.extra || []).filter((x) => SPOT_ACTIONS.some((s) => s.id === x));
    if (!ids.length || !c) return [];
    const sp = state.dance.speed || 1;
    const am = state.dance.amp == null ? 1 : state.dance.amp;
    const w = t * 2.4 * sp;
    const out = [];
    const add = (zone, ang, dx) => out.push({ zone, ang, dx: dx || 0, ...SPOT_ZONES[zone] });
    for (const id of ids) {
      if (id === "headturn") {
        const s = Math.sin(w * 0.95);
        add("head", s * 5.0 * DEG * am, s * 0.006 * c.w * am);
      } else if (id === "twist") {
        add("torso", Math.sin(w * 1.1 + 0.45) * 6.2 * DEG * am, 0);
      } else if (id === "hip") {
        const s = Math.sin(w * 1.35 + 1.6);
        add("hip", s * 5.2 * DEG * am, s * 0.007 * c.w * am);
      } else if (id === "waveL") {
        // 幅度用「度」思考更直观：1.7°~12°，靠肩铰接往内/外摆
        add("armL", (0.10 + Math.sin(w * 3) * 0.10) * am, 0);
      } else if (id === "waveR") {
        add("armR", -(0.09 + Math.sin(w * 3) * 0.08) * am, 0);
      } else if (id === "waveB") {
        add("armL", (0.10 + Math.sin(w * 3) * 0.10) * am, 0);
        add("armR", -(0.09 + Math.sin(w * 3 + Math.PI) * 0.08) * am, 0);
      }
    }
    return out;
  }

  /* ---------- 像素级「掀起一块转一下」的实现 ---------- */
  let warpBuf = null;
  let warpBufCtx = null;
  let warpTmp = null;
  let warpTmpCtx = null;
  let warpSrc = null;
  let warpSrcCtx = null;
  let warpFill = null;
  let warpFillCtx = null;
  let maskCache = { key: "", maps: {}, spans: {} };

  function sizeCanvas(cv, w, h) {
    if (cv.width < w || cv.height < h) {
      cv.width = Math.max(cv.width, w);
      cv.height = Math.max(cv.height, h);
    }
  }

  function warpBuffer(w, h) {
    if (!warpBuf) {
      warpBuf = document.createElement("canvas");
      warpBufCtx = warpBuf.getContext("2d");
    }
    if (warpBuf.width !== w || warpBuf.height !== h) {
      warpBuf.width = w;
      warpBuf.height = h;
    }
    if (!warpTmp) {
      warpTmp = document.createElement("canvas");
      warpTmpCtx = warpTmp.getContext("2d");
    }
    sizeCanvas(warpTmp, w, h);
    if (!warpSrc) {
      warpSrc = document.createElement("canvas");
      warpSrcCtx = warpSrc.getContext("2d");
    }
    sizeCanvas(warpSrc, w, h);
    if (!warpFill) {
      warpFill = document.createElement("canvas");
      warpFillCtx = warpFill.getContext("2d");
    }
    sizeCanvas(warpFill, w, h);
    return warpBufCtx;
  }

  // 圆角径向渐变：做成椭圆形的软边遮罩
  function softEllipse(g, cx, cy, rx, ry, feather) {
    const f = clamp(feather == null ? 0.32 : feather, 0.02, 0.95);
    g.save();
    g.translate(cx, cy);
    g.scale(Math.max(1, rx), Math.max(1, ry));
    const gr = g.createRadialGradient(0, 0, 1 - f, 0, 0, 1);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.66, "rgba(255,255,255,0.94)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(0, 0, 1, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // 把遮罩「瘦一圈」：去掉抗锯齿产生的 1~2px 毛边，
  // 否则细边（包带、描边）会被误当成整块区域，掀起时把包啃出小洞
  function erodeMask(cv, r) {
    const t = document.createElement("canvas");
    t.width = cv.width;
    t.height = cv.height;
    const g = t.getContext("2d");
    g.drawImage(cv, 0, 0);
    g.globalCompositeOperation = "destination-in";
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      g.drawImage(cv, Math.cos(a) * r, Math.sin(a) * r);
    }
    return t;
  }

  /* 为当前角色算各区域的遮罩：椭圆软边 ∩ 角色本身（∩/扣掉裙摆） */
  function warpMasks(c) {
    const key = c.id + "|" + Math.round(c.w) + "x" + Math.round(c.h);
    if (maskCache.key === key) return maskCache.maps;
    const W = Math.max(1, Math.round(c.w));
    const H = Math.max(1, Math.round(c.h));
    const src = document.createElement("canvas");
    src.width = W;
    src.height = H;
    const sg = src.getContext("2d", { willReadFrequently: true });
    sg.drawImage(c.img, 0, 0, W, H);

    // 裙子：深色块。用来「手臂遮罩里排除裙摆」和「臀部只动裙摆」
    const skirt = document.createElement("canvas");
    skirt.width = W;
    skirt.height = H;
    const kg = skirt.getContext("2d");
    // 头发：青绿像素。手臂遮罩里要把两侧垂下来的头发排除掉，不然甩手会带走一撮头发
    const hair = document.createElement("canvas");
    hair.width = W;
    hair.height = H;
    const hg = hair.getContext("2d");
    let px = null;
    try {
      px = sg.getImageData(0, 0, W, H).data;
    } catch (e) {
      px = null;
    }
    if (px) {
      const im = kg.createImageData(W, H);
      const him = hg.createImageData(W, H);
      const y0 = Math.floor(H * 0.62);
      const y1 = Math.min(H, Math.ceil(H * 0.9));
      const x0 = Math.floor(W * 0.16);
      const x1 = Math.min(W, Math.ceil(W * 0.84));
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * W + x) * 4;
          if (px[i + 3] < 40) continue;
          const r = px[i], g2 = px[i + 1], b = px[i + 2];
          const mx = Math.max(r, g2, b), mn = Math.min(r, g2, b);
          if (mx < 120 && mx - mn < 60) {
            im.data[i] = 255;
            im.data[i + 1] = 255;
            im.data[i + 2] = 255;
            im.data[i + 3] = 255;
          }
        }
      }
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          if (px[i + 3] < 40) continue;
          const r = px[i], g2 = px[i + 1], b = px[i + 2];
          // 青绿头发：绿明显高于红，而且蓝不比绿高太多（不然浅蓝的手提包会被误判成头发）
          if (g2 > r + 8 && g2 > 120 && g2 >= b - 10) {
            him.data[i] = 255;
            him.data[i + 1] = 255;
            him.data[i + 2] = 255;
            him.data[i + 3] = 255;
          }
        }
      }
      kg.putImageData(im, 0, 0);
      hg.putImageData(him, 0, 0);
    }
    const skirtTight = erodeMask(skirt, 1.2);
    const hairTight = erodeMask(hair, 1.2);

    // 每个遮罩自己「每一行的左右边界」，错切时按行整体横移要靠它判断往哪边补缝
    const make = (z) => {
      const cv = document.createElement("canvas");
      cv.width = W;
      cv.height = H;
      const g2 = cv.getContext("2d", { willReadFrequently: true });
      for (const [cx, cy, rx, ry] of z.shapes) {
        softEllipse(g2, cx * W, cy * H, rx * W, ry * H, z.feather);
      }
      g2.globalCompositeOperation = "destination-in";
      g2.drawImage(src, 0, 0);
      if (z.noSkirt || z.skirtOnly) {
        g2.globalCompositeOperation = z.skirtOnly ? "destination-in" : "destination-out";
        try {
          g2.filter = "blur(1px)";
        } catch (e) {}
        g2.drawImage(skirtTight, 0, 0);
        try {
          g2.filter = "none";
        } catch (e) {}
      }
      if (z.noHair) {
        g2.globalCompositeOperation = "destination-out";
        g2.drawImage(hairTight, 0, 0);
        g2.globalCompositeOperation = "source-over";
      }
      g2.globalCompositeOperation = "source-over";
      return cv;
    };

    const maps = {
      head: make(SPOT_ZONES.head),
      torso: make(SPOT_ZONES.torso),
      hip: make(SPOT_ZONES.hip),
      armL: make(SPOT_ZONES.armL),
      armR: make(SPOT_ZONES.armR),
    };
    const spans = {};
    for (const k in maps) spans[k] = rowSpans(maps[k]);
    maskCache = { key, maps, spans, skirtRow: rowSpans(skirtTight) };
    return maps;
  }

  /* 取遮罩每行「第一个和最后一个有点的像素」，供逐行错切时定位内容段 */
  function rowSpans(cv) {
    const W = cv.width;
    const H = cv.height;
    const L = new Int32Array(H);
    const R = new Int32Array(H);
    L.fill(-1);
    R.fill(-1);
    let px = null;
    try {
      px = cv.getContext("2d").getImageData(0, 0, W, H).data;
    } catch (e) {
      px = null;
    }
    if (!px) return { L, R, h: H };
    for (let y = 0; y < H; y++) {
      const row = y * W;
      let a = -1, b = -1;
      for (let x = 0; x < W; x++) {
        if (px[(row + x) * 4 + 3] > 24) {
          if (a < 0) a = x;
          b = x;
        }
      }
      L[y] = a;
      R[y] = b;
    }
    return { L, R, h: H };
  }

  /* 某一行被「转」了多少：把旋转近似成逐行横移。
     head/torso/hip 用对称权重（上下两端都归零，所以边缘不会裂开）；
     手臂用 hinge：肩关节处不动、越往下越偏 */
  function spotWeight(s, yChar, c) {
    if (s.hinge) {
      const py = s.pivot[1] * c.h;
      const span = Math.max(1, s.box[3] * c.h - py);
      return smooth01((yChar - py) / span);
    }
    const cy = ((s.box[1] + s.box[3]) / 2) * c.h;
    // 收缩到椭圆的 0.88 再算权重：遮罩边缘那一圈羽化带里位移必须已经归零，
    // 否则「抹掉一半 + 贴回一半」会在领口、裙腰这些地方留下锯齿状重影
    const ry = Math.max(1, ((s.box[3] - s.box[1]) / 2) * c.h) * 0.88;
    const t = (yChar - cy) / ry;
    if (Math.abs(t) >= 1) return 0;
    return smooth01((1 - Math.abs(t)) / 0.42);
  }
  function spotDx(s, yChar, c) {
    const py = s.pivot[1] * c.h;
    return spotWeight(s, yChar, c) * (-(yChar - py) * Math.sin(s.ang) + (s.dx || 0));
  }

  /* 在已画好的角色缓冲上，把某个区域按「行」错切：
     每行只横移、不旋转，所以形状是被连续拉斜的；位移让出来的缝，
     用紧挨着的那一列像素横着拉过去补满 —— 扁平卡通色块这样补几乎看不出来，
     也不会有空洞、残影、被拽走的裙摆 */
  function applySpotWarps(buf, g, q, c, spots) {
    const masks = warpMasks(c);
    const spans = maskCache.spans || {};
    for (const s of spots) {
      const mask = masks[s.zone];
      const sp = spans[s.zone];
      if (!mask || !sp) continue;

      const [bx0, by0, bx1, by1] = s.box;
      const py = s.pivot[1] * c.h;
      // 最远那一行能横移多少，决定左右要预留多宽的余量
      const reach = Math.abs(Math.sin(s.ang)) * Math.abs(by1 * c.h - py) + Math.abs(s.dx || 0);
      const pad = Math.ceil(reach * q) + 8;
      const bx = Math.max(0, Math.floor(bx0 * c.w * q) - pad);
      const by = Math.max(0, Math.floor(by0 * c.h * q));
      const bw = Math.min(buf.width - bx, Math.ceil((bx1 - bx0) * c.w * q) + pad * 2 + 2);
      const bh = Math.min(buf.height - by, Math.ceil((by1 - by0) * c.h * q) + 2);
      if (bw < 8 || bh < 8) continue;

      // 1) 把「画面 ∩ 遮罩」抠一份到 src：遮罩已经烤进去了，后面就不用再裁第二次
      const sc = warpSrcCtx;
      sc.setTransform(1, 0, 0, 1, 0, 0);
      sc.globalCompositeOperation = "source-over";
      sc.clearRect(0, 0, warpSrc.width, warpSrc.height);
      sc.drawImage(buf, bx, by, bw, bh, 0, 0, bw, bh);
      sc.globalCompositeOperation = "destination-in";
      sc.drawImage(mask, bx / q, by / q, bw / q, bh / q, 0, 0, bw, bh);
      sc.globalCompositeOperation = "source-over";

      // 2) 逐行横移：整数像素精确铺贴（不能重叠，否则柔边会叠出条纹）
      const t = warpTmpCtx;
      t.setTransform(1, 0, 0, 1, 0, 0);
      t.globalCompositeOperation = "source-over";
      t.clearRect(0, 0, warpTmp.width, warpTmp.height);
      const f = warpFillCtx;
      let hasFill = false;
      f.setTransform(1, 0, 0, 1, 0, 0);
      f.globalCompositeOperation = "source-over";
      f.clearRect(0, 0, warpFill.width, warpFill.height);

      const N = s.inner ? Math.max(32, Math.min(140, Math.round(bh / 4))) : 44;
      for (let i = 0; i < N; i++) {
        const y0 = Math.round((i * bh) / N);
        const y1 = Math.round(((i + 1) * bh) / N);
        const hRow = y1 - y0;
        if (hRow <= 0) continue;
        const yb = by + y0;
        if (yb >= buf.height) break;
        const hh = Math.min(hRow, buf.height - yb);
        const my = Math.min(sp.h - 1, Math.max(0, Math.floor((yb + hh * 0.5) / q)));
        const dx = spotDx(s, (yb + hh * 0.5) / q, c) * q;
        if (!s.inner) {
          // 头/腰/臀：上下两端本来就归零，整行搬过去就行，缝隙自然收口
          t.drawImage(warpSrc, 0, y0, bw, hh, dx, y0, bw, hh);
          continue;
        }
        const ml = sp.L[my];
        const mr = sp.R[my];
        if (ml < 0 || mr <= ml) continue;
        const lxb = Math.max(0, Math.round(ml * q) - bx);
        const rxb = Math.min(bw, Math.round((mr + 1) * q) - bx);
        const wRow = rxb - lxb;
        if (wRow < 1) continue;
        t.drawImage(warpSrc, lxb, y0, wRow, hh, lxb + dx, y0, wRow, hh);
        // 缝：只在「朝身体内侧」那一侧补（外侧本来该露出背景）；
        // 内侧如果紧挨着裙摆，说明这条缝其实是手臂和裙子之间的空隙，也该留空
        if (Math.abs(dx) > 0.4) {
          const gapRight = dx < 0;
          const want = gapRight ? s.inner === "right" : s.inner === "left";
          let blocked = false;
          const sk = maskCache.skirtRow;
          if (want && sk && my < sk.h) {
            if (gapRight) {
              const k = sk.L[my];
              if (k >= 0 && k <= mr + 4) blocked = true;
            } else {
              const k = sk.R[my];
              if (k >= 0 && k >= ml - 4) blocked = true;
            }
          }
          if (want && !blocked) {
            if (gapRight) {
              const sxx = bx + rxb;
              if (sxx < buf.width) {
                f.drawImage(buf, sxx, yb, Math.min(3, buf.width - sxx), hh, lxb + wRow + dx, y0, -dx, hh);
                hasFill = true;
              }
            } else {
              f.drawImage(buf, Math.max(0, bx + lxb - 3), yb, 3, hh, lxb, y0, dx, hh);
              hasFill = true;
            }
          }
        }
      }
      // 补缝是一条条横带拼出来的，整体虚化一下把带子化开
      if (hasFill) {
        try {
          t.filter = "blur(1.4px)";
        } catch (e) {}
        t.drawImage(warpFill, 0, 0, bw, bh, 0, 0, bw, bh);
        try {
          t.filter = "none";
        } catch (e) {}
      }

      // 3) 原位置抹掉，再把错切后的贴回去
      g.save();
      g.globalCompositeOperation = "destination-out";
      g.drawImage(mask, bx / q, by / q, bw / q, bh / q, bx, by, bw, bh);
      g.restore();
      g.drawImage(warpTmp, 0, 0, bw, bh, bx, by, bw, bh);
    }
  }

  function dancePose(t) {
    const d = state.dance;
    const sp = d.speed || 1;
    const am = d.amp == null ? 1 : d.amp;
    const out = { x: 0, y: 0, rot: 0, s: 1 };
    if (!d.id || d.id === "none") return out;

    if (d.id.startsWith("c:")) {
      // 视频学习得到的运动轨迹（-1..1 的偏移）
      const item = (d.custom || []).find((x) => "c:" + x.id === d.id);
      if (!item || !item.curve || !item.curve.length) return out;
      const cv = item.curve;
      const dur = item.dur || 2.4;
      const ph = (((t * sp) % dur) + dur) % dur;
      const f = (ph / dur) * cv.length;
      const i = Math.floor(f) % cv.length;
      const j = (i + 1) % cv.length;
      const k = f - Math.floor(f);
      const a = cv[i], b = cv[j];
      out.x = (a.x + (b.x - a.x) * k) * 34 * am;
      out.y = (a.y + (b.y - a.y) * k) * 26 * am;
      out.rot = (a.x + (b.x - a.x) * k) * 0.05 * am;
      return out;
    }

    const w = t * 2.3 * sp;
    switch (d.id) {
      case "sway":
        out.x = Math.sin(w) * 26 * am;
        out.rot = Math.sin(w) * 0.055 * am;
        out.y = -Math.abs(Math.cos(w)) * 5 * am;
        break;
      case "bounce":
        out.y = -Math.abs(Math.sin(w * 1.7)) * 34 * am;
        out.s = 1 + Math.abs(Math.sin(w * 1.7)) * 0.025 * am;
        break;
      case "spin":
        out.rot = Math.sin(w * 0.85) * 0.42 * am;
        out.y = -Math.abs(Math.sin(w * 0.85)) * 9 * am;
        break;
      case "nod":
        out.y = Math.sin(w * 1.15) * 9 * am;
        out.s = 1 + Math.sin(w * 1.15) * 0.018 * am;
        break;
      case "hiphop":
        out.x = Math.sin(w) * 20 * am;
        out.y = -Math.abs(Math.sin(w * 2)) * 18 * am;
        out.rot = Math.sin(w + 0.9) * 0.05 * am;
        out.s = 1 + Math.sin(w * 2) * 0.015 * am;
        break;
      case "wiggle":
        out.x = Math.sin(w * 2.6) * 11 * am;
        out.rot = Math.sin(w * 2.6) * 0.075 * am;
        break;
      case "jump": {
        const p = (w / (Math.PI * 2)) % 1;
        const h = Math.max(0, Math.sin(p * Math.PI * 2));
        out.y = -h * 46 * am;
        out.s = 1 + h * 0.03 * am;
        out.rot = Math.sin(w * 2) * 0.03 * am;
        break;
      }
      default:
        break;
    }
    return out;
  }

  /* 从上传的视频里「学个大概」：抽帧算运动重心，得到左右/上下摆动轨迹 */
  async function learnMotionFromVideo(file) {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.src = url;
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    await new Promise((res, rej) => {
      v.onloadeddata = res;
      v.onerror = () => rej(new Error("video"));
      setTimeout(res, 4000);
    });
    const dur = Math.min(Math.max(v.duration || 3, 1.2), 12);
    const N = 26;
    const S = 48;
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    const g = cv.getContext("2d", { willReadFrequently: true });
    const seek = (t) =>
      new Promise((res) => {
        let done = false;
        const fin = () => {
          if (done) return;
          done = true;
          res();
        };
        v.onseeked = fin;
        v.currentTime = Math.min(t, Math.max(0, dur - 0.05));
        setTimeout(fin, 500);
      });

    let prev = null;
    const pts = [];
    for (let i = 0; i < N; i++) {
      await seek((dur * i) / N);
      try {
        g.drawImage(v, 0, 0, S, S);
      } catch (err) {
        break;
      }
      const d = g.getImageData(0, 0, S, S).data;
      const lum = new Float32Array(S * S);
      for (let k = 0; k < S * S; k++) {
        lum[k] = (d[k * 4] * 0.299 + d[k * 4 + 1] * 0.587 + d[k * 4 + 2] * 0.114) / 255;
      }
      if (prev) {
        let sx = 0, sy = 0, tot = 0;
        for (let y = 0; y < S; y++) {
          for (let x = 0; x < S; x++) {
            const df = Math.abs(lum[y * S + x] - prev[y * S + x]);
            if (df > 0.07) {
              sx += (x / S - 0.5) * 2 * df;
              sy += (y / S - 0.5) * 2 * df;
              tot += df;
            }
          }
        }
        if (tot > 0.004) pts.push({ x: sx / tot, y: sy / tot });
      }
      prev = lum;
    }
    URL.revokeObjectURL(url);
    if (pts.length < 4) return null;
    // 去掉整体漂移，只保留来回摆动的部分
    const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    const curve = pts.map((p) => ({ x: clamp(p.x - mx, -1, 1), y: clamp(p.y - my, -1, 1) }));
    return { curve, dur };
  }

  // 角色本体（部件 + 立绘 + 五官）画到任意画布
  function paintCharacter(g, c) {
    c.parts.filter((p) => p.visible && p.z < 0).sort((a, b) => a.z - b.z)
      .forEach((p) => (p.kind === "animal" ? drawAnimalPart(g, p, c) : drawPart(g, p)));

    g.drawImage(c.img, 0, 0, c.w, c.h);

    const fc = faceColors();
    drawFace(g, c.face, {
      eye: state.face.eye,
      mouth: state.face.mouth,
      colL: fc.colL,
      colR: fc.colR,
      mouthCol: fc.mouthCol,
      off: state.off,
      eyeImg: findCustom("eye", state.face.eye),
      mouthImg: findCustom("mouth", state.face.mouth) || findCustom("lip", state.face.mouth),
      exprImg: findCustom("expr", state.face.eye),
    });

    c.parts.filter((p) => p.visible && p.z >= 0).sort((a, b) => a.z - b.z)
      .forEach((p) => (p.kind === "animal" ? drawAnimalPart(g, p, c) : drawPart(g, p)));
  }

  function render() {
    const c = cur();
    if (!c) return;
    ctx.clearRect(0, 0, view.w, view.h);
    drawBG();

    const S = view.scale;
    const bobY = state.look.breath ? Math.sin(state.t * 1.6) * 3 : 0;
    const dv = dancePose(state.t);
    const popS = (1 + c.pop * 0.035) * dv.s;
    const roll = clamp(-c.vx * 0.00003, -0.1, 0.1) + dv.rot;

    const cx = view.cx + c.px + dv.x;
    const cy = view.cy + c.py + bobY + dv.y;
    const footY = cy + (c.h * S) / 2;

    if (state.look.shadow) drawShadow(c, cx, footY, c.w * S * 0.34, c.h * S * 0.075);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll);
    ctx.scale(S * (state.look.flip ? -1 : 1) * popS, S * popS);
    ctx.translate(-c.w / 2, -c.h / 2);

    const spots = spotWarps(state.t, c);
    if (!spots.length) {
      paintCharacter(ctx, c);
    } else {
      // 有局部动作：先画到离屏画布，掀起对应区域转一下，再整体贴回来
      const q = clamp(S * dpr, 1, 1.75);
      const bw = Math.max(1, Math.round(c.w * q));
      const bh = Math.max(1, Math.round(c.h * q));
      const g = warpBuffer(bw, bh);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, bw, bh);
      g.setTransform(q, 0, 0, q, 0, 0);
      paintCharacter(g, c);
      g.setTransform(1, 0, 0, 1, 0, 0);
      applySpotWarps(warpBuf, g, q, c, spots);
      ctx.drawImage(warpBuf, 0, 0, c.w, c.h);
    }

    if (state.sel && !state.cropMode && state.editFrame) {
      const p = state.sel;
      const r = partRect(p);
      ctx.save();
      ctx.translate(p.ax, p.ay);
      ctx.rotate((p.rot + p.angle / DEG) * DEG);
      if (p.flip) ctx.scale(-1, 1);
      ctx.strokeStyle = "#ff5f8d";
      ctx.lineWidth = 2 / S;
      ctx.setLineDash([6 / S, 5 / S]);
      ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
      ctx.restore();
    }

    ctx.restore();

    if (state.look.touch && state.touched) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(state.touched.x, state.touched.y, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (state.cropMode && state.cropRect) {
      const r = normRect(state.cropRect);
      ctx.save();
      ctx.fillStyle = "rgba(255,95,141,0.16)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = "#ff5f8d";
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 1.6;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    }
  }

  /* ================= 物理 ================= */
  function partRect(p) {
    if (p.kind === "animal") {
      if (p.slot === "ear") return { x0: -p.w * 0.55, y0: -p.h * 1.05, x1: p.w * 0.55, y1: p.h * 0.1 };
      return { x0: -p.w * 0.12, y0: -p.w * 0.18, x1: p.w * 0.98, y1: p.w * 0.9 };
    }
    const x0 = -p.af[0] * p.w, y0 = -p.af[1] * p.h;
    return { x0, y0, x1: x0 + p.w, y1: y0 + p.h };
  }

  function bodyBounds(c) {
    let minX = 0, minY = 0, maxX = c.w, maxY = c.h;
    for (const p of c.parts) {
      if (!p.visible) continue;
      const r = partRect(p);
      const a = p.rot * DEG;
      const ca = Math.cos(a), sa = Math.sin(a);
      for (const [lx0, ly] of [[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]]) {
        const lx = p.flip ? -lx0 : lx0;
        const rx = lx * ca - ly * sa + p.ax;
        const ry = lx * sa + ly * ca + p.ay;
        minX = Math.min(minX, rx);
        maxX = Math.max(maxX, rx);
        minY = Math.min(minY, ry);
        maxY = Math.max(maxY, ry);
      }
    }
    return { minX, minY, maxX, maxY };
  }

  function clampChar(c) {
    const S = view.scale || 1;
    const b = bodyBounds(c);
    const d0x = (b.minX - c.w / 2) * S;
    const d1x = (b.maxX - c.w / 2) * S;
    const d0y = (b.minY - c.h / 2) * S;
    const d1y = (b.maxY - c.h / 2) * S;

    let loX = -view.cx - d0x;
    let hiX = view.w - view.cx - d1x;
    let loY = -view.cy - d0y;
    let hiY = view.h - view.cy - d1y;
    if (loX > hiX) loX = hiX = (loX + hiX) / 2;
    if (loY > hiY) loY = hiY = (loY + hiY) / 2;

    c.px = Math.max(loX, Math.min(hiX, c.px));
    c.py = Math.max(loY, Math.min(hiY, c.py));
    c.vx = Math.max(-2400, Math.min(2400, c.vx));
    c.vy = Math.max(-2400, Math.min(2400, c.vy));
  }

  function step(dt) {
    const c = cur();
    if (!c) return;
    const P = state.physics;

    c.px += c.vx * dt;
    c.py += c.vy * dt;
    const damp = Math.pow(0.12, dt);
    c.vx *= damp;
    c.vy *= damp;
    clampChar(c);
    c.pop = Math.max(0, c.pop - dt * 3.2);

    state.mouseWind *= Math.pow(0.02, dt);
    state.danceOn = !!(state.dance.id && state.dance.id !== "none") || !!(state.dance.extra || []).length;
    if (!P.on) return;

    for (const p of c.parts) {
      if (!p.visible) continue;
      if (p.type === "none") {
        p.angle *= 0.9;
        p.vel *= 0.9;
        continue;
      }
      const T = TYPE[p.type] || TYPE.cloth;
      const k = (P.k * T.k * 90) / (p.phys || 1);
      const damp2 = P.c * T.c * 30;
      const droop = P.g * T.droop * (p.droopDir || 1);
      const wind = Math.sin(state.t * 1.3 + p.seed * 9) * P.wind * P.wind * 2 * T.w;
      const inertia = -(c.vx * 0.0042 * T.sens * P.tr + c.vy * 0.0012 * T.sens * P.tr);
      const flow = state.mouseWind * T.sens * P.ms * 2.2;
      const beat = state.danceOn ? Math.sin(state.t * 2.3 * (state.dance.speed || 1) + p.seed * 6) * 0.5 : 0;
      const acc = -k * p.angle - damp2 * p.vel + droop + wind + inertia + flow + beat * T.w;
      if (p.type === "hair" || p.type === "tail") p.vel += beat * 0.0016;
      p.vel += acc * dt;
      p.angle += p.vel * dt;
      const lim = p.type === "hair" ? 0.5 : 0.95;
      p.angle = Math.max(-lim, Math.min(lim, p.angle));
    }
  }

  /* ================= 主循环 ================= */
  let last = performance.now();
  let frames = 0;
  let fpsT = 0;

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.t += dt;
    step(dt);
    render();

    frames++;
    fpsT += dt;
    if (fpsT >= 0.5) {
      const el = $("#fpsVal");
      if (el) el.textContent = Math.round(frames / fpsT);
      frames = 0;
      fpsT = 0;
    }
    requestAnimationFrame(loop);
  }

  /* ================= 交互 ================= */
  let drag = null;
  const pointerPos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const normRect = (r) => ({
    x: Math.min(r.x0, r.x1),
    y: Math.min(r.y0, r.y1),
    w: Math.abs(r.x1 - r.x0),
    h: Math.abs(r.y1 - r.y0),
  });

  function screenToBody(mx, my) {
    const c = cur();
    const S = view.scale;
    let x = (mx - view.cx - c.px) / S;
    let y = (my - view.cy - c.py) / S;
    if (state.look.flip) x = -x;
    return { x: x + c.w / 2, y: y + c.h / 2 };
  }

  function hitPart(mx, my) {
    const c = cur();
    const pt = screenToBody(mx, my);
    const list = [...c.parts].sort((a, b) => b.z - a.z);
    for (const p of list) {
      if (!p.visible) continue;
      const r = partRect(p);
      const dx = pt.x - p.ax;
      const dy = pt.y - p.ay;
      const a = -(p.rot + p.angle / DEG) * DEG;
      let lx = dx * Math.cos(a) - dy * Math.sin(a);
      const ly = dx * Math.sin(a) + dy * Math.cos(a);
      if (p.flip) lx = -lx;
      if (lx >= r.x0 && lx <= r.x1 && ly >= r.y0 && ly <= r.y1) return p;
    }
    return null;
  }

  canvas.addEventListener("pointerdown", (e) => {
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}
    const pos = pointerPos(e);
    canvas.classList.add("grabbing");
    state.touched = pos;

    if (state.cropMode) {
      state.cropRect = { x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y };
      drag = { mode: "crop" };
      return;
    }

    const c = cur();
    if (state.sel) {
      const p = hitPart(pos.x, pos.y);
      if (p) {
        state.sel = p;
        renderLayers();
        fillInspector();
        drag = { mode: "part", part: p, start: pos, ax0: p.ax, ay0: p.ay };
        return;
      }
      // 点到空白：取消选中，选框随之消失
      state.sel = null;
      state.editFrame = false;
      renderLayers();
      fillInspector();
    }
    drag = { mode: "char", start: pos, px0: c.px, py0: c.py, moved: 0, at: performance.now(), lastPos: pos };
  });

  canvas.addEventListener("pointermove", (e) => {
    const pos = pointerPos(e);
    state.touched = pos;
    const P = state.physics;

    if (drag && drag.lastPos) {
      const mvx = pos.x - drag.lastPos.x;
      state.mouseWind = Math.max(-1, Math.min(1, state.mouseWind + mvx * 0.012));
    }
    if (drag) drag.lastPos = pos;
    if (!drag) return;

    const c = cur();
    if (drag.mode === "crop") {
      state.cropRect.x1 = pos.x;
      state.cropRect.y1 = pos.y;
      return;
    }
    if (drag.mode === "part") {
      drag.part.ax = drag.ax0 + (pos.x - drag.start.x) / view.scale * (state.look.flip ? -1 : 1);
      drag.part.ay = drag.ay0 + (pos.y - drag.start.y) / view.scale;
      fillInspector();
      return;
    }
    if (drag.mode === "char") {
      drag.moved = Math.max(drag.moved, Math.hypot(pos.x - drag.start.x, pos.y - drag.start.y));
      if (state.look.mode === "follow") {
        const nx = pos.x - view.cx;
        const ny = pos.y - view.cy;
        c.vx = (nx - c.px) * 20 * P.tr;
        c.vy = (ny - c.py) * 20 * P.tr;
        c.px = nx;
        c.py = ny;
      } else {
        const nx = drag.px0 + (pos.x - drag.start.x);
        const ny = drag.py0 + (pos.y - drag.start.y);
        c.vx = (nx - c.px) * 55 * P.tr;
        c.vy = (ny - c.py) * 55 * P.tr;
        c.px = nx;
        c.py = ny;
      }
      clampChar(c);
    }
  });

  function endDrag() {
    canvas.classList.remove("grabbing");
    if (!drag) return;
    const c = cur();
    if (drag.mode === "char") {
      const quick = performance.now() - drag.at < 320;
      if (drag.moved < 8 && quick) poke();
      else c.vx *= 2.4, c.vy *= 2.4;
    }
    if (drag.mode === "crop" && state.cropRect) {
      const r = normRect(state.cropRect);
      if (r.w > 24 && r.h > 24) cutPart(r);
    }
    if (drag.mode === "crop") {
      state.cropRect = null;
      setCropMode(false);
    }
    drag = null;
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  function poke() {
    const c = cur();
    c.pop = 1;
    c.parts.forEach((p) => {
      if (p.type !== "none") p.vel += (Math.random() - 0.5) * 5;
    });
    if ($("#swVoiceTap").checked && voices.length) {
      playVoice(voices[Math.floor(Math.random() * voices.length)]);
    }
  }

  /* ================= 框选拆分 ================= */
  function setCropMode(on) {
    state.cropMode = on;
    canvas.style.cursor = on ? "crosshair" : "grab";
    $("#btnCrop").textContent = on ? "拖动框选…（再点一下取消）" : "框选拆分新部件";
  }

  function cutPart(r) {
    const c = cur();
    const a = screenToBody(r.x, r.y);
    const b = screenToBody(r.x + r.w, r.y + r.h);
    const bx = Math.max(0, Math.min(a.x, b.x));
    const by = Math.max(0, Math.min(a.y, b.y));
    const bw = Math.max(4, Math.abs(b.x - a.x));
    const bh = Math.max(4, Math.abs(b.y - a.y));

    const tmp = document.createElement("canvas");
    tmp.width = Math.round(bw);
    tmp.height = Math.round(bh);
    tmp.getContext("2d").drawImage(c.img, bx, by, bw, bh, 0, 0, tmp.width, tmp.height);
    const out = new Image();
    out.onload = () => {
      const p = makePart({
        kind: "image",
        name: "部件" + (c.parts.length + 1),
        img: out,
        type: "hair",
        ax: bx + bw / 2,
        ay: by + bh / 2,
        w: bw,
        af: [0.5, 0.5],
        z: 4,
        hue: 0, sat: 0, light: 0,
      });
      c.parts.push(p);
      state.sel = p;
      renderLayers();
      fillInspector();
      openMenu("split");
    };
    out.src = tmp.toDataURL("image/png");
  }

  /* ================= 表情面板 ================= */
  const TAB_KEYS = ["expr", "eye", "lid", "lip", "mouth", "brow", "ear", "tail", "dance"];
  function setOfTab(tab) {
    return TAB_KEYS.includes(tab) ? tab : "expr";
  }
  const isAnimalTab = (t) => t === "ear" || t === "tail";

  /* 耳朵 / 尾巴预览缩略图 */
  function drawAnimalThumb(cv, kind, slot, customItem) {
    const ch = cur();
    const c = cv.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    if (!ch) return;
    if (customItem) {
      const s = 92 / Math.max(customItem.img.width, customItem.img.height);
      const w = customItem.img.width * s;
      const h = customItem.img.height * s;
      c.drawImage(customItem.img, 60 - w / 2, 62 - h / 2, w, h);
      return;
    }
    if (kind === "none") {
      c.strokeStyle = "#d6d0e0";
      c.lineWidth = 3;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(38, 84);
      c.lineTo(82, 40);
      c.stroke();
      return;
    }
    const p = {
      w: 100, h: 100, animal: kind, slot, side: "L", flip: false, rot: 0, angle: 0,
      hue: ch.animal.hue, sat: ch.animal.sat, light: ch.animal.light,
    };
    const col = partColor(p, ch);
    if (slot === "ear") {
      const hgt = (ANIMALS[kind] ? ANIMALS[kind].ear.h : 1.2) * 100;
      p.h = hgt;
      const s = Math.min(86 / hgt, 0.78);
      const droop = EAR_INNER[kind] === "fold";
      c.save();
      c.translate(60, droop ? 106 - hgt * s * 0.92 : 106);
      c.scale(s, s);
      drawEar(c, p, col, ch.line);
      c.restore();
    } else {
      const shape = TAIL_SHAPES[kind] || {};
      let minX = -0.2, maxX = 0.9, minY = -0.3, maxY = 0.7;
      if (shape.spine) {
        minX = 1e9; maxX = -1e9; minY = 1e9; maxY = -1e9;
        shape.spine.forEach(([x, y], i) => {
          const r = shape.radii[i] || 0;
          minX = Math.min(minX, x - r);
          maxX = Math.max(maxX, x + r);
          minY = Math.min(minY, y - r);
          maxY = Math.max(maxY, y + r);
        });
      }
      const ext = Math.max(maxX - minX, maxY - minY) * 100; // 归一化坐标 × 尾巴长度
      const fit = 100 / Math.max(8, ext);
      const scx = ((minX + maxX) / 2) * 100;
      const scy = ((minY + maxY) / 2) * 100;
      c.save();
      c.translate(60 - scx * fit, 60 - scy * fit);
      c.scale(fit, fit);
      drawTail(c, p, col, ch.line);
      c.restore();
    }
  }

  function drawDanceThumb(cv, id, item) {
    const g = cv.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    if (item && item.curve && item.curve.length) {
      // 自定义（视频学习）：画一条运动轨迹
      g.strokeStyle = "#c5bcd4";
      g.lineWidth = 2;
      g.beginPath();
      item.curve.forEach((p, i) => {
        const x = 60 + p.x * 40;
        const y = 60 + p.y * 40;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.stroke();
      g.fillStyle = "#ff5f8d";
      g.beginPath();
      g.arc(60 + item.curve[0].x * 40, 60 + item.curve[0].y * 40, 3.2, 0, Math.PI * 2);
      g.fill();
      return;
    }
    const glyph = {
      none: "Ⅱ", sway: "↔", bounce: "↕", spin: "↻", nod: "⤵", hiphop: "♫", wiggle: "～", jump: "⤒",
      headturn: "↺", twist: "⌒", hip: "◡", waveL: "⤴", waveR: "⤵", waveB: "⇈",
    }[id] || "♫";
    g.fillStyle = "#c9c1d6";
    g.font = "600 54px system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(glyph, 60, 60);
  }

  /* 眼眶缩略图：先画一只简笔眼，再叠上眼眶 */
  function drawLidThumb(cv, id) {
    const g = cv.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    g.lineCap = "round";
    const w = 15, h = 31, cy0 = 60;
    g.fillStyle = "#e7e2ee";
    g.strokeStyle = "#cfc8da";
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(60, cy0, w, h, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    if (!id || id === "none") return;
    lidOne(g, id === "auto" ? "thin" : id, 60, cy0, w, h, 1, state.color.L.c || "#5f8f7c", 4.2);
  }

  function buildFaceGrid() {
    const grid = $("#faceGrid");
    grid.innerHTML = "";
    const bucket = setOfTab(state.faceSet);
    const c = cur();

    /* ---------- 眼眶：眼睑 / 眼窝样式 ---------- */
    if (bucket === "lid") {
      const add = (label, active, onClick, id) => {
        const btn = document.createElement("button");
        btn.className = "card" + (active ? " active" : "");
        const cv = document.createElement("canvas");
        cv.width = 120;
        cv.height = 120;
        const sp = document.createElement("span");
        sp.textContent = label;
        btn.appendChild(cv);
        btn.appendChild(sp);
        grid.appendChild(btn);
        drawLidThumb(cv, id);
        btn.onclick = onClick;
      };
      for (const it of LIDS) {
        add(it.label, state.lid.id === it.id, () => {
          state.lid.id = it.id;
          buildFaceGrid();
        }, it.id);
      }
      syncFaceTune();
      syncTabExtra();
      return;
    }

    /* ---------- 动作：简易舞蹈 ---------- */
    if (bucket === "dance") {
      const addCard = (label, onClick, active, item, id) => {
        const btn = document.createElement("button");
        btn.className = "card" + (active ? " active" : "");
        const cv = document.createElement("canvas");
        cv.width = 120;
        cv.height = 120;
        const sp = document.createElement("span");
        sp.textContent = label;
        btn.appendChild(cv);
        btn.appendChild(sp);
        if (item) {
          const del = document.createElement("i");
          del.className = "del";
          del.textContent = "×";
          del.title = "删除这个自定义动作";
          del.onclick = (ev) => {
            ev.stopPropagation();
            state.dance.custom = state.dance.custom.filter((x) => x !== item);
            if (state.dance.id === "c:" + item.id) state.dance.id = "none";
            buildFaceGrid();
          };
          btn.appendChild(del);
        }
        grid.appendChild(btn);
        drawDanceThumb(cv, id, item);
        btn.onclick = onClick;
      };
      for (const d of DANCES) {
        addCard(d.label, () => {
          state.dance.id = d.id;
          buildFaceGrid();
        }, state.dance.id === d.id, null, d.id);
      }
      for (const ci of state.dance.custom || []) {
        addCard(ci.label, () => {
          state.dance.id = "c:" + ci.id;
          buildFaceGrid();
        }, state.dance.id === "c:" + ci.id, ci, "custom");
      }

      /* --- 局部动作：可以多选同时跑，同组互斥 --- */
      const head = document.createElement("div");
      head.className = "grid-head";
      const extra = state.dance.extra || [];
      head.innerHTML =
        `<b>局部动作</b><i class="badge">可叠加</i>` +
        `<em>${extra.length ? "同时运行：" + extra.map(spotLabelOf).join(" + ") : "同组只能用一种，不同组可以一起开"}</em>`;
      grid.appendChild(head);

      const toggleSpot = (id) => {
        const list = state.dance.extra || [];
        if (list.includes(id)) state.dance.extra = list.filter((x) => x !== id);
        else {
          const g = spotGroupOf(id);
          // 同组互斥：先把同组的其它动作去掉
          state.dance.extra = list.filter((x) => spotGroupOf(x) !== g).concat(id);
        }
        buildFaceGrid();
      };
      for (const s of SPOT_ACTIONS) {
        addCard(s.label, () => toggleSpot(s.id), (state.dance.extra || []).includes(s.id), null, s.id);
      }

      const add = document.createElement("button");
      add.className = "card add";
      add.innerHTML = `<span class="plus">＋</span><span>上传视频学习</span>`;
      add.onclick = () => $("#danceFile").click();
      grid.appendChild(add);
      syncFaceTune();
      syncTabExtra();
      return;
    }

    /* ---------- 耳朵 / 尾巴：种类卡片 ---------- */
    if (isAnimalTab(bucket) && c) {
      const list = bucket === "ear" ? EAR_KINDS : TAIL_KINDS;
      const addCard = (label, onClick, active, customItem, kind) => {
        const btn = document.createElement("button");
        btn.className = "card" + (active ? " active" : "");
        const cv = document.createElement("canvas");
        cv.width = 120;
        cv.height = 120;
        const sp = document.createElement("span");
        sp.textContent = label;
        btn.appendChild(cv);
        btn.appendChild(sp);
        if (customItem) {
          const del = document.createElement("i");
          del.className = "del";
          del.textContent = "×";
          del.title = "删除这个自定义项";
          del.onclick = (ev) => {
            ev.stopPropagation();
            state.custom[bucket] = state.custom[bucket].filter((x) => x !== customItem);
            if (c.animal[bucket] === "c:" + customItem.id) {
              c.animal[bucket] = "none";
              buildAnimalParts(c);
              layout();
            }
            buildFaceGrid();
          };
          btn.appendChild(del);
        }
        grid.appendChild(btn);
        drawAnimalThumb(cv, kind, bucket, customItem);
        btn.onclick = onClick;
      };
      for (const k of list) {
        addCard(k.label, () => {
          c.animal[bucket] = k.id;
          buildAnimalParts(c);
          layout();
          buildFaceGrid();
          renderLayers();
        }, c.animal[bucket] === k.id, null, k.id);
      }
      for (const ci of state.custom[bucket] || []) {
        const id = "c:" + ci.id;
        addCard(ci.label, () => {
          c.animal[bucket] = id;
          buildAnimalParts(c);
          layout();
          buildFaceGrid();
          renderLayers();
        }, c.animal[bucket] === id, ci, null);
      }
      const add = document.createElement("button");
      add.className = "card add";
      add.innerHTML = `<span class="plus">＋</span><span>上传图片</span>`;
      add.onclick = () => {
        faceImportTarget = bucket;
        $("#faceFile").click();
      };
      grid.appendChild(add);
      syncFaceTune();
      syncTabExtra();
      return;
    }

    /* ---------- 五官：表情 / 眼神 / 口型 / 嘴巴 / 眉毛 ---------- */
    let items = EXPRS;
    if (bucket === "eye") items = EYES;
    else if (bucket === "lip") items = LIPS;
    else if (bucket === "mouth") items = MOUTHS;
    else if (bucket === "brow") items = BROWS;

    const addCard = (label, eye, mouth, onClick, active, customItem, browId) => {
      const btn = document.createElement("button");
      btn.className = "card" + (active ? " active" : "");
      const cv = document.createElement("canvas");
      cv.width = 120;
      cv.height = 120;
      const sp = document.createElement("span");
      sp.textContent = label;
      btn.appendChild(cv);
      btn.appendChild(sp);
      if (customItem) {
        const del = document.createElement("i");
        del.className = "del";
        del.textContent = "×";
        del.title = "删除这个自定义项";
        del.onclick = (ev) => {
          ev.stopPropagation();
          const id = "c:" + customItem.id;
          state.custom[bucket] = state.custom[bucket].filter((x) => x !== customItem);
          if (state.face.eye === id) state.face.eye = "happy";
          if (state.face.mouth === id) state.face.mouth = "smile";
          if (state.brow.id === id) state.brow.id = "auto";
          buildFaceGrid();
        };
        btn.appendChild(del);
      }
      grid.appendChild(btn);
      drawThumb(cv, eye, mouth, customItem, browId);
      btn.onclick = onClick;
    };

    for (const it of items) {
      const eye = bucket === "expr" ? it.eye : bucket === "eye" ? it.id : state.face.eye;
      const mouth = bucket === "expr" ? it.mouth : bucket === "lip" || bucket === "mouth" ? it.id : state.face.mouth;
      const active =
        bucket === "expr"
          ? state.face.eye === it.eye && state.face.mouth === it.mouth
          : bucket === "eye"
          ? state.face.eye === it.id
          : bucket === "brow"
          ? state.brow.id === it.id
          : state.face.mouth === it.id;
      const browId = bucket === "brow"
        ? (it.id === "auto" ? EYE_BROW[state.face.eye] || "soft" : it.id)
        : EYE_BROW[eye] || "soft";
      addCard(it.label, eye, mouth, () => {
        if (bucket === "expr") {
          state.face.eye = it.eye;
          state.face.mouth = it.mouth;
        } else if (bucket === "eye") {
          state.face.eye = it.id;
        } else if (bucket === "brow") {
          state.brow.id = it.id;
        } else {
          state.face.mouth = it.id;
        }
        buildFaceGrid();
      }, active, null, browId);
    }

    for (const ci of state.custom[bucket] || []) {
      const id = "c:" + ci.id;
      const active = bucket === "brow" ? state.brow.id === id
        : bucket === "eye" || bucket === "expr" ? state.face.eye === id
        : state.face.mouth === id;
      addCard(ci.label, state.face.eye, state.face.mouth, () => {
        if (bucket === "brow") state.brow.id = id;
        else if (bucket === "eye" || bucket === "expr") state.face.eye = id;
        else state.face.mouth = id;
        buildFaceGrid();
      }, active, ci, bucket === "brow" ? id : (EYE_BROW[state.face.eye] || "soft"));
    }

    const add = document.createElement("button");
    add.className = "card add";
    add.innerHTML = `<span class="plus">＋</span><span>上传图片</span>`;
    add.onclick = () => {
      faceImportTarget = bucket;
      $("#faceFile").click();
    };
    grid.appendChild(add);

    syncFaceTune();
    syncTabExtra();
  }

  function drawThumb(cv, eye, mouth, customItem, browId) {
    const ch = cur();
    const c = cv.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    const b = { cx: 60, cy: 62, rx: 44, ry: 34 };

    if (customItem) {
      const w = 96;
      const h = w * (customItem.img.height / customItem.img.width);
      c.drawImage(customItem.img, 60 - w / 2, 60 - h / 2, w, h);
      return;
    }

    c.fillStyle = "#fdf2ea";
    ell(c, 60, 62, 46, 40);
    c.fill();
    c.fillStyle = ch ? ch.hair : "#f0e6c8";
    c.beginPath();
    c.ellipse(60, 46, 47, 34, 0, Math.PI, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(13, 44);
    c.quadraticCurveTo(20, 26, 60, 22);
    c.quadraticCurveTo(100, 26, 107, 44);
    c.quadraticCurveTo(96, 34, 60, 32);
    c.quadraticCurveTo(24, 34, 13, 44);
    c.fill();

    const fc = faceColors();
    drawFace(c, b, {
      eye,
      mouth,
      colL: fc.colL,
      colR: fc.colR,
      mouthCol: fc.mouthCol,
      browId: browId || EYE_BROW[eye] || "soft",
      off: {
        expr: { x: 0, y: 0, s: 1 },
        eye: { x: 0, y: 0, s: 1 },
        mouth: { x: 0, y: 0, s: 1 },
      },
      eyeImg: findCustom("eye", eye),
      mouthImg: findCustom("mouth", mouth) || findCustom("lip", mouth),
      exprImg: findCustom("expr", eye),
    });
  }

  $$("#faceTabs button").forEach((b) => {
    b.onclick = () => {
      $$("#faceTabs button").forEach((x) => x.classList.toggle("active", x === b));
      state.faceSet = b.dataset.set;
      buildFaceGrid();
    };
  });

  /* 位置 / 大小微调（表情 / 眼神 / 口型 / 嘴巴 / 眉毛 / 耳朵 / 尾巴） */
  let ftKey = "expr";
  const tuneKey = () => {
    const t = setOfTab(state.faceSet);
    if (t === "dance" || t === "lid") return t;
    if (t === "brow") return "brow";
    if (t === "ear" || t === "tail") return t;
    return t === "expr" || t === "eye" ? t : "mouth";
  };
  const browTarget = () => (state.brow.side === "R" ? state.brow.R : state.brow.L);
  function setBrowVal(key, v) {
    const B = state.brow;
    if (B.side === "both") {
      B.L[key] = v;
      B.R[key] = v;
    } else B[B.side][key] = v;
  }
  function afterTune() {
    if (ftKey === "ear" || ftKey === "tail") {
      const c = cur();
      if (c) {
        buildAnimalParts(c);
        layout();
      }
    }
  }
  function syncFaceTune() {
    ftKey = tuneKey();
    const tuneBox = $("#faceTune");
    if (tuneBox) tuneBox.hidden = ftKey === "dance" || ftKey === "lid";
    // 眉毛 / 眼眶 / 动作没有「整张图导入」，隐藏导入按钮
    const pick = $("#btnFacePick");
    if (pick) pick.hidden = ftKey === "brow" || ftKey === "lid" || ftKey === "dance";
    if (ftKey === "dance" || ftKey === "lid") return;
    const brow = ftKey === "brow";
    const tilt = brow || ftKey === "ear" || ftKey === "tail";
    $("#segBrowSide").hidden = !brow;
    $("#ftRotLbl").hidden = !tilt;
    $("#ftRot").hidden = !tilt;
    $("#ftRotv").hidden = !tilt;
    $("#ftName").textContent = {
      expr: "表情整体", eye: "眼神", mouth: "嘴巴/口型", brow: "眉毛", ear: "耳朵", tail: "尾巴",
    }[ftKey];
    const o = brow ? browTarget() : state.off[ftKey];
    const s = Math.round((o.s == null ? 1 : o.s) * 100);
    $("#ftX").value = o.x;
    $("#ftY").value = o.y;
    $("#ftS").value = s;
    $("#ftXv").textContent = Math.round(o.x);
    $("#ftYv").textContent = Math.round(o.y);
    $("#ftSv").textContent = s + "%";
    $("#ftRot").value = o.rot || 0;
    $("#ftRotv").textContent = Math.round(o.rot || 0);
  }
  $("#ftX").oninput = (e) => {
    const v = Number(e.target.value);
    $("#ftXv").textContent = Math.round(v);
    if (ftKey === "brow") setBrowVal("x", v);
    else state.off[ftKey].x = v;
    afterTune();
  };
  $("#ftY").oninput = (e) => {
    const v = Number(e.target.value);
    $("#ftYv").textContent = Math.round(v);
    if (ftKey === "brow") setBrowVal("y", v);
    else state.off[ftKey].y = v;
    afterTune();
  };
  $("#ftS").oninput = (e) => {
    const v = Number(e.target.value) / 100;
    $("#ftSv").textContent = e.target.value + "%";
    if (ftKey === "brow") setBrowVal("s", v);
    else state.off[ftKey].s = v;
    afterTune();
  };
  $("#ftRot").oninput = (e) => {
    const v = Number(e.target.value);
    $("#ftRotv").textContent = v;
    if (ftKey === "brow") setBrowVal("rot", v);
    else {
      state.off[ftKey].rot = v;
      afterTune();
    }
  };
  $("#ftSave").onclick = () => saveAll();
  $("#ftReset").onclick = () => {
    if (ftKey === "brow") {
      const fresh = () => ({ x: 0, y: 0, rot: 0, s: 1 });
      if (state.brow.side === "both") {
        state.brow.L = fresh();
        state.brow.R = fresh();
      } else state.brow[state.brow.side] = fresh();
    } else {
      state.off[ftKey] = { x: 0, y: 0, s: 1, rot: 0 };
      afterTune();
    }
    syncFaceTune();
  };
  $$("#segBrowSide button").forEach((b) => {
    b.onclick = () => {
      $$("#segBrowSide button").forEach((x) => x.classList.toggle("active", x === b));
      state.brow.side = b.dataset.side;
      syncFaceTune();
    };
  });

  /* ================= 五官 / 耳尾自定义导入 ================= */
  let faceImportTarget = "expr";
  $("#faceFile").onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    // 以当前页签为准，避免导入到上一次记录的类别
    const bucket = setOfTab(state.faceSet);
    faceImportTarget = bucket;
    const c = cur();
    for (const f of files) {
      if (!f.type.startsWith("image")) continue;
      const url = URL.createObjectURL(f);
      const im = await new Promise((res) => {
        const i = new Image();
        i.onload = () => res(i);
        i.src = url;
      });
      const item = {
        id: String(Date.now()) + Math.random().toString(36).slice(2, 5),
        label: f.name.replace(/\.[^.]+$/, "").slice(0, 6) || "自定",
        img: im,
        scale: 1,
      };
      state.custom[bucket].push(item);
      const id = "c:" + item.id;
      if (bucket === "brow") state.brow.id = id;
      else if (bucket === "eye" || bucket === "expr") state.face.eye = id;
      else if (bucket === "ear" || bucket === "tail") {
        if (c) {
          c.animal[bucket] = id;
          buildAnimalParts(c);
          layout();
        }
      } else state.face.mouth = id;
    }
    buildFaceGrid();
    renderLayers();
  };
  $("#btnFacePick").onclick = () => {
    const t = setOfTab(state.faceSet);
    if (t === "dance") {
      $("#danceFile").click();
      return;
    }
    faceImportTarget = t;
    $("#faceFile").click();
  };

  /* ================= 上传视频学动作 ================= */
  $("#danceFile").onchange = async (e) => {
    const f = (e.target.files || [])[0];
    e.target.value = "";
    if (!f) return;
    const say = (t) => {
      const el = $("#teDanceMsg");
      if (el) el.textContent = t;
    };
    say("正在从视频里提取动作，请稍等…");
    let r = null;
    try {
      r = await learnMotionFromVideo(f);
    } catch (err) {
      r = null;
    }
    if (!r) {
      say("这段视频没提取到明显动作。换一段人物动起来的、机位固定的视频再试。");
      return;
    }
    const item = {
      id: String(Date.now()).slice(-6),
      label: (f.name.replace(/\.[^.]+$/, "") || "自定义").slice(0, 6),
      curve: r.curve,
      dur: r.dur,
    };
    state.dance.custom.push(item);
    state.dance.id = "c:" + item.id;
    buildFaceGrid();
    const el = $("#teDanceMsg");
    if (el) el.textContent = `已生成动作「${item.label}」，时长约 ${r.dur.toFixed(1)} 秒，可调速度/幅度。`;
  };

  $("#btnHidePanel").onclick = () => {
    $("#panel").classList.toggle("collapsed");
    $("#btnHidePanel").classList.toggle("off", $("#panel").classList.contains("collapsed"));
    resize();
  };

  /* ================= 缩放 / 顶栏 ================= */
  function setZoom(z) {
    state.look.zoom = clamp(z, 0.55, 2);
    $("#zoomVal").textContent = Math.round(state.look.zoom * 100) + "%";
    layout();
  }
  $("#zoomIn").onclick = () => setZoom(state.look.zoom + 0.1);
  $("#zoomOut").onclick = () => setZoom(state.look.zoom - 0.1);
  $("#zoomVal").onclick = () => setZoom(1);

  /* ================= 弹窗 ================= */
  function openMask(el) {
    el.hidden = false;
    document.body.classList.add("sheet-open");
  }
  function closeMask(el) {
    el.hidden = true;
    document.body.classList.remove("sheet-open");
    // 关掉菜单就收起部件选框，避免虚线框一直挂在角色身上
    if (el.id === "menuMask") state.editFrame = false;
  }
  $("#btnMenu").onclick = () => openMask($("#menuMask"));
  $("#menuClose").onclick = () => closeMask($("#menuMask"));
  $("#btnChar").onclick = () => {
    buildCharCards();
    openMask($("#charMask"));
  };
  $("#charClose").onclick = () => closeMask($("#charMask"));
  $$(".mask").forEach((m) => {
    m.addEventListener("pointerdown", (e) => {
      if (e.target === m) closeMask(m);
    });
  });

  function openMenu(pane) {
    openMask($("#menuMask"));
    $$("#menuTabs button").forEach((b) => b.classList.toggle("active", b.dataset.pane === pane));
    $$(".pane").forEach((p) => p.classList.toggle("active", p.dataset.pane === pane));
  }

  $$("#menuTabs button").forEach((b) => {
    b.onclick = () => {
      $$("#menuTabs button").forEach((x) => x.classList.toggle("active", x === b));
      $$(".pane").forEach((p) => p.classList.toggle("active", p.dataset.pane === b.dataset.pane));
    };
  });

  /* ================= 角色卡片 ================= */
  function buildCharCards() {
    const box = $("#charCards");
    box.innerHTML = "";
    state.chars.forEach((c, i) => {
      const el = document.createElement("button");
      el.className = "char-card" + (i === state.cur ? " active" : "");
      const img = document.createElement("img");
      img.alt = "";
      img.src = c.img.src;
      el.appendChild(img);
      const b = document.createElement("b");
      b.textContent = c.name;
      const sm = document.createElement("small");
      sm.textContent = i === state.cur ? "使用中" : "选择角色";
      el.appendChild(b);
      el.appendChild(sm);
      const ck = document.createElement("span");
      ck.className = "check";
      ck.textContent = "✓";
      el.appendChild(ck);
      el.onclick = () => {
        state.cur = i;
        state.sel = null;
        state.face = { eye: "happy", mouth: "smile" };
        state.off = freshOff();
        state.brow = freshBrow();
        state.lid = freshLid();
        applyFaceColorOf(c);
        c.px = c.py = c.vx = c.vy = 0;
        closeMask($("#charMask"));
        refreshCharUI();
        buildFaceGrid();
        syncTabExtra();
        renderLayers();
        fillInspector();
      };
      box.appendChild(el);
    });
  }

  function avatarFor(c) {
    try {
      const size = 96;
      const cv = document.createElement("canvas");
      cv.width = cv.height = size * 2;
      const g = cv.getContext("2d");
      const f = c.face;
      const sw = Math.min(c.w, f.rx * 4.2);
      const sh = sw;
      const sx = Math.max(0, Math.min(c.w - sw, f.cx - sw / 2));
      const sy = Math.max(0, Math.min(c.h - sh, f.cy - f.ry * 2.3));
      g.drawImage(c.img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
      return cv.toDataURL();
    } catch (err) {
      console.warn("[兽耳工作室] 头像裁切失败，改用原图", err);
      return c.img.src;
    }
  }

  function refreshCharUI() {
    const c = cur();
    if (!c) return;
    $("#avatarImg").src = avatarFor(c);
    $("#charName").textContent = c.name;
    layout();
  }

  /* ================= 各板块里的颜色 / 尺寸 ================= */
  function applyAnimalLook() {
    const c = cur();
    if (!c) return;
    const A = c.animal;
    c.parts.forEach((p) => {
      if (p.kind !== "animal") return;
      p.hue = A.hue;
      p.sat = A.sat;
      p.light = A.light;
    });
  }

  const colorRow = (label, id, val) =>
    `<label class="line"><span>${label}</span><input type="color" id="${id}" value="${val}" /></label>`;
  const rangeRow = (label, id, min, max, val, unit) =>
    `<label class="line"><span>${label}</span><input type="range" id="${id}" min="${min}" max="${max}" step="1" value="${val}" /><em id="${id}V">${val}${unit || ""}</em></label>`;
  const onEl = (id, ev, fn) => {
    const el = $("#" + id);
    if (el) el[ev] = fn;
  };

  function syncTabExtra() {
    const box = $("#tabExtra");
    if (!box) return;
    const t = setOfTab(state.faceSet);
    const c = cur();
    box.innerHTML = "";
    if (!c) return;
    const C = state.color;

    if (t === "eye") {
      const k = C.target === "R" ? "R" : "L";
      box.innerHTML =
        `<div class="te-title">眼睛颜色
          <span class="seg mini-seg te-seg" id="teEyeSide">
            <button data-v="both" class="${C.target === "both" ? "active" : ""}">双眼</button>
            <button data-v="L" class="${C.target === "L" ? "active" : ""}">左眼</button>
            <button data-v="R" class="${C.target === "R" ? "active" : ""}">右眼</button>
          </span>
        </div>` +
        `<label class="line"><span>左眼</span><input type="color" id="teEyeL" value="${C.L.c}" /><span>右眼</span><input type="color" id="teEyeR" value="${C.R.c}" /></label>` +
        `<label class="line"><span>左右同色</span><input type="checkbox" class="toggle" id="teLink" ${C.link ? "checked" : ""} /></label>` +
        rangeRow("色相", "teHue", -180, 180, C[k].h) +
        rangeRow("对比度", "teSat", -60, 60, C[k].s) +
        rangeRow("明度", "teLight", -30, 30, C[k].l);

      onEl("teEyeL", "oninput", (e) => {
        C.L.c = e.target.value;
        if (C.link) {
          C.R.c = e.target.value;
          $("#teEyeR").value = e.target.value;
        }
      });
      onEl("teEyeR", "oninput", (e) => {
        C.R.c = e.target.value;
        if (C.link) {
          C.L.c = e.target.value;
          $("#teEyeL").value = e.target.value;
        }
      });
      onEl("teLink", "onchange", (e) => {
        C.link = e.target.checked;
        if (C.link) {
          C.R = { ...C.L };
          syncTabExtra();
        }
      });
      $$("#teEyeSide button").forEach((b) => {
        b.onclick = () => {
          C.target = b.dataset.v;
          syncTabExtra();
        };
      });
      ["teHue", "teSat", "teLight"].forEach((id) => {
        onEl(id, "oninput", (e) => {
          const key = { teHue: "h", teSat: "s", teLight: "l" }[id];
          const v = Number(e.target.value);
          $("#" + id + "V").textContent = v;
          if (C.target === "L") C.L[key] = v;
          else if (C.target === "R") C.R[key] = v;
          else {
            C.L[key] = v;
            C.R[key] = v;
          }
          if (C.link) C.R = { ...C.L };
        });
      });
      return;
    }

    if (t === "mouth" || t === "lip") {
      box.innerHTML =
        `<div class="te-title">嘴巴颜色</div>` +
        colorRow("颜色", "teMouth", C.mouth.c) +
        rangeRow("色相", "teMHue", -180, 180, C.mouth.h) +
        rangeRow("对比度", "teMSat", -60, 60, C.mouth.s) +
        rangeRow("明度", "teMLight", -30, 30, C.mouth.l);
      onEl("teMouth", "oninput", (e) => (C.mouth.c = e.target.value));
      ["teMHue", "teMSat", "teMLight"].forEach((id) => {
        onEl(id, "oninput", (e) => {
          const key = { teMHue: "h", teMSat: "s", teMLight: "l" }[id];
          C.mouth[key] = Number(e.target.value);
          $("#" + id + "V").textContent = e.target.value;
        });
      });
      return;
    }

    if (t === "lid") {
      const L = state.lid;
      box.innerHTML =
        `<div class="te-title">眼眶颜色 <span>默认跟随眼睛</span></div>` +
        `<label class="line"><span>上色</span><input type="color" id="teLidC1" value="${L.c1 || C.L.c}" /><span>下色</span><input type="color" id="teLidC2" value="${L.c2 || C.R.c}" /></label>` +
        `<label class="line"><span>渐变</span><input type="checkbox" class="toggle" id="teLidGrad" ${L.grad ? "checked" : ""} /></label>` +
        rangeRow("色相", "teLHue", -180, 180, L.hue) +
        rangeRow("对比度", "teLSat", -60, 60, L.sat) +
        rangeRow("明度", "teLLight", -40, 40, L.light) +
        `<div class="row"><button class="mini tiny" id="teLidAuto">恢复跟随眼睛</button></div>`;
      onEl("teLidC1", "oninput", (e) => (L.c1 = e.target.value));
      onEl("teLidC2", "oninput", (e) => (L.c2 = e.target.value));
      onEl("teLidGrad", "onchange", (e) => (L.grad = e.target.checked));
      ["teLHue", "teLSat", "teLLight"].forEach((id) => {
        onEl(id, "oninput", (e) => {
          const key = { teLHue: "hue", teLSat: "sat", teLLight: "light" }[id];
          L[key] = Number(e.target.value);
          $("#" + id + "V").textContent = e.target.value;
        });
      });
      onEl("teLidAuto", "onclick", () => {
        L.c1 = "";
        L.c2 = "";
        L.hue = 0;
        L.sat = 0;
        L.light = 0;
        L.grad = true;
        syncTabExtra();
      });
      return;
    }

    if (t === "brow") {
      box.innerHTML =
        `<div class="te-title">眉毛颜色 <span>${C.brow.c ? "自定义" : "跟随眼睛"}</span></div>` +
        colorRow("颜色", "teBrow", C.brow.c || C.L.c) +
        rangeRow("色相", "teBHue", -180, 180, C.brow.h) +
        rangeRow("对比度", "teBSat", -60, 60, C.brow.s) +
        rangeRow("明度", "teBLight", -40, 40, C.brow.l) +
        `<div class="row"><button class="mini tiny" id="teBrowAuto">恢复跟随眼睛</button></div>`;
      onEl("teBrow", "oninput", (e) => {
        C.brow.c = e.target.value;
        $("#teBrow").closest(".te-title").querySelector("span").textContent = "自定义";
      });
      ["teBHue", "teBSat", "teBLight"].forEach((id) => {
        onEl(id, "oninput", (e) => {
          const key = { teBHue: "h", teBSat: "s", teBLight: "l" }[id];
          C.brow[key] = Number(e.target.value);
          $("#" + id + "V").textContent = e.target.value;
        });
      });
      onEl("teBrowAuto", "onclick", () => {
        C.brow.c = "";
        C.brow.h = 0;
        C.brow.s = 0;
        C.brow.l = 0;
        syncTabExtra();
      });
      return;
    }

    if (t === "dance") {
      const d = state.dance;
      const label = d.id.startsWith("c:")
        ? ((d.custom.find((x) => "c:" + x.id === d.id) || {}).label || "自定义")
        : ((DANCES.find((x) => x.id === d.id) || {}).label || "静止");
      const extra = (d.extra || []).map(spotLabelOf);
      box.innerHTML =
        `<div class="te-title">动作 <span>${label}${extra.length ? " · " + extra.join(" + ") : ""}</span></div>` +
        rangeRow("速度", "teSpd", 50, 200, Math.round((d.speed || 1) * 100), "%") +
        rangeRow("幅度", "teAmp", 20, 200, Math.round((d.amp == null ? 1 : d.amp) * 100), "%") +
        `<p class="te-hint" id="teDanceMsg">「局部动作」可以多选叠加：扭头、扭腰、扭屁股、挥手同时开也没问题（挥手类同组，只能选一种）。速度/幅度对整体动作和局部动作一起生效。</p>`;
      onEl("teSpd", "oninput", (e) => {
        d.speed = Number(e.target.value) / 100;
        $("#teSpdV").textContent = e.target.value + "%";
      });
      onEl("teAmp", "oninput", (e) => {
        d.amp = Number(e.target.value) / 100;
        $("#teAmpV").textContent = e.target.value + "%";
      });
      return;
    }

    if (t === "ear" || t === "tail") {
      const A = c.animal;
      const kind = A[t];
      const custom = kind && kind.startsWith("c:");
      box.innerHTML =
        `<div class="te-title">${t === "ear" ? "耳朵" : "尾巴"}配色 <span>${
          custom ? "自定义图片" : (ANIMALS[kind] ? ANIMALS[kind].label + (t === "ear" ? "耳" : "尾") : "无")
        }</span></div>` +
        rangeRow("色相", "teAHue", -180, 180, A.hue) +
        rangeRow("对比度", "teASat", -60, 60, A.sat) +
        rangeRow("明度", "teALight", -40, 40, A.light) +
        `<div class="row"><button class="mini tiny" id="teFollowHair">跟随发色</button>
          <span class="te-hint">上面「大小 / X / Y / 倾斜」可整体调位置和角度</span></div>`;
      ["teAHue", "teASat", "teALight"].forEach((id) => {
        onEl(id, "oninput", (e) => {
          const key = { teAHue: "hue", teASat: "sat", teALight: "light" }[id];
          c.animal[key] = Number(e.target.value);
          $("#" + id + "V").textContent = e.target.value;
          applyAnimalLook();
        });
      });
      onEl("teFollowHair", "onclick", () => {
        c.animal.hue = 0;
        c.animal.sat = 0;
        c.animal.light = 0;
        applyAnimalLook();
        syncTabExtra();
      });
      return;
    }

    box.innerHTML = `<p class="te-hint">表情整体只调位置和大小；眼睛、嘴巴、眉毛的颜色在各自页签里。</p>`;
  }

  /* ================= 背景色板 ================= */
  const BGS = [
    { id: "stage", label: "舞台", css: "linear-gradient(160deg,#4a3a6b,#241b36)" },
    { id: "grad", label: "渐变", css: "linear-gradient(160deg,#ffffff,#e9dffb)" },
    { id: "#fff6ea", label: "奶油", color: "#fff6ea" },
    { id: "#ffeaf1", label: "樱花", color: "#ffeaf1" },
    { id: "#eaf6f0", label: "薄荷", color: "#eaf6f0" },
    { id: "#eaf0fb", label: "雾蓝", color: "#eaf0fb" },
  ];

  function buildBG() {
    const box = $("#bgSwatches");
    box.innerHTML = "";
    BGS.forEach((b) => {
      const el = document.createElement("button");
      el.className = "sw " + (b.id === "stage" ? "dark" : "light") + (state.look.bg === b.id ? " active" : "");
      el.style.background = b.css || b.color;
      el.innerHTML = `<b>${b.label}</b>`;
      el.onclick = () => {
        state.look.bg = b.id;
        if (b.color) state.look.bgColor = b.color;
        buildBG();
      };
      box.appendChild(el);
    });
  }
  $("#bgColor").oninput = (e) => {
    state.look.bg = e.target.value;
    state.look.bgColor = e.target.value;
    buildBG();
  };

  /* ================= 默认背景音乐（程序化合成） ================= */
  // 自己用 Web Audio 现场合成的 8 小节约 100BPM 循环，不依赖任何外部音频文件，
  // 因此没有任何版权问题，离线也能响。
  const BGM_SONG = {
    bpm: 108,
    // 五声音阶旋律（MIDI 音高，0 = 休止），每格一个八分音符
    lead: [
      76, 0, 79, 0, 81, 79, 76, 0, 74, 0, 76, 0, 72, 0, 0, 0,
      76, 0, 79, 0, 83, 81, 79, 0, 81, 0, 79, 76, 74, 0, 0, 0,
      72, 0, 74, 76, 79, 0, 76, 0, 74, 0, 72, 0, 69, 0, 0, 0,
      76, 0, 79, 81, 83, 0, 81, 0, 79, 76, 74, 0, 72, 0, 0, 0,
    ],
    bass: [
      48, 0, 55, 0, 48, 0, 55, 0, 45, 0, 52, 0, 45, 0, 52, 0,
      41, 0, 48, 0, 41, 0, 48, 0, 43, 0, 50, 0, 43, 0, 50, 0,
      48, 0, 55, 0, 48, 0, 55, 0, 45, 0, 52, 0, 45, 0, 52, 0,
      41, 0, 48, 0, 43, 0, 50, 0, 48, 0, 55, 0, 48, 0, 0, 0,
    ],
  };
  const bgmSynth = { ctx: null, timer: null, gain: null, on: false };

  const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function bgmBlip(freq, at, dur, type, vol) {
    const ctx = bgmSynth.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    g.connect(bgmSynth.gain);
    o.start(at);
    o.stop(at + dur + 0.04);
  }

  function bgmKick(at, vol) {
    const ctx = bgmSynth.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, at);
    o.frequency.exponentialRampToValueAtTime(52, at + 0.12);
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    o.connect(g);
    g.connect(bgmSynth.gain);
    o.start(at);
    o.stop(at + 0.22);
  }

  function startBgm() {
    try {
      if (!bgmSynth.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        bgmSynth.ctx = new AC();
        bgmSynth.gain = bgmSynth.ctx.createGain();
        bgmSynth.gain.gain.value = 0.22;
        bgmSynth.gain.connect(bgmSynth.ctx.destination);
      }
      const ctx = bgmSynth.ctx;
      if (ctx.state === "suspended") ctx.resume();
      stopBgm(true);
      bgmSynth.on = true;
      const step = 60 / BGM_SONG.bpm / 2;
      let i = 0;
      let next = ctx.currentTime + 0.12;
      const tick = () => {
        if (!bgmSynth.on) return;
        while (next < ctx.currentTime + 0.45) {
          const n = BGM_SONG.lead[i % BGM_SONG.lead.length];
          const b = BGM_SONG.bass[i % BGM_SONG.bass.length];
          if (n) bgmBlip(midiHz(n), next, step * 1.6, "triangle", 0.18);
          if (n && i % 8 === 0) bgmBlip(midiHz(n + 12), next, step * 2.2, "sine", 0.06);
          if (b) bgmBlip(midiHz(b), next, step * 1.7, "sine", 0.24);
          if (i % 4 === 0) bgmKick(next, 0.32);
          next += step;
          i++;
        }
        bgmSynth.timer = setTimeout(tick, 140);
      };
      tick();
    } catch (err) {
      console.warn("[兽耳工作室] 背景音乐启动失败", err);
    }
  }

  function stopBgm(keepCtx) {
    bgmSynth.on = false;
    if (bgmSynth.timer) clearTimeout(bgmSynth.timer);
    bgmSynth.timer = null;
    if (!keepCtx && bgmSynth.ctx && bgmSynth.ctx.state === "running") bgmSynth.ctx.suspend();
  }

  /* ================= 设置 ================= */
  $("#swPhysics").onchange = (e) => (state.physics.on = e.target.checked);
  $("#swBreath").onchange = (e) => (state.look.breath = e.target.checked);
  $("#swShadow").onchange = (e) => (state.look.shadow = e.target.checked);
  $("#swTouch").onchange = (e) => (state.look.touch = e.target.checked);
  $("#swMusic").onchange = (e) => {
    state.look.music = e.target.checked;
    if (e.target.checked) startBgm();
    else {
      stopBgm();
      bgm.pause();
    }
  };
  $$("#segMode button").forEach((b) => {
    b.onclick = () => {
      $$("#segMode button").forEach((x) => x.classList.toggle("active", x === b));
      state.look.mode = b.dataset.mode;
    };
  });

  $("#btnReset").onclick = () => {
    const c = cur();
    c.px = c.py = c.vx = c.vy = 0;
    c.parts.forEach((p) => {
      p.angle = 0;
      p.vel = 0;
    });
    state.face = { eye: "happy", mouth: "smile" };
    state.off = freshOff();
    state.brow = freshBrow();
    state.lid = freshLid();
    state.look.flip = false;
    applyFaceColorOf(c);
    buildAnimalParts(c);
    setZoom(1);
    buildFaceGrid();
    syncTabExtra();
    closeMask($("#menuMask"));
  };

  /* ================= 物理面板 ================= */
  const PHYS_MAP = [
    ["physK", "k", 0.01],
    ["physC", "c", 0.01],
    ["physG", "g", 0.01],
    ["physW", "wind", 0.01],
    ["physM", "ms", 0.01],
    ["physT", "tr", 0.01],
  ];
  PHYS_MAP.forEach(([id, key, mul]) => {
    const el = $("#" + id);
    el.oninput = () => {
      state.physics[key] = Number(el.value) * mul;
      $("#" + id + "v").textContent = el.value;
    };
  });

  $$("[data-preset]").forEach((b) => {
    b.onclick = () => {
      const p = b.dataset.preset;
      const cfg = { soft: [0.28, 0.14, 0.5, 0.3, 1.3, 1.3], normal: [0.45, 0.1, 0.35, 0.18, 1, 1], firm: [0.75, 0.06, 0.2, 0.08, 0.6, 0.6] }[p];
      const keys = ["k", "c", "g", "wind", "ms", "tr"];
      const ids = ["physK", "physC", "physG", "physW", "physM", "physT"];
      keys.forEach((k, i) => {
        state.physics[k] = cfg[i];
        $("#" + ids[i]).value = cfg[i] * 100;
        $("#" + ids[i] + "v").textContent = Math.round(cfg[i] * 100);
      });
    };
  });

  /* ================= 图层 ================= */
  function renderLayers() {
    const list = $("#layerList");
    const c = cur();
    if (!list || !c) return;
    list.innerHTML = "";
    if (!c.parts.length) {
      list.innerHTML = `<li class="empty-line">还没有拆分部件，点上面的按钮开始切</li>`;
    }
    [...c.parts].sort((a, b) => b.z - a.z).forEach((p) => {
      const li = document.createElement("li");
      li.className = state.sel === p ? "active" : "";
      const tag = p.kind === "animal"
        ? (p.slot === "ear" ? ANIMALS[p.animal].label + "耳" : ANIMALS[p.animal].label + "尾")
        : { none: "静态", ear: "耳朵", tail: "尾巴", hair: "头发", cloth: "布料" }[p.type];
      li.innerHTML = `<button class="eye">${p.visible ? "◉" : "○"}</button><span class="nm">${p.name}</span><span class="tag">${tag}</span>`;
      li.querySelector(".eye").onclick = (ev) => {
        ev.stopPropagation();
        p.visible = !p.visible;
        renderLayers();
      };
      li.onclick = () => {
        state.sel = p;
        state.editFrame = true;
        renderLayers();
        fillInspector();
      };
      list.appendChild(li);
    });
    const bodyLi = document.createElement("li");
    bodyLi.className = "body-layer";
    bodyLi.innerHTML = `<span class="eye">◉</span><span class="nm">身体（底图）</span><span class="tag">底图</span>`;
    list.appendChild(bodyLi);
  }

  function fillInspector() {
    const p = state.sel;
    $("#inspector").hidden = !p;
    if (!p) return;
    $("#inspName").textContent = p.name;
    $("#pAx").value = p.ax;
    $("#vAx").textContent = Math.round(p.ax);
    $("#pAy").value = p.ay;
    $("#vAy").textContent = Math.round(p.ay);
    $("#pW").value = p.w;
    $("#vW").textContent = Math.round(p.w);
    $("#pRot").value = p.rot;
    $("#vRot").textContent = Math.round(p.rot);
    $("#pZ").value = p.z;
    $("#vZ").textContent = p.z;
    $("#pType").value = p.type;
    $("#pSoft").value = Math.round((p.phys || 1) * 100);
    $("#vSoft").textContent = Math.round((p.phys || 1) * 100);
    const isAnimal = p.kind === "animal";
    $("#animalTint").hidden = !isAnimal;
    if (isAnimal) {
      $("#pHue").value = p.hue;
      $("#vHue").textContent = p.hue;
      $("#pSat").value = p.sat;
      $("#vSat").textContent = p.sat;
      $("#pLight").value = p.light;
      $("#vLight").textContent = p.light;
      $("#pType").value = p.type;
    }
  }

  const bindPart = (id, key, valId, after) => {
    $("#" + id).oninput = (e) => {
      if (!state.sel) return;
      state.sel[key] = Number(e.target.value);
      if (valId) $("#" + valId).textContent = e.target.value;
      if (after) after();
    };
  };
  bindPart("pAx", "ax", "vAx");
  bindPart("pAy", "ay", "vAy");
  bindPart("pW", "w", "vW", () => {
    const p = state.sel;
    if (p.kind === "animal" && p.slot === "ear") p.h = p.w * ANIMALS[p.animal].ear.h;
    else if (p.img) p.h = p.w * (p.img.height / p.img.width);
    else p.h = p.w;
  });
  bindPart("pRot", "rot", "vRot");
  bindPart("pZ", "z", "vZ");
  bindPart("pHue", "hue", "vHue");
  bindPart("pSat", "sat", "vSat");
  bindPart("pLight", "light", "vLight");
  $("#pType").onchange = (e) => {
    if (state.sel) state.sel.type = e.target.value;
  };
  $("#pSoft").oninput = (e) => {
    if (!state.sel) return;
    state.sel.phys = Number(e.target.value) / 100;
    $("#vSoft").textContent = e.target.value;
  };
  /* 结束部件编辑：收起选框 */
  function endEdit() {
    state.sel = null;
    state.editFrame = false;
    renderLayers();
    fillInspector();
  }
  $("#btnFrameDone").onclick = () => {
    endEdit();
    closeMask($("#menuMask"));
  };
  $("#btnFrameDone2").onclick = () => {
    endEdit();
    closeMask($("#menuMask"));
  };
  $("#btnDelPart").onclick = () => {
    const c = cur();
    c.parts = c.parts.filter((p) => p !== state.sel);
    state.sel = null;
    renderLayers();
    fillInspector();
  };
  $("#btnFlipPart").onclick = () => {
    if (state.sel) state.sel.flip = !state.sel.flip;
  };
  $("#btnCopyPart").onclick = () => {
    const p = state.sel;
    if (!p) return;
    const c = cur();
    const q = makePart({ ...p, name: p.name + "副本", img: p.img, ax: p.ax + 40, z: p.z + 1 });
    c.parts.push(q);
    state.sel = q;
    renderLayers();
    fillInspector();
  };
  $("#btnFrontPart").onclick = () => {
    if (!state.sel) return;
    state.sel.z += 1;
    renderLayers();
    fillInspector();
  };
  $("#btnBackPart").onclick = () => {
    if (!state.sel) return;
    state.sel.z -= 1;
    renderLayers();
    fillInspector();
  };

  $("#btnCrop").onclick = () => setCropMode(!state.cropMode);

  /* ================= 本机存档 ================= */
  const STORE_KEY = "fox-studio:save:v2";

  function storeMsg(t) {
    const a = $("#layoutMsg");
    const b = $("#saveAllMsg");
    if (a) a.textContent = t;
    if (b) b.textContent = t;
  }

  // 图片部件存成缩过的 dataURL，避免撑爆 localStorage
  function packSrc(img) {
    try {
      if (img.src && img.src.startsWith("data:") && img.width <= 520) return img.src;
      const k = Math.min(1, 520 / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(img.width * k));
      cv.height = Math.max(1, Math.round(img.height * k));
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      return cv.toDataURL("image/png");
    } catch (err) {
      return null;
    }
  }

  /* 自定义图片（五官 / 眉毛 / 耳尾）一起存，refresh 之后不会白导入 */
  function packCustom() {
    const out = {};
    for (const k of Object.keys(state.custom)) {
      const arr = (state.custom[k] || [])
        .map((it) => ({ id: it.id, label: it.label, scale: it.scale, src: packSrc(it.img) }))
        .filter((x) => x.src);
      if (arr.length) out[k] = arr;
    }
    return out;
  }

  function imgFromSrc(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error("custom img"));
      im.src = src;
    });
  }

  function snapshot() {
    const c = cur();
    const parts = [];
    for (const p of c.parts) {
      if (p.kind === "animal" || p.auto) continue;
      parts.push({
        name: p.name,
        src: packSrc(p.img),
        ax: p.ax, ay: p.ay, w: p.w, rot: p.rot, flip: p.flip, af: p.af,
        z: p.z, type: p.type, phys: p.phys, visible: p.visible,
      });
    }
    return {
      v: 3,
      char: c.id,
      dance: {
        id: state.dance.id, extra: [...(state.dance.extra || [])],
        speed: state.dance.speed, amp: state.dance.amp,
        custom: (state.dance.custom || []).map((x) => ({ id: x.id, label: x.label, curve: x.curve, dur: x.dur })),
      },
      custom: packCustom(),
      face: { ...state.face },
      off: JSON.parse(JSON.stringify(state.off)),
      brow: JSON.parse(JSON.stringify(state.brow)),
      lid: JSON.parse(JSON.stringify(state.lid)),
      color: JSON.parse(JSON.stringify(state.color)),
      animal: { ...c.animal },
      physics: { ...state.physics },
      zoom: state.look.zoom,
      parts,
    };
  }

  function saveAll(silent) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(snapshot()));
      if (!silent) storeMsg("已保存到本机浏览器，下次打开自动恢复。");
      return true;
    } catch (err) {
      console.warn("[兽耳工作室] 存档失败", err);
      if (!silent) storeMsg("保存失败：浏览器本地存储空间不够（拆分的部件太多时容易出现）。");
      return false;
    }
  }

  async function loadAll(silent) {
    let data = null;
    try {
      data = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    } catch (err) {
      data = null;
    }
    if (!data) {
      if (!silent) storeMsg("本机还没有存档。");
      return false;
    }
    // 打开页面时默认永远是「初音未来」，不会被上次存档里记下的角色顶掉；
    // 只有点「读取存档」或地址栏 ?char= 时才跟着存档切换角色。
    const qsChar = new URLSearchParams(location.search).get("char");
    const i = state.chars.findIndex((c) => c.id === data.char);
    if ((!silent || qsChar) && i >= 0) state.cur = i;
    const c = cur();
    if (!c) return false;
    // 存档里的角色和当前角色不是同一个：只恢复通用设置，不把别人身上的
    // 五官偏移 / 拆分部件 / 耳尾 硬套过来
    const sameChar = data.char === c.id;

    if (sameChar && data.face) state.face = { ...state.face, ...data.face };
    if (sameChar) {
      state.off = data.off || freshOff();
      for (const k of ["expr", "eye", "mouth", "ear", "tail"]) {
        state.off[k] = Object.assign({ x: 0, y: 0, s: 1, rot: 0 }, state.off[k] || {});
      }
      state.brow = Object.assign(freshBrow(), data.brow || {});
      if (data.lid) state.lid = Object.assign({ id: "none", hue: 0, sat: 0, light: 0, grad: true, c1: "", c2: "" }, data.lid);
      state.brow.L = Object.assign({ x: 0, y: 0, rot: 0, s: 1 }, state.brow.L || {});
      state.brow.R = Object.assign({ x: 0, y: 0, rot: 0, s: 1 }, state.brow.R || {});
      if (data.animal) Object.assign(c.animal, data.animal);
    }
    if (data.color) state.color = Object.assign(state.color, data.color);
    if (data.physics) state.physics = Object.assign(state.physics, data.physics);
    if (data.dance) {
      state.dance.id = data.dance.id || "none";
      state.dance.extra = Array.isArray(data.dance.extra)
        ? data.dance.extra.filter((x) => SPOT_ACTIONS.some((s) => s.id === x))
        : [];
      state.dance.speed = data.dance.speed || 1;
      state.dance.amp = data.dance.amp || 1;
      state.dance.custom = Array.isArray(data.dance.custom) ? data.dance.custom : [];
    }
    if (data.custom) {
      for (const k of Object.keys(state.custom)) {
        const arr = data.custom[k] || [];
        const loaded = [];
        for (const d of arr) {
          if (!d.src) continue;
          try {
            loaded.push({ id: d.id, label: d.label || "自定", img: await imgFromSrc(d.src), scale: d.scale || 1 });
          } catch (err) {
            /* 单张失败就跳过 */
          }
        }
        state.custom[k] = loaded;
      }
    }

    buildAnimalParts(c);
    // 保留自动生成的长发部件，重建用户拆分的部件（角色不同就不套用）
    c.parts = c.parts.filter((p) => p.kind === "animal" || p.auto);
    for (const d of sameChar ? data.parts || [] : []) {
      if (!d.src) continue;
      let im;
      try {
        im = await new Promise((res, rej) => {
          const j = new Image();
          j.onload = () => res(j);
          j.onerror = () => rej(new Error("part img"));
          j.src = d.src;
        });
      } catch (err) {
        continue;
      }
      c.parts.push(makePart({ ...d, img: im, kind: "image" }));
    }
    c.px = c.py = c.vx = c.vy = 0;

    state.sel = null;
    state.editFrame = false;
    refreshCharUI();
    buildCharCards();
    buildFaceGrid();
    syncTabExtra();
    renderLayers();
    fillInspector();
    applyAnimalLook();
    setZoom(data.zoom || 1);
    if (!silent) storeMsg("已读取上次保存的布局。");
    return true;
  }

  $("#btnSaveLayout").onclick = () => saveAll();
  $("#btnLoadLayout").onclick = async () => {
    if (!(await loadAll())) return;
    closeMask($("#menuMask"));
  };
  $("#btnSaveAll").onclick = () => saveAll();
  $("#btnLoadAll").onclick = async () => {
    await loadAll();
  };
  $("#btnClearAll").onclick = () => {
    try {
      localStorage.removeItem(STORE_KEY);
      storeMsg("存档已清除。");
    } catch (err) {
      storeMsg("清除失败。");
    }
  };

  /* ================= 保存 ================= */
  $("#btnExport").onclick = () => {
    try {
      const a = document.createElement("a");
      a.download = `兽耳工作室-${Date.now()}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      $("#saveMsg").textContent = "已导出。";
    } catch (err) {
      $("#saveMsg").textContent = "导出被浏览器拦住了，请用本地服务器（http）打开页面。";
    }
  };
  $("#btnCopyCfg").onclick = async () => {
    const c = cur();
    const cfg = {
      char: c.name,
      face: state.face,
      color: state.color,
      off: state.off,
      zoom: state.look.zoom,
      physics: state.physics,
      animal: c.animal,
      parts: c.parts.map((p) => ({ name: p.name, kind: p.kind, ax: p.ax, ay: p.ay, w: p.w, rot: p.rot, z: p.z, type: p.type })),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(cfg, null, 2));
      $("#saveMsg").textContent = "配置已复制到剪贴板。";
    } catch (e) {
      $("#saveMsg").textContent = "复制失败，浏览器不允许访问剪贴板。";
    }
  };

  /* ================= 语音 ================= */
  const voices = [];
  const bgm = new Audio();
  bgm.loop = true;
  bgm.volume = 0.35;

  function playVoice(v, asBgm) {
    const a = asBgm ? bgm : v.audio;
    a.currentTime = 0;
    a.play().catch(() => {});
  }

  function addVoices(files) {
    for (const f of files) {
      if (!f.type.startsWith("audio")) continue;
      const url = URL.createObjectURL(f);
      const audio = new Audio(url);
      voices.push({ name: f.name.replace(/\.[^.]+$/, "").slice(0, 12), audio, url });
    }
    renderVoices();
  }

  function renderVoices() {
    const list = $("#voiceList");
    list.innerHTML = "";
    if (!voices.length) {
      list.innerHTML = `<li class="empty-line" style="border:0">还没有语音，导入后会在这里列出</li>`;
      return;
    }
    voices.forEach((v, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<button class="play">▶</button><span class="nm">${v.name}</span><span style="color:#b3adc0;font-size:11px">${i + 1}</span><button class="del">×</button>`;
      li.querySelector(".play").onclick = () => playVoice(v);
      li.querySelector(".del").onclick = () => {
        voices.splice(i, 1);
        renderVoices();
      };
      list.appendChild(li);
    });
  }

  $("#btnVoicePick").onclick = () => $("#voiceFile").click();
  $("#voiceFile").onchange = (e) => {
    addVoices(Array.from(e.target.files || []));
    e.target.value = "";
  };
  const voicePane = document.querySelector('.pane[data-pane="voice"]');
  ["dragover", "drop"].forEach((t) =>
    voicePane.addEventListener(t, (e) => {
      e.preventDefault();
      if (t === "drop") addVoices(Array.from(e.dataTransfer.files || []));
    })
  );
  document.addEventListener("keydown", (e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= 9 && voices[n - 1]) playVoice(voices[n - 1]);
    if (e.key === "Escape") {
      closeMask($("#menuMask"));
      closeMask($("#charMask"));
    }
  });

  /* ================= 导入自己的立绘 ================= */
  $("#btnImport").onclick = () => $("#charFile").click();
  $("#charFile").onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const im = await new Promise((res) => {
      const i = new Image();
      i.onload = () => res(i);
      i.src = url;
    });
    const mode = $("#cutMode").value;
    const cvs = document.createElement("canvas");
    cvs.width = im.naturalWidth;
    cvs.height = im.naturalHeight;
    const c2 = cvs.getContext("2d");
    c2.drawImage(im, 0, 0);
    if (mode !== "none") {
      try {
        const data = c2.getImageData(0, 0, cvs.width, cvs.height);
        cutBackground(data, mode);
        c2.putImageData(data, 0, 0);
      } catch (_) {}
    }
    const out = new Image();
    await new Promise((res) => {
      out.onload = res;
      out.src = cvs.toDataURL("image/png");
    });
    const c = {
      id: "custom-" + Date.now(),
      name: f.name.replace(/\.[^.]+$/, "").slice(0, 8),
      img: out,
      w: out.naturalWidth,
      h: out.naturalHeight,
      face: {
        cx: out.naturalWidth * 0.5,
        cy: out.naturalHeight * 0.32,
        rx: out.naturalWidth * 0.22,
        ry: out.naturalHeight * 0.09,
        eye: "#5c5c6b",
        mouth: "#b9606c",
      },
      hair: "#f0e6c8",
      line: "#cbb3c2",
      anchors: {
        earL: [out.naturalWidth * 0.4, out.naturalHeight * 0.12],
        earR: [out.naturalWidth * 0.6, out.naturalHeight * 0.12],
        tail: [out.naturalWidth * 0.74, out.naturalHeight * 0.68],
      },
      earW: out.naturalWidth * 0.16,
      tailL: out.naturalWidth * 0.5,
      animal: { ear: "none", tail: "none", hue: 0, sat: 0, light: 0, earScale: 1, tailScale: 1 },
      parts: [],
      px: 0, py: 0, vx: 0, vy: 0, pop: 0,
    };
    state.chars.push(c);
    state.cur = state.chars.length - 1;
    state.sel = null;
    applyFaceColorOf(c);
    buildCharCards();
    refreshCharUI();
    syncTabExtra();
    renderLayers();
    fillInspector();
    closeMask($("#charMask"));
    openMenu("split");
  };

  function cutBackground(imgData, mode) {
    const { width: W, height: H, data } = imgData;
    let tr, tg, tb;
    const idx = (x, y) => (y * W + x) * 4;
    if (mode === "auto") {
      let r = 0, g = 0, b = 0;
      const pts = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]];
      pts.forEach(([x, y]) => {
        const i = idx(x, y);
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      });
      tr = r / 4;
      tg = g / 4;
      tb = b / 4;
    } else if (mode === "white") {
      tr = tg = tb = 255;
    } else {
      tr = tg = tb = 0;
    }
    const tol2 = 34 * 34;
    const match = (i) => {
      const dr = data[i] - tr, dg = data[i + 1] - tg, db = data[i + 2] - tb;
      return dr * dr + dg * dg + db * db <= tol2 && data[i + 3] > 0;
    };
    const seen = new Uint8Array(W * H);
    const stack = [];
    const push = (x, y) => {
      const p = y * W + x;
      if (!seen[p] && match(p * 4)) {
        seen[p] = 1;
        stack.push(p);
      }
    };
    for (let x = 0; x < W; x++) {
      push(x, 0);
      push(x, H - 1);
    }
    for (let y = 0; y < H; y++) {
      push(0, y);
      push(W - 1, y);
    }
    while (stack.length) {
      const p = stack.pop();
      data[p * 4 + 3] = 0;
      const x = p % W;
      const y = (p - x) / W;
      if (x > 0) push(x - 1, y);
      if (x < W - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1);
      if (y < H - 1) push(x, y + 1);
    }
  }

  /* ================= 启动 ================= */
  // 调试出口：控制台里可以直接看取景与状态
  window.__studio = {
    view, state,
    bbox: () => (cur() ? bodyBounds(cur()) : null),
    pose: (t) => dancePose(t),
    // 改完 state 里耳尾种类 / 倾斜后调一下，让部件重建
    apply: () => {
      const c = cur();
      if (!c) return;
      buildAnimalParts(c);
      layout();
    },
    masks: () => (cur() ? warpMasks(cur()) : null),
    zones: SPOT_ZONES,
    // 调试：把某个区域按指定角度扭一下，返回画布（用来对比变形前后）
    warpTest: (zone, deg) => {
      const c = cur();
      if (!c) return null;
      const q = 1;
      const bw = Math.round(c.w);
      const bh = Math.round(c.h);
      const g = warpBuffer(bw, bh);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, bw, bh);
      g.setTransform(q, 0, 0, q, 0, 0);
      paintCharacter(g, c);
      g.setTransform(1, 0, 0, 1, 0, 0);
      applySpotWarps(warpBuf, g, q, c, [{ zone, ang: deg * DEG, dx: 0, ...SPOT_ZONES[zone] }]);
      return warpBuf;
    },
    save: () => saveAll(true),
    load: () => loadAll(true),
  };
  buildBG();
  renderVoices();
  fillInspector();
  boot();

  window.addEventListener("resize", () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    resize();
  });
})();
