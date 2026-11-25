// The 3D half of the Shapes lesson: builds each solid, textures it and
// renders it with three.js. Loaded ONLY through a dynamic import (see
// components/ui/Solid3D.jsx) so the 2D app never downloads three.
//
// Every solid is built with its CENTROID at the origin — that is the point
// it turns about when the child drags it — and wears a two-tone checker so a
// turning sphere visibly turns.
import * as THREE from 'three';
import { createSoftPainter } from './solidsSoftware.js';

// ---- Texture ----------------------------------------------------------
// One 2×2 checker tile per color (the shape color and a pale tint of it),
// repeated across each surface. Cached: the same tile serves every solid.
const tileCache = new Map();

const checkerTile = (color) => {
  if (tileCache.has(color)) return tileCache.get(color);
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const base = new THREE.Color(color);
  const pale = base.clone().lerp(new THREE.Color('#ffffff'), 0.62);
  ctx.fillStyle = `#${pale.getHexString()}`;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, size / 2, size / 2);
  ctx.fillRect(size / 2, size / 2, size / 2, size / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  tileCache.set(color, texture);
  return texture;
};

// A material showing `u`×`v` tiles across the surface's 0..1 UV range.
// Texture clones share the canvas; only the repeat differs.
const checker = (color, u, v, extra = {}) => {
  const map = checkerTile(color).clone();
  map.repeat.set(u, v);
  map.needsUpdate = true;
  const material = new THREE.MeshStandardMaterial({ map, roughness: 0.55, metalness: 0, ...extra });
  // The two tile colors as 0–255 sRGB, for the software painter
  const base = new THREE.Color(color);
  const pale = base.clone().lerp(new THREE.Color('#ffffff'), 0.62);
  const bytes = (c) => {
    const hex = c.getHex();
    return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
  };
  material.userData.checker = { base: bytes(base), pale: bytes(pale) };
  return material;
};

const edgeColor = (color) => new THREE.Color(color).multiplyScalar(0.45);

// Crisp dark lines along a polyhedron's real edges (not its smooth curves)
const withEdges = (mesh, color) => {
  const lines = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 25),
    new THREE.LineBasicMaterial({ color: edgeColor(color) })
  );
  const group = new THREE.Group();
  group.add(mesh, lines);
  return group;
};

// ---- Solids -----------------------------------------------------------
// Each builder returns an Object3D whose geometry is already positioned so
// the centroid sits at the origin (transforms are baked into the geometry,
// which keeps the framing math below a plain vertex scan).

class HelixCurve extends THREE.Curve {
  constructor(radius, height, turns) {
    super();
    Object.assign(this, { radius, height, turns });
  }

  getPoint(t, target = new THREE.Vector3()) {
    const angle = t * this.turns * Math.PI * 2;
    return target.set(
      Math.cos(angle) * this.radius,
      (t - 0.5) * this.height,
      Math.sin(angle) * this.radius
    );
  }
}

