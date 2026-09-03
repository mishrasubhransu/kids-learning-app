import { BookOpen, Hash, Palette, Shapes, Keyboard, Image, ArrowLeftRight, Volume2, Users, Plus } from 'lucide-react';

// Top-level lesson cards on the Home screen. Light backgrounds
// (yellow/amber/green/cyan/orange) need dark text to stay readable; the
// darker card colors keep white text.
export const homeCategories = [
  {
    id: 'alphabets',
    name: 'Alphabets',
    description: 'Learn A to Z',
    icon: BookOpen,
    color: 'bg-blue-600',
    hoverColor: 'group-hover:bg-blue-700',
    textColor: 'text-white',
    preview: 'ABC',
  },
  // Promoted out of the Phonics page (2026-08-07): its own card next to
  // Alphabets. lessonKey/path alias the original nested lesson — the
  // registry key must stay 'phonics.letters' or existing profiles' settings
  // for it would read as disabled (absent key = off).
  {
    id: 'letter-sounds',
    lessonKey: 'phonics.letters',
    path: '/phonics/letters',
    name: 'Letter Sounds',
    description: 'A is for Apple',
    icon: Volume2,
    color: 'bg-rose-500',
    hoverColor: 'group-hover:bg-rose-600',
    textColor: 'text-white',
    preview: '🍎',
  },
  {
    id: 'numbers',
    name: 'Numbers',
    icon: Hash,
    color: 'bg-green-500',
    hoverColor: 'group-hover:bg-green-600',
    textColor: 'text-gray-900',
    preview: '123',
  },
  // Sums to 10 with crates of objects — for children who can already count
  // to 10. The card's pills pick the biggest sum (5/10) and the object.
  {
    id: 'addition',
    name: 'Addition',
    description: 'Count them all together',
    icon: Plus,
    color: 'bg-teal-500',
    hoverColor: 'group-hover:bg-teal-600',
    textColor: 'text-gray-900',
    preview: '2+3',
  },
  {
    id: 'colors',
    name: 'Colors',
    description: 'Learn colors',
    icon: Palette,
    color: 'bg-pink-600',
    hoverColor: 'group-hover:bg-pink-700',
    textColor: 'text-white',
    preview: '🎨',
  },
  {
    id: 'shapes',
    name: 'Shapes',
    description: 'Learn shapes',
    icon: Shapes,
    color: 'bg-purple-600',
    hoverColor: 'group-hover:bg-purple-700',
    textColor: 'text-white',
    preview: '⬟',
  },
  {
    id: 'concepts',
    name: 'Concepts',
    description: 'Learn about the world',
    icon: Image,
    color: 'bg-amber-500',
    hoverColor: 'group-hover:bg-amber-600',
    textColor: 'text-gray-900',
    preview: '🦁',
  },
  {
    id: 'opposites',
    name: 'Opposites',
    icon: ArrowLeftRight,
    color: 'bg-cyan-500',
    hoverColor: 'group-hover:bg-cyan-600',
    textColor: 'text-gray-900',
    preview: '↔️',
  },
  {
    id: 'family',
    name: 'My Family',
    description: 'The people you love',
    icon: Users,
    color: 'bg-rose-600',
    hoverColor: 'group-hover:bg-rose-700',
    textColor: 'text-white',
    preview: '👪',
  },
  {
    id: 'phonics',
    name: 'Phonics',
    description: 'Learn 3-letter words',
    icon: Volume2,
    color: 'bg-indigo-600',
    hoverColor: 'group-hover:bg-indigo-700',
    textColor: 'text-white',
    preview: '🔤',
  },
  {
    id: 'typing',
    name: 'Typing',
    description: 'Type & hear letters',
    icon: Keyboard,
    color: 'bg-orange-500',
    hoverColor: 'group-hover:bg-orange-600',
    textColor: 'text-gray-900',
    preview: '⌨️',
  },
];
