import { useSyncExternalStore } from 'react';

// Short viewports (phone landscape): the numbers hero can't stack four
// ten-frames under the numeral, so the frames go two abreast beside it.
// Shared by ui/CountingFrames (frame grid) and learning/ScrollView (hero
// row direction) so both flip on the same breakpoint.
export const SHORT_VIEWPORT = '(max-height: 520px)';

const subscribe = (cb) => {
  const mq = window.matchMedia(SHORT_VIEWPORT);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const read = () => window.matchMedia(SHORT_VIEWPORT).matches;

const useShortViewport = () => useSyncExternalStore(subscribe, read, () => false);

export default useShortViewport;
