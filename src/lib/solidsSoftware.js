// Software fallback for lib/solids3d.js: draws the same three.js solids on a
// plain 2D canvas, for browsers where WebGL is off (GPU blocklisted, hardware
// acceleration disabled, some locked-down tablets). A small z-buffered
// triangle rasterizer — perspective-correct checker, per-vertex shading —
// which is plenty for a dozen primitives at lesson size.
import * as THREE from 'three';

// Light directions match the WebGL stage (world space; the camera never moves)
const SUN = new THREE.Vector3(-2.5, 5, 4).normalize();
const FILL = new THREE.Vector3(4, 1, 2.5).normalize();

const shade = (nx, ny, nz) => {
  const sun = Math.max(0, nx * SUN.x + ny * SUN.y + nz * SUN.z);
  const fill = Math.max(0, nx * FILL.x + ny * FILL.y + nz * FILL.z);
  return Math.min(1.06, 0.6 + 0.42 * sun + 0.14 * fill);
};

// Texture pixels per canvas, read back once (checker clones share a canvas)
const pixelCache = new WeakMap();
const pixelsOf = (canvas) => {
  if (!pixelCache.has(canvas)) {
    const { width, height } = canvas;
    const { data } = canvas.getContext('2d').getImageData(0, 0, width, height);
    pixelCache.set(canvas, { width, height, data: new Uint32Array(data.buffer) });
  }
  return pixelCache.get(canvas);
};

// 1×1 "texture" for a plain-colored material (ABGR, as ImageData packs it)
const flatColor = (color) => {
  const c = color.clone().convertLinearToSRGB();
  const byte = (x) => Math.round(Math.min(1, Math.max(0, x)) * 255);
  return {
    width: 1,
    height: 1,
    data: new Uint32Array([0xff000000 | (byte(c.b) << 16) | (byte(c.g) << 8) | byte(c.r)]),
  };
};

// Flatten a solid into typed arrays once; frames only re-project them
const extract = (solid) => {
  const parts = [];
  solid.traverse((node) => {
    if (!node.isMesh) return;
    const g = node.geometry;
    const count = g.index ? g.index.count : g.attributes.position.count;
    const groups = g.groups.length ? g.groups : [{ start: 0, count, materialIndex: 0 }];
    const materials = [].concat(node.material);
    parts.push({
      position: g.attributes.position.array,
      normal: g.attributes.normal.array,
      uv: g.attributes.uv.array,
      index: g.index?.array ?? null,
      ranges: groups.map(({ start, count: n, materialIndex }) => {
        const m = materials[materialIndex] ?? materials[0];
        return {
          start,
          end: start + n,
          repeatU: m.map?.repeat.x ?? 1,
          repeatV: m.map?.repeat.y ?? 1,
          texture: m.map ? pixelsOf(m.map.image) : flatColor(m.color),
          flat: Boolean(m.flatShading),
          back: m.side === THREE.BackSide,
        };
      }),
    });
  });
  return parts;
};

