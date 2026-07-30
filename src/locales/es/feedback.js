// Spanish praise and encouragement — same tier structure as
// utils/feedback.js (escalating excitement), phrased gender-neutrally so
// they work for every child. Clips live in the voice bucket at
// feedback/positive/tier<t>/<i> and feedback/encouragement/<i>.
export default {
  positiveTiers: [
    // Tier 0 — warm start
    ['¡Muy bien!', '¡Bien hecho!', '¡Así es!', '¡Eso es!', '¡Qué bien!'],
    // Tier 1 — upbeat
    [
      '¡Uy, qué buen trabajo!',
      '¡Fantástico!',
      '¡Genial!',
      '¡Increíble, así se hace!',
      '¡Maravilloso, sigue así!',
    ],
    // Tier 2 — excited
    [
      '¡Guau, asombroso!',
      '¡Lo estás haciendo súper bien!',
      '¡Mírate, qué bien vas!',
      '¡Impresionante!',
      '¡Yuju! ¡Te lo sabes todo!',
    ],
    // Tier 3 — over the moon
    [
      '¡Eres un genio!',
      '¡Absolutamente increíble!',
      '¡Eres una superestrella!',
      '¡Nada te detiene!',
      '¡No puedo creer lo increíble que eres!',
    ],
  ],
  encouragement: [
    '¡Uy! Casi.',
    '¡Ups! ¡Inténtalo otra vez!',
    'Mmm, ese no es.',
    '¡Oh no! ¡Prueba otra vez!',
    '¡Ay! ¡Inténtalo de nuevo!',
    '¡No! ¡Pero casi!',
  ],
};
