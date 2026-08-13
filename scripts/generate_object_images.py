#!/usr/bin/env python3
"""
Generate photorealistic images for the Kids Learning App.

Uses Google Gemini image generation with a consistent photorealistic style.
Images are saved to public/<output_dir>/<name>.webp

Usage:
    # Generate all images
    python scripts/generate_object_images.py

    # Generate a specific category
    python scripts/generate_object_images.py --category animals
    python scripts/generate_object_images.py --category emotions
    python scripts/generate_object_images.py --category opposites

    # Generate a specific item
    python scripts/generate_object_images.py --category animals --item lion

    # Force regenerate (overwrite existing)
    python scripts/generate_object_images.py --force
"""

import os
import sys
import base64
import argparse
import time
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO

client = genai.Client(
    api_key=os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
)

MODEL = "gemini-3-pro-image-preview"
#MODEL = "gemini-3.1-flash-image-preview"  # cheaper

OPENAI_MODEL = "gpt-image-2"

_openai_client = None


def get_openai_client():
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI
        _openai_client = OpenAI()
    return _openai_client

# Category-specific style prompts for consistent, high-quality output
STYLE_PROMPTS = {
    "animals": (
        "A beautiful, high-quality photograph of {subject}. "
        "Photorealistic with vivid natural colors, soft studio-like lighting, "
        "and a clean, slightly blurred pastel background. Centered and clearly visible. "
        "Captured as if by a professional wildlife photographer. "
        "Sharp focus on the subject, shallow depth of field. "
        "No text, no labels, no watermarks. Square 1:1 composition."
    ),
    "birds": (
        "A beautiful, high-quality photograph of {subject}. "
        "Photorealistic with vivid natural colors, soft natural lighting, "
        "and a clean, slightly blurred natural background. Centered and clearly visible. "
        "Captured as if by a professional wildlife photographer. "
        "Sharp focus on the subject, shallow depth of field. "
        "No text, no labels, no watermarks. Square 1:1 composition."
    ),
    "food": (
        "A beautiful, high-quality food photograph of {subject}. "
        "Photorealistic with vivid appetizing colors, warm studio lighting, "
        "and a clean, slightly blurred background. Centered and clearly visible. "
        "Professional food photography style, appetizing presentation. "
        "Sharp focus on the food, shallow depth of field. "
        "No text, no labels, no watermarks. Square 1:1 composition."
    ),
    "transportation": (
        "A beautiful, high-quality photograph of {subject}. "
        "Photorealistic with vivid colors, natural outdoor lighting, "
        "and a clean, slightly blurred background. Centered and clearly visible. "
        "Captured as if by a professional product photographer. "
        "Sharp focus on the subject, shallow depth of field. "
        "No text, no labels, no watermarks. Square 1:1 composition."
    ),
    "profession": (
        "A beautiful, high-quality photograph of {subject}. "
        "Photorealistic with natural colors, professional cinematic lighting. "
        "The scene should clearly convey the profession with appropriate setting and props. "
        "Sharp focus, cinematic quality, warm and inviting mood. "
        "No text, no labels, no watermarks. Square 1:1 composition."
    ),
    "fruits": (
        "A beautiful, high-quality photograph of {subject}. "
        "Photorealistic with vivid natural colors, soft studio lighting, "
        "and a clean, slightly blurred white or pastel background. Centered and clearly visible. "
        "Professional food photography style, fresh and appetizing appearance. "
        "Sharp focus on the fruit, shallow depth of field. "
        "No text, no labels, no watermarks. Square 1:1 composition."
    ),
    "vegetables": (
        "A beautiful, high-quality photograph of {subject}. "
        "Photorealistic with vivid natural colors, soft studio lighting, "
        "and a clean, slightly blurred white or pastel background. Centered and clearly visible. "
        "Professional food photography style, fresh and appetizing appearance. "
        "Sharp focus on the vegetable, shallow depth of field. "
        "No text, no labels, no watermarks. Square 1:1 composition."
    ),
    "tools": (
        "A beautiful, high-quality photograph of {subject}. "
        "Photorealistic with vivid colors, soft studio lighting, "
        "and a clean, slightly blurred white or light grey background. Centered and clearly visible. "
        "Professional product photography style, clean and well-lit. "
        "Sharp focus on the tool, shallow depth of field. "
        "No text, no labels, no watermarks. Square 1:1 composition."
    ),
    "bodyparts": (
        "A high-quality, photorealistic photograph focusing on {subject}. "
        "Sharp focus on the body part with a very shallow depth of field, "
        "blurring everything else in the background. "
        "Soft natural lighting, warm tones, clean and simple composition. "
        "Professional portrait/medical photography style. "
        "No text, no labels, no watermarks. Square 1:1 composition."
    ),
    "emotions": (
        "A cute, child-friendly cartoon illustration of a child showing the emotion: {subject}. "
        "Simple, colorful cartoon style with expressive face, bright cheerful colors, "
        "and a plain soft pastel background. The emotion should be immediately obvious "
        "from the facial expression and body language. "
        "Friendly and approachable style suitable for toddlers. "
        "No text, no labels, no watermarks. Square 1:1 composition."
    ),
    "emotions-real": (
        "A warm, high-quality photograph of {subject}. "
        "Photorealistic with natural skin tones and soft flattering lighting, "
        "bright and friendly mood suitable for a toddler learning app. "
        "The emotion must be instantly readable from the person's facial expression "
        "and body language, with the face clearly visible and prominent. "
        "Gentle, non-frightening tone even for negative emotions. "
        "Sharp focus on the person, softly blurred background. "
        "No text, no labels, no watermarks. Square 1:1 composition."
    ),
    "opposites": (
        "A delightful 3D-rendered cartoon illustration of {subject}. "
        "Rounded, chunky, toy-like shapes with bright saturated colors and soft cheerful lighting, "
        "like a still from a modern animated children's film. "
        "One single clear idea, centered, on a simple pastel backdrop with no clutter. "
        "No text, no letters, no numbers, no watermarks. Square 1:1 composition."
    ),
    "opposites-scenes": (
        "A delightful 3D-rendered cartoon illustration showing {subject}. "
        "Rounded, chunky, toy-like shapes with bright saturated colors and soft cheerful lighting, "
        "like a still from a modern animated children's film. "
        "The two contrasting things are equally prominent and instantly easy to tell apart at a glance. "
        "Simple pastel backdrop with no clutter. "
        "No text, no letters, no numbers, no watermarks. Square 1:1 composition."
    ),
    "letter-sounds": (
        "A delightful 3D-rendered cartoon illustration of {subject}. "
        "Rounded, chunky, toy-like shapes with bright saturated colors and soft cheerful lighting, "
        "like a still from a modern animated children's film. "
        "One single clear idea, centered, on a simple pastel backdrop with no clutter. "
        "No text, no letters, no numbers, no watermarks. Square 1:1 composition."
    ),
    "phonics-words": (
        "A delightful 3D-rendered cartoon illustration of {subject}. "
        "Rounded, chunky, toy-like shapes with bright saturated colors and soft cheerful lighting, "
        "like a still from a modern animated children's film. "
        "One single clear idea, centered, on a simple pastel backdrop with no clutter. "
        "No text, no letters, no numbers, no watermarks. Square 1:1 composition."
    ),
    "household": (
        "A beautiful, high-quality photograph of {subject}. "
        "Photorealistic with vivid natural colors, soft studio lighting, "
        "and a clean, slightly blurred white or light grey background. Centered and clearly visible. "
        "Professional product photography style, clean and well-lit. "
        "Sharp focus on the object, shallow depth of field. "
        "No text, no labels, no watermarks. Square 1:1 composition."
    ),
    "sea-creatures": (
        "A beautiful, high-quality underwater photograph of {subject}. "
        "Photorealistic with vivid natural colors, soft underwater lighting filtering down from the surface, "
        "and a clean, slightly blurred ocean blue background. Centered and clearly visible. "
        "Captured as if by a professional underwater wildlife photographer. "
        "Sharp focus on the subject, shallow depth of field. "
        "No text, no labels, no watermarks. Square 1:1 composition."
    ),
    "nature": (
        "A breathtaking, high-quality landscape photograph of {subject}. "
        "Photorealistic with vivid natural colors and beautiful natural light. "
        "The subject is instantly recognizable at a glance and dominates the frame, "
        "with a simple, uncluttered composition. "
        "Captured as if by a professional landscape photographer. "
        "No people, no animals, no text, no labels, no watermarks. Square 1:1 composition."
    ),
    "bugs": (
        "A beautiful, high-quality macro photograph of {subject}. "
        "Photorealistic with vivid natural colors, soft natural lighting, "
        "and a clean, slightly blurred green natural background. Centered and clearly visible. "
        "Captured as if by a professional macro wildlife photographer. "
        "Friendly and non-frightening appearance suitable for a toddler learning app. "
        "Sharp focus on the subject, shallow depth of field. "
        "No text, no labels, no watermarks. Square 1:1 composition."
    ),
    "space": (
        "A stunning, high-quality astronomy photograph of {subject}. "
        "Photorealistic in the style of real NASA telescope and spacecraft imagery, "
        "sharp detail against the deep black of space with faint stars. "
        "The subject is centered, large in the frame, and instantly recognizable. "
        "Scientifically accurate colors and surface features. "
        "No text, no labels, no watermarks. Square 1:1 composition."
    ),
    "traffic": (
        "A beautiful, high-quality photograph of {subject}. "
        "Photorealistic with vivid colors and bright natural outdoor daylight, "
        "and a clean, slightly blurred street background. Centered and clearly visible. "
        "Professional photography, sharp focus on the subject, shallow depth of field. "
        "Any standard wording or symbols that belong on the sign or signal should be "
        "accurate, correctly spelled, and clearly legible. "
        "No extra labels, no captions, no watermarks. Square 1:1 composition."
    ),
    "weather": (
        "A breathtaking, high-quality photograph of a landscape in {subject} weather. "
        "Photorealistic, and the weather condition is the unmistakable star of the "
        "picture — obvious at a single glance to a two-year-old. "
        "Simple, uncluttered composition with vivid natural colors. "
        "Captured as if by a professional landscape photographer. "
        "Friendly and non-frightening mood suitable for a toddler learning app. "
        "No people, no text, no labels, no watermarks. Square 1:1 composition."
    ),
    "construction": (
        "A beautiful, high-quality photograph of {subject} at a tidy construction site. "
        "Photorealistic with vivid colors and bright natural outdoor daylight, "
        "and a clean, slightly blurred construction-site background. "
        "The vehicle is centered, fills most of the frame, and is clearly visible from "
        "a three-quarter view so its working parts are easy to recognize. "
        "Captured as if by a professional vehicle photographer. "
        "Sharp focus on the vehicle, shallow depth of field. "
        "No people in the foreground, no text, no labels, no watermarks. Square 1:1 composition."
    ),
    "gadgets": (
        "A beautiful, high-quality photograph of {subject}. "
        "Photorealistic with vivid colors, soft studio lighting, "
        "and a clean, slightly blurred white or light grey background. Centered and clearly visible. "
        "Professional product photography style, clean and well-lit. "
        "Sharp focus on the gadget, shallow depth of field. "
        "No brand logos, no text, no labels, no watermarks. Square 1:1 composition."
    ),
    "outside": (
        "A beautiful, high-quality photograph of {subject}. "
        "Photorealistic with vivid colors and bright, cheerful natural daylight. "
        "The subject is instantly recognizable at a glance and dominates the frame, "
        "with a simple, uncluttered composition. "
        "Captured as if by a professional photographer on a pleasant sunny day. "
        "Sharp focus on the subject, shallow depth of field. "
        "No text, no labels, no watermarks. Square 1:1 composition."
    ),
    # Every prepositions image reuses the SAME kitten + cardboard box pair so
    # only the position changes between pictures (same-subject contrast).
    "prepositions": (
        "A delightful 3D-rendered cartoon illustration of {subject}. "
        "The kitten is always the same character: a chubby fluffy ginger kitten "
        "with big friendly eyes; the box is always the same plain brown cardboard box. "
        "Rounded, chunky, toy-like shapes with bright saturated colors and soft cheerful lighting, "
        "like a still from a modern animated children's film. "
        "The spatial position must be instantly obvious at a single glance to a two-year-old. "
        "One single clear idea, centered, on a simple pastel backdrop with no clutter. "
        "No text, no letters, no numbers, no watermarks. Square 1:1 composition."
    ),
}

