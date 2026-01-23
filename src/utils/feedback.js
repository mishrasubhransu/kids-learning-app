export const positiveFeedback = [
  'Very good!',
  'Excellent!',
  'Fantastic!',
  'Amazing!',
  'Great job!',
  'Wonderful!',
  'Perfect!',
  'You got it!',
  "Yes, that's correct!",
  'Well done!',
  'Awesome!',
  'Super!',
];

export const encouragement = [
  'Try again!',
  'Almost there!',
  'Keep trying!',
  'You can do it!',
  "Let's try once more!",
];

export const getRandomPositive = () => {
  return positiveFeedback[Math.floor(Math.random() * positiveFeedback.length)];
};

export const getRandomEncouragement = () => {
  return encouragement[Math.floor(Math.random() * encouragement.length)];
};
