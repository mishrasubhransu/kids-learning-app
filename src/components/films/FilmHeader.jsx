import HomeButton from '../ui/HomeButton';

// The bar across the top of every film-lesson page: the way back, the
// lesson's badge, and what this page is
const FilmHeader = ({ backTo, catInfo, title }) => (
  <div className="bg-white shadow-sm border-b border-gray-100 p-4">
    <div className="max-w-6xl mx-auto flex items-center gap-4">
      <HomeButton to={backTo} />
      <span
        className={`${catInfo.color} w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-2xl shadow-sm`}
        aria-hidden="true"
      >
        {catInfo.emoji}
      </span>
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
    </div>
  </div>
);

export default FilmHeader;
