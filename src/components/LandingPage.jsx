import { Link, Navigate } from 'react-router-dom';
import { BookOpen, Hash, Palette, Shapes, Gamepad2, Volume2, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: BookOpen,
    title: 'Alphabets A–Z',
    description: 'Interactive letter recognition with fun visuals and sounds',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Hash,
    title: 'Numbers 1–20',
    description: 'Learn counting with colorful objects and visual aids',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: Palette,
    title: 'Colors & Shapes',
    description: 'Discover colors and shapes through playful exploration',
    color: 'bg-pink-100 text-pink-600',
  },
  {
    icon: Volume2,
    title: 'Audio Feedback',
    description: 'Hear letters, numbers, and words spoken aloud to build pronunciation',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: Gamepad2,
    title: 'Quiz Mode',
    description: 'Test knowledge with fun quizzes at easy, medium, and hard levels',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: Smartphone,
    title: 'Works Everywhere',
    description: 'Touch-friendly design that works on phones, tablets, and computers',
    color: 'bg-teal-100 text-teal-600',
  },
];

const LandingPage = () => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 overflow-auto fixed inset-0 z-10">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="text-xl font-bold text-gray-800">ToddLearn</span>
        <Link
          to="/login"
          className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
        >
          Log In
        </Link>
      </header>

      {/* Hero */}
      <section className="px-6 pt-12 pb-8 md:pt-20 md:pb-12 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          Make Learning Fun
          <br />
          <span className="text-indigo-600">for Your Toddler</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          An interactive app that helps toddlers learn alphabets, numbers, colors, and shapes
          through play — with audio, quizzes, and a touch-friendly design built for little hands.
        </p>
        <Link
          to="/login"
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
        >
          Try for Free
        </Link>
      </section>

      {/* Features */}
      <section className="px-6 pb-20 max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-12">
          Everything Your Child Needs to Start Learning
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{feature.title}</h3>
                <p className="text-gray-500">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20 text-center">
        <div className="bg-indigo-600 rounded-3xl max-w-4xl mx-auto px-8 py-12 md:py-16 shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Start Learning?
          </h2>
          <p className="text-indigo-100 mb-8 text-lg max-w-xl mx-auto">
            Join parents who use ToddLearn to give their toddlers a head start — no credit card required.
          </p>
          <Link
            to="/login"
            className="inline-block bg-white text-indigo-600 font-bold py-3 px-8 rounded-full text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            Get Started for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/50">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>&copy; {new Date().getFullYear()} ToddLearn. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <a href="mailto:privacy@toddlearn.app" className="hover:text-gray-700 transition-colors">
              Privacy
            </a>
            <a href="mailto:contact@toddlearn.app" className="hover:text-gray-700 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
