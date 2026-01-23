const DifficultySelector = ({ difficulty, onChange }) => {
  return (
    <select
      value={difficulty}
      onChange={(e) => onChange(e.target.value)}
      className="bg-gray-100 border-none rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-200 cursor-pointer outline-none"
    >
      <option value="easy">Easy (3-4)</option>
      <option value="medium">Medium (5-6)</option>
      <option value="hard">Hard (All)</option>
    </select>
  );
};

export default DifficultySelector;
