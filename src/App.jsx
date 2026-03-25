import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import CategoryPage from './components/CategoryPage';
import TypingMode from './components/TypingMode';
import ObjectsHome from './components/ObjectsHome';
import ObjectsCategoryPage from './components/ObjectsCategoryPage';
import FeedbackButton from './components/FeedbackButton';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/alphabets/*" element={<ProtectedRoute><CategoryPage category="alphabets" /></ProtectedRoute>} />
        <Route path="/numbers/*" element={<ProtectedRoute><CategoryPage category="numbers" /></ProtectedRoute>} />
        <Route path="/colors/*" element={<ProtectedRoute><CategoryPage category="colors" /></ProtectedRoute>} />
        <Route path="/shapes/*" element={<ProtectedRoute><CategoryPage category="shapes" /></ProtectedRoute>} />
        <Route path="/objects" element={<ProtectedRoute><ObjectsHome /></ProtectedRoute>} />
        <Route path="/objects/:subcategory/*" element={<ProtectedRoute><ObjectsCategoryPage /></ProtectedRoute>} />
        <Route path="/typing" element={<ProtectedRoute><TypingMode /></ProtectedRoute>} />
      </Routes>
      <FeedbackButton />
    </>
  );
};

export default App;
