// "A is for Apple" letter sounds — 3 toddler-familiar words per letter.
// Images live in public/phonics/letters/<slug>.webp (see scripts/generate_object_images.py)
// Audio lives in public/audio/phonics/letters/<letter>-<slug>.mp3 (see scripts/generate-phonics-audio.mjs)

export const letterSounds = [
  { letter: 'a', words: [{ slug: 'apple', name: 'Apple' }, { slug: 'ant', name: 'Ant' }, { slug: 'airplane', name: 'Airplane' }] },
  { letter: 'b', words: [{ slug: 'ball', name: 'Ball' }, { slug: 'banana', name: 'Banana' }, { slug: 'baby', name: 'Baby' }] },
  { letter: 'c', words: [{ slug: 'cat', name: 'Cat' }, { slug: 'car', name: 'Car' }, { slug: 'cow', name: 'Cow' }] },
  { letter: 'd', words: [{ slug: 'dog', name: 'Dog' }, { slug: 'duck', name: 'Duck' }, { slug: 'door', name: 'Door' }] },
  { letter: 'e', words: [{ slug: 'elephant', name: 'Elephant' }, { slug: 'egg', name: 'Egg' }, { slug: 'ear', name: 'Ear' }] },
  { letter: 'f', words: [{ slug: 'fish', name: 'Fish' }, { slug: 'frog', name: 'Frog' }, { slug: 'flower', name: 'Flower' }] },
  { letter: 'g', words: [{ slug: 'goat', name: 'Goat' }, { slug: 'grapes', name: 'Grapes' }, { slug: 'gift', name: 'Gift' }] },
  { letter: 'h', words: [{ slug: 'hat', name: 'Hat' }, { slug: 'horse', name: 'Horse' }, { slug: 'house', name: 'House' }] },
  { letter: 'i', words: [{ slug: 'ice-cream', name: 'Ice Cream' }, { slug: 'igloo', name: 'Igloo' }, { slug: 'insect', name: 'Insect' }] },
  { letter: 'j', words: [{ slug: 'juice', name: 'Juice' }, { slug: 'jam', name: 'Jam' }, { slug: 'jellyfish', name: 'Jellyfish' }] },
  { letter: 'k', words: [{ slug: 'kite', name: 'Kite' }, { slug: 'key', name: 'Key' }, { slug: 'kangaroo', name: 'Kangaroo' }] },
  { letter: 'l', words: [{ slug: 'lion', name: 'Lion' }, { slug: 'leaf', name: 'Leaf' }, { slug: 'lemon', name: 'Lemon' }] },
  { letter: 'm', words: [{ slug: 'monkey', name: 'Monkey' }, { slug: 'moon', name: 'Moon' }, { slug: 'milk', name: 'Milk' }] },
  { letter: 'n', words: [{ slug: 'nose', name: 'Nose' }, { slug: 'nest', name: 'Nest' }, { slug: 'nut', name: 'Nut' }] },
  { letter: 'o', words: [{ slug: 'orange', name: 'Orange' }, { slug: 'owl', name: 'Owl' }, { slug: 'octopus', name: 'Octopus' }] },
  { letter: 'p', words: [{ slug: 'pig', name: 'Pig' }, { slug: 'penguin', name: 'Penguin' }, { slug: 'pizza', name: 'Pizza' }] },
  { letter: 'q', words: [{ slug: 'queen', name: 'Queen' }, { slug: 'quilt', name: 'Quilt' }, { slug: 'quail', name: 'Quail' }] },
  { letter: 'r', words: [{ slug: 'rabbit', name: 'Rabbit' }, { slug: 'rainbow', name: 'Rainbow' }, { slug: 'robot', name: 'Robot' }] },
  { letter: 's', words: [{ slug: 'sun', name: 'Sun' }, { slug: 'star', name: 'Star' }, { slug: 'snake', name: 'Snake' }] },
  { letter: 't', words: [{ slug: 'tiger', name: 'Tiger' }, { slug: 'train', name: 'Train' }, { slug: 'tree', name: 'Tree' }] },
  { letter: 'u', words: [{ slug: 'umbrella', name: 'Umbrella' }, { slug: 'unicorn', name: 'Unicorn' }, { slug: 'up', name: 'Up' }] },
  { letter: 'v', words: [{ slug: 'van', name: 'Van' }, { slug: 'violin', name: 'Violin' }, { slug: 'vegetables', name: 'Vegetables' }] },
  { letter: 'w', words: [{ slug: 'watermelon', name: 'Watermelon' }, { slug: 'whale', name: 'Whale' }, { slug: 'window', name: 'Window' }] },
  { letter: 'x', words: [{ slug: 'xylophone', name: 'Xylophone' }, { slug: 'x-ray', name: 'X-ray' }, { slug: 'fox', name: 'Fox' }] },
  { letter: 'y', words: [{ slug: 'yo-yo', name: 'Yo-yo' }, { slug: 'yogurt', name: 'Yogurt' }, { slug: 'yarn', name: 'Yarn' }] },
  { letter: 'z', words: [{ slug: 'zebra', name: 'Zebra' }, { slug: 'zoo', name: 'Zoo' }, { slug: 'zipper', name: 'Zipper' }] },
];

export const letterImageSrc = (slug) => `/phonics/letters/${slug}.webp`;

export const letterAudioSrc = (letter, slug) => `/audio/phonics/letters/${letter}-${slug}.mp3`;

// Spoken line for each clip. "X is for Fox" ends with the sound, like the song.
export const letterPhrase = (letter, word) =>
  letter === 'x' && word.slug === 'fox'
    ? 'X is at the end of Fox!'
    : `${letter.toUpperCase()} is for ${word.name}!`;
