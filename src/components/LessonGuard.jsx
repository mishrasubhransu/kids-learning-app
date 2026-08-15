import { Navigate, useParams } from 'react-router-dom';
import { useChildProfile } from '../context/ChildProfileContext';
import { isLessonEnabled, isLessonAvailable, lessonLanguageChosen } from '../data/lessons';

// Blocks direct URLs to lessons the active child has disabled — the menus
// already hide them, this covers bookmarks and typed URLs. Waits for the
// profile before deciding so deep links don't flash a redirect; fails open
// when no profile exists (pre-bootstrap, offline first run).
//
// Static lessons pass `lesson="alphabets"`; dynamic routes pass
// `prefix="concepts" param="subcategory"` to build the key from the URL.
const LessonGuard = ({ lesson, prefix, param, children }) => {
  const params = useParams();
  const { activeChild, loading } = useChildProfile();

  const key = param ? `${prefix}.${params[param]}` : lesson;

  if (loading && !activeChild) {
    return (
      <div
        className="h-full bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col items-center justify-center gap-4"
        role="status"
      >
        <div className="text-6xl motion-safe:animate-bounce" aria-hidden="true">
          🎈
        </div>
        <div className="text-2xl font-semibold text-gray-600">Loading…</div>
      </div>
    );
  }

  const language = activeChild?.settings?.language || 'en';
  // Language-gated lessons (Indian Food) fail CLOSED without their voice
  // language — there is nothing correct they could play
  if (
    !isLessonAvailable(language, key) ||
    !isLessonEnabled(activeChild?.settings?.enabledLessons, key) ||
    !lessonLanguageChosen(activeChild?.settings, key)
  ) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default LessonGuard;