const builders = {
  sphere: (color) =>
    new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), checker(color, 4, 2)),

  ellipsoid: (color) =>
    new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 32).scale(1.55, 0.9, 0.9),
      checker(color, 4, 2)
    ),

  cube: (color) => {
    const face = checker(color, 1, 1);
    return withEdges(
      new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), face),
      color
    );
  },

  cuboid: (color) => {
    // Long faces carry twice the tiles so the squares stay square
    const long = checker(color, 2, 1);
    const end = checker(color, 1, 1);
    return withEdges(
      new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.2), [
        end, end, long, long, long, long,
      ]),
      color
    );
  },

  cylinder: (color) => {
    const cap = checker(color, 1, 1);
    return new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.9, 48), [
      checker(color, 4, 1.5),
      cap,
      cap,
    ]);
  },

  cone: (color) => {
    const height = 2;
    // A cone balances a quarter of the way up from its base
    const geometry = new THREE.ConeGeometry(0.95, height, 48).translate(0, height / 4, 0);
    const cap = checker(color, 1, 1);
    return new THREE.Mesh(geometry, [checker(color, 4, 2), cap, cap]);
  },

  pyramid: (color) => {
    const height = 1.7;
    // Four sides + a square base; turned 45° so a flat face looks at you
    const geometry = new THREE.ConeGeometry(1.2, height, 4)
      .rotateY(Math.PI / 4)
      .translate(0, height / 4, 0);
    const base = checker(color, 1, 1, { flatShading: true });
    return withEdges(
      new THREE.Mesh(geometry, [checker(color, 4, 2, { flatShading: true }), base, base]),
      color
    );
  },

  prism: (color) => {
    // Triangular prism lying on its side with a ridge on top, like a tent
    const geometry = new THREE.CylinderGeometry(0.95, 0.95, 1.9, 3)
      .rotateZ(Math.PI / 2)
      .rotateX(-Math.PI / 2);
    const end = checker(color, 1, 1, { flatShading: true });
    return withEdges(
      new THREE.Mesh(geometry, [checker(color, 3, 2, { flatShading: true }), end, end]),
      color
    );
  },

  hemisphere: (color) => {
    const radius = 1.2;
    // A solid half-ball balances 3/8 of a radius above its flat face
    const drop = (-3 * radius) / 8;
    const group = new THREE.Group();
    group.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(radius, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, drop, 0),
        checker(color, 4, 1)
      ),
      new THREE.Mesh(
        new THREE.CircleGeometry(radius, 48).rotateX(Math.PI / 2).translate(0, drop, 0),
        checker(color, 1, 1)
      )
    );
    return group;
  },

  tube: (color) => {
    const outer = 0.85;
    const inner = 0.58;
    const height = 1.9;
    const rim = checker(color, 2, 2);
    const group = new THREE.Group();
    group.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(outer, outer, height, 48, 1, true),
        checker(color, 4, 1.5)
      ),
      // The inside wall, seen through the open ends
      new THREE.Mesh(
        new THREE.CylinderGeometry(inner, inner, height, 48, 1, true),
        checker(color, 4, 1.5, { side: THREE.BackSide })
      ),
      new THREE.Mesh(
        new THREE.RingGeometry(inner, outer, 48).rotateX(-Math.PI / 2).translate(0, height / 2, 0),
        rim
      ),
      new THREE.Mesh(
        new THREE.RingGeometry(inner, outer, 48).rotateX(Math.PI / 2).translate(0, -height / 2, 0),
        rim
      )
    );
    return group;
  },

  torus: (color) =>
    new THREE.Mesh(
      // Lying flat like a donut on a plate
      new THREE.TorusGeometry(0.85, 0.38, 24, 64).rotateX(Math.PI / 2),
      checker(color, 4, 2)
    ),

  helix: (color) => {
    const curve = new HelixCurve(0.7, 2, 3);
    const thickness = 0.17;
    const material = checker(color, 18, 1);
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 240, thickness, 16), material));
    // Rounded ends so the coil doesn't look sliced open
    [0, 1].forEach((t) => {
      const p = curve.getPoint(t);
      group.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(thickness, 16, 12).translate(p.x, p.y, p.z),
          new THREE.MeshStandardMaterial({ color, roughness: 0.55 })
        )
      );
    });
    return group;
  },
};

export const SOLID_KINDS = Object.keys(builders);

// Farthest any vertex gets from the centroid — the sphere the camera must
// keep in frame however the child turns the shape.
const reach = (object) => {
  let max = 0;
  const v = new THREE.Vector3();
  object.traverse((node) => {
    const position = node.geometry?.attributes?.position;
    if (!position) return;
    for (let i = 0; i < position.count; i++) {
      max = Math.max(max, v.fromBufferAttribute(position, i).lengthSq());
    }
  });
  return Math.sqrt(max);
};

const disposeObject = (object) => {
  object.traverse((node) => {
    node.geometry?.dispose();
    [].concat(node.material ?? []).forEach((material) => {
      // Clones only — the shared checker tile outlives every solid
      material.map?.dispose();
      material.dispose();
    });
  });
};

// ---- Scene ------------------------------------------------------------
// The camera looks slightly down on the shape; the lights ride with the
// camera, so the shading stays put while the shape turns under it.
const FOV = 32;
const CAMERA_PITCH = 0.42; // radians above the horizon
const START_YAW = -0.55;

const createStage = () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight('#ffffff', '#b4bccd', 1.9));
  const sun = new THREE.DirectionalLight('#ffffff', 1.9);
  sun.position.set(-2.5, 5, 4);
  // A soft fill from the other side so no face ever goes black
  const fill = new THREE.DirectionalLight('#ffffff', 0.8);
  fill.position.set(4, 1, 2.5);
  scene.add(sun, fill);
  const pivot = new THREE.Group();
  scene.add(pivot);
  return { scene, camera, pivot };
};

const frame = (camera, radius) => {
  const distance = (radius / Math.sin(THREE.MathUtils.degToRad(FOV / 2))) * 1.1;
  camera.position.set(0, Math.sin(CAMERA_PITCH) * distance, Math.cos(CAMERA_PITCH) * distance);
  camera.lookAt(0, 0, 0);
};

const mount = (stage, kind, color) => {
  const { pivot, camera } = stage;
  while (pivot.children.length) {
    const old = pivot.children[0];
    pivot.remove(old);
    disposeObject(old);
  }
  const solid = (builders[kind] ?? builders.sphere)(color);
  pivot.add(solid);
  pivot.quaternion.setFromAxisAngle(Y_AXIS, START_YAW);
  frame(camera, reach(solid));
};

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

// ---- Painters -----------------------------------------------------------
// WebGL where the browser has it; otherwise the 2D-canvas software painter
// (lib/solidsSoftware.js). Both expose { setSize, render, dispose }. Probed
// once on a throwaway canvas: asking the real canvas for WebGL and failing
// would make three log errors on every lesson visit.
let webglOk = null;
const hasWebGL = () => {
  if (webglOk === null) {
    try {
      const probe = document.createElement('canvas');
      webglOk = Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
    } catch {
      webglOk = false;
    }
  }
  return webglOk;
};

