import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Camera, Loader2, X, Delete } from 'lucide-react';
import useFamilyMembers, { memberPhotoPaths } from '../../hooks/useFamilyMembers';
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
  if (!initial) return { kind: 'path', steps: ['mother'], seniority: null };
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
  const [rel, setRel] = useState(() =>
    initial || !isLinked
      ? initialRelState(initial)
      : { kind: 'path', steps: [], seniority: null }
  );
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
                  onClick={() => setSteps([sib])}
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
                onClick={() =>
                  pick.legacy
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
              uncle…) keeps its selection visible until the parent rebuilds it */}
          {rel.kind === 'legacy' &&
            !QUICK_PICKS.some((p) => p.legacy === rel.value) && (
              <button aria-pressed className={chipClass(true)}>
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
              <span
                key={`${s}-${i}`}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-sm font-semibold text-indigo-700"
              >
                {KINSHIP_STEPS.find((k) => k.value === s)?.label}
                {i < steps.length - 1 ? "'s" : ''}
              </span>
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

      <div className="flex gap-2 justify-end">
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

const FamilyManager = () => {
  const { members, loading, addMember, updateMember, removeMember } =
    useFamilyMembers();
  const { childProfiles } = useChildProfile();
  const [editorMode, setEditorMode] = useState(null); // null | 'new' | memberId
  // Child profile a NEW member is being linked to (via the suggestion chips)
  const [linkChildId, setLinkChildId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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
        {members.map((member) => (
          <div
            key={member.id}
            className="bg-white/70 rounded-2xl border border-gray-100 p-3 flex items-center gap-3 hover:bg-white transition-colors"
          >
            <MemberFace member={member} />
            <span className="flex-1 min-w-0">
              <span className="font-bold text-gray-800 block truncate">
                {member.name}
              </span>
              <span className="text-xs text-gray-400 font-medium">
                {kinshipLabel(member, 'en')}
                {member.child_profile_id && ' · your child'}
                {memberPhotoPaths(member).length === 0 && ' · no photo yet'}
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
        ))}
        {!loading && members.length === 0 && (
          <div className="text-sm text-gray-400">
            No family members yet — add the people your child loves.
          </div>
        )}
      </div>

      {editorMode ? (
        <div className="mt-3">
          <MemberEditor
            initial={
              editorMode === 'new'
                ? null
                : members.find((m) => m.id === editorMode)
            }
            linkChild={
              (childProfiles || []).find((p) =>
                editorMode === 'new'
                  ? p.id === linkChildId
                  : p.id ===
                    members.find((m) => m.id === editorMode)?.child_profile_id
              ) || null
            }
            saveLabel={editorMode === 'new' ? 'Add member' : 'Save'}
            onSave={async (fields) => {
              if (editorMode === 'new') await addMember(fields);
              else await updateMember(editorMode, fields);
              closeEditor();
            }}
            onCancel={closeEditor}
          />
        </div>
      ) : (
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
