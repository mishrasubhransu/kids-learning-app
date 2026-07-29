import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Camera, Loader2 } from 'lucide-react';
import useFamilyMembers from '../../hooks/useFamilyMembers';
import { familyPhotoUrl } from '../../lib/familyPhotos';
import { RELATIONS, relationByValue, relationLabel } from '../../data/relations';
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

// Round photo (or relation emoji stand-in) used in both the list and editor
const MemberFace = ({ member, size = 'w-12 h-12', textSize = 'text-2xl' }) => {
  const url = familyPhotoUrl(member.photo_path);
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
      {relationByValue(member.relation)?.emoji || '🙂'}
    </span>
  );
};

// Add/edit form for one family member. The name is what the child actually
// SAYS ("Nana", "Papa") — it drives the lesson audio; the relation places
// the member in the family tree.
const MemberEditor = ({ initial, onSave, onCancel, saveLabel = 'Save' }) => {
  const [name, setName] = useState(initial?.name || '');
  const [relation, setRelation] = useState(initial?.relation || 'mummy');
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Picked photos go through the crop frame first (converting HEIC → JPEG
  // when needed), so photoFile is always an exactly-sized square JPEG. The
  // preview object URL is made when the crop lands (not in an effect) and
  // revoked on replace/unmount via the ref.
  const [cropSource, setCropSource] = useState(null); // Blob awaiting crop
  const [converting, setConverting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const previewUrlRef = useRef(null);
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
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(blob);
    setPhotoFile(blob);
    setPreviewUrl(previewUrlRef.current);
  };
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );
  const photoSrc = previewUrl || familyPhotoUrl(initial?.photo_path);

  const canSave = name.trim().length > 0 && name.trim().length <= 30 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), relation, photoFile });
    } catch (e) {
      setError(e.message || 'Could not save');
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={converting}
          aria-label={photoSrc ? 'Change photo' : 'Add photo'}
          className="relative w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden ring-2 ring-gray-200 hover:ring-indigo-400 transition-shadow shrink-0"
        >
          {converting ? (
            <Loader2 size={28} className="text-gray-400 animate-spin" />
          ) : photoSrc ? (
            <img src={photoSrc} alt="" className="w-full h-full object-cover" />
          ) : (
            <Camera size={28} className="text-gray-400" />
          )}
          <span className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-[10px] font-semibold py-0.5">
            {converting ? 'Reading…' : photoSrc ? 'Change' : 'Photo'}
          </span>
        </button>
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
        <label className="flex flex-col gap-1 flex-1 min-w-0">
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
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-gray-600">Who are they?</span>
        <div className="flex flex-wrap gap-1.5">
          {RELATIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setRelation(r.value)}
              aria-pressed={relation === r.value}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                relation === r.value
                  ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-400'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r.emoji} {r.label}
            </button>
          ))}
        </div>
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
  const [editorMode, setEditorMode] = useState(null); // null | 'new' | memberId
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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
                {relationLabel(member.relation)}
                {!member.photo_path && ' · no photo yet'}
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
            saveLabel={editorMode === 'new' ? 'Add member' : 'Save'}
            onSave={async (fields) => {
              if (editorMode === 'new') await addMember(fields);
              else await updateMember(editorMode, fields);
              setEditorMode(null);
            }}
            onCancel={() => setEditorMode(null)}
          />
        </div>
      ) : (
        <button
          onClick={() => setEditorMode('new')}
          className="mt-3 flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold"
        >
          <Plus size={18} /> Add a family member
        </button>
      )}
    </>
  );
};

export default FamilyManager;