# Subject descriptions for each item — detailed enough for good image generation
ITEMS = {
    "animals": {
        "lion": "a lion standing majestically, full body visible",
        "tiger": "a Bengal tiger standing alert, full body visible",
        "dog": "a friendly golden retriever dog, full body visible",
        "cat": "a cute orange tabby cat sitting, full body visible",
        "pig": "a pink pig standing, full body visible",
        "rhino": "a rhinoceros standing, full body visible",
        "hippo": "a hippopotamus standing near water, full body visible",
        "horse": "a brown horse standing in a field, full body visible",
        "donkey": "a grey donkey standing, full body visible",
        "zebra": "a zebra standing, full body visible with distinctive stripes",
        "sheep": "a fluffy white sheep standing, full body visible",
        "goat": "a goat standing, full body visible",
        "llama": "a llama standing, full body visible",
        "camel": "a camel standing, full body visible",
        "elephant": "an elephant standing majestically, full body visible",
        "alligator": "an alligator resting on a riverbank, full body visible",
        "gorilla": "a silverback gorilla sitting, full body visible",
        "chimpanzee": "a chimpanzee sitting, full body visible",
        "orangutan": "an orangutan sitting, full body visible",
        "monkey": "an Indian rhesus macaque monkey sitting on a branch, full body visible",
        "deer": "a spotted deer standing alert, full body visible",
    },
    "birds": {
        "peacock": "a peacock with its colorful tail feathers fully displayed",
        "crow": "a black crow perched on a branch, full body visible",
        "pigeon": "a grey pigeon standing on the ground, full body visible",
        "hen": "a brown hen standing, full body visible",
        "rooster": "a colorful rooster standing with prominent red comb and tail feathers",
        "turkey": "a turkey with fanned tail feathers, full body visible",
        "parrot": "a colorful green and red macaw parrot perched on a branch",
        "sparrow": "a small brown sparrow perched on a twig, full body visible",
        "duck": "a mallard duck standing near water, full body visible",
        "swan": "a graceful white swan gliding on calm water",
        "ostrich": "an ostrich standing tall, full body visible",
        "eagle": "a bald eagle perched majestically on a branch",
        "vulture": "a vulture perched with wings slightly spread, full body visible",
    },
    "food": {
        "pizza": "a delicious pepperoni pizza with melted cheese on a wooden board",
        "burger": "a juicy cheeseburger with lettuce, tomato, and sesame bun",
        "dosa": "a crispy golden South Indian masala dosa with coconut chutney and sambar",
        "vada": "crispy golden South Indian medu vada served with coconut chutney",
        "rice": "a plate of fluffy steaming white basmati rice",
        "ice-cream": "a colorful ice cream cone with three scoops of different flavors",
        "french-fries": "a generous serving of crispy golden french fries",
        "fish": "a beautifully plated grilled fish with lemon and herbs",
        "pasta": "a plate of spaghetti pasta with rich red marinara sauce",
        "yogurt": "a bowl of creamy white yogurt with a swirl on top",
        "soup": "a bowl of hot vegetable soup with visible steam rising",
        "kebab": "grilled meat kebab pieces on a metal skewer with colorful vegetables",
    },
    "transportation": {
        "bicycle": "a classic bicycle standing on its kickstand, side view",
        "electric-scooter": "a modern electric kick scooter, side view",
        "moped": "a classic Vespa-style moped scooter, side view",
        "motorcycle": "a sport motorcycle, side view",
        "car": "a modern red sedan car, three-quarter front view",
        "truck": "a large delivery truck on a road, side view",
        "bus": "a colorful city public transit bus, side view",
        "train": "a modern passenger train at a station platform, side view",
        "aeroplane": "a commercial passenger airplane in flight against a blue sky",
        "rocket": "a space rocket on a launch pad ready for takeoff",
        "van": "a typical white Mercedes Sprinter panel van parked on a quiet street, side view, tall boxy body and sliding side door clearly visible",
    },
    "profession": {
        "doctor": "a doctor in a white coat examining a patient with a stethoscope in a bright medical office",
        "nurse": "a nurse in blue scrubs with a stethoscope around the neck, standing in a hospital ward with a warm smile",
        "air-hostess": "a smiling flight attendant in uniform serving food trays to passengers inside an airplane cabin",
        "teacher": "a teacher standing at a whiteboard with diagrams, teaching an engaged class of students",
        "firefighter": "a firefighter in full yellow turnout gear and helmet actively fighting a fire, holding a fire hose with water spraying onto bright orange flames, dramatic action scene with smoke and a red fire truck visible in the background",
        "police-officer": "a police officer in uniform with a badge, standing next to a police car",
        "astronaut": "an astronaut in a white spacesuit on a spacewalk outside the International Space Station, tethered to the ISS structure with solar panels visible, the curved blue Earth glowing in the background, stars in space",
        "pilot": "an airline pilot in uniform sitting in an airplane cockpit surrounded by instruments and controls",
        "chef": "a chef in a white double-breasted jacket and tall white hat, cooking in a professional kitchen",
        "farmer": "a farmer in overalls and a straw hat, standing in a green field with a tractor in the background",
        "scientist": "a scientist in a white lab coat carefully mixing colorful chemicals in test tubes and beakers in a laboratory",
        "software-engineer": "a software engineer sitting at a desk with dual monitors displaying colorful code and data visualization plots",
        "construction-worker": "a construction worker wearing a yellow hard hat and orange safety vest, working on a building site",
        "artist": "an artist in a paint-splattered apron, painting on a canvas with a palette of colorful paints in hand",
        "musician": "a musician playing an acoustic guitar on a small stage with warm spotlight lighting",
        "postman": "a friendly postman in a blue uniform and cap, holding letters and a brown leather mail bag, standing next to a red mail truck on a sunny suburban street",
        "dentist": "a dentist in a white coat and face mask leaning over a patient lying in a dental chair with mouth open, gently examining the patient's teeth with a small dental mirror and probe, a large anatomical teeth model visible on the counter in the background, bright clean modern dental office",
        "veterinarian": "a veterinarian in a white coat with a stethoscope, gently examining a small puppy on an exam table in a bright animal clinic",
        "baker": "a baker in a white apron and chef hat, holding a tray of freshly baked golden bread, standing in a warm bakery with breads and pastries on shelves behind",
        "mechanic": "a mechanic in blue coveralls holding a wrench, working on the engine of a car with the hood open, in a well-lit garage workshop",
        "magician": "a magician in a black tuxedo with a top hat and red bow tie, waving a wand to perform a trick, with a white rabbit appearing from a black top hat on a small table, theatrical stage lighting",
    },
    "fruits": {
        "apple": "a shiny red apple with a small green leaf on the stem",
        "banana": "a ripe yellow banana, slightly curved",
        "orange": "a bright orange citrus fruit, whole and round",
        "grapes": "a bunch of purple grapes on a small vine stem",
        "strawberry": "a fresh red strawberry with green leaves on top",
        "watermelon": "a slice of watermelon showing red flesh and green rind",
        "mango": "a single ripe Alphonso mango with the classic curved kidney shape, golden yellow skin with a slight orange-red blush, small stem with a green leaf visible at the top",
        "pineapple": "a whole pineapple with its spiky green crown",
        "cherry": "a pair of red cherries with stems and a green leaf",
        "peach": "a ripe fuzzy peach with a small leaf, warm pink-orange color",
        "pear": "a green pear standing upright",
        "kiwi": "a kiwi fruit cut in half showing green flesh and black seeds",
        "blueberry": "a small pile of fresh blueberries, deep blue-purple color",
        "lemon": "a bright yellow lemon, whole fruit",
        "coconut": "a whole brown coconut and a half showing white flesh inside",
    },
    "vegetables": {
        "carrot": "a fresh orange carrot with green leafy top",
        "tomato": "a ripe red tomato with a small green stem, round and shiny",
        "potato": "a whole russet potato, brown skin with natural texture",
        "onion": "a whole yellow onion with papery golden skin",
        "broccoli": "a fresh green broccoli floret with thick stem",
        "corn": "a fresh ear of corn with bright yellow kernels and green husk pulled back",
        "peas": "an open green pea pod showing round green peas inside",
        "cucumber": "a fresh whole green cucumber with small bumps on skin",
        "bell-pepper": "a vibrant red bell pepper, whole and shiny",
        "spinach": "a bunch of fresh green spinach leaves",
        "cauliflower": "a whole white cauliflower head with green leaves around the base",
        "pumpkin": "a round orange pumpkin with a green stem on top",
        "eggplant": "a glossy dark purple eggplant with green stem cap",
        "cabbage": "a whole green cabbage head with layered leaves",
        "mushroom": "a fresh white button mushroom with smooth round cap and short stem",
    },
    "tools": {
        "nail": "a single steel nail with a flat head and pointed tip, side view",
        "hammer": "a classic claw hammer with a wooden handle and steel head",
        "screw": "a single steel Phillips head screw, side view showing the threads",
        "screwdriver": "a Phillips head screwdriver with a yellow and black handle",
        "bolt": "a single steel hex bolt with visible threads, side view",
        "nut": "a single steel hexagonal nut, three-quarter view showing the hex shape and threaded hole",
        "spanner": "a chrome open-end combination spanner wrench, side view",
        "pliers": "a pair of combination pliers with red and black rubber handles",
        "grip-pliers": "a pair of locking grip pliers (vise-grips) with curved jaws and lever release",
        "pipe-wrench": "a heavy-duty pipe wrench with adjustable jaw and red handle",
        "wood-saw": "a hand wood saw with a wooden handle and large toothed blade",
        "hacksaw": "a hacksaw with a metal frame, blue handle, and thin blade for cutting metal",
        "electric-drill": "a cordless electric drill with a yellow and black body, chuck, and drill bit attached",
        "tape-measure": "a retractable yellow tape measure with the tape partially extended",
        "safety-goggles": "a pair of clear safety goggles with adjustable strap",
    },
    "bodyparts": {
        "head": "a child's head from the side view, focused on the head shape with the background blurred",
        "hair": "a child's hair, camera focused tightly on the hair with the rest of the head softly blurred",
        "face": "a child's face from the front, focused on the facial features with background blurred",
        "eyes": "a child's eyes, camera focused on the eyes with the rest of the face softly blurred",
        "eyebrows": "a child's eyebrows, camera focused on the eyebrow area with the rest of the face softly blurred",
        "nose": "a child's nose, camera focused on the nose with the rest of the face softly blurred",
        "ear": "a child's ear from the side, camera focused on the ear with everything else blurred",
        "lips": "a child's lips, camera focused on the lips with the rest of the face softly blurred",
        "teeth": "a child smiling showing teeth, camera focused on the teeth with the rest blurred",
        "tongue": "a child playfully sticking out their tongue, focused on the tongue with the rest blurred",
        "chin": "a child's chin, camera focused on the chin and jawline with the rest blurred",
        "cheeks": "a child's cheeks, camera focused on the rosy cheek area with the rest blurred",
        "shoulders": "a child's shoulders from the front, camera focused on the shoulders with the rest blurred",
        "arm": "a child's outstretched arm, camera focused on the arm with everything else blurred",
        "hand": "a child's open hand with fingers spread, focused on the hand with the rest blurred",
        "fingers": "a child's fingers spread apart, camera focused on the fingers with the rest blurred",
        "belly": "a child's belly or tummy, camera focused on the belly with everything else blurred",
        "foot": "a child's bare foot, camera focused on the foot with the background blurred",
        "toes": "a child's bare toes, camera focused tightly on the toes with the rest blurred",
    },
    "emotions": {
        "happy": "happy, with a big bright smile and sparkling eyes",
        "sad": "sad, sitting on the floor with a broken toy in front of them, droopy eyes and a tear on the cheek",
        "angry": "angry, with furrowed brows, a frown, and clenched fists",
        "surprised": "surprised, with wide open eyes, raised eyebrows, and an open mouth",
        "scared": "scared, with wide fearful eyes, raised shoulders, and hands near the face",
        "excited": "excited, jumping with arms raised, huge smile, and sparkling eyes",
        "tired": "tired, yawning on a bed with droopy eyes, cozy blankets and pillows around them",
        "confused": "confused, with a tilted head and puzzled expression, puzzle pieces scattered on the floor around them",
        "shy": "shy, a little girl shyly peeking out from behind her parent's legs, blushing cheeks",
        "love": "feeling love, hugging a big red heart with closed happy eyes",
        "silly": "being silly, making a funny face with tongue out and crossed eyes",
    },
    # Realistic variants of the emotions lesson (diverse adults, with a
    # visible cause for the emotion where it helps comprehension).
    # Output goes to public/concepts/emotions/real/ — see OUTPUT_DIRS.
    "emotions-real": {
        "happy": "a young woman with a big genuine smile and bright sparkling eyes, holding a small wrapped gift box she has just received",
        "sad": "a middle-aged man sitting on a park bench with sad teary eyes and drooping shoulders, looking down at his dropped ice cream cone splattered on the ground beside the bench",
        "angry": "a woman with furrowed brows, a tight frown and crossed arms, glaring at a smartphone with a badly cracked screen lying on the table in front of her",
        "surprised": "a man with wide open eyes, raised eyebrows and open mouth, hands on his cheeks, as colorful confetti falls around him at a surprise birthday party",
        "scared": "a young man in genuine terror, leaning far backward away from a garden fence — eyes stretched extremely wide, eyebrows raised high, mouth wide open in a frightened scream, both arms thrown up to shield his face, body twisted away mid-retreat — as a powerful muscular pitbull growls fiercely at him with front paws up on the fence, wrinkled muzzle, lips fully pulled back baring sharp teeth, ears back, intense aggressive stare, muscles bulging",
        "excited": "an excited young woman jumping with both arms raised high and a huge open-mouthed smile of joy, colorful celebration around her",
        "tired": "a tired man yawning widely on a cozy couch in warm evening lamplight, droopy half-closed eyes, one hand covering his mouth",
        "confused": "a confused woman scratching her head with a puzzled frown and tilted head, holding a large unfolded road map turned the wrong way around",
        "shy": "a shy young woman with a small bashful smile and blushing cheeks, shoulders raised, partly hiding the lower half of her face behind her hands",
        "love": "a woman with a gentle loving smile and softly closed eyes, warmly hugging a small fluffy puppy close to her chest",
        "silly": "a man making a silly goofy face with his tongue sticking out and crossed eyes, wearing a colorful party hat",
    },
    "household": {
        "cup": "a single ceramic coffee mug with a handle, side view",
        "plate": "a single round white ceramic dinner plate, top-down view",
        "bowl": "a single white ceramic bowl, three-quarter view",
        "frying-pan": "a black non-stick frying pan with a handle, three-quarter view",
        "cookies": "a small stack of round chocolate chip cookies",
        "spatula": "a kitchen spatula with a black handle and silicone head, side view",
        "spoon": "a single stainless steel dinner spoon, top-down view",
        "fork": "a single stainless steel dinner fork, top-down view",
        "toothbrush": "a single colorful toothbrush with bristles, side view",
        "toothpaste": "a tube of white and blue toothpaste lying on its side, cap on",
        "computer": "a desktop computer with a monitor, keyboard, and mouse on a desk, three-quarter view",
        "laptop": "a modern silver laptop computer, open with screen on, three-quarter view",
        "standing-fan": "a tall white pedestal standing fan, full body visible, front view",
        "tv": "a flat screen television on a TV stand, screen displaying a colorful nature scene, front view",
        "christmas-tree": "a beautifully decorated Christmas tree with colorful ornaments, lights, and a star on top, full tree visible",
        "dining-table": "a wooden dining table with four matching chairs around it, three-quarter view",
        "mirror": "a rectangular wall mirror with a simple wooden frame, hanging on a plain wall",
        "table": "a simple wooden study table with four legs, three-quarter view",
        "chair": "a single wooden dining chair, three-quarter view",
        "bed": "a neatly made double bed with white sheets, fluffy pillows, and a soft blanket, three-quarter view",
        "toys": "a colorful pile of children's toys including a fluffy brown teddy bear, a wooden toy train, and a stack of colorful building blocks, on a clean floor",
        "phone": "a modern smartphone lying flat on a clean surface with a colorful home screen visible, top-down view",
        "washing-machine": "a white front-loading washing machine, full appliance visible, front view",
        "fridge": "a tall double-door stainless steel refrigerator, full appliance visible, front view",
        "lamp": "a table lamp with a fabric shade and warm glowing bulb, on a small side table",
        "door": "a closed wooden front door with a brass doorknob, front view",
        "keys": "a small bunch of metal house keys on a simple keyring",
        "shoes": "a pair of children's sneakers placed side by side, three-quarter view",
        "jacket": "a child's cozy winter jacket with a hood, hanging on a hanger or laid flat",
        "shoe-stand": "a wooden shoe rack with several pairs of shoes neatly arranged on its shelves, three-quarter view",
        "umbrella": "an open colorful umbrella with a curved handle, three-quarter view",
        "clock": "a round analog wall clock with large clear numbers and easy-to-see hands, hanging on a plain wall, front view",
        "peel": "an empty yellow banana peel lying open on a clean surface, the fruit already eaten, clearly just the peel",
    },
    "weather": {
        "sunny": "a real photograph of bright sunny weather over a green meadow, the real sun blazing in a clear blue sky with natural glare and lens flare, everything bathed in golden sunlight — strictly photographic, absolutely no cartoon or illustrated elements",
        "cloudy": "cloudy weather over rolling green hills, the sky completely filled with big puffy grey and white clouds",
        "rainy": "rainy weather on a quiet street, heavy rain falling with visible raindrops, wet shiny pavement and puddles with ripples",
        "foggy": "foggy weather in a quiet park, thick white fog softening trees and a path into pale silhouettes",
        "windy": "windy weather in a park, trees bending strongly in the wind with leaves flying through the air",
        "snowy": "snowy weather over a cottage and pine trees, thick snowflakes falling, ground and roofs covered in fresh white snow",
        "stormy": "stormy weather over a field, dark dramatic storm clouds and a bright lightning bolt in the distance, edge-to-edge full-bleed photograph with no border or frame",
    },
    "construction": {
        "digger": "a yellow excavator digger with its articulated arm and bucket raised mid-dig",
        "crane": "a tall yellow mobile crane with its long boom extended up into the sky, lifting a load on a hook",
        "bulldozer": "a yellow bulldozer with a wide front blade pushing a small mound of earth",
        "dump-truck": "a large yellow dump truck with its open cargo bed full of earth",
        "concrete-mixer": "a concrete mixer truck with a large striped rotating drum",
        "steam-roller": "a yellow road roller with a big smooth metal drum flattening fresh asphalt",
        "forklift": "a yellow forklift lifting a wooden pallet on its two front forks",
        "wrecking-ball": "a crane swinging a huge heavy wrecking ball on a chain",
    },
    "gadgets": {
        "phone": "a modern smartphone standing upright with a colorful home screen visible, front view",
        "tablet": "a modern tablet computer propped at a slight angle with a colorful screen visible, front view",
        "laptop": "a modern silver laptop computer, open with a colorful screen on, three-quarter view",
        "keyboard": "a computer keyboard with clearly visible keys, top-down three-quarter view",
        "mouse": "a computer mouse with a scroll wheel, three-quarter view",
        "headphones": "a pair of large over-ear headphones with a padded headband, three-quarter view",
        "earphones": "a pair of small white wireless earbuds next to their open charging case",
        "camera": "a digital camera with a prominent round lens, three-quarter view",
        "remote": "a TV remote control with colorful rubber buttons, three-quarter view",
        "drone": "a quadcopter camera drone with four rotors, hovering in the air, three-quarter view",
        "smartwatch": "a smartwatch with a colorful watch face, strap open, three-quarter view",
        "speaker": "a portable wireless speaker with a visible fabric grille, three-quarter view",
    },
    "outside": {
        "road": "an empty two-lane road with a yellow center line curving gently through green countryside",
        "fence": "a white wooden picket fence along a garden with green grass and a few flowers",
        "gate": "a garden gate in a low fence, slightly ajar, with a path leading through it",
        "tunnel": "the arched entrance of a road tunnel going into a green hillside",
        "bridge": "a small arched stone footbridge crossing a calm stream in a park",
        "street-lamp": "a classic black street lamp glowing warmly at dusk on a tidy sidewalk",
        "drain": "a metal storm drain grate at the edge of a street curb, seen from above at an angle",
        "playground": "a colorful children's playground with a slide, swings, and a climbing frame on soft ground",
        "swing": "a children's swing set with two swings in a sunny playground",
        "slide": "a colorful children's slide in a sunny playground",
        "park-bench": "a classic wooden park bench on a path under a leafy tree",
        "mailbox": "a cheerful red curbside mailbox on a wooden post with its little flag up",
        "bell": "a large bronze church-style bell with a rope, hanging in a small open bell tower against a blue sky",
    },
    "sea-creatures": {
        "fish": "a colorful tropical clownfish with bright orange and white stripes, swimming gracefully, full body visible",
        "sea-horse": "a small bright yellow seahorse with a curled tail, side view, full body visible",
        "octopus": "a reddish-purple octopus with tentacles spread out, full body visible",
        "dolphin": "a friendly bottlenose dolphin swimming, full body visible from the side",
        "whale": "a majestic humpback whale swimming, full body visible from the side",
        "shark": "a great white shark swimming, full body visible from the side",
        "crab": "a bright red crab with claws raised, on the sandy ocean floor, full body visible from above",
        "lobster": "a bright red lobster with large claws, on the sandy ocean floor, full body visible",
        "shrimp": "a fresh pink shrimp curled, full body visible from the side",
        "jellyfish": "a translucent moon jellyfish with long flowing tentacles, floating in clear blue water, full body visible",
        "oyster": "an open oyster shell on the sandy ocean floor, showing the pearl-like inside",
        "mussels": "a small cluster of dark blue-black mussel shells, partially open, on a rocky surface",
        "coral": "a vibrant cluster of colorful coral reef with branching shapes in pink, orange, and purple",
    },
    "opposites": {
        "big": "a gigantic friendly green dinosaur towering so tall it nearly fills the whole frame",
        "small": "a teeny-tiny red ladybug sitting on a wide green leaf, lots of open space around it to show how little it is",
        "hot": "a glowing campfire with dancing orange flames and a marshmallow toasting on a stick beside it",
        "cold": "an ice-cream cone stacked with frosty scoops, sparkling snowflakes and a light dusting of frost around it",
        "up": "a red diamond kite soaring high into the sky, ribbons on its tail rippling upward, viewed from below",
        "down": "a golden autumn leaf drifting gently down from a branch toward the ground, a soft falling motion trail behind it",
        "happy": "a bouncing golden puppy mid-leap with a huge doggy grin, ears flying and tail wagging",
        "sad": "a droopy-eared puppy sitting with big watery eyes and one single tear rolling down its cheek",
        "light": "the inside of a cozy children's bedroom in the evening with the ceiling light and bedside lamp switched on, the whole room bright and warm, toys and bed clearly visible",
        "dark": "the same cozy children's bedroom at night with the main lights switched off, only a small bedside lamp glowing dimly with a soft warm halo, the rest of the room in deep blue shadow but the bed and toys still gently visible",
        "open": "a big storybook lying with its covers spread wide open, pages fanned out",
        "close": "the same big storybook shut tight, cover closed flat with nothing peeking out",
        "full": "a toy box packed all the way to the top with colorful balls, blocks, and stuffed animals spilling over the rim",
        "empty": "the same toy box with absolutely nothing inside, just its bare walls and floor showing",
        "wet": "a child in a yellow raincoat and boots splashing through a rain puddle, raindrops and splashes flying",
        "dry": "a child in a sun hat standing on warm dry sand under a bright sun, not a drop of water anywhere",
        "long": "a toy train with a very long line of colorful cars stretching all the way across the picture",
        "short": "a toy train with only one little car behind the engine, small and compact in the center",
        "loud": "a roaring lion with its mouth wide open and big bold colorful sound waves bursting out",
        "quiet": "a little kitten sleeping curled in a ball, soft z's floating gently above it",
        "soft": "an extra-woolly fluffy white sheep that looks like a walking cloud, squishy and cuddly",
        "hard": "a sturdy tortoise with a thick solid shell, patting the tough shell surface into focus",
        "clean": "a shiny red toy car gleaming after a wash, sparkle glints and a few soap bubbles floating around",
        "dirty": "the same red toy car splattered all over with brown mud, mud dripping off the wheels",
        "old": "a rusty old bicycle with faded paint, a bent basket, and creaky worn wheels",
        "new": "a brand-new shiny bicycle with sparkling paint, gleaming spokes, and a red gift bow on the handlebars",
        "day": "a sunny little farm under a bright blue sky, big cheerful sun, cows grazing on green grass",
        "night": "the same little farm under a deep starry sky, glowing crescent moon, cows asleep on the grass",
        "running": "a happy young boy running fast across a park path, arms pumping and legs stretched mid-stride, motion lines and little dust puffs behind him",
        "walking": "the same young boy walking calmly and slowly along the park path, relaxed easy pace, one foot gently in front of the other",
        "fast": "a sleek red race car zooming by at top speed, big bold motion lines streaking behind it",
        "slow": "a smiling little snail sliding along very slowly, a short gentle slime trail behind it",
        # Beautiful/ugly stays on gardens (a fixable state of a place), never
        # on people or creatures — see the note in src/data/opposites.js
        "beautiful": "a beautiful blooming flower garden bursting with tidy colorful flowers, roses and tulips in neat beds, butterflies and gentle sparkles in the air",
        "ugly": "a neglected scraggly garden patch choked with tangled grey-brown weeds, drooping thorny brambles and patchy dry dirt, unkempt and gloomy but not scary, no flowers anywhere, not a single bloom or bright color",
        "inside": "a fluffy white puppy sitting snugly INSIDE a red doghouse, its happy face peeking out of the round doorway",
        "outside": "the same fluffy white puppy standing on the grass OUTSIDE beside the same red doghouse, fully visible next to it",
        "here": "a smiling little girl in a pink shirt and blue overalls standing in a wide green park, pointing straight down at a red ball sitting right at her feet, very close in the foreground",
        "there": "the same little girl pointing far away across a wide green park at the same red ball sitting tiny in the distance",
        "near": "a colorful striped hot air balloon floating very close and huge, filling most of the frame above a green meadow",
        "far": "the same colorful striped hot air balloon tiny and far away in a big open sky above the same green meadow",
    },
    "opposites-scenes": {
        "big-small-scene": "a great big dog and a tiny kitten sitting side by side on the same rug, the size difference dramatic and clear",
        "hot-cold-scene": "a table with a steaming bowl of noodle soup on one side and an ice-cream sundae with frost on the other",
        "up-down-scene": "a tall tree with one squirrel perched at the very top and another squirrel at the bottom on the ground",
        "happy-sad-scene": "two puppies side by side: one leaping joyfully with a huge grin, the other drooping with a single tear",
        "light-dark-scene": "one lamp lighting one half of a room brightly while the other half sits in deep blue shadow",
        "open-close-scene": "two identical lunchboxes side by side: one flipped wide open showing food inside, one snapped firmly shut",
        "full-empty-scene": "two identical baskets side by side: one overflowing with red apples, one with nothing inside at all",
        "wet-dry-scene": "two towels on a clothesline: one dripping wet with water droplets falling, one dry and fluttering in the breeze",
        "long-short-scene": "two toy trains on parallel tracks: one very long with many colorful cars, one short with a single car",
        "loud-quiet-scene": "a lion roaring with big sound waves on one side while a kitten sleeps peacefully on the other",
        "soft-hard-scene": "a fluffy woolly sheep standing beside a tortoise with a thick solid shell",
        "clean-dirty-scene": "two red toy cars side by side: one sparkling clean and shiny, one caked in dripping brown mud",
        "old-new-scene": "two bicycles side by side: one rusty, faded and bent, one brand-new and shiny with a red gift bow",
        "day-night-scene": "a rolling hill landscape split by weather magic: bright sun and blue sky over one half, moon and stars over the other",
        "running-walking-scene": "two children side by side on a park path: one running fast with motion lines and flying hair, the other strolling slowly and calmly",
        "fast-slow-scene": "a red race car zooming past with big speed lines on one side while a smiling snail slides slowly along on the other side",
        "beautiful-ugly-scene": "a garden split down the middle: one half bursting with tidy colorful blooming flowers and butterflies, the other half a scraggly patch of tangled thorny grey-brown weeds",
        "inside-outside-scene": "two identical red doghouses side by side: a white puppy sitting inside one with its face in the doorway, and another white puppy standing on the grass outside the other",
        "here-there-scene": "a child in a park with one red ball sitting right at the child's feet in the near foreground, and an identical red ball sitting tiny far away in the distance on the same lawn",
        "near-far-scene": "two identical striped hot air balloons in one sky: one very close and huge on one side, the other tiny and far away near the horizon on the other side",
    },
    # Nature concepts support several photo variants per item; filenames are
    # suffixed -1, -2, … and listed in src/data/concepts.js `images` arrays.
    "nature": {
        "waterfall-1": "a tall powerful waterfall cascading down mossy rock cliffs into a clear pool, white falling water clearly visible",
        "mountain-1": "a majestic snow-capped mountain peak rising against a clear blue sky, dramatic and instantly recognizable",
        "valley-1": "a lush green valley between rolling mountains, viewed from a scenic overlook, a small river winding through the middle",
        "river-1": "a wide gently flowing river with clear blue water winding through a green landscape, both banks visible",
        "lake-1": "a calm mirror-still mountain lake with a perfect reflection of trees and sky in the water",
        "beach-1": "a beautiful sandy beach where gentle turquoise waves meet golden sand, clear blue sky above",
        "ocean-1": "the vast open ocean with rolling deep-blue waves and white foam crests under a bright sky",
        "forest-1": "a lush green forest with tall trees and sunlight streaming down between the trunks onto a soft path",
        "desert-1": "golden sand dunes of a vast desert with rippled wind patterns under a clear blue sky",
        "volcano-1": "a classic cone-shaped volcano with a thin plume of smoke rising from its crater, viewed from a distance",
        "cave-1": "the entrance of a large rocky cave, dark opening framed by rugged stone, soft daylight illuminating the mouth",
        "island-1": "a small lush tropical island with palm trees surrounded by clear turquoise water, seen from above",
        "rainbow-1": "a vivid full rainbow arching over a bright green meadow after rain, all colors clearly visible",
        "cloud-1": "big puffy white cumulus clouds floating in a bright blue sky, soft and cotton-like",
        "sun-1": "the bright golden sun glowing in a clear sky at golden hour, warm rays spreading over a soft landscape below",
        "moon-1": "a large detailed full moon glowing in a dark night sky, craters clearly visible",
        "stars-1": "a brilliant starry night sky filled with twinkling stars over a dark silhouetted horizon",
        "snow-1": "a peaceful snowy landscape with evergreen trees blanketed in fresh white snow, soft winter light",
        "lightning-1": "a dramatic bolt of lightning striking down from dark storm clouds over an open landscape",
        "glacier-1": "a massive blue-white glacier meeting dark water, with a floating iceberg, crisp arctic light",
        # Second variants: same concept, deliberately different scene/angle
        # so repeat visits show the idea in a fresh way
        "waterfall-2": "a wide curtain waterfall thundering over a rocky ledge into a misty plunge pool, viewed from the front at a distance, spray rising",
        "mountain-2": "a rugged rocky mountain range with sharp snow-dusted peaks glowing orange at sunrise, dramatic alpine scenery",
        "valley-2": "a broad sunlit valley seen from a hilltop, patchwork of green meadows and wildflowers between gentle rolling hills",
        "river-2": "a calm forest river flowing between tree-lined banks, seen from low over the water, soft morning mist",
        "lake-2": "a bright turquoise alpine lake surrounded by pine trees and tall mountains under a sunny sky",
        "beach-2": "a white-sand tropical beach at golden sunset, gentle foamy waves washing ashore and a few seashells on the sand",
        "ocean-2": "powerful deep-blue ocean waves crashing against dark coastal rocks, white spray flying, bright daylight",
        "forest-2": "a colorful autumn forest with golden and red leaves, a carpet of fallen leaves on the ground, warm light",
        "desert-2": "a rocky desert landscape with tall green saguaro cactus plants under a blazing blue sky",
        "volcano-2": "an erupting volcano at dusk with glowing bright red-orange lava flowing down its dark slopes, ash cloud rising from the crater",
        "cave-2": "the inside of a large cave with dramatic stalactites hanging from the ceiling and stalagmites rising from the floor, warm golden light",
        "island-2": "a small green island with a few palm trees in the middle of a calm turquoise sea, viewed from the water level with sky above",
        "rainbow-2": "a brilliant double rainbow stretching across a dramatic sky over a calm lake, colors reflected in the water",
        "cloud-2": "one giant towering puffy white cumulus cloud in a deep blue sky, seen from a hillside meadow below",
        "moon-2": "a bright crescent moon in a deep twilight-blue evening sky above a dark silhouetted treeline",
        "sun-2": "the sun rising over a calm ocean horizon, golden light path reflected across the water",
        "stars-2": "the bright band of the Milky Way stretching across a clear night sky above dark mountain silhouettes",
        "snow-2": "snowflakes falling gently over a white winter meadow, snow-covered pine branches in the foreground",
        "lightning-2": "multiple branching lightning bolts lighting up a dark purple night sky over the sea",
        "glacier-2": "a vast glacier like a frozen river of ice winding between dark mountain ridges, seen from above, deep blue crevasses visible",
        # States-of-water trio + stone/pebbles (added Aug 2026)
        "ice-1": "clear sparkling ice cubes in a small glass bowl, frosty and glistening, close up",
        "ice-2": "long clear icicles hanging from a snowy branch, sparkling in winter sunlight",
        "water-1": "crystal-clear water being poured into a drinking glass, splashing and sparkling, close up",
        "water-2": "clear blue water with gentle ripples and sunlight sparkles, seen up close",
        "steam-1": "thick white steam rising from a kettle spout, the curling steam clearly visible against a plain background",
        "steam-2": "white steam rising gently from a natural hot spring pool among rocks in the morning light",
        "stone-1": "one large smooth grey stone resting on green grass, close up",
        "stone-2": "a big round river stone sitting on sand beside a stream, warm sunlight",
        "pebbles-1": "a pile of small smooth colorful pebbles in greys, whites and browns, close up",
        "pebbles-2": "small round pebbles covering a river bank at the edge of clear shallow water, close up",
    },
    "bugs": {
        "butterfly": "a colorful monarch butterfly with wings spread open, resting on a flower",
        "bee": "a fuzzy honeybee collecting nectar on a bright yellow flower, wings and stripes clearly visible",
        "ladybug": "a bright red ladybug with black spots crawling on a green leaf",
        "ant": "a black garden ant walking on a twig, body segments clearly visible",
        "snail": "a garden snail with a spiral brown shell gliding slowly on a leaf, eye stalks extended",
        "grasshopper": "a bright green grasshopper perched on a blade of grass, long back legs clearly visible",
        "dragonfly": "a dragonfly with transparent shimmering wings perched on a reed near water",
        "caterpillar": "a plump green and yellow striped caterpillar crawling along a leafy branch",
        "spider": "a small friendly-looking garden spider sitting in the center of a dew-covered web",
        "firefly": "a firefly on a leaf at dusk with its abdomen glowing warm yellow-green light",
        "beetle": "a shiny iridescent green jewel beetle standing on a leaf, rounded shell clearly visible",
        "worm": "a pink earthworm crawling on rich brown garden soil next to small green sprouts",
    },
    "space": {
        "sun": "the Sun as seen by a solar telescope, a glowing orange-yellow ball of plasma with visible solar flares and surface texture, filling most of the frame",
        "moon": "the full Moon photographed through a telescope, grey cratered surface with maria and craters in crisp detail, filling most of the frame",
        "mercury": "the planet Mercury from spacecraft imagery, a grey-brown heavily cratered rocky planet, full sphere visible",
        "venus": "the planet Venus from spacecraft imagery, a full sphere wrapped in thick creamy yellow-white swirling clouds",
        "earth": "the planet Earth from space, the classic blue marble with blue oceans, green-brown continents and white swirling clouds, full sphere visible",
        "mars": "the planet Mars from spacecraft imagery, the red planet with rusty orange-red surface, dark markings and a white polar ice cap, full sphere visible",
        "jupiter": "the planet Jupiter from spacecraft imagery, a full sphere with orange, brown and cream cloud bands and the Great Red Spot clearly visible",
        "saturn": "the planet Saturn from spacecraft imagery, a pale golden sphere with its magnificent bright rings fully visible at a slight tilt",
        "uranus": "the planet Uranus from spacecraft imagery, a smooth pale cyan-blue sphere with its faint thin rings tilted vertically",
        "neptune": "the planet Neptune from spacecraft imagery, a deep vivid blue sphere with faint white streaked clouds, full sphere visible",
        "stars": "a dense field of countless twinkling stars in deep space with the colorful glowing band of the Milky Way running across the frame",
        "solar-system": "the whole solar system in one view: the glowing Sun on the left with all eight planets lined up in order to the right along their orbit lines, sizes clearly distinct, Saturn's rings visible",
    },
    "traffic": {
        "traffic-light": "a standard three-light traffic signal on a pole, with the red, amber yellow, and green lights all clearly visible from top to bottom, against a clear blue sky",
        "red-light": "a traffic signal with only the red light at the top glowing brightly, the yellow and green lights dark, against a clear blue sky",
        "yellow-light": "a traffic signal with only the amber yellow light in the middle glowing brightly, the red and green lights dark, against a clear blue sky",
        "green-light": "a traffic signal with only the green light at the bottom glowing brightly, the red and yellow lights dark, against a clear blue sky",
        "stop-sign": "a red octagonal STOP sign on a post, with the white word STOP large and clearly legible",
        "yield-sign": "a downward-pointing triangular YIELD sign with a red border and white center, the word YIELD legible, on a post",
        "crosswalk": "a pedestrian crosswalk with bold bright white painted zebra stripes across a clean city street",
        "traffic-cone": "a single bright orange traffic safety cone with a reflective white band, standing on a road",
        "speed-bump": "a yellow and black striped speed bump raised across a paved road",
        "railroad-crossing": "a railroad crossing with a white X-shaped crossbuck sign and round red warning lights beside train tracks",
        "bus-stop": "a city bus stop with a clear bus-stop sign and a small shelter beside a street",
        "sidewalk": "a clean paved sidewalk running alongside a quiet street, clearly showing the pedestrian walking path",
        "roundabout": "a blue circular roundabout road sign with three curved white arrows forming a ring, on a post against a clear sky",
        "do-not-enter": "a round red Do Not Enter traffic sign with a horizontal white bar in the center, on a post against a clear sky",
        "walk-signal": "a pedestrian crossing signal box showing a glowing white walking-person WALK symbol",
        "crossing-guard": "a friendly crossing guard wearing a bright high-visibility vest, holding up a handheld STOP paddle sign at a street corner",
        "one-way": "a black and white rectangular ONE WAY traffic sign with a large arrow, on a post against a clear sky",
        "school-crossing": "a fluorescent yellow-green pentagon school-crossing sign showing two children walking, on a post against a clear sky",
    },
    # "A is for Apple" letter-sound words (src/data/letterSounds.js)
    "letter-sounds": {
        "apple": "a shiny red apple with a green leaf",
        "ant": "a cute friendly black ant with big eyes",
        "airplane": "a cheerful little passenger airplane flying among puffy clouds",
        "ball": "a colorful striped bouncy ball",
        "banana": "a bright yellow banana, slightly peeled",
        "baby": "a happy giggling baby sitting up wearing a onesie",
        "cat": "a cute orange tabby kitten sitting and smiling",
        "car": "a happy little red toy car",
        "cow": "a friendly white cow with black spots standing on grass",
        "dog": "a happy golden puppy sitting with tongue out",
        "duck": "a cute yellow duckling standing by a puddle",
        "door": "a friendly red front door with a round doorknob",
        "elephant": "a cute baby elephant with big ears waving its trunk",
        "egg": "a white egg in a straw nest, one cracked open showing a yolk beside it",
        "ear": "a friendly child's face in profile with a clearly visible ear",
        "fish": "a cute smiling orange fish blowing bubbles underwater",
        "frog": "a happy green frog sitting on a lily pad",
        "flower": "a bright pink flower with a smiling yellow center",
        "goat": "a playful white baby goat standing on grass",
        "grapes": "a bunch of shiny purple grapes with a leaf",
        "gift": "a wrapped gift box with a big red bow",
        "hat": "a cheerful yellow sun hat with a ribbon",
        "horse": "a friendly brown horse standing in a meadow",
        "house": "a cozy little house with a red roof and a chimney",
        "ice-cream": "a happy ice cream cone with a pink scoop and a cherry on top",
        "igloo": "a snug white igloo made of snow blocks on snowy ground",
        "insect": "a cute friendly ladybug on a green leaf",
        "juice": "a glass of orange juice with a striped straw and an orange slice",
        "jam": "a jar of red strawberry jam with a spoon and strawberries beside it",
        "jellyfish": "a cute smiling pink jellyfish floating underwater",
        "kite": "a colorful diamond kite with a long bowed tail flying in a blue sky",
        "key": "a shiny golden key with a heart-shaped top",
        "kangaroo": "a friendly kangaroo mom with a joey peeking from her pouch",
        "lion": "a cute lion cub with a fluffy mane sitting proudly",
        "leaf": "a single bright green leaf with visible veins",
        "lemon": "a bright yellow lemon with one slice beside it",
        "monkey": "a playful brown monkey hanging from a branch by one arm",
        "moon": "a smiling crescent moon with little stars in a night sky",
        "milk": "a glass of white milk next to a small milk jug",
        "nose": "a friendly child's smiling face with a cute button nose front and center",
        "nest": "a cozy bird nest with three little blue eggs",
        "nut": "a brown acorn with a cap, with a walnut and a peanut beside it",
        "orange": "a bright orange fruit with one peeled segment beside it",
        "owl": "a cute wide-eyed brown owl perched on a branch",
        "octopus": "a cute smiling purple octopus with curly arms underwater",
        "pig": "a happy pink piglet with a curly tail standing in grass",
        "penguin": "a cute baby penguin waddling on ice",
        "pizza": "a cheerful pizza with melted cheese and one slice pulled out",
        "queen": "a kind smiling queen with a golden crown and a purple royal cape",
        "quilt": "a colorful patchwork quilt folded on a little bed",
        "quail": "a cute round quail bird with a curled head plume",
        "rabbit": "a cute white bunny rabbit with long ears holding a carrot",
        "rainbow": "a bright rainbow arching over puffy white clouds",
        "robot": "a friendly little blue toy robot waving hello",
        "sun": "a big smiling yellow sun with soft rays",
        "star": "a golden five-pointed star with a happy face in a night sky",
        "snake": "a cute friendly green snake coiled with a smiling face",
        "tiger": "a cute tiger cub with orange and black stripes sitting",
        "train": "a happy little blue steam train with a red engine car on tracks",
        "tree": "a big friendly green tree with a thick brown trunk on a grassy hill",
        "umbrella": "a bright red open umbrella with rain drops falling around it",
        "unicorn": "a cute white unicorn with a rainbow mane and a golden horn",
        "up": "a happy child pointing up at a red balloon floating up into the sky",
        "van": "a cheerful little blue van driving on a road",
        "violin": "a shiny brown violin with a bow",
        "vegetables": "a basket of colorful vegetables: carrot, tomato, broccoli, and corn",
        "watermelon": "a big green watermelon with one juicy red slice cut out",
        "whale": "a cute smiling blue whale spouting water",
        "window": "a cozy open window with curtains and a flower pot on the sill",
        "xylophone": "a colorful toy xylophone with rainbow bars and two mallets",
        "x-ray": "a friendly cartoon x-ray picture showing the bones of a waving hand, on a light panel",
        "fox": "a cute orange fox with a fluffy tail sitting and smiling",
        "yo-yo": "a bright red yo-yo with its string making a loop",
        "yogurt": "a cup of creamy yogurt with a spoon and strawberries beside it",
        "yarn": "a ball of soft pink yarn with knitting needles",
        "zebra": "a cute baby zebra with black and white stripes standing",
        "zoo": "a cheerful zoo entrance gate with a giraffe and elephant peeking over the fence",
        "zipper": "a big colorful zipper half-open on a bright blue jacket",
    },
    # Spatial words (src/data/concepts.js prepositions) — one recurring
    # kitten + cardboard-box pair, only the position changes per picture.
    # The style prompt pins the characters; each subject states the position.
    "prepositions": {
        "inside": "the ginger kitten sitting INSIDE the open cardboard box, its head and paws peeking over the rim",
        "outside": "the ginger kitten sitting on the floor OUTSIDE the closed cardboard box, clearly beside and separate from it",
        "on": "the ginger kitten sitting proudly ON TOP of the closed cardboard box",
        "under": "the ginger kitten curled up UNDER a sturdy wooden table, the cardboard box sitting on top of the table",
        "over": "the ginger kitten leaping in mid-air OVER the closed cardboard box, a soft dotted arc showing its jump path",
        "behind": "the ginger kitten peeking out from BEHIND the cardboard box, only its head and one paw visible past the box edge",
        "in-front": "the ginger kitten sitting IN FRONT of the cardboard box, fully visible with the box clearly behind it",
        "between": "the ginger kitten sitting snugly BETWEEN two identical cardboard boxes, one on each side",
        "next-to": "the ginger kitten sitting close beside the cardboard box, side by side and almost touching, NEXT TO it",
        "around": "exactly ONE single ginger kitten running AROUND the cardboard box, mid-run at one point of a soft dotted circle path that loops all the way around the box — only one kitten in the whole picture",
        "through": "the ginger kitten walking THROUGH a cardboard box tunnel open at both ends, its head emerging from one end and tail still inside",
    },
    # 3-letter word-family words (src/data/phonics.js)
    "phonics-words": {
        "bat": "a cute friendly purple bat with round ears flying at dusk",
        "cat": "a cute orange tabby cat sitting and smiling",
        "hat": "a classic brown cowboy hat with a wide curved brim",
        "mat": "a soft fluffy pink rectangular bath mat with white daisy flowers on it, lying flat on a bathroom floor, seen from a high angle so its rectangular shape is clear, with a person standing on it wearing striped pyjama bottoms and bare feet — only their feet and lower legs up to the calves visible, the rest of the body out of frame at the top",
        "rat": "a cute grey rat with round ears holding a piece of cheese",
        "can": "a shiny tin can with a bright red label, no text on the label",
        "fan": "a cheerful electric table fan with blue blades",
        "man": "a friendly smiling man waving hello",
        "pan": "a shiny frying pan with a black handle",
        "van": "a cheerful little blue van driving on a road",
        "cap": "a bright blue baseball cap",
        "lap": "a parent sitting cross-legged with a happy toddler sitting on their lap",
        "map": "a colorful treasure map with a dotted path and a big X",
        "nap": "a cute toddler napping peacefully under a cozy blanket",
        "tap": "a shiny silver water tap with water flowing into a sink",
    },
}

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..")
OUTPUT_BASE = os.path.join(PROJECT_ROOT, "public", "concepts")

