import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

function getAnonId() {
  let id = localStorage.getItem('anonId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('anonId', id);
  }
  return id;
}

function getDevice() {
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  if (/iPhone/.test(ua)) os = 'iPhone';
  else if (/iPad/.test(ua)) os = 'iPad';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Mac/.test(ua)) os = 'Mac';
  else if (/Win/.test(ua)) os = 'Windows';
  else if (/Linux/.test(ua)) os = 'Linux';

  let browser = 'Unknown Browser';
  if (/CriOS|Chrome/.test(ua) && !/Edg/.test(ua)) browser = 'Chrome';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Firefox/.test(ua)) browser = 'Firefox';
  else if (/Edg/.test(ua)) browser = 'Edge';

  return `${os} / ${browser}`;
}

function getScreen() {
  return `${window.screen.width}×${window.screen.height}`;
}

function getContext(pathname) {
  if (pathname === '/') return 'Landing';
  const parts = pathname.split('/').filter(Boolean);
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' → ');
}

const MAX_CHARS = 250;

// Parent-facing surfaces only. Mid-lesson, a bright floating tap target
// that opens a text modal is toddler bait.
const PARENT_SURFACES = ['/', '/home', '/objects', '/phonics', '/admin/record'];

const FeedbackButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const location = useLocation();

  // Focus the dialog itself, not the textarea — autofocusing a text field
  // pops the on-screen keyboard on tablets before the parent asked for it
  useEffect(() => {
    if (isOpen) dialogRef.current?.focus();
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
    openerRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!message.trim() || status === 'sending') return;
    setStatus('sending');

    try {
      const resp = await fetch('/api/submit-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          anonId: getAnonId(),
          device: getDevice(),
          screen: getScreen(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          context: getContext(location.pathname),
        }),
      });

      if (resp.ok) {
        setStatus('sent');
        setMessage('');
        setTimeout(() => {
          close();
          setStatus('idle');
        }, 1500);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  // Escape closes from anywhere in the dialog; Tab cycles inside it
  const handleModalKeyDown = (e) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusables = [
      ...dialogRef.current.querySelectorAll('button, textarea'),
    ].filter((el) => !el.disabled);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!PARENT_SURFACES.includes(location.pathname)) return null;

  return (
    <>
      {/* Floating button */}
      <button
        ref={openerRef}
        onClick={() => { setIsOpen(true); setStatus('idle'); }}
        className="fixed bottom-4 right-4 z-40 bg-indigo-500 hover:bg-indigo-600 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110"
        aria-label="Send feedback"
      >
        <MessageSquare size={22} />
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
          onKeyDown={handleModalKeyDown}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 relative"
          >
            <button
              onClick={close}
              className="absolute top-2 right-2 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Close"
            >
              <X size={24} />
            </button>

            <h2 id="feedback-title" className="text-lg font-semibold text-gray-800 mb-3">Send Feedback</h2>

            {status === 'sent' ? (
              <p className="text-green-600 font-medium py-4 text-center">Thanks for your feedback!</p>
            ) : (
              <>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder="What's on your mind?"
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${message.length >= MAX_CHARS ? 'text-red-500' : 'text-gray-400'}`}>
                    {message.length}/{MAX_CHARS}
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || status === 'sending'}
                    className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <Send size={14} />
                    {status === 'sending' ? 'Sending...' : status === 'error' ? 'Retry' : 'Send'}
                  </button>
                </div>
                {status === 'error' && (
                  <p className="text-red-500 text-xs mt-2">Failed to send. Please try again.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;
