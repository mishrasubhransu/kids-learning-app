import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Mic, Square, Play, Save, RotateCcw, Check } from 'lucide-react';
import HomeButton from '../ui/HomeButton';
import { useAuth } from '../../context/AuthContext';
import { phonicsWords } from '../../data/phonics';
import {
  ADMIN_EMAIL,
  hasRecording,
  getRecordingObjectUrl,
  syncRecordings,
  uploadRecording,
} from '../../lib/recordings';

// Admin-only batch recorder for the 2-letter phonics syllables. Built for
// speed: hold Space to record, release to stop, preview auto-plays, Enter
// saves and jumps to the next unrecorded syllable.

const FAMILIES = ['a', 'e', 'i', 'o', 'u'];
const CATEGORY = 'syllables';
const MAX_TAKE_MS = 3000;

const pickMimeType = () =>
  ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) =>
    window.MediaRecorder?.isTypeSupported(t)
  ) || '';

const RecordingStudio = () => {
  const { user } = useAuth();
  const names = useMemo(
    () => FAMILIES.flatMap((f) => phonicsWords[f].map((w) => w.name)),
    []
  );
  const [selected, setSelected] = useState(names[0]);
  const [recorded, setRecorded] = useState(
    () => new Set(names.filter((n) => hasRecording(CATEGORY, n)))
  );
  const [status, setStatus] = useState('idle'); // idle | recording | preview | saving
  const [micError, setMicError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [level, setLevel] = useState(0);

  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const takeRef = useRef(null);
  const previewUrlRef = useRef('');
  const audioRef = useRef(null);
  const autoStopRef = useRef(null);
  const rafRef = useRef(null);

  // Mic + analyser for the level meter, acquired once on mount
  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        setMicError('');
      })
      .catch((err) => setMicError(err.message || 'Microphone access denied'));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
      cancelAnimationFrame(rafRef.current);
      clearTimeout(autoStopRef.current);
      audioRef.current?.pause();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  // Pick up recordings made on another device
  useEffect(() => {
    syncRecordings().then(() => {
      setRecorded(new Set(names.filter((n) => hasRecording(CATEGORY, n))));
    });
  }, [names]);

  const runMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const d = (buf[i] - 128) / 128;
        sum += d * d;
      }
      setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 3));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopRecording = useCallback(() => {
    clearTimeout(autoStopRef.current);
    const rec = recorderRef.current;
    if (rec && rec.state === 'recording') rec.stop();
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || status === 'recording' || status === 'saving') return;
    setSaveError('');
    audioRef.current?.pause();
    audioCtxRef.current?.resume();
    chunksRef.current = [];
    const mimeType = pickMimeType();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      cancelAnimationFrame(rafRef.current);
      setLevel(0);
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
      if (!blob.size) {
        setStatus('idle');
        return;
      }
      takeRef.current = blob;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = URL.createObjectURL(blob);
      setStatus('preview');
      const audio = new Audio(previewUrlRef.current);
      audioRef.current = audio;
      audio.play().catch(() => {});
    };
    rec.start();
    setStatus('recording');
    runMeter();
    autoStopRef.current = setTimeout(stopRecording, MAX_TAKE_MS);
  }, [status, runMeter, stopRecording]);

  const discardTake = useCallback(() => {
    if (status !== 'preview') return;
    audioRef.current?.pause();
    takeRef.current = null;
    setStatus('idle');
  }, [status]);

  const playCurrent = useCallback(async () => {
    audioRef.current?.pause();
    if (status === 'preview' && previewUrlRef.current) {
      const audio = new Audio(previewUrlRef.current);
      audioRef.current = audio;
      audio.play().catch(() => {});
      return;
    }
    const url = await getRecordingObjectUrl(CATEGORY, selected);
    if (!url) return;
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch(() => {});
  }, [status, selected]);

  const selectSyllable = useCallback((name) => {
    if (status === 'recording' || status === 'saving') return;
    audioRef.current?.pause();
    takeRef.current = null;
    setSaveError('');
    setStatus('idle');
    setSelected(name);
  }, [status]);

  const selectOffset = useCallback(
    (delta) => {
      const idx = names.indexOf(selected);
      selectSyllable(names[(idx + delta + names.length) % names.length]);
    },
    [names, selected, selectSyllable]
  );

  const save = useCallback(async () => {
    const blob = takeRef.current;
    if (!blob || status !== 'preview') return;
    setStatus('saving');
    setSaveError('');
    try {
      await uploadRecording(CATEGORY, selected, blob);
      setRecorded((prev) => new Set(prev).add(selected));
      takeRef.current = null;
      setStatus('idle');
      // Jump to the next syllable that still has no recording
      const start = names.indexOf(selected);
      for (let i = 1; i <= names.length; i++) {
        const cand = names[(start + i) % names.length];
        if (!hasRecording(CATEGORY, cand)) {
          setSelected(cand);
          break;
        }
      }
    } catch (err) {
      setSaveError(err.message || 'Save failed');
      setStatus('preview');
    }
  }, [status, names, selected]);

  // Hold Space to record, Enter save, R re-record, P play, arrows move
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat) return;
      if (e.code === 'Space') {
        e.preventDefault();
        startRecording();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        save();
      } else if (e.key === 'ArrowRight') {
        selectOffset(1);
      } else if (e.key === 'ArrowLeft') {
        selectOffset(-1);
      } else if (e.key === 'r' || e.key === 'R') {
        discardTake();
      } else if (e.key === 'p' || e.key === 'P') {
        playCurrent();
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        stopRecording();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [startRecording, stopRecording, save, discardTake, playCurrent, selectOffset]);

  if (user.email !== ADMIN_EMAIL) {
    return <Navigate to="/home" replace />;
  }

  const selectedWord = { onset: selected.slice(0, -1), rime: selected.slice(-1) };
  const hasExisting = recorded.has(selected);
  const isRecording = status === 'recording';

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col overflow-y-auto">
      <div className="bg-white shadow-sm border-b border-gray-100 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <HomeButton to="/home" />
            <h1 className="text-2xl font-bold text-gray-800">Syllable Recorder</h1>
          </div>
          <span className="text-sm font-medium text-gray-500">
            {recorded.size} / {names.length} recorded
          </span>
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col gap-6">
        {micError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            Microphone unavailable: {micError}. Allow mic access and reload.
          </div>
        )}

        {/* Current syllable + controls */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4">
          <span
            className="font-bold leading-none select-none tracking-wide uppercase"
            style={{ fontSize: 'min(18vw, 16vh)', fontFamily: 'Arial, sans-serif' }}
          >
            <span className="text-gray-700">{selectedWord.onset}</span>
            <span className="text-orange-500">{selectedWord.rime}</span>
          </span>

          <div className="h-2 w-56 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-75 ${
                isRecording ? 'bg-red-500' : 'bg-gray-300'
              }`}
              style={{ width: `${Math.round(level * 100)}%` }}
            />
          </div>

          <div className="text-sm text-gray-500 h-5">
            {status === 'recording' && 'Recording… release Space to stop'}
            {status === 'preview' && 'Preview played — Enter to save, R to re-record'}
            {status === 'saving' && 'Saving…'}
            {status === 'idle' &&
              (hasExisting ? 'Recorded — Space to redo, P to hear it' : 'Hold Space to record')}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={Boolean(micError) || status === 'saving'}
              className={`p-4 rounded-full transition-colors disabled:opacity-40 ${
                isRecording
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              }`}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? <Square size={28} /> : <Mic size={28} />}
            </button>
            <button
              onClick={playCurrent}
              disabled={status !== 'preview' && !hasExisting}
              className="p-4 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors disabled:opacity-40"
              aria-label="Play"
            >
              <Play size={28} />
            </button>
            {status === 'preview' && (
              <>
                <button
                  onClick={save}
                  className="p-4 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                  aria-label="Save recording"
                >
                  <Save size={28} />
                </button>
                <button
                  onClick={discardTake}
                  className="p-4 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  aria-label="Discard take"
                >
                  <RotateCcw size={28} />
                </button>
              </>
            )}
          </div>

          {saveError && <div className="text-sm text-red-600">Save failed: {saveError}</div>}

          <div className="text-xs text-gray-400">
            Hold Space to record · Enter save · R re-record · P play · ← → move
          </div>
        </div>

        {/* Syllable grid */}
        <div className="flex flex-col gap-3 pb-8">
          {FAMILIES.map((family) => (
            <div key={family} className="flex items-center gap-3">
              <span className="w-8 text-sm font-bold text-gray-400 uppercase">_{family}</span>
              <div className="flex flex-wrap gap-2">
                {phonicsWords[family].map((w) => {
                  const isSelected = w.name === selected;
                  const isDone = recorded.has(w.name);
                  return (
                    <button
                      key={w.name}
                      onClick={() => selectSyllable(w.name)}
                      className={`relative px-3 py-2 rounded-lg text-sm font-semibold uppercase transition-all ${
                        isDone
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
                      } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                    >
                      {w.name}
                      {isDone && (
                        <Check
                          size={12}
                          className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-[1px]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecordingStudio;
