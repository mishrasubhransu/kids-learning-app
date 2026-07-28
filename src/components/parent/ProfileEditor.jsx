import { useState } from 'react';

const AVATARS = [
  '🦁', '🐼', '🦊', '🐰',
  '🦄', '🐯', '🐸', '🐥',
  '🐙', '🦋', '🐬', '🐶',
  '🚀', '🌟', '🍓', '🌈',
];

// Add/edit form for one child. Birthdate is optional — it only powers the
// age-suggested starter lessons and the age shown on the profile card.
const ProfileEditor = ({ initial, onSave, onCancel, saveLabel = 'Save' }) => {
  const [name, setName] = useState(initial?.name || '');
  const [avatar, setAvatar] = useState(initial?.avatar || AVATARS[0]);
  const [birthdate, setBirthdate] = useState(initial?.birthdate || '');
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && name.trim().length <= 30 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await onSave({
      name: name.trim(),
      avatar,
      birthdate: birthdate || null,
    });
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-gray-600">Name</span>
        <input
          type="text"
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          placeholder="Child's name"
          className="border border-gray-200 rounded-xl px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-gray-600">Avatar</span>
        <div className="grid grid-cols-8 gap-1.5">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              aria-label={`Avatar ${a}`}
              aria-pressed={avatar === a}
              className={`text-2xl rounded-xl p-1.5 transition-colors ${
                avatar === a
                  ? 'bg-indigo-100 ring-2 ring-indigo-500'
                  : 'hover:bg-gray-100'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-gray-600">
          Birthday <span className="font-normal text-gray-400">(optional — suggests lessons by age)</span>
        </span>
        <input
          type="date"
          value={birthdate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setBirthdate(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </label>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-semibold"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold"
        >
          {saving ? 'Saving…' : saveLabel}
        </button>
      </div>
    </div>
  );
};

export default ProfileEditor;