# Custom output directories for non-object categories
# Categories not listed here default to public/concepts/<category>/
OUTPUT_DIRS = {
    "emotions": os.path.join(PROJECT_ROOT, "public", "concepts", "emotions"),
    "emotions-real": os.path.join(PROJECT_ROOT, "public", "concepts", "emotions", "real"),
    "opposites": os.path.join(PROJECT_ROOT, "public", "opposites"),
    "opposites-scenes": os.path.join(PROJECT_ROOT, "public", "opposites", "scenes"),
    "letter-sounds": os.path.join(PROJECT_ROOT, "public", "phonics", "letters"),
    "phonics-words": os.path.join(PROJECT_ROOT, "public", "phonics", "words"),
}

WEBP_SIZE = 1024
WEBP_QUALITY = 80

# Cross-project generated-image library (/mnt/data/genlab). Archiving must
# never break generation, so failures are reported and swallowed.
GENLAB_DIR = "/mnt/data/genlab"


def archive_to_genlab(output_path, prompt, provider, model, category, item_name,
                      status="accepted", notes=None):
    try:
        if GENLAB_DIR not in sys.path:
            sys.path.insert(0, GENLAB_DIR)
        import genlab
        genlab.record(
            output_path,
            prompt=prompt,
            provider=provider,
            model=model,
            project="toddlearn",
            category=category,
            item=item_name,
            status=status,
            notes=notes,
        )
    except Exception as e:
        print(f"  ⚠  genlab archive failed for {category}/{item_name}: {e}")


