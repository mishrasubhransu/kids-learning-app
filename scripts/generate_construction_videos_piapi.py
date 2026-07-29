#!/usr/bin/env python3
"""
Generate construction-vehicle clips via PiAPI (Kling), reusing the task
poll/download machinery from generate_action_videos_piapi.py.

Each clip shows the machine doing its one signature job (digger digs,
crane lifts, ...) so the vehicle is recognizable with the sound off —
clips play muted and looping in the app, like the actions lesson.

Clips land in public/concepts/construction/<slug>.mp4, normalized to
720x720 H.264 and archived to genlab by the shared download step.

Usage:
    python scripts/generate_construction_videos_piapi.py            # all vehicles
    python scripts/generate_construction_videos_piapi.py --item digger --force
    # Image-to-video from a reference frame (single item):
    python scripts/generate_construction_videos_piapi.py --item forklift \
        --image /path/to/frame.png --force
"""

import base64
import os
import sys
import argparse
import requests

from generate_action_videos_piapi import (
    API_BASE,
    API_KEY,
    HEADERS,
    DURATION_SECONDS,
    ASPECT_RATIO,
    poll_tasks,
    download,
)

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "concepts", "construction")

STYLE = (
    "A bright, cheerful, high-quality video of {subject}. "
    "Photorealistic, warm sunny lighting, simple uncluttered background, "
    "suitable for a toddler learning app. One single continuous motion that "
    "clearly shows what the machine does, the whole vehicle centered and "
    "fully visible. Fixed camera, no cuts, no text, no captions, no watermarks."
)

# Keys must match the concepts.js file slugs (they become <slug>.mp4).
VEHICLES = {
    "digger": "a bright yellow digger (excavator) at a sunny construction site, "
              "digging its bucket deep into the ground in front of it and "
              "scooping soil out of a clearly visible hole, then swinging its "
              "arm to the side and tipping the bucket over a dirt pile next to "
              "the hole, the soil pouring out on top of the pile",
    "crane": "a tall yellow tower crane at a sunny construction site, slowly "
             "lifting a large wooden crate high into the air on its hook and "
             "steel cable, clear blue sky behind",
    "bulldozer": "a big yellow bulldozer with metal tracks driving slowly "
                 "forward, its wide front blade pushing a mound of brown dirt "
                 "across the flat ground of a sunny construction site",
    "dump-truck": "a big orange dump truck at a sunny construction site, seen "
                  "from the side, hydraulic arms slowly raising the front of "
                  "the bed near the cab so the bed tilts backward, the load of "
                  "sand and gravel sliding out only through the open tailgate "
                  "at the very rear of the truck and falling onto the ground "
                  "behind the back wheels, the front and sides of the bed "
                  "staying completely sealed with nothing spilling from them",
    "concrete-mixer": "a concrete mixer truck at a sunny construction site, its "
                      "big striped drum turning round and round steadily, wet "
                      "grey concrete sliding down the chute at the back",
    "steam-roller": "a yellow steam roller (road roller) driving slowly forward, "
                    "its huge smooth metal drum flattening fresh dark asphalt on "
                    "a new road, sunny day",
    "forklift": "a big yellow forklift in a warehouse aisle beside tall storage "
                "racks stocked with cardboard boxes, smoothly raising a large "
                "wooden crate on its forks up to the height of an upper shelf",
    "wrecking-ball": "a heavy round steel wrecking ball on a crane chain, "
                     "swinging left away from the brick wall, then swinging "
                     "back to the right at full speed and smashing out a big "
                     "chunk of the building on impact",
}

# Extra guardrails passed as Kling's negative_prompt where a clip keeps
# doing something specific wrong.
NEGATIVES = {
    "dump-truck": "sand or gravel spilling from the front of the bed, material "
                  "falling near the cab, dirt leaking from the sides or "
                  "underneath the bed",
    "wrecking-ball": "the wall crumbling or falling before the ball touches it, "
                     "the ball disappearing",
}


