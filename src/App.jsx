import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ADMIN_EMAIL, syncRecordings } from './lib/recordings';
import Home from './components/Home';
import CategoryPage from './components/CategoryPage';
import TypingMode from './components/TypingMode';
import ConceptsHome from './components/ConceptsHome';
import ConceptsCategoryPage from './components/ConceptsCategoryPage';
import PhonicsHome from './components/PhonicsHome';
import PhonicsCategoryPage from './components/PhonicsCategoryPage';
import LetterSoundsView from './components/LetterSoundsView';
import OppositesPage from './components/opposites/OppositesPage';
import FeedbackButton from './components/FeedbackButton';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import LessonGuard from './components/LessonGuard';
import LandingPage from './components/LandingPage';
import usePageTracking from './hooks/usePageTracking';

// Admin screens stay out of the main bundle: this chunk is only fetched
// after AdminGate has confirmed the admin account, so other users never
// download the admin UI or see which tools exist
const AdminRoutes = lazy(() => import('./components/admin/AdminRoutes'));
// Parent Zone is visited rarely — keep it out of the kid-facing bundle too
const ParentZone = lazy(() => import('./components/parent/ParentZone'));

const AdminGate = ({ children }) => {
  const { user } = useAuth();
  if (user?.email !== ADMIN_EMAIL) {
    return <Navigate to="/home" replace />;
  }
  return <Suspense fallback={null}>{children}</Suspense>;
};

const App = () => {
  const { user } = useAuth();
  usePageTracking();

  useEffect(() => {
    const handler = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  // Non-blocking: check the recordings version once per load and refresh the
  // audio cache in the background while the rest of the site renders
  useEffect(() => {
    if (user) syncRecordings();
  }, [user]);

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/parent" element={<ProtectedRoute><Suspense fallback={null}><ParentZone /></Suspense></ProtectedRoute>} />
        <Route path="/alphabets/*" element={<ProtectedRoute><LessonGuard lesson="alphabets"><CategoryPage category="alphabets" /></LessonGuard></ProtectedRoute>} />
        <Route path="/numbers/*" element={<ProtectedRoute><LessonGuard lesson="numbers"><CategoryPage category="numbers" /></LessonGuard></ProtectedRoute>} />
        <Route path="/colors/*" element={<ProtectedRoute><LessonGuard lesson="colors"><CategoryPage category="colors" /></LessonGuard></ProtectedRoute>} />
        <Route path="/shapes/*" element={<ProtectedRoute><LessonGuard lesson="shapes"><CategoryPage category="shapes" /></LessonGuard></ProtectedRoute>} />
        <Route path="/concepts" element={<ProtectedRoute><LessonGuard lesson="concepts"><ConceptsHome /></LessonGuard></ProtectedRoute>} />
        <Route path="/concepts/:subcategory/*" element={<ProtectedRoute><LessonGuard prefix="concepts" param="subcategory"><ConceptsCategoryPage /></LessonGuard></ProtectedRoute>} />
        {/* Old bookmarks from before the Objects → Concepts rename */}
        <Route path="/objects/*" element={<Navigate to="/concepts" replace />} />
        <Route path="/phonics" element={<ProtectedRoute><LessonGuard lesson="phonics"><PhonicsHome /></LessonGuard></ProtectedRoute>} />
        <Route path="/phonics/letters" element={<ProtectedRoute><LessonGuard lesson="phonics.letters"><LetterSoundsView /></LessonGuard></ProtectedRoute>} />
        <Route path="/phonics/:family/*" element={<ProtectedRoute><LessonGuard prefix="phonics" param="family"><PhonicsCategoryPage /></LessonGuard></ProtectedRoute>} />
        <Route path="/opposites/*" element={<ProtectedRoute><LessonGuard lesson="opposites"><OppositesPage /></LessonGuard></ProtectedRoute>} />
        {/* Emotions now lives under Concepts; keep old links working */}
        <Route path="/emotions/*" element={<Navigate to="/concepts/emotions" replace />} />
        <Route path="/typing" element={<ProtectedRoute><LessonGuard lesson="typing"><TypingMode /></LessonGuard></ProtectedRoute>} />
        <Route path="/admin/*" element={<ProtectedRoute><AdminGate><AdminRoutes /></AdminGate></ProtectedRoute>} />
        {/* Unknown URLs land somewhere useful instead of a blank page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <FeedbackButton />
    </>
  );
};

export default App;