def get_output_dir(category):
    """Get the output directory for a category."""
    return OUTPUT_DIRS.get(category, os.path.join(OUTPUT_BASE, category))


def _save_webp(image, output_path):
    if image.size != (WEBP_SIZE, WEBP_SIZE):
        image = image.resize((WEBP_SIZE, WEBP_SIZE), Image.LANCZOS)
    image.save(output_path, "WEBP", quality=WEBP_QUALITY)
    return os.path.getsize(output_path) // 1024


def _generate_gemini(prompt, output_path):
    response = client.models.generate_content(
        model=MODEL,
        contents=[prompt],
        config=types.GenerateContentConfig(
            response_modalities=["Text", "Image"],
            image_config=types.ImageConfig(
                aspect_ratio="1:1",
                image_size="1K",
            ),
        ),
    )

    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            image = Image.open(BytesIO(part.inline_data.data))
            size_kb = _save_webp(image, output_path)
            print(f"  ✅ Saved: {output_path} ({WEBP_SIZE}x{WEBP_SIZE}, {size_kb}KB)")
            return True
        elif part.text is not None:
            print(f"  ℹ  Model note: {part.text[:100]}")
    return False


def _generate_openai(prompt, output_path):
    result = get_openai_client().images.generate(
        model=OPENAI_MODEL,
        prompt=prompt,
        size="1024x1024",
        quality="medium",
    )
    image_bytes = base64.b64decode(result.data[0].b64_json)
    image = Image.open(BytesIO(image_bytes))
    size_kb = _save_webp(image, output_path)
    print(f"  ✅ Saved: {output_path} ({WEBP_SIZE}x{WEBP_SIZE}, {size_kb}KB)")
    return True


