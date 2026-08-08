import { Fragment, useEffect, useMemo, useRef, useCallback } from 'react';
import useVoice from '../../hooks/useVoice';
import { fixedLinePart } from '../../data/voiceLines';
import { relationByValue } from '../../data/relations';
import { pathDepth, pathGender, kinshipEmoji } from '../../data/kinship';
import { familyPhotoUrl } from '../../lib/familyPhotos';
import { memberPhotoPaths } from '../../hooks/useFamilyMembers';

// Family-tree entry page — the My Family take on CategoryIntro. Kinship
// paths give the tree real structure: every generation gets ONE line
// (great-grandparents above grandparents above parents above the kids),
// each line splits into Dad's side | Mum's side at the exact middle of the
// page (equal 1fr halves), every couple stands with a heart between them,
// and the kids line hangs centered under Daddy♥Mummy's heart. Friends and
// pets aren't branches of the tree, so they float free around it.
//
// Sizing is screen-based: everything is scaled by the --node CSS variable,
// computed from the widest generation against 100vw AND the generation
// count against 100vh — a big desktop gets a big tree, a small family gets
// a big tree, and a 20-person family on a phone shrinks to fit. Pure CSS
// (vw/vh), so it re-flows live on window resize.
//
// Tap anywhere (or ArrowRight — it drives everything in this app) to
// circle-reveal into the lesson.

// Old flat-enum members without a stored path: the unambiguous ones still
// take their place; side-unknown ones (generic grandma/uncle…) are parked
// at the outer edge of whichever half of their line is smaller until the
// parent rebuilds them as a path.
const LEGACY_STEPS = {
  mummy: ['mother'],
  daddy: ['father'],
  brother: ['brother'],
  sister: ['sister'],
};

const stepsOf = (m) =>
  m.relation_detail?.steps?.length
    ? m.relation_detail.steps
    : LEGACY_STEPS[m.relation] || null;

const isFloating = (m) =>
  !stepsOf(m) && (m.relation === 'friend' || m.relation === 'pet');

// father.… = Dad's side, mother.… = Mum's side; one-step paths (Daddy,
// Mummy, siblings) and everything anchored on the child sit on the middle
const sideOf = (steps) => {
  if (steps.length > 1 && steps[0] === 'father') return 'left';
  if (steps.length > 1 && steps[0] === 'mother') return 'right';
  return 'center';
};

// The child's straight ancestor line (Daddy, Mum's parents…) stands next
// to the middle; everyone else fans outward from it
const isDirectLine = (steps) =>
  Boolean(steps) && steps.every((s) => s === 'father' || s === 'mother');

// Sort key that keeps in-law spouses next to their partner even when the
// couple pairing below didn't claim them ('~' sorts after letters)
const foldedKey = (n) => {
  if (!n.steps) return '~~legacy';
  const last = n.steps[n.steps.length - 1];
  return last === 'wife' || last === 'husband'
    ? [...n.steps.slice(0, -1), '~spouse'].join('.')
    : n.steps.join('.');
};

// Find n's other half among the line's nodes: a trailing wife/husband step
// pairs with the path it extends (Kaka ♥ Khudi), and a …father/…mother pair
// of the same prefix are a couple too (Jeje ♥ Jejema, Daddy ♥ Mummy).
// Convention: boys stand on the left of the heart, girls on the right
// (blood-first order kept only when both halves are the same gender).
const partnerOf = (n, byKey) => {
  if (!n.steps) return null;
  const key = n.steps.join('.');
  const prefix = n.steps.slice(0, -1);
  const last = n.steps[n.steps.length - 1];
  let pair = null;
  if (last === 'wife' || last === 'husband') {
    const blood = byKey.get(prefix.join('.'));
    pair = blood ? [blood, n] : null;
  } else if (last === 'father') {
    const her = byKey.get([...prefix, 'mother'].join('.'));
    pair = her ? [n, her] : null;
  } else if (last === 'mother') {
    const him = byKey.get([...prefix, 'father'].join('.'));
    pair = him ? [him, n] : null;
  }
  if (!pair) {
    const spouse = byKey.get(`${key}.wife`) || byKey.get(`${key}.husband`);
    pair = spouse ? [n, spouse] : null;
  }
  if (
    pair &&
    pathGender(pair[0].steps) === 'f' &&
    pathGender(pair[1].steps) === 'm'
  ) {
    pair = [pair[1], pair[0]];
  }
  return pair;
};

