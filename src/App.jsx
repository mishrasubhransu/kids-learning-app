import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import CategoryPage from './components/CategoryPage';
import TypingMode from './components/TypingMode';
import ObjectsHome from './components/ObjectsHome';
import ObjectsCategoryPage from './components/ObjectsCategoryPage';
import FeedbackButton from './components/FeedbackButton';

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/alphabets/*" element={<CategoryPage category="alphabets" />} />
        <Route path="/numbers/*" element={<CategoryPage category="numbers" />} />
        <Route path="/colors/*" element={<CategoryPage category="colors" />} />
        <Route path="/shapes/*" element={<CategoryPage category="shapes" />} />
        <Route path="/objects" element={<ObjectsHome />} />
        <Route path="/objects/:subcategory/*" element={<ObjectsCategoryPage />} />
        <Route path="/typing" element={<TypingMode />} />
      </Routes>
      <FeedbackButton />
    </>
  );
};

export default App;