const createWebGLPainter = (canvas, pixelRatio) => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(pixelRatio);
  return {
    setSize: (w, h) => renderer.setSize(w, h, false),
    render: (stage) => renderer.render(stage.scene, stage.camera),
    dispose: () => renderer.dispose(),
  };
};

const createPainter = (canvas, pixelRatio) =>
  hasWebGL() ? createWebGLPainter(canvas, pixelRatio) : createSoftPainter(canvas);

// ---- Still pictures (tiles, quiz cards, recap) --------------------------
// One shared offscreen renderer paints every still; browsers cap live WebGL
// contexts (~16), so a grid of twelve canvases is not an option.
let still = null;
const stillCache = new Map();

export const snapshot = (kind, color, size = 384) => {
  const key = `${kind}|${color}|${size}`;
  if (stillCache.has(key)) return stillCache.get(key);
  if (!still) {
    const canvas = document.createElement('canvas');
    still = { canvas, painter: createPainter(canvas, 1), stage: createStage() };
  }
  const { canvas, painter, stage } = still;
  painter.setSize(size, size);
  mount(stage, kind, color);
  painter.render(stage);
  const url = canvas.toDataURL('image/png');
  stillCache.set(key, url);
  return url;
};

// ---- Live viewer (the lesson's hero shape) ------------------------------
// Drag to turn the shape about its centroid, trackball-style: sideways drags
// spin it about the vertical, up/down drags tip it toward or away from you.
// Let go and it keeps the spin you gave it, easing back to a slow turntable
// idle (or to rest, under reduced motion).
const IDLE_SPIN = 0.45; // rad/s about the vertical
const TURN_PER_WIDTH = Math.PI * 1.15; // dragging across the canvas ≈ 200°
const TAP_SLOP = 8; // px a touch may wander and still count as a tap

export const createViewer = (canvas, { kind, color, reducedMotion = false }) => {
  const painter = createPainter(canvas, Math.min(window.devicePixelRatio || 1, 2));
  const stage = createStage();
  const { pivot } = stage;
  mount(stage, kind, color);

  const idle = new THREE.Vector3(0, reducedMotion ? 0 : IDLE_SPIN, 0);
  const velocity = idle.clone(); // world-space angular velocity, rad/s
  const step = new THREE.Quaternion();
  const axis = new THREE.Vector3();

  const turn = (wx, wy) => {
    // Premultiplied = about the WORLD axes, so the drag direction always
    // matches what the finger sees, whatever way up the shape already is
    pivot.quaternion.premultiply(step.setFromAxisAngle(Y_AXIS, wy));
    pivot.quaternion.premultiply(step.setFromAxisAngle(X_AXIS, wx));
  };

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    painter.setSize(w, h);
    stage.camera.aspect = w / h;
    stage.camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  // -- pointer handling
  let drag = null; // { id, x, y, t, moved }
  let draggedSinceDown = false;

  const onDown = (e) => {
    if (drag) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), travel: 0 };
    draggedSinceDown = false;
    canvas.setPointerCapture?.(e.pointerId);
    velocity.set(0, 0, 0);
  };

  const onMove = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.travel += Math.abs(dx) + Math.abs(dy);
    if (drag.travel > TAP_SLOP) draggedSinceDown = true;
    const scale = TURN_PER_WIDTH / Math.max(canvas.clientWidth, 1);
    const wx = dy * scale;
    const wy = dx * scale;
    turn(wx, wy);
    // Smoothed fling velocity from the latest movement
    const now = performance.now();
    const dt = Math.max((now - drag.t) / 1000, 1 / 240);
    velocity.lerp(axis.set(wx / dt, wy / dt, 0), 0.5);
    Object.assign(drag, { x: e.clientX, y: e.clientY, t: now });
  };

  const onUp = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    // A finger that paused before lifting shouldn't fling the shape
    if (performance.now() - drag.t > 120) velocity.set(0, 0, 0);
    velocity.clampLength(0, 14);
    drag = null;
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  // -- render loop
  let raf = 0;
  let last = performance.now();
  const tick = (now) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!drag) {
      // Ease whatever spin the child left toward the idle turntable
      velocity.lerp(idle, 1 - Math.exp(-dt * 1.6));
      const speed = velocity.length();
      if (speed > 1e-4) {
        pivot.quaternion.premultiply(
          step.setFromAxisAngle(axis.copy(velocity).divideScalar(speed), speed * dt)
        );
      }
    }
    pivot.quaternion.normalize();
    painter.render(stage);
  };
  raf = requestAnimationFrame(tick);

  return {
    // Swap in another solid, upright again and idling
    setShape(nextKind, nextColor) {
      mount(stage, nextKind, nextColor);
      velocity.copy(idle);
    },
    // True when the press that just ended was a drag, not a tap
    wasDragged: () => draggedSinceDown,
    dispose() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      disposeObject(pivot);
      painter.dispose();
    },
  };
};
