/*
 * The keyboard focus box (the outline around the button Tab has landed on)
 * is OFF by default: children mash keys, and a box hopping around the
 * lesson is noise to them. A parent who navigates by keyboard turns it on
 * in Parent Zone. Device-wide rather than per child — it describes how
 * this device is driven, not who is learning.
 *
 * State lives on <html class="focus-ring"> so index.css can gate the
 * outline and key handlers can check it without React.
 */
const STORAGE_KEY = 'setting-focusRing';
const CLASS_NAME = 'focus-ring';

export const isFocusRingEnabled = () =>
  document.documentElement.classList.contains(CLASS_NAME);

// Call once at startup, before the first render
export const applyFocusRing = () => {
  let on = false;
  try {
    on = localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    /* storage blocked — stay off */
  }
  document.documentElement.classList.toggle(CLASS_NAME, on);
};

export const setFocusRingEnabled = (on) => {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    /* best-effort — still applies for this visit */
  }
  document.documentElement.classList.toggle(CLASS_NAME, on);
};
