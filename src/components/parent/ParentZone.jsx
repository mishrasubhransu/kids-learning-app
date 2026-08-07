import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Home as HomeIcon,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Play,
  RefreshCw,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChildProfile, DEFAULT_CHILD_NAME } from '../../context/ChildProfileContext';
import { loadPraiseClips, neutralNameUrl, playClipUrl } from '../../lib/nameAudio';
import {
  starterLessonsForAge,
  defaultEnabledLessons,
  ageFromBirthdate,
} from '../../data/lessons';
import { availableLocales } from '../../locales';
import HoldGate from './HoldGate';
import LessonTree from './LessonTree';
import ProfileEditor from './ProfileEditor';
import FamilyManager from './FamilyManager';
import VoiceSelector from '../ui/VoiceSelector';

// Pill-style option picker for a per-child setting
const OptionRow = ({ label, hint, options, value, onChange }) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div className="min-w-0">
      <div className="font-semibold text-gray-800">{label}</div>
      {hint && <div className="text-sm text-gray-500">{hint}</div>}
    </div>
    <div className="flex gap-1 shrink-0 bg-gray-100 rounded-full p-1">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
            value === opt.value
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

// Dropdown variant of OptionRow for settings with too many options for pills
// (language grew past three). Native select — the OS picker works best on
// the phones Parent Zone is mostly used on.
const SelectRow = ({ label, hint, options, value, onChange }) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div className="min-w-0">
      <div className="font-semibold text-gray-800">{label}</div>
      {hint && <div className="text-sm text-gray-500">{hint}</div>}
    </div>
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-gray-100 hover:bg-gray-200 rounded-full pl-4 pr-9 py-2 text-sm font-semibold text-indigo-700 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
      />
    </div>
  </div>
);

const SectionTitle = ({ children }) => (
  <h2 className="text-lg font-bold text-gray-800 mt-8 mb-3">{children}</h2>
);

// Voice-clip state for one child: generating spinner, play button when the
// clip exists, or the actual error + retry — so testing the name never
// requires playing a game and hoping. Once praise clips exist, the play
// button demos a personalized tier-0 cheer instead of the bare name.
const NameAudioStatus = ({ child, status, onGenerate }) => {
  const [playing, setPlaying] = useState(false);

  if (child.name === DEFAULT_CHILD_NAME) return null;

  if (status?.state === 'generating') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
        <Loader2 size={13} className="animate-spin" /> Making voice clip…
      </span>
    );
  }

  if (child.name_audio_path) {
    const playName = async () => {
      if (playing) return;
      setPlaying(true);
      try {
        const clips = await loadPraiseClips(child.name_audio_path);
        const tier0 = clips?.tiers?.[0];
        const url = tier0?.length
          ? tier0[Math.floor(Math.random() * tier0.length)]
          : (clips?.neutralUrl ?? neutralNameUrl(child.name_audio_path));
        await playClipUrl(url);
      } finally {
        setPlaying(false);
      }
    };
    return (
      <span className="flex flex-wrap items-center gap-3">
        <button
          onClick={playName}
          className="flex items-center gap-1.5 text-xs text-green-700 font-semibold hover:text-green-800"
        >
          <Play size={13} className={playing ? 'animate-pulse' : ''} />
          {playing ? 'Playing…' : `Play "${child.name}!"`}
        </button>
        {status?.praise === 'generating' && (
          <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
            <Loader2 size={13} className="animate-spin" /> Making praise clips…
          </span>
        )}
        {status?.praise === 'error' && (
          <span className="flex items-center gap-2 text-xs text-red-600">
            Praise clips failed: {status.message}
            <button
              onClick={onGenerate}
              className="flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </span>
        )}
      </span>
    );
  }

  if (status?.state === 'error') {
    return (
      <span className="flex items-center gap-2 text-xs text-red-600">
        Voice clip failed: {status.message}
        <button
          onClick={onGenerate}
          className="flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <RefreshCw size={12} /> Retry
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={onGenerate}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-700 font-semibold"
    >
      <RefreshCw size={12} /> No voice clip yet — generate
    </button>
  );
};

