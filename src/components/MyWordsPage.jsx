import { Navigate } from 'react-router-dom';
import CategoryPage from './CategoryPage';
import { useChildProfile } from '../context/ChildProfileContext';
import { customWordItems } from '../data/wordLibrary';

// The parent-curated reading list (Parent Zone → My Words), served in the
// phonics word-reveal style. No lesson-registry key: the first word added
// turns the lesson on, an empty list hides it — so an empty deep link just
// bounces back to the phonics menu. Resolved (not raw) keys are checked, so
// a list of only stale words bounces too instead of rendering an empty
// lesson. LessonGuard has already waited for the profile to load.
const MyWordsPage = () => {
  const { activeChild } = useChildProfile();
  const items = customWordItems(activeChild?.settings?.customWords);
  if (!items.length) return <Navigate to="/phonics" replace />;
  return <CategoryPage category="phonics-my-words" backTo="/phonics" />;
};

export default MyWordsPage;
