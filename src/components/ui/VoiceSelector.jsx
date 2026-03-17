import useSpeech from '../../hooks/useSpeech';

const VoiceSelector = () => {
  const { availableVoices, selectedVoiceURI, setSelectedVoiceURI, speak } = useSpeech();

  if (availableVoices.length <= 1) return null;

  const handleChange = (e) => {
    const uri = e.target.value;
    setSelectedVoiceURI(uri);
    setTimeout(() => speak('Hello!'), 100);
  };

  return (
    <select
      value={selectedVoiceURI}
      onChange={handleChange}
      className="bg-gray-100 border-none rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-200 cursor-pointer outline-none"
    >
      <option value="">Auto (default voice)</option>
      {availableVoices.map((voice) => (
        <option key={voice.voiceURI} value={voice.voiceURI}>
          {voice.name} ({voice.lang})
        </option>
      ))}
    </select>
  );
};

export default VoiceSelector;