def generate_image(category, item_name, subject_desc, force=False, provider="gemini"):
    """Generate and save a single image as compressed WebP. Returns True on success."""
    output_dir = get_output_dir(category)
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{item_name}.webp")

    if os.path.exists(output_path) and not force:
        print(f"  ⏭  Skipping {category}/{item_name} (already exists)")
        return True

    style = STYLE_PROMPTS.get(category, STYLE_PROMPTS["animals"])
    prompt = style.format(subject=subject_desc)

    print(f"  🎨 Generating {category}/{item_name} via {provider}...")

    try:
        if provider == "openai":
            ok = _generate_openai(prompt, output_path)
        else:
            ok = _generate_gemini(prompt, output_path)
            if not ok:
                print(f"  ❌ No image returned for {category}/{item_name}")
        if ok:
            model = OPENAI_MODEL if provider == "openai" else MODEL
            archive_to_genlab(output_path, prompt, provider, model, category, item_name)
        return ok

    except Exception as e:
        print(f"  ❌ Error generating {category}/{item_name}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Generate images for Kids Learning App")
    parser.add_argument("--category", type=str, help="Generate only this category (e.g. animals, bodyparts, emotions, opposites, opposites-scenes)")
    parser.add_argument("--item", type=str, help="Generate only this item (requires --category)")
    parser.add_argument("--force", action="store_true", help="Overwrite existing images")
    parser.add_argument("--provider", choices=["gemini", "openai"], default="openai", help="Image generation provider")
    parser.add_argument("--limit", type=int, help="Limit to first N items per category (useful for testing)")
    args = parser.parse_args()

    if args.item and not args.category:
        parser.error("--item requires --category")

    categories = {args.category: ITEMS[args.category]} if args.category else ITEMS

    total = sum(len(items) for items in categories.values())
    success = 0
    failed = 0
    skipped = 0

    print(f"\n📸 Generating {total} images across {len(categories)} categories\n")

    for category, items in categories.items():
        print(f"\n{'='*50}")
        print(f"📁 Category: {category.upper()} ({len(items)} items)")
        print(f"{'='*50}")

        target_items = {args.item: items[args.item]} if args.item else items
        if args.limit:
            target_items = dict(list(target_items.items())[:args.limit])

        for item_name, subject_desc in target_items.items():
            output_path = os.path.join(get_output_dir(category), f"{item_name}.webp")
            if os.path.exists(output_path) and not args.force:
                skipped += 1
                print(f"  ⏭  Skipping {category}/{item_name} (exists)")
                continue
            ok = generate_image(category, item_name, subject_desc, force=args.force, provider=args.provider)

            if ok:
                success += 1
            else:
                failed += 1

            # Brief pause between API calls to avoid rate limiting
            time.sleep(1)

    print(f"\n{'='*50}")
    print(f"📊 Results: {success} generated, {skipped} skipped, {failed} failed")
    print(f"{'='*50}\n")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
