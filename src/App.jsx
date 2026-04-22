import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import CategoryPage from './components/CategoryPage';
import TypingMode from './components/TypingMode';
import ObjectsHome from './components/ObjectsHome';
import ObjectsCategoryPage from './components/ObjectsCategoryPage';
import FeedbackButton from './components/FeedbackButton';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './components/LandingPage';

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
        <Route path="/opposites/*" element={<ProtectedRoute><CategoryPage category="opposites" /></ProtectedRoute>} />
        <Route path="/emotions/*" element={<ProtectedRoute><CategoryPage category="emotions" /></ProtectedRoute>} />
        <Route path="/typing" element={<ProtectedRoute><TypingMode /></ProtectedRoute>} />
      </Routes>
      <FeedbackButton />
    </>
  );
};

export default App;
