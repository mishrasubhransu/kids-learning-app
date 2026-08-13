import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Camera,
  Loader2,
  X,
  Delete,
  TriangleAlert,
  Volume2,
} from 'lucide-react';
import useFamilyMembers, {
  memberPhotoPaths,
  memberAudioStale,
} from '../../hooks/useFamilyMembers';
import { neutralNameUrl, playClipUrl } from '../../lib/nameAudio';
import { useAuth } from '../../context/AuthContext';
import { familyPhotoUrl } from '../../lib/familyPhotos';
import { relationByValue, relationLabel } from '../../data/relations';
import {
  KINSHIP_STEPS,
  seniorityApplies,
  kinshipLabel,
  kinshipEmoji,
  legacyRelationValue,
  pathEmoji,
} from '../../data/kinship';
import { useLocale } from '../../context/LocaleContext';
import { availableLocales } from '../../locales';
import {
  useChildProfile,
  DEFAULT_CHILD_NAME,
} from '../../context/ChildProfileContext';
import PhotoCropper from './PhotoCropper';

// iPhone photos are HEIC, which non-Safari browsers can't decode — convert
// to JPEG first via heic2any (wasm libheif, loaded only when needed).
// Pickers on some platforms also refuse to offer .heic under image/*, hence
// the explicit extensions in the accept attribute.
const isHeic = (file) =>
  /\.hei[cf]$/i.test(file.name || '') || /^image\/hei[cf]$/.test(file.type);

const toDecodableBlob = async (file) => {
  if (!isHeic(file)) return file;
  const { default: heic2any } = await import('heic2any');
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  return Array.isArray(out) ? out[0] : out;
};

// Enough photos for the lesson to shuffle, few enough to stay manageable
const MAX_PHOTOS = 6;

// Voice languages whose script isn't Latin: picking one auto-fills the
// phonetic spelling with an AI transliteration (via /api/transliterate-name)
// for the parent to review or correct
const PHONETIC_SUGGEST = new Set(['or']);

// One-tap presets that pre-fill the path builder (plus the non-kinship
// legacy values, which have no path)
const QUICK_PICKS = [
  { steps: ['mother'], label: 'Mummy' },
  { steps: ['father'], label: 'Daddy' },
  { steps: ['brother'], label: 'Brother' },
  { steps: ['sister'], label: 'Sister' },
  { steps: ['father', 'father'], label: "Grandpa (Dad's side)" },
  { steps: ['father', 'mother'], label: "Grandma (Dad's side)" },
  { steps: ['mother', 'father'], label: "Grandpa (Mum's side)" },
  { steps: ['mother', 'mother'], label: "Grandma (Mum's side)" },
  { legacy: 'baby', label: 'Baby' },
  { legacy: 'friend', label: 'Friend' },
  { legacy: 'pet', label: 'Pet' },
];

const samePath = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Old members carry only the flat enum; the unambiguous values open the
// editor as their equivalent path, the side-of-family-unknown ones (grandma,
// uncle…) stay legacy until the parent rebuilds them.
const LEGACY_TO_PATH = {
  mummy: ['mother'],
  daddy: ['father'],
  brother: ['brother'],
  sister: ['sister'],
};

const initialRelState = (initial) => {
  // New members start with NO relation: a preselected "Mummy" was one
  // careless Save away from being stored wrong, and it leaked into the
  // phonetic suggestion as a false kinship hint. Empty keeps Save disabled
  // (canSave requires a relation) until the parent actually chooses.
  if (!initial) return { kind: 'path', steps: [], seniority: null };
  const detail = initial.relation_detail;
  if (detail?.steps?.length)
    return { kind: 'path', steps: detail.steps, seniority: detail.seniority || null };
  if (LEGACY_TO_PATH[initial.relation])
    return { kind: 'path', steps: LEGACY_TO_PATH[initial.relation], seniority: null };
  return { kind: 'legacy', value: initial.relation || 'friend' };
};

