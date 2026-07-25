import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setScreenContext } from '../lib/analytics';

// Keeps the analytics screen segment in sync with the route. The first path
// segment is a good default category ("alphabets", "concepts", …); screens
// with richer context (CategoryPage, OppositesPage) patch in the precise
// category and mode themselves.
const usePageTracking = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const [root] = pathname.split('/').filter(Boolean);
    // Landing/login aren't learning time, and admin pages would only
    // pollute the stats with the admin's own dashboard visits
    if (!root || root === 'login' || root === 'admin') return;
    setScreenContext({ category: root });
  }, [pathname, user]);
};

export default usePageTracking;