const ParentZone = () => {
  const [unlocked, setUnlocked] = useState(false);
  const { user, signOut } = useAuth();
  const {
    childProfiles,
    activeChild,
    setActiveChild,
    createChild,
    updateChild,
    deleteChild,
    patchChildSettings,
    nameAudioStatus,
    requestNameAudio,
  } = useChildProfile();

  const [selectedId, setSelectedId] = useState(null);
  const [editorMode, setEditorMode] = useState(null); // null | 'new' | childId
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  if (!unlocked) return <HoldGate onUnlock={() => setUnlocked(true)} />;

  const profiles = childProfiles || [];
  const selected =
    profiles.find((c) => c.id === selectedId) || activeChild || profiles[0];
  const settings = selected?.settings || {};
  const enabledLessons = settings.enabledLessons;
  // Only clip-complete languages are offered; incomplete ones surface in dev
  // builds for review, marked beta. One option = nothing to choose = no row.
  const languageOptions = availableLocales(import.meta.env.DEV).map((l) => ({
    value: l.id,
    label: l.complete ? l.label : `${l.label} (beta)`,
  }));
  const language = settings.language || 'en';

  const patch = (p) => selected && patchChildSettings(selected.id, p);

  const handleCreate = async (fields) => {
    const age = ageFromBirthdate(fields.birthdate);
    const child = await createChild({
      ...fields,
      settings: { enabledLessons: starterLessonsForAge(age) },
    });
    if (child) {
      setSelectedId(child.id);
      if (profiles.length === 0) setActiveChild(child.id);
    }
    setEditorMode(null);
  };

  const handleDelete = (child) => {
    if (confirmDeleteId !== child.id) {
      setConfirmDeleteId(child.id);
      setTimeout(() => setConfirmDeleteId(null), 4000);
      return;
    }
    setConfirmDeleteId(null);
    if (selectedId === child.id) setSelectedId(null);
    deleteChild(child.id);
  };

  const ageLabel = (birthdate) => {
    const age = ageFromBirthdate(birthdate);
    if (age == null) return null;
    const years = Math.floor(age);
    return years < 1 ? `${Math.max(1, Math.floor(age * 12))} mo` : `${years} yr`;
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-100 overflow-y-auto">
      <div className="bg-white shadow-sm border-b border-gray-100 p-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link
            to="/home"
            aria-label="Back to home"
            className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl p-2.5 transition-colors"
          >
            <HomeIcon size={22} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Parent Zone</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-6 pb-16">
        {/* ---- Children ---- */}
        <SectionTitle>Children</SectionTitle>
        <div className="flex flex-col gap-2">
          {profiles.map((child) => {
            const isActive = activeChild?.id === child.id;
            const isSelected = selected?.id === child.id;
            return (
              <div
                key={child.id}
                className={`rounded-2xl border p-3 transition-colors ${
                  isSelected
                    ? 'bg-white border-indigo-300 ring-2 ring-indigo-200'
                    : 'bg-white/70 border-gray-100 hover:bg-white'
                }`}
              >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedId(child.id)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <span className="text-3xl" aria-hidden="true">
                    {child.avatar}
                  </span>
                  <span className="min-w-0">
                    <span className="font-bold text-gray-800 block truncate">
                      {child.name}
                      {ageLabel(child.birthdate) && (
                        <span className="ml-2 font-normal text-sm text-gray-400">
                          {ageLabel(child.birthdate)}
                        </span>
                      )}
                    </span>
                    {isActive && (
                      <span className="text-xs font-semibold text-green-600">
                        Learning now
                      </span>
                    )}
                  </span>
                </button>
                {!isActive && (
                  <button
                    onClick={() => setActiveChild(child.id)}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                  >
                    Switch to
                  </button>
                )}
                <button
                  onClick={() => setEditorMode(child.id)}
                  aria-label={`Edit ${child.name}`}
                  className="text-gray-400 hover:text-gray-600 p-1.5"
                >
                  <Pencil size={18} />
                </button>
                {profiles.length > 1 && (
                  <button
                    onClick={() => handleDelete(child)}
                    aria-label={`Remove ${child.name}`}
                    className={`p-1.5 ${
                      confirmDeleteId === child.id
                        ? 'text-red-600'
                        : 'text-gray-400 hover:text-red-500'
                    }`}
                  >
                    {confirmDeleteId === child.id ? (
                      <span className="text-xs font-bold whitespace-nowrap">
                        Tap again
                      </span>
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                )}
              </div>
              <div className="mt-1.5 ml-12">
                <NameAudioStatus
                  child={child}
                  status={nameAudioStatus[child.id]}
                  onGenerate={() => requestNameAudio(child.id)}
                />
              </div>
              </div>
            );
          })}
        </div>

        {editorMode ? (
          <div className="mt-3">
            <ProfileEditor
              initial={
                editorMode === 'new'
                  ? null
                  : profiles.find((c) => c.id === editorMode)
              }
              saveLabel={editorMode === 'new' ? 'Add child' : 'Save'}
              onCancel={() => setEditorMode(null)}
              onSave={async (fields) => {
                if (editorMode === 'new') {
                  await handleCreate(fields);
                } else {
                  await updateChild(editorMode, fields);
                  setEditorMode(null);
                }
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => setEditorMode('new')}
            className="mt-3 flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            <Plus size={18} /> Add a child
          </button>
        )}

        {selected && (
          <>
            {/* ---- Lessons ---- */}
            <SectionTitle>
              Lessons for {selected.name === DEFAULT_CHILD_NAME ? 'your child' : selected.name}
            </SectionTitle>
            <p className="text-sm text-gray-500 -mt-2 mb-3">
              Turn lessons on as {selected.name === DEFAULT_CHILD_NAME ? 'they' : selected.name} may be
              ready for something new, and off when it&apos;s time for a break.
              Hidden lessons disappear from the app completely.
            </p>
            {/* No map yet (older profile / failed bootstrap) mirrors the
                app's fail-open behavior: show everything checked */}
            <LessonTree
              enabled={enabledLessons || defaultEnabledLessons()}
              onChange={(next) => patch({ enabledLessons: next })}
              locale={language}
            />

            {/* ---- Personalization ---- */}
            <SectionTitle>Personalization</SectionTitle>
            <div className="bg-white rounded-2xl border border-gray-100 px-4 divide-y divide-gray-100">
              {languageOptions.length > 1 && (
                <SelectRow
                  label="Language"
                  hint="Lessons, questions and praise in this language"
                  options={languageOptions}
                  value={language}
                  onChange={async (v) => {
                    if (v === language) return;
                    // Name + praise clips follow the language — regenerate
                    // in the new voice AFTER the setting lands in the DB
                    // (the API reads language from the profile row). Stock
                    // praise fills in while the old manifest is ignored.
                    await patch({ language: v });
                    if (selected && selected.name !== DEFAULT_CHILD_NAME) {
                      requestNameAudio(selected.id);
                    }
                  }}
                />
              )}
              <OptionRow
                label="Use name in praise"
                hint={`Sometimes cheer "Great job, ${selected.name === DEFAULT_CHILD_NAME ? '…' : selected.name}!"`}
                options={[
                  { value: true, label: 'On' },
                  { value: false, label: 'Off' },
                ]}
                value={settings.useNameInPraise !== false}
                onChange={(v) => patch({ useNameInPraise: v })}
              />
              <OptionRow
                label="Letter case"
                hint="How letters appear in phonics"
                options={[
                  { value: 'capital', label: 'ABC' },
                  { value: 'small', label: 'Aa' },
                ]}
                value={settings.letterCase || localStorage.getItem('setting-letterCase') || 'capital'}
                onChange={(v) => patch({ letterCase: v })}
              />
              <OptionRow
                label="Praise sounds"
                hint="Cheers and encouragement during games"
                options={[
                  { value: true, label: 'On' },
                  { value: false, label: 'Off' },
                ]}
                value={settings.soundEffects !== false}
                onChange={(v) => patch({ soundEffects: v })}
              />
              <OptionRow
                label="Lesson size"
                hint="Pictures per lesson visit — the rest rotate in next time. Numbers always count the full range"
                options={[
                  { value: '5', label: '5' },
                  { value: '8', label: '8' },
                  { value: '12', label: '12' },
                  { value: 'all', label: 'All' },
                ]}
                value={settings.lessonItemCap || 'all'}
                onChange={(v) => patch({ lessonItemCap: v })}
              />
              <OptionRow
                label="Test length"
                hint="Questions per test — unseen ones come first next visit. Numbers always test the full range"
                options={[
                  { value: '3', label: '3' },
                  { value: '5', label: '5' },
                  { value: '8', label: '8' },
                  { value: 'all', label: 'All' },
                ]}
                value={settings.testItemCap || 'all'}
                onChange={(v) => patch({ testItemCap: v })}
              />
            </div>

            <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-gray-800">Speaking voice</div>
                <div className="text-sm text-gray-500">
                  Applies to this device
                </div>
              </div>
              <VoiceSelector />
            </div>
          </>
        )}

        {/* ---- Family ---- */}
        <SectionTitle>Family</SectionTitle>
        <p className="text-sm text-gray-500 -mt-2 mb-3">
          The people (and pets) in the My Family lesson — shared by all your
          children. Use the name your child actually says, and add a photo so
          they recognize the real face.
        </p>
        <FamilyManager />

        {/* ---- Account ---- */}
        <SectionTitle>Account</SectionTitle>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-4">
          <div className="text-sm text-gray-600 truncate">{user?.email}</div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 whitespace-nowrap"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParentZone;
