// The Cortex logo, rebuilt in 3D, guiding the scroll.
// Scroll position becomes `c`: which [data-ch] section sits mid-screen, fractional in between.
// One keyframe per section says what the brain does there; each frame blends the two either side of `c`.
// Any failure (no WebGL, blocked module) falls back to the still page.
const root = document.documentElement;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// brain: outline + glowing branches · pods: the three lobes pulled out · graph: nodes spread into a knowledge graph
// pull: graph drawn back into the core · x: shift right, as a fraction of view width · z: camera distance
// op: overall opacity · glow: core brightness
const KEYS = [
  { brain: 1,   pods: 0, graph: 0, pull: 0, x: 0.26, z: 6.2, op: 1,    glow: 1   }, // 0 hero: the whole logo
  { brain: 0.4, pods: 1, graph: 0, pull: 0, x: 0.17, z: 5.8, op: 1,    glow: 0.8 }, // 1 lobes: code / docs / research come out
  { brain: 0,   pods: 0, graph: 1, pull: 0, x: 0,    z: 7.0, op: 0.5,  glow: 0.6 }, // 2 features: the nodes become a graph
  { brain: 0,   pods: 0, graph: 1, pull: 0, x: 0,    z: 10,  op: 0.3,  glow: 0.6 }, // 3 screenshots: graph steps back
  { brain: 0,   pods: 0, graph: 1, pull: 1, x: 0,    z: 6.0, op: 0.6,  glow: 1.6 }, // 4 how: point it at a folder, all of it flows in
  { brain: 1,   pods: 0, graph: 0, pull: 0, x: 0,    z: 4.6, op: 0.4,  glow: 2   }, // 5 download: whole again, brightest
  { brain: 1,   pods: 0, graph: 0, pull: 0, x: 0,    z: 4.6, op: 0,    glow: 1   }, // 6 faq: out of the way
];

if (root.classList.contains('live')) {
  start().catch((err) => {
    console.error('Cortex: 3D scene unavailable, showing the still page.', err);
    root.classList.replace('live', 'static');
  });
}

