#!/usr/bin/env python3
"""
Generate action/verb clips via the Kling API (api-singapore.klingai.com,
API 2.0, Bearer auth via KLINGAI_API_KEY) for comparison against Veo.

Clips are saved to public/concepts/actions/<verb>-kling-<model>.mp4 so they
sit alongside the Veo versions without clobbering them.

Usage:
    python scripts/generate_action_videos_kling.py --item eating --item catching \
        --model kling-2.6 kling-3.0

Pricing (API trial: 100 units): 720p no-audio per second —
kling-3.0 (Omni) 0.6 units, kling-3.0-turbo 0.8 (always with audio),
kling-2.6 0.3, kling-2.5-turbo 0.3 (5s/10s only).
A 6s 720p clip: kling-3.0 = 3.6 units (~$0.50), kling-2.6 = 1.8 (~$0.25).
"""

import os
import sys
import time
import argparse
import requests

from generate_action_videos import STYLE, VERBS, archive_to_genlab

API_BASE = "https://api-singapore.klingai.com"
API_KEY = os.environ.get("KLINGAI_API_KEY")

MODELS = ["kling-3.0", "kling-3.0-turbo", "kling-2.6", "kling-2.5-turbo"]

DURATION_SECONDS = 6  # kling-2.6 / 2.5-turbo only accept 5 or 10 — use --duration 5
RESOLUTION = "720p"
ASPECT_RATIO = "1:1"  # square, matches the app's tiles; 16:9 was used for the Veo trial comparison
MAX_CONCURRENCY = 5  # API trial allows 5 concurrent tasks

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "concepts", "actions")

HEADERS = {"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"}


def submit_task(item_name, subject_desc, model, duration=DURATION_SECONDS, aspect=ASPECT_RATIO):
    prompt = STYLE.format(subject=subject_desc)
    body = {
        "prompt": prompt,
        "settings": {
            "resolution": RESOLUTION,
            "duration": duration,
            "aspect_ratio": aspect,
        },
    }
    if model in ("kling-2.6",):
        body["settings"]["audio"] = "off"
    r = requests.post(f"{API_BASE}/text-to-video/{model}", json=body, headers=HEADERS, timeout=60)
    payload = r.json()
    if r.status_code != 200 or payload.get("code") != 0:
        print(f"  ❌ Submit failed for {item_name}/{model}: HTTP {r.status_code} {payload}")
        return None
    task_id = payload["data"]["id"]
    print(f"  🎬 Submitted {item_name} on {model} (task {task_id})")
    return {"task_id": task_id, "item": item_name, "model": model, "prompt": prompt}


def poll_tasks(tasks, timeout_s=900):
    pending = {t["task_id"]: t for t in tasks}
    deadline = time.time() + timeout_s
    results = []
    while pending and time.time() < deadline:
        time.sleep(15)
        ids = ",".join(pending)
        r = requests.get(f"{API_BASE}/tasks", params={"task_ids": ids}, headers=HEADERS, timeout=60)
        payload = r.json()
        if payload.get("code") != 0:
            print(f"  ⚠  Poll error: {payload}")
            continue
        for entry in payload.get("data", []):
            status = entry.get("status")
            task = pending.get(entry.get("id"))
            if not task:
                continue
            if status == "succeeded":
                videos = [o for o in entry.get("outputs", []) if o.get("type") == "video"]
                billing = entry.get("billing", [])
                results.append({**task, "url": videos[0]["url"], "billing": billing})
                del pending[task["task_id"]]
            elif status == "failed":
                print(f"  ❌ {task['item']}/{task['model']} failed: {entry.get('message')}")
                del pending[task["task_id"]]
    for t in pending.values():
        print(f"  ⏰ {t['item']}/{t['model']} timed out (task {t['task_id']})")
    return results


def download(result, suffix_model=False):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filename = f"{result['item']}-{result['model']}.mp4" if suffix_model else f"{result['item']}.mp4"
    output_path = os.path.join(OUTPUT_DIR, filename)
    r = requests.get(result["url"], timeout=120)
    r.raise_for_status()
    with open(output_path, "wb") as f:
        f.write(r.content)
    size_mb = len(r.content) / (1024 * 1024)
    units = ", ".join(f"{b.get('amount')} {b.get('charge_type')}" for b in result.get("billing", []))
    print(f"  ✅ Saved: {output_path} ({size_mb:.1f}MB, billed: {units or 'n/a'})")
    archive_to_genlab(output_path, result["prompt"], result["model"], result["item"],
                      notes=f"kling api trial, {RESOLUTION} {DURATION_SECONDS}s",
                      provider="kling")


def main():
    parser = argparse.ArgumentParser(description="Generate action videos via Kling API")
    parser.add_argument("--item", action="append", required=True, help="Verb to generate (repeatable)")
    parser.add_argument("--model", nargs="+", choices=MODELS, default=["kling-2.6"],
                        help="Kling model(s) to generate with")
    parser.add_argument("--duration", type=int, default=DURATION_SECONDS,
                        help="Clip length in seconds (kling-2.6/2.5-turbo: 5 or 10 only)")
    parser.add_argument("--aspect", default=ASPECT_RATIO, choices=["1:1", "16:9", "9:16"],
                        help="Output aspect ratio")
    parser.add_argument("--suffix-model", action="store_true",
                        help="Append -<model> to filenames (for comparisons); default is <verb>.mp4")
    parser.add_argument("--force", action="store_true", help="Overwrite existing clips")
    args = parser.parse_args()

    if not API_KEY:
        sys.exit("KLINGAI_API_KEY is not set")

    todo = []
    for item in args.item:
        for model in args.model:
            filename = f"{item}-{model}.mp4" if args.suffix_model else f"{item}.mp4"
            if not args.force and os.path.exists(os.path.join(OUTPUT_DIR, filename)):
                print(f"  ⏭  Skipping {filename} (already exists)")
                continue
            todo.append((item, model))

    submitted = downloaded = 0
    # Submit in waves so we never exceed the account's concurrency cap
    for i in range(0, len(todo), MAX_CONCURRENCY):
        chunk = todo[i:i + MAX_CONCURRENCY]
        tasks = []
        for item, model in chunk:
            t = submit_task(item, VERBS[item], model, duration=args.duration, aspect=args.aspect)
            if t:
                tasks.append(t)
        submitted += len(tasks)
        print(f"\n⏳ Polling {len(tasks)} task(s) (wave {i // MAX_CONCURRENCY + 1})...")
        results = poll_tasks(tasks)
        for res in results:
            download(res, suffix_model=args.suffix_model)
        downloaded += len(results)

    print(f"\n📊 {downloaded}/{len(todo)} clips downloaded")
    return 0 if downloaded == len(todo) else 1


if __name__ == "__main__":
    sys.exit(main())
