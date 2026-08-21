#!/usr/bin/env python3
"""
Generate short action/verb video clips for the Kids Learning App using Veo.

Clips are saved to public/concepts/actions/<name>.mp4 (or <name>-<tier>.mp4
when comparing quality tiers). Convert to looping webm later once a tier is
chosen.

Usage:
    # Generate every verb on the default tier (fast)
    python scripts/generate_action_videos.py

    # Quality comparison: selected items on both fast and lite
    python scripts/generate_action_videos.py --item eating --tier fast lite --suffix-tier

    # Single item, single tier
    python scripts/generate_action_videos.py --item jumping --tier lite

Pricing (checked July 2026, 720p): standard $0.40/s, fast $0.15/s, lite $0.05/s.
A 6s clip: standard $2.40, fast $0.90, lite $0.30.
"""

import os
import sys
import argparse
import time
from google import genai
from google.genai import types

client = genai.Client(
    api_key=os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
)

TIER_MODELS = {
    "standard": "veo-3.1-generate-preview",
    "fast": "veo-3.1-fast-generate-preview",
    "lite": "veo-3.1-lite-generate-preview",
}

DURATION_SECONDS = 6
RESOLUTION = "720p"

# Kid-friendly, single clear action, clean background — the verb must be
# obvious with the sound off (clips play muted in the app).
STYLE = (
    "A bright, cheerful, high-quality video of {subject}. "
    "Photorealistic, warm natural lighting, simple uncluttered background, "
    "suitable for a toddler learning app. One single continuous action that "
    "clearly shows the verb, the subject centered and fully visible. "
    "Fixed camera, no cuts, no text, no captions, no watermarks."
)

