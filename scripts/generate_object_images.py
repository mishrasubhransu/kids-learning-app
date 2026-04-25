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
    "opposites-pairs": (
        "A child-friendly illustration showing {subject}. "
        "The left half of the image shows one concept, the right half shows the opposite. "
        "A clear visual divide between left and right. "
        "Simple, colorful style with bright cheerful colors and clean backgrounds. "
        "Both concepts should be immediately obvious and easy for a toddler to understand. "
        "No text, no labels, no watermarks. Wide 2:1 landscape composition."
    ),
    "household": (
        "A beautiful, high-quality photograph of {subject}. "
        "Photorealistic with vivid natural colors, soft studio lighting, "
        "and a clean, slightly blurred white or light grey background. Centered and clearly visible. "
        "Professional product photography style, clean and well-lit. "
        "Sharp focus on the object, shallow depth of field. "
        "No text, no labels, no watermarks. Square 1:1 composition."
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
    },
    "profession": {
        "doctor": "a doctor in a white coat examining a patient with a stethoscope in a bright medical office",
        "nurse": "a nurse in blue scrubs with a stethoscope around the neck, standing in a hospital ward with a warm smile",
        "air-hostess": "a smiling flight attendant in uniform serving food trays to passengers inside an airplane cabin",
        "teacher": "a teacher standing at a whiteboard with diagrams, teaching an engaged class of students",
        "firefighter": "a firefighter in full yellow turnout gear and helmet, standing in front of a red fire truck",
        "police-officer": "a police officer in uniform with a badge, standing next to a police car",
        "astronaut": "an astronaut in a white spacesuit with helmet visor up, floating inside a space station with Earth visible through a window",
        "pilot": "an airline pilot in uniform sitting in an airplane cockpit surrounded by instruments and controls",
        "chef": "a chef in a white double-breasted jacket and tall white hat, cooking in a professional kitchen",
        "farmer": "a farmer in overalls and a straw hat, standing in a green field with a tractor in the background",
        "scientist": "a scientist in a white lab coat carefully mixing colorful chemicals in test tubes and beakers in a laboratory",
        "software-engineer": "a software engineer sitting at a desk with dual monitors displaying colorful code and data visualization plots",
        "construction-worker": "a construction worker wearing a yellow hard hat and orange safety vest, working on a building site",
        "artist": "an artist in a paint-splattered apron, painting on a canvas with a palette of colorful paints in hand",
        "musician": "a musician playing an acoustic guitar on a small stage with warm spotlight lighting",
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
    },
    "opposites-pairs": {
        "big-small": "LEFT: a very large elephant. RIGHT: a tiny mouse. Emphasize the size difference",
        "hot-cold": "LEFT: a steaming hot cup of cocoa with visible steam. RIGHT: a frozen snowman in snow",
        "up-down": "LEFT: a cat sitting on top of a refrigerator looking down. RIGHT: the same cat sitting on the kitchen floor looking up",
        "happy-sad": "LEFT: a close-up of a child's face with a big happy smile. RIGHT: the same child's face looking sad with a tear",
        "light-dark": "LEFT: a cozy room with all lights on, bright and warm. RIGHT: the same room with only a candle lit, dim and shadowy",
        "open-close": "LEFT: an open wooden door. RIGHT: the same wooden door closed shut",
        "full-empty": "LEFT: a glass completely full of orange juice. RIGHT: the same glass completely empty",
        "wet-dry": "LEFT: a golden retriever puppy soaking wet with water droplets. RIGHT: the same puppy dry and fluffy in sunshine",
        "long-short": "A split image with a clear vertical line dividing left and right. LEFT SIDE ONLY: a long yellow pencil standing vertically, tall and full-length. RIGHT SIDE ONLY: a very short stubby yellow pencil nub, same style but tiny. Both on the same plain white background. Each pencil stays entirely within its own half",
        "loud-quiet": "LEFT: a child banging a drum loudly with visible sound waves. RIGHT: a baby sleeping peacefully with a finger on lips",
        "soft-hard": "LEFT: a fluffy soft teddy bear. RIGHT: a solid hard rock",
        "clean-dirty": "LEFT: a cute white puppy perfectly clean and groomed. RIGHT: the same puppy covered in mud and dirt",
        "old-new": "LEFT: an old worn-out shoe with patches and holes. RIGHT: a brand new shiny shoe in a box",
        "day-night": "LEFT: a quaint village street in bright daytime with blue sky. RIGHT: the same village street at night with moon and stars",
    },
}

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..")
OUTPUT_BASE = os.path.join(PROJECT_ROOT, "public", "objects")