async function start() {
  // jsDelivr-minified copies of three@0.186.1 build/three.module.js + three.core.js, kept under their own names
  const THREE = await import('../vendor/three-0.186.1/three.module.js');
  const canvas = $('.world'), tagsEl = $('.tags');
  const chapters = $$('[data-ch]');
  console.assert(chapters.length === KEYS.length, 'Cortex: need one keyframe per [data-ch] section');
  const mobile = matchMedia('(max-width: 900px), (pointer: coarse)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const resize = () => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  };
  resize();

  // ---- textures, drawn on canvases (no image files to load) ----
  const canvasTex = (size, draw) => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    draw(cv.getContext('2d'), size);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
  // brushed-steel look of the logo, with the amber light catching the lower edge
  const matcap = canvasTex(256, (g) => {
    let gr = g.createRadialGradient(96, 82, 4, 128, 128, 132);
    gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.2, '#DADDE3'); gr.addColorStop(0.52, '#8C9099');
    gr.addColorStop(0.8, '#45484F'); gr.addColorStop(1, '#202228');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    gr = g.createRadialGradient(190, 206, 6, 190, 206, 110);
    gr.addColorStop(0, 'rgba(246,162,60,0.55)'); gr.addColorStop(1, 'rgba(246,162,60,0)');
    g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  });
  const glowTex = canvasTex(128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
  // the three glyphs inside the logo's pockets
  const icon = (draw) => canvasTex(256, (g) => {
    g.strokeStyle = '#B9BEC8'; g.lineWidth = 15; g.lineCap = g.lineJoin = 'round';
    g.beginPath(); draw(g); g.stroke();
  });
  const ICONS = {
    code: icon((g) => {
      g.moveTo(84, 88); g.lineTo(44, 128); g.lineTo(84, 168);
      g.moveTo(172, 88); g.lineTo(212, 128); g.lineTo(172, 168);
      g.moveTo(146, 76); g.lineTo(110, 180);
    }),
    doc: icon((g) => {
      g.moveTo(140, 48); g.lineTo(66, 48); g.lineTo(66, 208); g.lineTo(178, 208); g.lineTo(178, 150);
      g.moveTo(94, 92); g.lineTo(150, 92); g.moveTo(94, 124); g.lineTo(140, 124); g.moveTo(94, 156); g.lineTo(126, 156);
      g.moveTo(150, 168); g.lineTo(212, 98); g.lineTo(196, 84); g.lineTo(136, 152); g.lineTo(150, 168);
    }),
    chart: icon((g) => {
      g.arc(116, 116, 66, 0, Math.PI * 2);
      g.moveTo(72, 134); g.lineTo(100, 104); g.lineTo(122, 128); g.lineTo(158, 88);
      g.moveTo(166, 166); g.lineTo(214, 214);
    }),
  };

  // ---- materials ----
  const silver = new THREE.MeshMatcapMaterial({ matcap, transparent: true });
  const ember = new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true });
  const additive = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
  const haze = new THREE.MeshBasicMaterial({ color: 0xf6a23c, opacity: 0.16, ...additive });
  const nodeGlow = new THREE.SpriteMaterial({ map: glowTex, color: 0xffb35c, ...additive });
  const sparkMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xfff1d6, ...additive });
  const podSilver = new THREE.MeshMatcapMaterial({ matcap, transparent: true });
  const podBack = new THREE.MeshBasicMaterial({ color: 0x15181f, transparent: true });

  // ---- the brain, traced from logo.png (pixel coords; core at 965,770) ----
  const S = 1 / 630, CX = 965, CY = 770;
  // the middle sits closer to the viewer than the rim, so it reads as a volume when it turns
  const dome = (x, y) => 0.32 * Math.max(0, 1 - (x * x + y * y) / 1.3);
  const pt = ([px, py], w = 0) => { const x = (px - CX) * S, y = (CY - py) * S; return new THREE.Vector3(x, y, dome(x, y) + w); };
  const curve = (pts, closed = false, k = 0) =>
    new THREE.CatmullRomCurve3(pts.map((p, i) => pt(p, 0.035 * Math.sin(i * 1.9 + k))), closed);
  const tube = (c, r, mat, segs = 80, closed = false) => new THREE.Mesh(new THREE.TubeGeometry(c, segs, r, 8, closed), mat);

  const OUTLINE = [[440, 905], [360, 800], [345, 690], [385, 570], [470, 455], [600, 375], [730, 320], [860, 292],
    [990, 300], [1120, 298], [1255, 330], [1385, 385], [1490, 465], [1565, 570], [1600, 700], [1592, 850], [1545, 985],
    [1470, 1080], [1430, 1160], [1330, 1200], [1235, 1168], [1130, 1115], [1000, 1088], [870, 1105], [740, 1080],
    [620, 1030], [520, 975]];
  const FOLDS = [
    [[470, 560], [560, 500], [670, 490], [760, 535]], [[640, 380], [700, 440], [790, 450]],
    [[900, 300], [875, 410], [915, 540]], [[1160, 305], [1105, 415], [1070, 545]],
    [[1390, 390], [1335, 480], [1370, 575], [1490, 615]], [[375, 760], [480, 800], [610, 815]],
    [[1310, 1010], [1410, 955], [1540, 905]],
    [[1250, 1120], [1350, 1105], [1460, 1075]], [[1265, 1158], [1360, 1152], [1430, 1136]], // cerebellum
    [[1035, 1090], [1075, 1210], [1130, 1320], [1175, 1380]], [[985, 1085], [1030, 1200], [1090, 1320], [1135, 1385]], // stem
  ];
  const NODES = [[830, 375], [810, 440], [1035, 430], [1270, 395], [610, 510], [1455, 590], [1470, 680],
    [1445, 825], [1540, 930], [1380, 1060], [710, 975], [855, 1060], [430, 830]];
  const PODS = [
    { at: [700, 710], icon: 'code', label: '<b>Code</b>Studio IDE' },
    { at: [1210, 600], icon: 'doc', label: '<b>Documents</b>Document Studio' },
    { at: [1200, 930], icon: 'chart', label: '<b>Research</b>Deep Research' },
  ];

  const group = new THREE.Group();   // moves with the pointer and the scroll
  const brain = new THREE.Group();   // the parts that fade out when the graph takes over
  group.add(brain);
  scene.add(group);

  brain.add(tube(curve(OUTLINE, true), 0.03, silver, 320, true));
  FOLDS.forEach((f, k) => brain.add(tube(curve(f, false, k), 0.022, silver, 48)));

  const core = pt([CX, CY]);
  const nodePos = NODES.map((n) => pt(n));
  const branches = nodePos.map((p, i) => {
    // core → node, bowed sideways a little so the branches fan out like the logo's
    const mid = core.clone().lerp(p, 0.5);
    const side = new THREE.Vector3(-(p.y - core.y), p.x - core.x, 0).multiplyScalar(i % 2 ? 0.14 : -0.14);
    const c = new THREE.CatmullRomCurve3([core, mid.add(side).setZ(mid.z + 0.05), p]);
    brain.add(tube(c, 0.009, ember, 40), tube(c, 0.032, haze, 40));
    const node = new THREE.Sprite(nodeGlow);
    node.position.copy(p);
    const spark = new THREE.Sprite(sparkMat); // a signal firing from the core out to this node
    brain.add(node, spark);
    return { c, node, spark, phase: (i * 0.37) % 1 };
  });

  // core: a silver socket with a pulsing light in it
  const socket = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.022, 12, 48), silver);
  socket.position.copy(core);
  brain.add(socket);
  const coreLight = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd9a0, ...additive }));
  coreLight.position.copy(core);
  const coreDot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 12), new THREE.MeshBasicMaterial({ color: 0xfff3dc }));
  coreDot.position.copy(core);
  group.add(coreLight, coreDot);

  // the three pockets: ring + dark disc + glyph, which float out in the lobes chapter
  const podGeo = { ring: new THREE.TorusGeometry(0.19, 0.022, 12, 56), disc: new THREE.CircleGeometry(0.18, 40), glyph: new THREE.PlaneGeometry(0.25, 0.25) };
  const pods = PODS.map((d) => {
    const g = new THREE.Group();
    const glyphMat = new THREE.MeshBasicMaterial({ map: ICONS[d.icon], transparent: true, depthWrite: false });
    g.add(new THREE.Mesh(podGeo.disc, podBack), new THREE.Mesh(podGeo.ring, podSilver), new THREE.Mesh(podGeo.glyph, glyphMat));
    g.children[2].position.z = 0.01;
    const home = pt(d.at, 0.06);
    const out = new THREE.Vector3(home.x, home.y, 0).normalize();
    group.add(g);
    return { g, home, out, glyphMat };
  });

  // ---- knowledge graph: starts on the brain's nodes, spreads out, gets pulled into the core ----
  const N = mobile ? 70 : 120;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const from = new Float32Array(N * 3), to = new Float32Array(N * 3), cur = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const n = nodePos[i % nodePos.length];
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = 1 + rnd() * 1.9, s = Math.sqrt(1 - u * u);
    from.set([n.x + (rnd() - 0.5) * 0.06, n.y + (rnd() - 0.5) * 0.06, n.z], i * 3);
    to.set([core.x + r * s * Math.cos(th) * 1.4, core.y + r * u * 0.8, core.z + r * s * Math.sin(th)], i * 3);
    col.set(i % 4 ? [1, 0.68, 0.32] : [0.22, 0.74, 0.97], i * 3); // amber, with the site's cyan mixed in
  }
  const edges = [];
  const d2 = (a, b) => (to[a * 3] - to[b * 3]) ** 2 + (to[a * 3 + 1] - to[b * 3 + 1]) ** 2 + (to[a * 3 + 2] - to[b * 3 + 2]) ** 2;
  for (let i = 0; i < N; i++) {
    const near = [...Array(N).keys()].filter((j) => j !== i).sort((a, b) => d2(i, a) - d2(i, b)).slice(0, 2);
    near.forEach((j) => edges.push(i, j));
  }
  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(cur, 3));
  pointsGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const linePos = new Float32Array(edges.length * 3);
  const linesGeo = new THREE.BufferGeometry();
  linesGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const graph = new THREE.Group();
  const points = new THREE.Points(pointsGeo, new THREE.PointsMaterial({ size: 0.13, map: glowTex, vertexColors: true, ...additive }));
  const lines = new THREE.LineSegments(linesGeo, new THREE.LineBasicMaterial({ color: 0xf6a23c, ...additive }));

  // signals hopping node to node along the links: the graph is thinking
  const nbrs = Array.from({ length: N }, () => []);
  for (let e = 0; e < edges.length; e += 2) { nbrs[edges[e]].push(edges[e + 1]); nbrs[edges[e + 1]].push(edges[e]); }
  const hop = (p) => { p.a = p.b; const n = nbrs[p.a]; p.b = n[(Math.random() * n.length) | 0]; p.u = 0; };
  const pulses = Array.from({ length: mobile ? 14 : 28 }, (_, i) => { const p = { b: (i * 7) % N }; hop(p); p.u = Math.random(); return p; });
  const pulsePos = new Float32Array(pulses.length * 3);
  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3));
  const signals = new THREE.Points(pulseGeo, new THREE.PointsMaterial({ size: 0.22, map: glowTex, color: 0xfff1d6, ...additive }));
  graph.add(points, lines, signals);
  group.add(graph);

  // feature cards: every node belongs to one card's cluster. Hover a card and its cluster gathers
  // behind it and lights up, the way Cortex pulls related context together before it answers.
  const cards = $$('#features .card');
  const hl = new Float32Array(Math.max(1, cards.length)), anchors = [...hl].map(() => new THREE.Vector3());
  const offs = new Float32Array(N * 3), baseCol = col.slice(), LIT = [1, 0.95, 0.85];
  for (let i = 0; i < N; i++) {
    const a = rnd() * Math.PI * 2, b = rnd() * 2 - 1, r = 0.15 + rnd() * 0.35, s = Math.sqrt(1 - b * b);
    offs.set([r * s * Math.cos(a) * 1.6, r * b, r * s * Math.sin(a)], i * 3); // wider than tall, like a card
  }
  let hover = -1;
  cards.forEach((el, j) => {
    el.addEventListener('pointerenter', () => { hover = j; });
    el.addEventListener('pointerleave', () => { if (hover === j) hover = -1; });
  });
  const ray = new THREE.Vector3(), coreXYZ = [core.x, core.y, core.z];

  // ---- labels for the three pockets (HTML, placed on projected 3D points) ----
  const tags = PODS.map((d) => {
    const el = document.createElement('div');
    el.className = 'tag';
    el.innerHTML = d.label;
    tagsEl.append(el);
    return el;
  });
  const tmp = new THREE.Vector3();
  const project = (v) => {
    tmp.copy(v).project(camera);
    const x = (tmp.x * 0.5 + 0.5) * canvas.clientWidth, y = (-tmp.y * 0.5 + 0.5) * canvas.clientHeight;
    return { x, y, on: tmp.z < 1 && x > -40 && x < canvas.clientWidth + 40 && y > -40 && y < canvas.clientHeight + 40 };
  };

  // ---- scroll → c ----
  let centers = [];
  const measure = () => { centers = chapters.map((el) => el.getBoundingClientRect().top + scrollY + el.offsetHeight / 2); };
  measure();
  new ResizeObserver(measure).observe(document.body);
  addEventListener('resize', () => { resize(); measure(); });
  const targetC = () => {
    const vc = scrollY + innerHeight / 2;
    if (vc <= centers[0]) return 0;
    for (let i = 0; i < centers.length - 1; i++) if (vc < centers[i + 1]) return i + (vc - centers[i]) / (centers[i + 1] - centers[i]);
    return centers.length - 1;
  };
  const keyAt = (c) => {
    const i = Math.min(KEYS.length - 2, Math.max(0, Math.floor(c)));
    const f = smooth(0, 1, c - i), a = KEYS[i], b = KEYS[i + 1], k = {};
    for (const p in a) k[p] = lerp(a[p], b[p], f);
    return k;
  };

  const pointer = { x: 0, y: 0 }, aim = { x: 0, y: 0 };
  if (!mobile) addEventListener('pointermove', (e) => { aim.x = e.clientX / innerWidth - 0.5; aim.y = e.clientY / innerHeight - 0.5; }, { passive: true });

  let c = targetC(), last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000), t = now / 1000;
    last = now;
    const tc = targetC();
    c += (tc - c) * (1 - Math.exp(-dt * 5));
    if (Math.abs(tc - c) < 1e-4) c = tc;
    pointer.x += (aim.x - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (aim.y - pointer.y) * Math.min(1, dt * 3);
    let maxHl = 0;
    for (let j = 0; j < hl.length; j++) { hl[j] += ((j === hover ? 1 : 0) - hl[j]) * Math.min(1, dt * 4); maxHl = Math.max(maxHl, hl[j]); }

    const k = keyAt(c);
    const narrow = innerWidth < 900;
    // between sections (lobes → features → screenshots → how) the graph swings round and flies at the
    // reader, then settles back behind the next section
    const surge = c > 1 && c < 4 ? Math.sin(Math.PI * (c % 1)) ** 2 : 0;
    // on a phone the brain sits centred behind the text, so dim it there
    let op = lerp(k.op * (narrow && c < 1.5 ? 0.3 : 1), 0.85, surge);
    op = lerp(op, Math.max(op, 0.8), maxHl);
    canvas.style.opacity = op.toFixed(3);
    if (op < 0.005) { tags.forEach((el) => el.classList.remove('show')); requestAnimationFrame(tick); return; }

    camera.position.set(0, 0, k.z);
    const visW = 2 * k.z * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
    group.position.x = (narrow ? 0 : k.x) * visW;
    group.rotation.y = 0.22 * Math.sin(t * 0.3) + pointer.x * 0.5;
    group.rotation.x = 0.06 * Math.sin(t * 0.23) + pointer.y * 0.3;

    // brain
    brain.visible = k.brain > 0.01;
    silver.opacity = ember.opacity = k.brain;
    haze.opacity = 0.16 * k.brain;
    nodeGlow.opacity = 0.9 * k.brain;
    sparkMat.opacity = k.brain;
    branches.forEach((b, i) => {
      const u = (t * 0.45 + b.phase) % 1;
      b.c.getPoint(u, b.spark.position);
      b.spark.scale.setScalar(0.17 * Math.sin(Math.PI * u));
      const flare = u > 0.5 ? smooth(0.8, 1, u) : smooth(0.25, 0, u); // the node flares as its spark arrives
      b.node.scale.setScalar(0.2 * (1 + 0.15 * Math.sin(t * 2 + i) + 1.1 * flare));
    });
    coreLight.scale.setScalar(0.55 * k.glow * (1 + 0.1 * Math.sin(t * 2.2)));

    // pockets
    const podOp = Math.max(k.brain, k.pods);
    podSilver.opacity = podBack.opacity = podOp;
    for (const p of pods) {
      p.g.visible = podOp > 0.01;
      p.glyphMat.opacity = podOp;
      p.g.position.copy(p.home).addScaledVector(p.out, 0.55 * k.pods);
      p.g.position.z += 0.5 * k.pods;
      p.g.scale.setScalar(1 + 0.45 * k.pods);
    }

    // graph
    graph.visible = k.graph > 0.01;
    // half a turn per section, starting square to the brain so the nodes leave from where they sat
    graph.rotation.set(0.35 * surge, Math.max(0, c - 1) * Math.PI + 0.1 * Math.sin(t * 0.3), 0);
    graph.scale.setScalar(1 + 1.6 * surge);
    graph.position.z = 2.2 * surge;
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();

    if (graph.visible) {
      // where each lit cluster gathers: the hovered card's centre, cast onto the core's plane
      for (let j = 0; j < cards.length; j++) {
        if (hl[j] < 0.001) continue;
        const r = cards[j].getBoundingClientRect();
        ray.set(((r.left + r.width / 2) / canvas.clientWidth) * 2 - 1, 1 - ((r.top + r.height / 2) / canvas.clientHeight) * 2, 0.5)
          .unproject(camera).sub(camera.position).normalize();
        anchors[j].copy(camera.position).addScaledVector(ray, (core.z - camera.position.z) / ray.z);
        graph.worldToLocal(anchors[j]);
      }
      for (let i = 0; i < N; i++) {
        const j = i % hl.length, h = hl[j];
        for (let a = 0; a < 3; a++) {
          const q = i * 3 + a, base = lerp(lerp(from[q], to[q], k.graph), coreXYZ[a], k.pull);
          cur[q] = h > 0.001 ? lerp(base, anchors[j].getComponent(a) + offs[q], h) : base;
          col[q] = lerp(baseCol[q], LIT[a], h);
        }
      }
      for (let e = 0; e < edges.length; e++) linePos.set(cur.subarray(edges[e] * 3, edges[e] * 3 + 3), e * 3);
      pulses.forEach((p, n) => {
        p.u += dt * 1.4;
        if (p.u >= 1) hop(p);
        for (let a = 0; a < 3; a++) pulsePos[n * 3 + a] = lerp(cur[p.a * 3 + a], cur[p.b * 3 + a], p.u);
      });
      pointsGeo.attributes.position.needsUpdate = pointsGeo.attributes.color.needsUpdate = true;
      linesGeo.attributes.position.needsUpdate = pulseGeo.attributes.position.needsUpdate = true;
      points.material.opacity = signals.material.opacity = k.graph;
      lines.material.opacity = (0.28 + 0.12 * surge) * k.graph;
    }

    const tagsOn = k.pods > 0.6;
    pods.forEach((p, i) => {
      const at = project(p.g.localToWorld(tmp.set(0, -0.3, 0)));
      tags[i].classList.toggle('show', tagsOn && at.on);
      if (tagsOn && at.on) tags[i].style.transform = `translate3d(${at.x}px, ${at.y}px, 0) translate(-50%, 0)`;
    });

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