VERBS = {
    "running": "a happy young child running across a sunny green park lawn, arms swinging",
    "jumping": "a joyful young child jumping up and down on a grassy lawn, both feet leaving the ground",
    "eating": "a happy young child sitting at a table eating a bowl of colorful fruit pieces with a spoon, taking clear bites",
    "sleeping": "a young child fast asleep in a cozy bed, eyes fully closed, completely relaxed neutral face with no smile, breathing slowly and gently, hugging a teddy bear",
    "clapping": "a smiling young child clapping hands enthusiastically, claps clearly visible",
    "waving": "a friendly young child waving hello with one raised hand, big smile",
    "crying": "a young child crying softly, a single realistic tear rolling down each cheek from the eyes, gently wiping the tears away with the back of a hand, gentle non-frightening mood",
    "laughing": "a young child laughing heartily with head tilted back, big joyful smile",
    "climbing": "a young child seen from behind, back to the camera, actively climbing up a playground climbing frame ladder, moving upward hand over hand and step by step",
    "hugging": "a mother and her toddler daughter giving each other a big warm hug, both with light Mediterranean white skin and brown hair, the mother kneeling to the toddler's height",
    "cycling": "a happy young child riding a small bicycle with training wheels along a park path, pedaling steadily",
    "boating": "a happy family rowing a small colorful rowboat on a calm lake, oars dipping into the water",
    "throwing": "a young child throwing a big red ball forward with both hands, the ball flying through the air",
    "catching": "a young boy seen from the side, a big colorful ball flying in from the left side of the frame, the boy watching it and catching it with both arms",
    "breaking": "a young boy gripping a dry brown stick with both hands, straining with visible effort as he bends it, until the stick snaps unevenly into two jagged pieces, breaking naturally with rough splintered ends",
    "squeezing": "a young child squeezing half a yellow lemon with one hand over a clear glass cup half full of water, drops of lemon juice falling into the water",
    "flying": "a white bird flying across a clear blue sky, wings flapping steadily, full body visible from the side",
    "swimming": "a happy young child swimming across a sunny outdoor pool, arms making clear swimming strokes with small splashes",
    "driving": "a smiling parent driving a car, seen from the side through the open window, both hands on the steering wheel turning it slightly, scenery moving past",
    "cleaning": "a young child happily pushing an upright vacuum cleaner back and forth across a living room rug, visibly cleaning",
    "pressing": "a young child's hand pressing a big round red button with one finger, the button clearly going down and lighting up when pressed",
    "digging": "a happy young child crouching in a sunny garden, digging a hole in brown soil with a small hand shovel, scooping dirt out of the hole and piling it beside it",
    "drinking": "a happy young child holding a clear cup of water with both hands, tilting it up and drinking, visibly swallowing with a satisfied smile",
    "brushing": "a young child brushing teeth in front of a bathroom mirror, the toothbrush moving clearly back and forth over the teeth, a little white toothpaste foam",
    "bathing": "a happy young child in a bubble bath, white foam covering up to the chest, gently splashing water and playing with a yellow rubber duck",
    "dancing": "a joyful young child dancing in a sunny living room, bouncing on both feet and swaying arms side to side rhythmically",
    "kicking": "a young child kicking a big colorful ball across a grassy lawn with one foot, the ball clearly rolling away after the kick",
    "crawling": "a happy baby crawling steadily across a soft living room rug, moving forward hand over hand on all fours",
    "swinging": "a young child gripping a thick rope hanging from a tall tree branch, swinging back and forth through the air like Tarzan, feet off the ground",
    "spinning": "a joyful young child spinning around in place with arms stretched out wide, twirling in a sunny garden, hair and clothes flaring out",
    "stacking": "a young child stacking colorful wooden blocks one on top of another on the floor, the tower clearly growing taller block by block",
    "pouring": "a young child carefully pouring water from a small plastic jug into a clear cup on a table, the water stream clearly visible",
    "cutting": "a young child cutting a sheet of bright colored paper with child-safe scissors, the paper clearly separating along the cut",
    "peeling": "a pair of adult hands peeling a raw potato with a vegetable peeler over a wooden kitchen table, peel strips coming off one by one",
    "kissing": "a mother with light Mediterranean white skin and brown hair kneeling to kiss her toddler on the cheek, the toddler giggling happily at the kiss",
    "reading": "a parent and a young child sitting together on a cozy sofa reading a big colorful picture book, the parent turning a page while the child points at the pictures",
    "hiding": "a young child running to a long window curtain and hiding behind it, the curtain swaying with small feet peeking out underneath",
    "walking": "a happy young child walking calmly along a sunny park path toward the camera, taking steady unhurried steps",
    "sharing": "two happy toddlers sitting side by side on a picnic blanket, one child warmly handing a cookie from their small plate to the other child, who takes it and smiles",
    # close-up hands-only framing — a full-body attempt came back as a
    # surprised baby with a fist at its mouth, no pinch anywhere; a loose
    # close-up read as wrist-holding, so the fold-of-skin is spelled out
    "pinching": "a young child's left forearm resting flat on a wooden table, the child's right hand reaching in and pinching the skin in the middle of the forearm, thumb and index finger clearly lifting a small fold of skin up like a tiny tent, holding it for a moment, then letting go, exactly two hands in frame",
    "crushing": "a pair of adult hands crushing a big white pill into powder with a small metal hammer on a wooden kitchen table, gentle taps clearly breaking the pill into small white pieces and powder",
    # side view with the box BEHIND the child — a face-the-box version read
    # as the box sliding forward on its own, dragging the child
    "pulling": "seen from the side, a young child gripping a rope over their shoulder with both hands, leaning far forward and taking slow effortful steps, dragging a big heavy brown cardboard box along the floor behind them, the rope pulled taut, the box sliding only a little with each strained step",
    "pushing": "a young child pushing a big brown cardboard box across a living room floor with both hands, leaning forward with effort, the box clearly sliding forward",
    # second squeezing variant — concepts.js lists both under `videos`
    "squeezing-toothpaste": "a young child's hands squeezing a soft colorful toothpaste tube over a toothbrush, a thick ribbon of toothpaste clearly coming out of the tube onto the brush bristles",
    # writing is NOT here — STYLE forbids on-screen text, so it runs with a
    # custom --prompt on the piapi script (words "cat bat mat" must be legible)
    # drawing/painting: start from PARTIAL artwork and add to it — a
    # finished-picture start state gets scribbled over and ruined
    "drawing": "a close-up top-down view of a child's hand holding a pencil over a mostly blank white sheet of paper on a wooden table, only the head and neck of a simple horse outline drawn so far, the hand steadily extending the single clean pencil line to add the horse's back, belly and legs, the outline growing neatly stroke by stroke, never scribbling over lines that are already drawn, exactly one hand in frame",
    "painting": "a close-up view of a child's hand holding a small paintbrush over white paper on a wooden table, a big flower outline with only two petals filled in with red paint so far, the brush filling the empty petals one by one with smooth strokes of bright red wet paint, staying inside the outlines, never painting over the petals that are already finished, a small palette of watercolors beside the paper, exactly one hand in frame",
}

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "concepts", "actions")

