import { Link, Navigate } from 'react-router-dom';
import { BarChart3, Mic, ChevronRight } from 'lucide-react';
import { ADMIN_EMAIL } from '../../lib/recordings';
import { useAuth } from '../../context/AuthContext';
import HomeButton from '../ui/HomeButton';

// Hub for admin-only tools (/admin). Add new tools here as they ship.
const tools = [
  {
    to: '/admin/analytics',
    icon: BarChart3,
    title: 'Usage Analytics',
    description: 'Where each user spends time, quiz accuracy, and improvement hints.',
  },
  {
    to: '/admin/record',
    icon: Mic,
    title: 'Syllable Recorder',
    description: 'Record parent-voice audio clips for phonics playback.',
  },
];

const AdminHome = () => {
  const { user } = useAuth();

  if (user?.email !== ADMIN_EMAIL) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col overflow-y-auto">
      <div className="bg-white shadow-sm border-b border-gray-100 p-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <HomeButton to="/home" />
          <h1 className="text-2xl font-bold text-gray-800">Admin</h1>
        </div>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto p-4 flex flex-col gap-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.to}
              to={tool.to}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md hover:border-indigo-100 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <Icon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-800">{tool.title}</h2>
                <p className="text-sm text-gray-500">{tool.description}</p>
              </div>
              <ChevronRight size={20} className="text-gray-300 shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default AdminHome;
