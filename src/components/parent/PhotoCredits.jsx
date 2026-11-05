import { photoCredits } from '../../data/photoCredits';

// CC BY / CC BY-SA photos need visible attribution — collapsed by default so
// it doesn't crowd the Parent Zone.
const PhotoCredits = () => (
  <details className="bg-white rounded-2xl border border-gray-100 p-4">
    <summary className="text-sm font-semibold text-gray-700 cursor-pointer">
      {photoCredits.length} photos from Wikimedia Commons
    </summary>
    <ul className="mt-3 space-y-2 text-xs text-gray-600">
      {photoCredits.map((c) => (
        <li key={c.image}>
          <a href={c.source} target="_blank" rel="noreferrer" className="font-semibold text-gray-800 hover:underline">
            {c.subject}
          </a>{' '}
          by {c.author},{' '}
          {c.licenseUrl ? (
            <a href={c.licenseUrl} target="_blank" rel="noreferrer" className="hover:underline">
              {c.license}
            </a>
          ) : (
            c.license
          )}
        </li>
      ))}
    </ul>
    <p className="mt-3 text-xs text-gray-400">Cropped to a square and resized.</p>
  </details>
);

export default PhotoCredits;