export const createSoftPainter = (canvas) => {
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let image = null;
  let pixels = null;
  let depth = null;
  let cached = { solid: null, parts: [] };
  const mvp = new THREE.Matrix4();
  // screen x, y, 1/w per transformed vertex — regrown as needed
  let sx = new Float32Array(0);
  let sy = new Float32Array(0);
  let sw = new Float32Array(0);

  const setSize = (w, h) => {
    // A little supersampling where it's cheap; the browser smooths it down
    const scale = Math.min(2, 520 / Math.max(w, h, 1));
    width = Math.max(1, Math.round(w * scale));
    height = Math.max(1, Math.round(h * scale));
    canvas.width = width;
    canvas.height = height;
    image = ctx.createImageData(width, height);
    pixels = new Uint32Array(image.data.buffer);
    depth = new Float32Array(width * height);
  };

  const render = ({ camera, pivot }) => {
    if (!image) return;
    const solid = pivot.children[0];
    if (cached.solid !== solid) cached = { solid, parts: solid ? extract(solid) : [] };
    pixels.fill(0);
    depth.fill(0);
    camera.updateMatrixWorld();
    pivot.updateMatrixWorld();
    mvp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(pivot.matrixWorld);
    const m = mvp.elements;
    const r = pivot.matrixWorld.elements; // rotation only — no scale on the pivot

    for (const part of cached.parts) {
      const { position, normal, uv, index } = part;
      const vertexCount = position.length / 3;
      if (sx.length < vertexCount) {
        sx = new Float32Array(vertexCount);
        sy = new Float32Array(vertexCount);
        sw = new Float32Array(vertexCount);
      }
      for (let i = 0; i < vertexCount; i++) {
        const x = position[i * 3];
        const y = position[i * 3 + 1];
        const z = position[i * 3 + 2];
        const iw = 1 / (m[3] * x + m[7] * y + m[11] * z + m[15]);
        sx[i] = ((m[0] * x + m[4] * y + m[8] * z + m[12]) * iw * 0.5 + 0.5) * width;
        sy[i] = (0.5 - (m[1] * x + m[5] * y + m[9] * z + m[13]) * iw * 0.5) * height;
        sw[i] = iw;
      }
      const lit = (i, sign) => {
        const nx = normal[i * 3];
        const ny = normal[i * 3 + 1];
        const nz = normal[i * 3 + 2];
        return shade(
          sign * (r[0] * nx + r[4] * ny + r[8] * nz),
          sign * (r[1] * nx + r[5] * ny + r[9] * nz),
          sign * (r[2] * nx + r[6] * ny + r[10] * nz)
        );
      };

      for (const range of part.ranges) {
        const { repeatU, repeatV, flat, back } = range;
        const { width: tw, height: th, data: texels } = range.texture;
        const sign = back ? -1 : 1;
        for (let t = range.start; t < range.end; t += 3) {
          const a = index ? index[t] : t;
          const b = index ? index[t + 1] : t + 1;
          const c = index ? index[t + 2] : t + 2;
          const x0 = sx[a], y0 = sy[a], x1 = sx[b], y1 = sy[b], x2 = sx[c], y2 = sy[c];
          const det = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
          // Screen y points down, so a face turned toward the camera has det < 0
          if (back ? det <= 0 : det >= 0) continue;
          const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
          const maxX = Math.min(width - 1, Math.ceil(Math.max(x0, x1, x2)));
          const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
          const maxY = Math.min(height - 1, Math.ceil(Math.max(y0, y1, y2)));
          if (minX > maxX || minY > maxY) continue;

          let l0 = lit(a, sign);
          let l1 = lit(b, sign);
          let l2 = lit(c, sign);
          if (flat) l0 = l1 = l2 = (l0 + l1 + l2) / 3;
          const w0 = sw[a], w1 = sw[b], w2 = sw[c];
          const u0 = uv[a * 2] * repeatU * w0, v0 = uv[a * 2 + 1] * repeatV * w0;
          const u1 = uv[b * 2] * repeatU * w1, v1 = uv[b * 2 + 1] * repeatV * w1;
          const u2 = uv[c * 2] * repeatU * w2, v2 = uv[c * 2 + 1] * repeatV * w2;
          const inv = 1 / det;
          const ax = (y1 - y2) * inv, ay = (x2 - x1) * inv;
          const bx = (y2 - y0) * inv, by = (x0 - x2) * inv;

          for (let py = minY; py <= maxY; py++) {
            const dy = py + 0.5 - y2;
            let row = py * width + minX;
            for (let px = minX; px <= maxX; px++, row++) {
              const dx = px + 0.5 - x2;
              const b0 = ax * dx + ay * dy;
              const b1 = bx * dx + by * dy;
              const b2 = 1 - b0 - b1;
              if (b0 < -1e-4 || b1 < -1e-4 || b2 < -1e-4) continue;
              const iw = b0 * w0 + b1 * w1 + b2 * w2; // larger = nearer
              if (iw <= depth[row]) continue;
              depth[row] = iw;
              const u = (b0 * u0 + b1 * u1 + b2 * u2) / iw;
              const v = (b0 * v0 + b1 * v1 + b2 * v2) / iw;
              // Nearest texel, wrapping; canvas rows run top-down, v bottom-up
              const tx = Math.min(tw - 1, ((u - Math.floor(u)) * tw) | 0);
              const ty = Math.min(th - 1, ((1 - (v - Math.floor(v))) * th) | 0);
              const texel = texels[ty * tw + tx];
              const light = b0 * l0 + b1 * l1 + b2 * l2;
              pixels[row] =
                0xff000000 |
                (Math.min(255, ((texel >> 16) & 255) * light) << 16) |
                (Math.min(255, ((texel >> 8) & 255) * light) << 8) |
                Math.min(255, (texel & 255) * light);
            }
          }
        }
      }
    }
    ctx.putImageData(image, 0, 0);
  };

  return { setSize, render, dispose() {} };
};
