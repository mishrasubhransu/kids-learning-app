/*
 * Lesson views listen for keys on window (arrows to navigate, Space/Enter
 * to speak or start). When a keyboard user has tabbed onto a button or
 * link, Enter/Space must activate that control instead of driving the
 * lesson — call this at the top of a window key handler and bail out when
 * it returns true.
 *
 * The :focus-visible check keeps mixed touch+keyboard use working: a tap
 * leaves the button focused but not focus-visible, so Space after tapping
 * an arrow still speaks the word rather than re-clicking the arrow.
 * Typing fields and dropdowns own every key they receive.
 */
const ownedByFocusedControl = (e) => {
  const el = e.target instanceof Element ? e.target : null;
  if (!el) return false;
  if (el.closest('input, select, textarea, [contenteditable="true"]')) {
    return true;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    const control = el.closest('button, a, [role="button"]');
    return Boolean(control && control.matches(':focus-visible'));
  }
  return false;
};

export default ownedByFocusedControl;