// Merge a line's nodes into units of one person or a couple
const pairCouples = (nodes) => {
  const byKey = new Map(
    nodes.filter((n) => n.steps).map((n) => [n.steps.join('.'), n])
  );
  const used = new Set();
  const units = [];
  nodes.forEach((n) => {
    if (used.has(n.key)) return;
    const couple = partnerOf(n, byKey);
    if (couple && !couple.some((p) => used.has(p.key))) {
      couple.forEach((p) => used.add(p.key));
      units.push({ key: couple[0].key, couple });
    } else {
      used.add(n.key);
      units.push({ key: n.key, couple: [n] });
    }
  });
  return units;
};

// Outer edge → middle: legacy first on the left half (they sort last on the
// right half), the direct ancestor couple always hugging the middle
const sortUnits = (units, side) =>
  units.slice().sort((a, b) => {
    const rank = (u) => {
      const lead = u.couple[0];
      const direct = isDirectLine(lead.steps) ? 1 : 0;
      const legacy = lead.steps ? 0 : 1;
      return side === 'left' ? legacy * -1 + direct * 10 : direct * -10 + legacy;
    };
    return (
      rank(a) - rank(b) ||
      (foldedKey(a.couple[0]) < foldedKey(b.couple[0]) ? -1 : 1)
    );
  });

// Everything below scales off --node (set on the tree wrapper; floaters set
// their own): circle = 1 node, label/heart/gaps/bars are fractions of it.
const TreeNode = ({ photoUrl, emoji, name, highlight = false }) => (
  <span
    className="flex flex-col items-center gap-1"
    style={{ width: 'calc(var(--node) * 1.15)' }}
  >
    <span
      className={`rounded-full overflow-hidden shadow-lg ring-4 flex items-center justify-center bg-white ${
        highlight ? 'ring-amber-400' : 'ring-white'
      }`}
      style={{
        width: 'var(--node)',
        height: 'var(--node)',
        fontSize: 'calc(var(--node) * 0.5)',
      }}
      aria-hidden={photoUrl ? undefined : 'true'}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        emoji
      )}
    </span>
    <span
      className="font-bold text-gray-700 text-center leading-tight truncate w-full"
      style={{ fontSize: 'clamp(0.55rem, calc(var(--node) * 0.16), 0.95rem)' }}
    >
      {name}
    </span>
  </span>
);

// One person, or a couple joined by their heart
const Unit = ({ couple }) =>
  couple.length === 2 ? (
    <span className="flex items-start" style={{ gap: 'calc(var(--node) * 0.06)' }}>
      <TreeNode {...couple[0]} />
      <span
        aria-hidden="true"
        style={{
          fontSize: 'calc(var(--node) * 0.28)',
          marginTop: 'calc(var(--node) * 0.36)',
        }}
      >
        ❤️
      </span>
      <TreeNode {...couple[1]} />
    </span>
  ) : (
    <TreeNode {...couple[0]} />
  );

const Cell = ({ units, justify }) => (
  <div
    className={`flex flex-wrap items-start ${justify}`}
    style={{ gap: 'calc(var(--node) * 0.2)' }}
  >
    {units.map((u) => (
      <Unit key={u.key} {...u} />
    ))}
  </div>
);

const Bar = () => (
  <span
    className="w-1 bg-amber-300 rounded-full my-1"
    style={{ height: 'calc(var(--node) * 0.35)' }}
    aria-hidden="true"
  />
);

// Friends and pets bob gently around the tree
const FLOAT_SLOTS = [
  { left: '5%', top: '16%' },
  { right: '5%', top: '18%' },
  { left: '3%', top: '50%' },
  { right: '3%', top: '53%' },
  { left: '10%', top: '78%' },
  { right: '10%', top: '76%' },
];