# Custom output directories for non-object categories
# Categories not listed here default to public/objects/<category>/
OUTPUT_DIRS = {
    "emotions": os.path.join(PROJECT_ROOT, "public", "emotions"),
    "opposites-pairs": os.path.join(PROJECT_ROOT, "public", "opposites"),
}

WEBP_SIZE = 1024
WEBP_QUALITY = 80


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
            return _generate_openai(prompt, output_path)
        else:
            ok = _generate_gemini(prompt, output_path)
            if not ok:
                print(f"  ❌ No image returned for {category}/{item_name}")
            return ok

    except Exception as e:
        print(f"  ❌ Error generating {category}/{item_name}: {e}")
        return False


def generate_opposite_pair(pair_name, subject_desc, force=False):
    """Generate a wide 2:1 image and split into left/right halves."""
    output_dir = get_output_dir("opposites-pairs")
    os.makedirs(output_dir, exist_ok=True)

    left_name, right_name = pair_name.split("-")
    left_path = os.path.join(output_dir, f"{left_name}.webp")
    right_path = os.path.join(output_dir, f"{right_name}.webp")

    if os.path.exists(left_path) and os.path.exists(right_path) and not force:
        print(f"  ⏭  Skipping opposites-pairs/{pair_name} (already exists)")
        return True

    style = STYLE_PROMPTS["opposites-pairs"]
    prompt = style.format(subject=subject_desc)

    print(f"  🎨 Generating opposites-pairs/{pair_name}...")

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_modalities=["Text", "Image"],
                image_config=types.ImageConfig(
                    aspect_ratio="16:9",
                ),
            ),
        )

        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                image = Image.open(BytesIO(part.inline_data.data))
                w, h = image.size
                mid = w // 2

                # Split into left and right halves, resize each to 512x512
                left_img = image.crop((0, 0, mid, h)).resize((512, 512), Image.LANCZOS)
                right_img = image.crop((mid, 0, w, h)).resize((512, 512), Image.LANCZOS)

                left_img.save(left_path, "WEBP", quality=WEBP_QUALITY)
                right_img.save(right_path, "WEBP", quality=WEBP_QUALITY)

                left_kb = os.path.getsize(left_path) // 1024
                right_kb = os.path.getsize(right_path) // 1024
                print(f"  ✅ Split: {left_name}.webp ({left_kb}KB) + {right_name}.webp ({right_kb}KB)")
                return True
            elif part.text is not None:
                print(f"  ℹ  Model note: {part.text[:100]}")

        print(f"  ❌ No image returned for opposites-pairs/{pair_name}")
        return False

    except Exception as e:
        print(f"  ❌ Error generating opposites-pairs/{pair_name}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Generate images for Kids Learning App")
    parser.add_argument("--category", type=str, help="Generate only this category (e.g. animals, bodyparts, emotions, opposites, opposites-scenes)")
    parser.add_argument("--item", type=str, help="Generate only this item (requires --category)")
    parser.add_argument("--force", action="store_true", help="Overwrite existing images")
    parser.add_argument("--provider", choices=["gemini", "openai"], default="gemini", help="Image generation provider")
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
            if category == "opposites-pairs":
                ok = generate_opposite_pair(item_name, subject_desc, force=args.force)
            else:
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
