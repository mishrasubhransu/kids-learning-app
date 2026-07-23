import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import CategoryPage from './components/CategoryPage';
import TypingMode from './components/TypingMode';
import ObjectsHome from './components/ObjectsHome';
import ObjectsCategoryPage from './components/ObjectsCategoryPage';
import PhonicsHome from './components/PhonicsHome';
import PhonicsCategoryPage from './components/PhonicsCategoryPage';
import LetterSoundsView from './components/LetterSoundsView';
import OppositesPage from './components/opposites/OppositesPage';
import FeedbackButton from './components/FeedbackButton';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './components/LandingPage';
import RecordingStudio from './components/admin/RecordingStudio';

const App = () => {
  useEffect(() => {
    const handler = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/alphabets/*" element={<ProtectedRoute><CategoryPage category="alphabets" /></ProtectedRoute>} />
        <Route path="/numbers/*" element={<ProtectedRoute><CategoryPage category="numbers" /></ProtectedRoute>} />
        <Route path="/colors/*" element={<ProtectedRoute><CategoryPage category="colors" /></ProtectedRoute>} />
        <Route path="/shapes/*" element={<ProtectedRoute><CategoryPage category="shapes" /></ProtectedRoute>} />
        <Route path="/objects" element={<ProtectedRoute><ObjectsHome /></ProtectedRoute>} />
        <Route path="/objects/:subcategory/*" element={<ProtectedRoute><ObjectsCategoryPage /></ProtectedRoute>} />
        <Route path="/phonics" element={<ProtectedRoute><PhonicsHome /></ProtectedRoute>} />
        <Route path="/phonics/letters" element={<ProtectedRoute><LetterSoundsView /></ProtectedRoute>} />
        <Route path="/phonics/:family/*" element={<ProtectedRoute><PhonicsCategoryPage /></ProtectedRoute>} />
        <Route path="/opposites/*" element={<ProtectedRoute><OppositesPage /></ProtectedRoute>} />
        <Route path="/emotions/*" element={<ProtectedRoute><CategoryPage category="emotions" /></ProtectedRoute>} />
        <Route path="/typing" element={<ProtectedRoute><TypingMode /></ProtectedRoute>} />
        <Route path="/admin/record" element={<ProtectedRoute><RecordingStudio /></ProtectedRoute>} />
      </Routes>
      <FeedbackButton />
    </>
  );
};

export default App;
