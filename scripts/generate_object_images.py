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
        "surgeon": "a surgeon in blue scrubs and surgical mask performing surgery in an operating theater with bright lights",
        "software-engineer": "a software engineer sitting at a desk with dual monitors displaying colorful code and data visualization plots",
        "scientist": "a scientist in a white lab coat carefully mixing colorful chemicals in test tubes and beakers in a laboratory",
        "mechanic": "an auto mechanic in overalls working on a car engine in a well-lit garage",
        "teacher": "a teacher standing at a whiteboard with diagrams, teaching an engaged class of students",
        "pilot": "an airline pilot in uniform sitting in an airplane cockpit surrounded by instruments and controls",
        "air-hostess": "a smiling flight attendant in uniform serving food trays to passengers inside an airplane cabin",
        "athlete": "an athlete in sportswear sprinting on a running track in a stadium",
        "chauffeur": "a professional chauffeur in a dark suit and cap driving a luxury sedan, viewed from inside the car",
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
