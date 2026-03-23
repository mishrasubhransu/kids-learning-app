#!/usr/bin/env python3
"""
Generate photorealistic images for the Kids Learning App objects section.

Uses Google Gemini image generation with a consistent photorealistic style.
Images are saved to public/objects/<category>/<name>.png

Usage:
    # Generate all images
    python scripts/generate_object_images.py

    # Generate a specific category
    python scripts/generate_object_images.py --category animals

    # Generate a specific item
    python scripts/generate_object_images.py --category animals --item lion

    # Force regenerate (overwrite existing)
    python scripts/generate_object_images.py --force
"""

import os
import sys
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
}

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..")
OUTPUT_BASE = os.path.join(PROJECT_ROOT, "public", "objects")


WEBP_SIZE = 1024
WEBP_QUALITY = 80


def generate_image(category, item_name, subject_desc, force=False):
    """Generate and save a single image as compressed WebP. Returns True on success."""
    output_dir = os.path.join(OUTPUT_BASE, category)
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{item_name}.webp")

    if os.path.exists(output_path) and not force:
        print(f"  ⏭  Skipping {category}/{item_name} (already exists)")
        return True

    style = STYLE_PROMPTS.get(category, STYLE_PROMPTS["animals"])
    prompt = style.format(subject=subject_desc)

    print(f"  🎨 Generating {category}/{item_name}...")

    try:
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
                if image.size != (WEBP_SIZE, WEBP_SIZE):
                    image = image.resize((WEBP_SIZE, WEBP_SIZE), Image.LANCZOS)
                image.save(output_path, "WEBP", quality=WEBP_QUALITY)
                size_kb = os.path.getsize(output_path) // 1024
                print(f"  ✅ Saved: {output_path} ({WEBP_SIZE}x{WEBP_SIZE}, {size_kb}KB)")
                return True
            elif part.text is not None:
                print(f"  ℹ  Model note: {part.text[:100]}")

        print(f"  ❌ No image returned for {category}/{item_name}")
        return False

    except Exception as e:
        print(f"  ❌ Error generating {category}/{item_name}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Generate object images for Kids Learning App")
    parser.add_argument("--category", type=str, help="Generate only this category (e.g. animals, birds, food, transportation, profession)")
    parser.add_argument("--item", type=str, help="Generate only this item (requires --category)")
    parser.add_argument("--force", action="store_true", help="Overwrite existing images")
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

        for item_name, subject_desc in target_items.items():
            output_path = os.path.join(OUTPUT_BASE, category, f"{item_name}.webp")
            if os.path.exists(output_path) and not args.force:
                skipped += 1
                print(f"  ⏭  Skipping {category}/{item_name} (exists)")
                continue

            ok = generate_image(category, item_name, subject_desc, force=args.force)
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
