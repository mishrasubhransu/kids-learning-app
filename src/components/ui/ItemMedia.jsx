// Renders an item's picture, or a silent looping clip when the item has a
// `video` instead (e.g. the actions lesson). Drop-in replacement for the
// <img> tags in the lesson views — same className contract.
const ItemMedia = ({ item, alt, className }) =>
  item.video ? (
    <video
      src={item.video}
      className={className}
      autoPlay
      loop
      muted
      playsInline
      aria-label={alt}
    />
  ) : (
    <img src={item.image} alt={alt} className={className} />
  );

export default ItemMedia;