// Round photo (or kinship emoji stand-in) used in the member list
const MemberFace = ({ member, size = 'w-12 h-12', textSize = 'text-2xl' }) => {
  const url = familyPhotoUrl(memberPhotoPaths(member)[0]);
  return url ? (
    <img
      src={url}
      alt=""
      className={`${size} rounded-full object-cover bg-gray-100 shrink-0`}
    />
  ) : (
    <span
      className={`${size} ${textSize} rounded-full bg-gray-100 flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      {kinshipEmoji(member) || relationByValue(member.relation)?.emoji || '🙂'}
    </span>
  );
};

const chipClass = (selected) =>
  `px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
    selected
      ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-400'
      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
  }`;

// Add/edit form for one family member. The name is what the child actually
// SAYS ("Nana", "Papa") — it drives the lesson audio; the relation places
// the member in the family tree and labels them in the child's language.
// linkChild = one of the account's child profiles this member IS: their own
// screen shows "Me!", so the only relation to pick is how siblings see them.
const MemberEditor = ({
  initial,
  linkChild = null,
  onSave,
  onCancel,
  saveLabel = 'Save',
}) => {
  const { locale } = useLocale();
  const isLinked = Boolean(linkChild || initial?.child_profile_id);
  const [name, setName] = useState(initial?.name || linkChild?.name || '');
  // Which voice speaks the name — "Jeje Bapa" reads badly in English. New
  // members default to the active child's language; old ones keep their
  // English clip until changed.
  const [nameLang, setNameLang] = useState(
    initial ? initial.name_lang || 'en' : locale
  );
  // Optional pronunciation spelling — what the voice reads instead of the
  // name. Latin spellings make the TTS guess ("Naana" can land on ଣ instead
  // of ନ); writing it in the voice's own script pins the pronunciation.
  const [namePhonetic, setNamePhonetic] = useState(
    initial?.name_phonetic || ''
  );
  // Once the parent touches the field (typing OR clearing), suggestions stop
  // for this editor session — auto-fill must never fight a human edit. A
  // saved spelling counts as touched.
  const [phoneticDirty, setPhoneticDirty] = useState(
    Boolean(initial?.name_phonetic)
  );
  const [suggesting, setSuggesting] = useState(false);
  const suggestSeqRef = useRef(0);
  const { session } = useAuth();

  // Plays the SAVED clip — the audio the child actually hears — not a
  // preview of unsaved edits (the API only voices stored rows, and browser
  // TTS has the wrong accent to stand in for it).
  const [playing, setPlaying] = useState(false);
  const playClip = async () => {
    if (playing || !initial?.name_audio_path) return;
    setPlaying(true);
    await playClipUrl(neutralNameUrl(initial.name_audio_path));
    setPlaying(false);
  };
  // (linked children also start relation-less — the parent picks how
  // siblings see them)
  const [rel, setRel] = useState(() => initialRelState(initial));
  const [customLabel, setCustomLabel] = useState(
    initial?.relation_detail?.label || ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Photos are staged until Save: existing entries keep their storage path,
  // new picks go through the crop frame (converting HEIC → JPEG when
  // needed) and hold a blob + preview object URL, revoked via the ref.
  const [photos, setPhotos] = useState(() =>
    memberPhotoPaths(initial).map((path, i) => ({ key: `existing-${i}`, path }))
  );
  const [cropSource, setCropSource] = useState(null); // Blob awaiting crop
  const [converting, setConverting] = useState(false);
  const previewUrlsRef = useRef([]);
  const nextKeyRef = useRef(0);

  const pickPhoto = async (file) => {
    setError(null);
    setConverting(true);
    try {
      setCropSource(await toDecodableBlob(file));
    } catch {
      setError("Couldn't read that photo — try a JPG or PNG.");
    } finally {
      setConverting(false);
    }
  };
  const applyCropped = (blob) => {
    setCropSource(null);
    const previewUrl = URL.createObjectURL(blob);
    previewUrlsRef.current.push(previewUrl);
    setPhotos((prev) => [
      ...prev,
      { key: `new-${nextKeyRef.current++}`, blob, previewUrl },
    ]);
  };
  const removePhoto = (key) =>
    setPhotos((prev) => prev.filter((p) => p.key !== key));
  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  const steps = rel.kind === 'path' ? rel.steps : [];
  const setSteps = (nextSteps) =>
    setRel({
      kind: 'path',
      steps: nextSteps,
      seniority: seniorityApplies(nextSteps)
        ? (rel.kind === 'path' && rel.seniority) || null
        : null,
    });

  // What the child will see under the photo, in their language
  const previewDetail = {
    relationDetail: {
      steps,
      seniority: rel.kind === 'path' ? rel.seniority : null,
      label: customLabel.trim() || null,
    },
    relation: rel.kind === 'legacy' ? rel.value : undefined,
  };
  const previewEn = kinshipLabel(previewDetail, 'en');
  const previewLocalized = locale !== 'en' ? kinshipLabel(previewDetail, locale) : null;

  // Non-Latin voice language + untouched field → auto-fill the phonetic
  // spelling with an AI transliteration of the name, as an editable
  // suggestion (only the saved value ever reaches TTS). The relation label
  // rides along: "Naani" + Grandma (Mum's side) resolves to the standard
  // kinship spelling; the prompt tells the model to ignore it when the
  // name isn't a form of that word. Debounced so typing doesn't fire a
  // request per keystroke.
  useEffect(() => {
    if (phoneticDirty) return undefined;
    if (!PHONETIC_SUGGEST.has(nameLang)) {
      // Whatever is in the untouched field was our suggestion for another
      // language — an Odia spelling makes no sense to the English voice
      setNamePhonetic('');
      return undefined;
    }
    const text = name.trim();
    const token = session?.access_token;
    if (!text || !token) return undefined;
    const seq = ++suggestSeqRef.current;
    const timer = setTimeout(async () => {
      setSuggesting(true);
      try {
        const res = await fetch('/api/transliterate-name', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text,
            lang: nameLang,
            relation: previewEn || undefined,
          }),
        });
        const data = await res.json().catch(() => null);
        if (seq === suggestSeqRef.current && res.ok && data?.phonetic) {
          setNamePhonetic(data.phonetic);
        }
      } catch {
        /* suggestion is best-effort — the field just stays empty */
      } finally {
        if (seq === suggestSeqRef.current) setSuggesting(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [name, nameLang, phoneticDirty, session, previewEn]);

  const canSave =
    name.trim().length > 0 &&
    name.trim().length <= 30 &&
    (rel.kind === 'legacy' || steps.length > 0) &&
    !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const relationFields =
      rel.kind === 'path'
        ? {
            relation: legacyRelationValue(steps),
            relationDetail: {
              steps,
              seniority: seniorityApplies(steps) ? rel.seniority : null,
              label: customLabel.trim() || null,
            },
          }
        : {
            relation: rel.value,
            relationDetail: customLabel.trim()
              ? { steps: null, seniority: null, label: customLabel.trim() }
              : null,
          };
    try {
      await onSave({
        name: name.trim(),
        ...relationFields,
        childProfileId: linkChild?.id ?? initial?.child_profile_id ?? null,
        nameLang,
        namePhonetic: namePhonetic.trim() || null,
        photoFiles: photos.filter((p) => p.blob).map((p) => p.blob),
        keptPhotoPaths: photos.filter((p) => p.path).map((p) => p.path),
      });
    } catch (e) {
      setError(e.message || 'Could not save');
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-gray-600">
          Photos{' '}
          <span className="font-normal text-gray-400">
            — a few different ones help your child recognise the person, not
            the picture
          </span>
        </span>
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <span
              key={p.key}
              className="relative w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-gray-200"
            >
              <img
                src={p.previewUrl || familyPhotoUrl(p.path)}
                alt=""
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removePhoto(p.key)}
                aria-label="Remove photo"
                className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-0.5"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={converting}
              aria-label="Add photo"
              className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center ring-2 ring-gray-200 hover:ring-indigo-400 text-gray-400 transition-shadow"
            >
              {converting ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <Camera size={24} />
              )}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) pickPhoto(e.target.files[0]);
            e.target.value = '';
          }}
        />
        {cropSource && (
          <PhotoCropper
            source={cropSource}
            onDone={applyCropped}
            onCancel={() => setCropSource(null)}
          />
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-gray-600">Name</span>
        <input
          type="text"
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          placeholder="What your child calls them — Nana, Papa…"
          className="border border-gray-200 rounded-xl px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </label>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">
            Say the name in
          </span>
          <select
            value={nameLang}
            onChange={(e) => setNameLang(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {availableLocales().map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        {initial?.name_audio_path && (
          <button
            type="button"
            onClick={playClip}
            disabled={playing}
            aria-label="Play the saved name clip"
            title="Hear the name as your child hears it"
            className={`p-1.5 rounded-lg transition-colors ${
              playing
                ? 'text-indigo-600'
                : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            <Volume2 size={18} className={playing ? 'animate-pulse' : ''} />
          </button>
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500">
          Spelling for the voice{' '}
          {suggesting && (
            <Loader2
              size={12}
              className="animate-spin inline text-gray-400"
              aria-label="Suggesting a spelling"
            />
          )}
          <span className="font-normal text-gray-400">
            — what the voice reads; fix it here if the name comes out wrong,
            e.g. ନାନା for Naana
          </span>
        </span>
        <input
          type="text"
          value={namePhonetic}
          maxLength={30}
          onChange={(e) => {
            setNamePhonetic(e.target.value);
            setPhoneticDirty(true);
          }}
          placeholder="Same as the name"
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-gray-600">Who are they?</span>
        {isLinked && (
          <>
            <span className="text-xs text-gray-400">
              This is your child — their own screen will say &ldquo;Me!&rdquo;;
              pick how brothers and sisters see them.
            </span>
            <div className="flex flex-wrap gap-1.5">
              {['brother', 'sister'].map((sib) => (
                <button
                  key={sib}
                  onClick={() =>
                    setSteps(samePath(steps, [sib]) ? [] : [sib])
                  }
                  aria-pressed={samePath(steps, [sib])}
                  className={chipClass(samePath(steps, [sib]))}
                >
                  {pathEmoji([sib])} {sib === 'brother' ? 'Brother' : 'Sister'}
                </button>
              ))}
            </div>
          </>
        )}
        {!isLinked && (
          <>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PICKS.map((pick) => {
            const selected = pick.legacy
              ? rel.kind === 'legacy' && rel.value === pick.legacy
              : rel.kind === 'path' && samePath(steps, pick.steps);
            return (
              <button
                key={pick.label}
                // Chips toggle: tapping the selected one deselects back to
                // no relation (an accidental pick was otherwise sticky —
                // radio behavior with no way back to empty)
                onClick={() =>
                  selected
                    ? setSteps([])
                    : pick.legacy
                      ? setRel({ kind: 'legacy', value: pick.legacy })
                      : setSteps(pick.steps)
                }
                aria-pressed={selected}
                className={chipClass(selected)}
              >
                {pick.legacy
                  ? relationByValue(pick.legacy)?.emoji
                  : pathEmoji(pick.steps)}{' '}
                {pick.label}
              </button>
            );
          })}
          {/* An old member whose flat relation has no quick pick (grandma,
              uncle…) keeps its selection visible until the parent rebuilds
              it — tapping it deselects, like every other chip */}
          {rel.kind === 'legacy' &&
            !QUICK_PICKS.some((p) => p.legacy === rel.value) && (
              <button
                onClick={() => setSteps([])}
                aria-pressed
                className={chipClass(true)}
              >
                {relationByValue(rel.value)?.emoji} {relationLabel(rel.value)}
              </button>
            )}
        </div>

        {/* Path builder: any relation, one step at a time from the child —
            Father's → Father's → Brother */}
        <div className="mt-1 bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
          <span className="text-xs font-semibold text-gray-500">
            Or build the exact relation, step by step from your child:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-500">
              Child&apos;s
            </span>
            {steps.map((s, i) => (
              // Each built step is itself the way to undo it — tapping
              // removes that step (reddens on hover so it reads as
              // removable, not selected)
              <button
                key={`${s}-${i}`}
                onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                title="Tap to remove this step"
                aria-label={`Remove ${
                  KINSHIP_STEPS.find((k) => k.value === s)?.label
                }`}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-sm font-semibold text-indigo-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
              >
                {KINSHIP_STEPS.find((k) => k.value === s)?.label}
                {i < steps.length - 1 ? "'s" : ''}
              </button>
            ))}
            <select
              value=""
              aria-label="Add a step"
              onChange={(e) => {
                if (e.target.value) setSteps([...steps, e.target.value]);
              }}
              className="px-2 py-1 rounded-lg border border-dashed border-gray-300 text-sm font-semibold text-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">{steps.length ? "+ 's …" : '+ add…'}</option>
              {KINSHIP_STEPS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            {steps.length > 0 && (
              <button
                onClick={() => setSteps(steps.slice(0, -1))}
                aria-label="Remove last step"
                className="p-1.5 text-gray-400 hover:text-gray-600"
              >
                <Delete size={16} />
              </button>
            )}
          </div>

          {rel.kind === 'path' && seniorityApplies(steps) && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-500">
                Elder or younger?
              </span>
              {[
                { value: 'elder', label: 'Elder' },
                { value: null, label: 'Either' },
                { value: 'younger', label: 'Younger' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setRel({ ...rel, seniority: opt.value })}
                  aria-pressed={rel.seniority === opt.value}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                    rel.seniority === opt.value
                      ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

        </div>
          </>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-500">
            Your own word for them (optional — shown instead of ours)
          </span>
          <input
            type="text"
            value={customLabel}
            maxLength={30}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="e.g., Bada Bapa"
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </label>

        {(previewEn || previewLocalized) && (
          <span className="text-sm text-gray-500">
            Shown as:{' '}
            <span className="font-bold text-amber-600">{previewEn}</span>
            {previewLocalized && previewLocalized !== previewEn && (
              <>
                {' · '}
                <span className="font-bold text-amber-600">
                  {previewLocalized}
                </span>
              </>
            )}
          </span>
        )}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex gap-2 justify-end items-center">
        {/* A dead Save button with no reason is a riddle — name the one
            thing still missing (form order: name first, then relation) */}
        {!saving && !canSave && (
          <span className="text-xs text-gray-400 font-medium mr-auto">
            {!name.trim()
              ? 'Add their name to save'
              : 'Pick who they are to save'}
          </span>
        )}
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Saving…' : saveLabel}
        </button>
      </div>
    </div>
  );
};

// "needs their Odia voice" — the language whose clip is missing, by name
const langName = (id) =>
  availableLocales().find((l) => l.id === (id || 'en'))?.label || 'English';

const FamilyManager = () => {
  const {
    members,
    loading,
    addMember,
    updateMember,
    removeMember,
    requestMemberAudio,
    pendingAudio,
  } = useFamilyMembers();
  const { childProfiles } = useChildProfile();
  const [editorMode, setEditorMode] = useState(null); // null | 'new' | memberId
  // Child profile a NEW member is being linked to (via the suggestion chips)
  const [linkChildId, setLinkChildId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Members whose name clip is missing or in the wrong voice (a TTS outage
  // mid-generation strands them — the app never retries on its own). A
  // generation in flight isn't stranded yet, so it doesn't warn. The
  // lesson still works via browser TTS, hence amber, not red.
  const isStranded = (m) => memberAudioStale(m) && !pendingAudio.has(m.id);
  const staleMembers = members.filter(isStranded);
  const [fixing, setFixing] = useState(null); // null | { done, total }
  const [fixNote, setFixNote] = useState(null);

  // Sequential on purpose: one serverless call per clip, and the TTS quota
  // whose exhaustion strands clips is the same one a parallel burst would
  // trip again. Each success updates the member row, so badges clear live.
  const fixAudio = async () => {
    const targets = members.filter(isStranded);
    if (!targets.length || fixing) return;
    setFixNote(null);
    setFixing({ done: 0, total: targets.length });
    let failed = 0;
    for (let i = 0; i < targets.length; i++) {
      if (!(await requestMemberAudio(targets[i].id))) failed++;
      setFixing({ done: i + 1, total: targets.length });
    }
    setFixing(null);
    if (failed) {
      setFixNote(
        `Couldn't make ${
          failed === 1 ? 'one voice' : `${failed} voices`
        } — the voice service may be busy, try again in a bit.`
      );
    }
  };

  // Children not yet in the family list (skip the unnamed bootstrap profile)
  const unlinkedChildren = (childProfiles || []).filter(
    (p) =>
      p.name !== DEFAULT_CHILD_NAME &&
      !members.some((m) => m.child_profile_id === p.id)
  );

  const closeEditor = () => {
    setEditorMode(null);
    setLinkChildId(null);
  };

  const handleDelete = (member) => {
    if (confirmDeleteId !== member.id) {
      setConfirmDeleteId(member.id);
      setTimeout(() => setConfirmDeleteId(null), 4000);
      return;
    }
    setConfirmDeleteId(null);
    removeMember(member.id);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        {(staleMembers.length > 0 || fixing || fixNote) && (
          <div className="bg-amber-50 ring-1 ring-amber-200 rounded-2xl p-3 flex items-center gap-2.5">
            <TriangleAlert
              size={18}
              className="text-amber-500 shrink-0"
              aria-hidden="true"
            />
            <span className="flex-1 text-sm font-medium text-amber-800">
              {fixing
                ? `Making voices… ${fixing.done}/${fixing.total}`
                : fixNote ||
                  (staleMembers.length === 1
                    ? `${staleMembers[0].name} is missing their voice`
                    : `${staleMembers.length} names are missing their voice`)}
            </span>
            {fixing ? (
              <Loader2
                size={18}
                className="animate-spin text-amber-500 shrink-0"
              />
            ) : (
              staleMembers.length > 0 && (
                <button
                  onClick={fixAudio}
                  className="px-3.5 py-1.5 rounded-xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors shrink-0"
                >
                  Fix audio
                </button>
              )
            )}
          </div>
        )}
        {members.map((member) =>
          // Editing replaces the row in place — the form appears where the
          // parent just tapped instead of below a possibly-long list, and
          // the row "becoming" the editor marks whom it belongs to. Only
          // the NEW-member editor lives at the bottom, by the Add button.
          editorMode === member.id ? (
            <MemberEditor
              key={member.id}
              initial={member}
              linkChild={
                (childProfiles || []).find(
                  (p) => p.id === member.child_profile_id
                ) || null
              }
              onSave={async (fields) => {
                await updateMember(member.id, fields);
                closeEditor();
              }}
              onCancel={closeEditor}
            />
          ) : (
          <div
            key={member.id}
            className="bg-white/70 rounded-2xl border border-gray-100 p-3 flex items-center gap-3 hover:bg-white transition-colors"
          >
            <MemberFace member={member} />
            <span className="flex-1 min-w-0">
              <span className="font-bold text-gray-800 flex items-center gap-1.5 min-w-0">
                <span className="truncate">{member.name}</span>
                {isStranded(member) && (
                  <TriangleAlert
                    size={14}
                    className="text-amber-500 shrink-0"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="text-xs text-gray-400 font-medium">
                {kinshipLabel(member, 'en')}
                {member.child_profile_id && ' · your child'}
                {memberPhotoPaths(member).length === 0 && ' · no photo yet'}
                {isStranded(member) && (
                  <span className="text-amber-600">
                    {` · needs their ${langName(member.name_lang)} voice`}
                  </span>
                )}
              </span>
            </span>
            <button
              onClick={() => setEditorMode(member.id)}
              aria-label={`Edit ${member.name}`}
              className="text-gray-400 hover:text-gray-600 p-1.5"
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={() => handleDelete(member)}
              aria-label={`Remove ${member.name}`}
              className={`p-1.5 ${
                confirmDeleteId === member.id
                  ? 'text-red-600'
                  : 'text-gray-400 hover:text-red-500'
              }`}
            >
              {confirmDeleteId === member.id ? (
                <span className="text-xs font-bold whitespace-nowrap">Tap again</span>
              ) : (
                <Trash2 size={18} />
              )}
            </button>
          </div>
          )
        )}
        {!loading && members.length === 0 && (
          <div className="text-sm text-gray-400">
            No family members yet — add the people your child loves.
          </div>
        )}
      </div>

      {editorMode === 'new' ? (
        <div className="mt-3">
          <MemberEditor
            initial={null}
            linkChild={
              (childProfiles || []).find((p) => p.id === linkChildId) || null
            }
            saveLabel="Add member"
            onSave={async (fields) => {
              await addMember(fields);
              closeEditor();
            }}
            onCancel={closeEditor}
          />
        </div>
      ) : editorMode ? null : (
        <div className="mt-3 flex flex-col gap-2">
          {unlinkedChildren.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-400">
                Your children belong in the tree too:
              </span>
              {unlinkedChildren.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setLinkChildId(p.id);
                    setEditorMode('new');
                  }}
                  className="px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 transition-colors"
                >
                  {p.avatar} Add {p.name}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setEditorMode('new')}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            <Plus size={18} /> Add a family member
          </button>
        </div>
      )}
    </>
  );
};

export default FamilyManager;
