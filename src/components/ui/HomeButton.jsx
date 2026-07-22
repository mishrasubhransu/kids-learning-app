import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

// Big kid-friendly home button, shared by every lesson page so the
// target looks and behaves the same everywhere.
const HomeButton = ({ to = '/home' }) => (
  <Link
    to={to}
    className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 rounded-2xl bg-yellow-400 hover:bg-yellow-500 active:scale-95 text-gray-900 shadow-md hover:shadow-lg transition-all"
    aria-label="Go home"
  >
    <Home size={32} className="md:w-10 md:h-10" strokeWidth={2.5} />
    <span className="text-xl md:text-2xl font-extrabold">Home</span>
  </Link>
);

export default HomeButton;