GENLAB_DIR = "/mnt/data/genlab"


def archive_to_genlab(output_path, prompt, model, item_name, notes=None, provider="gemini"):
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
            category="actions",
            item=item_name,
            status="accepted",
            notes=notes,
        )
    except Exception as e:
        print(f"  ⚠  genlab archive failed for actions/{item_name}: {e}")


def generate_video(item_name, subject_desc, tier, suffix_tier=False, force=False,
                   raw_prompt=None):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filename = f"{item_name}-{tier}.mp4" if suffix_tier else f"{item_name}.mp4"
    output_path = os.path.join(OUTPUT_DIR, filename)

    if os.path.exists(output_path) and not force:
        print(f"  ⏭  Skipping {filename} (already exists)")
        return True

    model = TIER_MODELS[tier]
    prompt = raw_prompt if raw_prompt else STYLE.format(subject=subject_desc)
    print(f"  🎬 Generating {filename} via {model}...")

    try:
        operation = client.models.generate_videos(
            model=model,
            prompt=prompt,
            config=types.GenerateVideosConfig(
                aspect_ratio="16:9",
                resolution=RESOLUTION,
                duration_seconds=DURATION_SECONDS,
                number_of_videos=1,
            ),
        )
        while not operation.done:
            time.sleep(15)
            operation = client.operations.get(operation)

        if operation.error:
            print(f"  ❌ {filename}: {operation.error}")
            return False

        video = operation.response.generated_videos[0].video
        client.files.download(file=video)
        video.save(output_path)
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"  ✅ Saved: {output_path} ({size_mb:.1f}MB)")
        archive_to_genlab(output_path, prompt, model, item_name, notes=f"tier={tier}")
        return True

    except Exception as e:
        print(f"  ❌ Error generating {filename}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Generate action videos via Veo")
    parser.add_argument("--item", action="append", help="Generate only this verb (repeatable)")
    parser.add_argument("--tier", nargs="+", choices=list(TIER_MODELS), default=["fast"],
                        help="Quality tier(s) to generate")
    parser.add_argument("--suffix-tier", action="store_true",
                        help="Append -<tier> to filenames (for quality comparisons)")
    parser.add_argument("--force", action="store_true", help="Overwrite existing videos")
    parser.add_argument("--prompt", help="Full prompt used verbatim (requires exactly one --item, "
                        "which then only names the output file); bypasses VERBS/STYLE")
    args = parser.parse_args()

    if args.prompt:
        if not args.item or len(args.item) != 1:
            sys.exit("--prompt requires exactly one --item (used as the output filename)")
        items = {args.item[0]: None}
    else:
        items = {name: VERBS[name] for name in (args.item or VERBS)}

    cost_per_sec = {"standard": 0.40, "fast": 0.15, "lite": 0.05}
    est = sum(cost_per_sec[t] for t in args.tier) * DURATION_SECONDS * len(items)
    print(f"\n🎬 Generating {len(items)} verbs x {len(args.tier)} tier(s) "
          f"({DURATION_SECONDS}s @ {RESOLUTION}) — estimated ${est:.2f}\n")

    success = failed = 0
    for item_name, subject_desc in items.items():
        for tier in args.tier:
            ok = generate_video(item_name, subject_desc, tier,
                                suffix_tier=args.suffix_tier, force=args.force,
                                raw_prompt=args.prompt)
            if ok:
                success += 1
            else:
                failed += 1

    print(f"\n📊 Results: {success} generated, {failed} failed\n")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