const FamilyTreeIntro = ({ members, activeChild, onReveal }) => {
  const { speak, cancel } = useVoice();
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    cancel();
    onReveal();
  }, [cancel, onReveal]);

  const tree = useMemo(() => {
    const lines = new Map(); // depth (0 = kids, 1 = parents, …) → cells
    const lineAt = (depth) => {
      if (!lines.has(depth))
        lines.set(depth, { left: [], center: [], right: [] });
      return lines.get(depth);
    };
    const floaters = [];

    members.forEach((m) => {
      const steps = stepsOf(m);
      const n = {
        key: m.id,
        name: m.name,
        steps,
        photoUrl: familyPhotoUrl(memberPhotoPaths(m)[0]),
        emoji: kinshipEmoji(m) || relationByValue(m.relation)?.emoji || '🙂',
        highlight: Boolean(activeChild && m.child_profile_id === activeChild.id),
      };
      if (isFloating(m)) {
        floaters.push(n);
        return;
      }
      // Legacy generations (0 grandparents / 1 parents / 2 kids) map onto
      // depths 2 / 1 / 0
      const depth = steps
        ? pathDepth(steps)
        : 2 - (relationByValue(m.relation)?.generation ?? 2);
      const line = lineAt(depth);
      if (!steps && depth > 0) {
        (line.left.length <= line.right.length ? line.left : line.right).push(n);
      } else {
        line[steps ? sideOf(steps) : 'center'].push(n);
      }
    });

    // The child stands among the kids: their linked member when the parent
    // added them (highlighted), their avatar otherwise
    const selfIsMember =
      activeChild && members.some((m) => m.child_profile_id === activeChild.id);
    if (activeChild && !selfIsMember) {
      lineAt(0).center.unshift({
        key: 'me',
        name: activeChild.name,
        steps: null,
        photoUrl: null,
        emoji: activeChild.avatar || '🧒',
        highlight: true,
      });
    }

    const rows = [...lines.entries()]
      .sort(([a], [b]) => b - a)
      .map(([depth, cells]) => ({
        depth,
        left: sortUnits(pairCouples(cells.left), 'left'),
        center: pairCouples(cells.center)
          .slice()
          .sort(
            (a, b) =>
              Number(b.couple.some((p) => p.highlight)) -
              Number(a.couple.some((p) => p.highlight))
          ),
        right: sortUnits(pairCouples(cells.right), 'right'),
      }));

    const count = (units) => units.reduce((t, u) => t + u.couple.length, 0);
    const widest = rows.reduce(
      (w, r) =>
        Math.max(w, 2 * Math.max(count(r.left), count(r.right)) + count(r.center)),
      0
    );

    return { rows, floaters, widest };
  }, [members, activeChild]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!doneRef.current) speak(fixedLinePart('this-is-my-family'));
    }, 300);
    return () => clearTimeout(timer);
  }, [speak]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  // Node size from the space each line actually has: the widest generation
  // (in nodes, ×1.3 for hearts and gaps) shares 100vw, the generation count
  // (×1.8 for labels and trunk bars) shares the height left after the title
  // and prompt. Bigger screen or smaller family → bigger faces, capped at
  // 7rem; floor of 2.5rem, where flex-wrap takes over as the last resort.
  const widthSlots = (Math.max(4, tree.widest) * 1.3).toFixed(1);
  const heightSlots = (Math.max(2, tree.rows.length) * 1.8).toFixed(1);
  const nodeSize = `clamp(2.5rem, min(calc((100vw - 3rem) / ${widthSlots}), calc((100vh - 14rem) / ${heightSlots})), 7rem)`;

  return (
    <button
      type="button"
      onClick={finish}
      aria-label="This is my family! Tap to start"
      className="absolute inset-0 w-full h-full bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col items-center justify-center gap-4 md:gap-6 p-6 overflow-hidden cursor-pointer"
    >
      <h1 className="text-4xl md:text-6xl font-black text-gray-800">
        My Family
      </h1>

      {/* One line per generation; the 1fr halves keep Dad's side and Mum's
          side split at the exact middle, so the kids' centered line sits
          directly under the parents' heart */}
      <div
        className="w-full flex flex-col items-center"
        style={{ '--node': nodeSize }}
      >
        {tree.rows.map((row, i) => (
          <Fragment key={row.depth}>
            {i > 0 && <Bar />}
            <div
              className="w-full grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start"
              style={{ columnGap: 'calc(var(--node) * 0.3)' }}
            >
              <Cell units={row.left} justify="justify-end" />
              <Cell units={row.center} justify="justify-center" />
              <Cell units={row.right} justify="justify-start" />
            </div>
          </Fragment>
        ))}
      </div>

      {tree.floaters.map((n, i) => (
        <span
          key={n.key}
          className="absolute motion-safe:animate-bounce"
          style={{
            ...FLOAT_SLOTS[i % FLOAT_SLOTS.length],
            '--node': 'clamp(3rem, 6vw, 4.5rem)',
            animationDuration: `${2.8 + (i % 3) * 0.9}s`,
          }}
        >
          <TreeNode {...n} />
        </span>
      ))}

      <p className="text-lg md:text-xl text-gray-500 font-semibold motion-safe:animate-pulse">
        Tap to meet everyone!
      </p>
    </button>
  );
};

export default FamilyTreeIntro;