def submit_task(item_name, prompt, version, mode, duration, aspect,
                image_b64=None, negative=None):
    """Like the actions-script submit, plus optional i2v reference frame
    (base64 data URI) and negative_prompt."""
    input_ = {
        "prompt": prompt,
        "duration": duration,
        "aspect_ratio": aspect,
        "mode": mode,
        "version": version,
        "cfg_scale": 0.5,
    }
    if image_b64:
        input_["image_url"] = image_b64
    if negative:
        input_["negative_prompt"] = negative
    body = {"model": "kling", "task_type": "video_generation", "input": input_}
    r = requests.post(f"{API_BASE}/task", json=body, headers=HEADERS, timeout=60)
    payload = r.json()
    if r.status_code != 200 or payload.get("code") != 200:
        print(f"  ❌ Submit failed for {item_name}: HTTP {r.status_code} {payload}")
        return None
    task_id = payload["data"]["task_id"]
    kind = "i2v" if image_b64 else "t2v"
    print(f"  🎬 Submitted {item_name} on kling {version} {mode} {kind} (task {task_id})")
    return {"task_id": task_id, "item": item_name, "model": f"kling-{version}-{mode}", "prompt": prompt}


def encode_image(path):
    ext = os.path.splitext(path)[1].lstrip(".").lower() or "png"
    mime = "jpeg" if ext in ("jpg", "jpeg") else ext
    with open(path, "rb") as f:
        return f"data:image/{mime};base64,{base64.b64encode(f.read()).decode()}"


def main():
    parser = argparse.ArgumentParser(description="Generate construction vehicle videos via PiAPI (Kling)")
    parser.add_argument("--item", action="append", help="Vehicle slug to generate (repeatable; default: all)")
    parser.add_argument("--version", default="2.6", help="Kling version, e.g. 2.6 or 3.0")
    parser.add_argument("--mode", default="std", choices=["std", "pro"], help="Kling quality tier")
    parser.add_argument("--duration", type=int, default=DURATION_SECONDS, choices=[5, 10],
                        help="Clip length in seconds")
    parser.add_argument("--image", help="Reference frame for image-to-video "
                        "(requires exactly one --item)")
    parser.add_argument("--force", action="store_true", help="Overwrite existing clips")
    args = parser.parse_args()

    if not API_KEY:
        sys.exit("PIAPI_API_KEY is not set")

    items = args.item or list(VEHICLES)
    unknown = [i for i in items if i not in VEHICLES]
    if unknown:
        sys.exit(f"No prompt in VEHICLES for: {', '.join(unknown)}")

    image_b64 = None
    if args.image:
        if len(items) != 1:
            sys.exit("--image requires exactly one --item")
        # PiAPI rejects large base64 payloads ("task input is too large"),
        # so hosted URLs are the reliable path; base64 kept for tiny images.
        image_b64 = args.image if args.image.startswith("http") else encode_image(args.image)

    tasks = []
    for item in items:
        if not args.force and os.path.exists(os.path.join(OUTPUT_DIR, f"{item}.mp4")):
            print(f"  ⏭  Skipping {item}.mp4 (already exists)")
            continue
        prompt = STYLE.format(subject=VEHICLES[item])
        t = submit_task(item, prompt, args.version, args.mode, args.duration,
                        ASPECT_RATIO, image_b64=image_b64, negative=NEGATIVES.get(item))
        if t:
            tasks.append(t)

    if not tasks:
        print("Nothing to do")
        return 0

    print(f"\n⏳ Polling {len(tasks)} task(s)...")
    results = poll_tasks(tasks)
    for res in results:
        download(res, args.duration, OUTPUT_DIR)

    print(f"\n📊 {len(results)}/{len(tasks)} clips done")
    return 0 if len(results) == len(tasks) else 1


if __name__ == "__main__":
    sys.exit(main())
