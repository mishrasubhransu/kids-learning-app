// Film pages start their sound the moment a child arrives by tapping a
// card or button. `autoplay` rides in that link's history state — which a
// reload restores, so also require that this page has really been touched,
// or the browser would refuse the sound.
export const playLink = { autoplay: true };

export const cameByTap = (location) =>
  Boolean(location.state?.autoplay) && (navigator.userActivation?.hasBeenActive ?? true);
