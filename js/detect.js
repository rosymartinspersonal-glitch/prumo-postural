/* TEAMRM - Posture & Correction — detecção automática.
   MediaPipe Tasks Vision (código aberto, Apache 2.0): pose do corpo, malha facial e segmentação.
   Marcadores verdes: detecção por cor, sem IA.                                                   */
'use strict';

const MP_VER = '0.10.14';
const MP_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`;
const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';
const POSE_LITE = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let visionPromise = null;
function vision() {
  if (!visionPromise) {
    visionPromise = (async () => {
      const v = await import(`${MP_BASE}/vision_bundle.mjs`);
      const files = await v.FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
      return { v, files };
    })();
    visionPromise.catch(() => { visionPromise = null; });
  }
  return visionPromise;
}
const models = {};
function model(name) {
  if (!models[name]) {
    models[name] = (async () => {
      const { v, files } = await vision();
      const base = path => ({ modelAssetPath: path, delegate: 'CPU' });
      // pontos sem máscara (bem menos memória); a máscara só é pedida para remover o fundo
      if (name === 'pose') return v.PoseLandmarker.createFromOptions(files, { baseOptions: base(POSE_MODEL), runningMode: 'IMAGE', numPoses: 1 });
      if (name === 'poseLite') return v.PoseLandmarker.createFromOptions(files, { baseOptions: base(POSE_LITE), runningMode: 'IMAGE', numPoses: 1 });
      if (name === 'poseSeg') return v.PoseLandmarker.createFromOptions(files, { baseOptions: base(POSE_MODEL), runningMode: 'IMAGE', numPoses: 1, outputSegmentationMasks: true });
      if (name === 'poseVideo') return v.PoseLandmarker.createFromOptions(files, { baseOptions: base(POSE_MODEL), runningMode: 'VIDEO', numPoses: 1 });
      if (name === 'face') return v.FaceLandmarker.createFromOptions(files, { baseOptions: base(FACE_MODEL), runningMode: 'IMAGE', numFaces: 1 });
      throw new Error('modelo desconhecido');
    })();
    models[name].catch(() => { delete models[name]; });
  }
  return models[name];
}

/* A IA roda dentro do navegador (WebAssembly), com memória limitada no celular. Fotos grandes
   faziam a IA abortar ("Aborted()"). Agora ela recebe uma cópia reduzida da foto (as coordenadas
   voltam em proporção, então a precisão na foto original é mantida) e, se ainda assim falhar,
   o app reinicia a IA e tenta de novo com uma cópia menor e o modelo leve. */
function aiInput(img, max) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, k = Math.min(1, max / Math.max(w, h));
  if (k === 1) return { src: img, w, h };
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
  return { src: c, w, h };
}
const aiAborted = e => /abort|memory|RuntimeError|unreachable|out of bounds|wasm/i.test(String(e?.message || e));
function resetAI() { visionPromise = null; for (const k in models) delete models[k]; }
async function withAI(name, max, run) {
  const tries = [[name, max], [name === 'pose' ? 'poseLite' : name, Math.min(max, 640)]];
  let last;
  for (let i = 0; i < tries.length; i++) {
    const [nm, mx] = tries[i];
    try { const lm = await withTimeout(model(nm), 40000); return run(lm, aiInput(img0(), mx)); }
    catch (e) { last = e; if (!aiAborted(e) || i === tries.length - 1) break; resetAI(); }
  }
  if (aiAborted(last)) throw new Error('a IA ficou sem memória neste celular. Feche outros apps e toque de novo em “Detectar com IA”, ou arraste os pontos à mão');
  throw last;
  function img0() { return run.img; }
}
async function detectPoseRaw(img) {
  const run = (lm, { src, w, h }) => {
    const r = lm.detect(src);
    (r.segmentationMasks || []).forEach(m => m.close && m.close());
    if (!r.landmarks || !r.landmarks.length) throw new Error('Nenhuma pessoa encontrada na foto');
    return { L: r.landmarks[0].map(p => ({ x: p.x * w, y: p.y * h })), V: r.landmarks[0].map(p => p.visibility ?? 1), w, h };
  };
  run.img = img;
  return withAI('pose', 1024, run);
}

async function detectPoints(V, img) {
  const w = img.naturalWidth, h = img.naturalHeight;
  let P;
  if (V.detect === 'face') {
    const run = (fm, { src }) => { const r = fm.detect(src); if (!r.faceLandmarks || !r.faceLandmarks.length) throw new Error('Nenhum rosto encontrado na foto'); return r.faceLandmarks[0]; };
    run.img = img;
    const F = await withAI('face', 1280, run);
    P = V.deriveFace(F.map(p => ({ x: p.x * w, y: p.y * h })));
  } else if (V.detect === 'pose' && V.derive) {
    const { L, V: vis } = await detectPoseRaw(img);
    P = V.derive(L, w, h, vis);
  } else throw new Error('esta vista não tem detecção automática');
  const out = {};
  for (const [k] of V.points) if (P[k]) out[k] = { x: Math.max(0, Math.min(w, P[k].x)), y: Math.max(0, Math.min(h, P[k].y)) };
  return out;
}

/* Remoção de fundo pela máscara de segmentação da pose */
async function removeBackground(img, bg = [221, 226, 236]) {
  const lm = await withTimeout(model('poseSeg'), 40000);
  let r; try { r = lm.detect(aiInput(img, 1024).src); } catch (e) { if (aiAborted(e)) { resetAI(); throw new Error('a IA ficou sem memória neste celular; feche outros apps e tente de novo'); } throw e; }
  const mask = r.segmentationMasks && r.segmentationMasks[0];
  if (!mask) throw new Error('Não foi possível separar a pessoa do fundo');
  try {
    const w = img.naturalWidth, h = img.naturalHeight, arr = mask.getAsFloat32Array();
    const mw = mask.width, mh = mask.height;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, w, h), d = id.data;
    for (let y = 0; y < h; y++) {
      const my = Math.min(mh - 1, Math.floor(y * mh / h));
      for (let x = 0; x < w; x++) {
        const a0 = arr[my * mw + Math.min(mw - 1, Math.floor(x * mw / w))];
        const a = Math.max(0, Math.min(1, (a0 - 0.25) / 0.5)), i = (y * w + x) * 4;
        d[i] = d[i] * a + bg[0] * (1 - a); d[i + 1] = d[i + 1] * a + bg[1] * (1 - a); d[i + 2] = d[i + 2] * a + bg[2] * (1 - a);
      }
    }
    ctx.putImageData(id, 0, 0);
    return cv.toDataURL('image/jpeg', 0.9);
  } finally { r.segmentationMasks.forEach(m => m.close && m.close()); }
}

/* Marcadores verdes: componentes conectados de pixels verdes saturados */
function isGreen(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx / 255, s = mx ? (mx - mn) / mx : 0;
  if (mx !== g || v < 0.22 || s < 0.35) return false;
  const hue = 60 * (2 + (b - r) / ((mx - mn) || 1));
  return hue >= 75 && hue <= 165;
}
function findGreenBlobs(source, sw, sh, maxSide = 640) {
  const k = Math.min(1, maxSide / Math.max(sw, sh)), w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(source, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data, mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = isGreen(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) ? 1 : 0;
  const blobs = [], stack = [], maxArea = w * h * 0.03;
  for (let i = 0; i < w * h; i++) {
    if (mask[i] !== 1) continue;
    let n = 0, sx = 0, sy = 0; stack.push(i); mask[i] = 2;
    while (stack.length) {
      const j = stack.pop(), x = j % w, y = (j / w) | 0; n++; sx += x; sy += y;
      if (x > 0 && mask[j - 1] === 1) { mask[j - 1] = 2; stack.push(j - 1); }
      if (x < w - 1 && mask[j + 1] === 1) { mask[j + 1] = 2; stack.push(j + 1); }
      if (y > 0 && mask[j - w] === 1) { mask[j - w] = 2; stack.push(j - w); }
      if (y < h - 1 && mask[j + w] === 1) { mask[j + w] = 2; stack.push(j + w); }
    }
    if (n >= 4 && n <= maxArea) blobs.push({ x: (sx / n + .5) / k, y: (sy / n + .5) / k, area: n / (k * k) });
  }
  return blobs;
}
/* Associa cada ponto estimado ao marcador verde mais próximo (sem repetir marcador) */
function snapToBlobs(est, blobs, maxR) {
  const pairs = [];
  for (const key in est) blobs.forEach((b, i) => { const d = dist(est[key], b); if (d <= maxR) pairs.push({ key, i, d }); });
  pairs.sort((a, b) => a.d - b.d);
  const usedK = new Set(), usedB = new Set(), out = {};
  for (const p of pairs) { if (usedK.has(p.key) || usedB.has(p.i)) continue; usedK.add(p.key); usedB.add(p.i); out[p.key] = { x: blobs[p.i].x, y: blobs[p.i].y }; }
  return out;
}
