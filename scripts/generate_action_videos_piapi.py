#!/usr/bin/env python3
"""
Generate action/verb clips via PiAPI (api.piapi.ai), which fronts Kling and
other video models behind one unified task API. Replaces the old direct
Kling-API script (generate_action_videos_kling.py).

Auth: PIAPI_API_KEY env var, sent as the x-api-key header.
Flow: POST /api/v1/task {model: "kling", task_type: "video_generation"},
then poll GET /api/v1/task/<id> until status == "completed".

Clips land in public/concepts/actions/<verb>.mp4, normalized in place with
ffmpeg (720x720, H.264 CRF 25, audio stripped) so they are app-ready and
stay under ~1MB. Raw downloads are archived to genlab before normalizing.

Usage:
    python scripts/generate_action_videos_piapi.py --item digging
    python scripts/generate_action_videos_piapi.py --item spinning --version 3.0 --force
"""

import os
import subprocess
import sys
import time
import argparse
import requests

from generate_action_videos import STYLE, VERBS, archive_to_genlab

API_BASE = "https://api.piapi.ai/api/v1"
API_KEY = os.environ.get("PIAPI_API_KEY")

DURATION_SECONDS = 5  # Kling accepts 5 or 10
ASPECT_RATIO = "1:1"  # square, matches the app's tiles

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "..")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "concepts", "actions")

HEADERS = {"Content-Type": "application/json", "x-api-key": API_KEY}


def submit_task(item_name, subject_desc, version, mode, duration, aspect):
    prompt = STYLE.format(subject=subject_desc)
    body = {
        "model": "kling",
        "task_type": "video_generation",
        "input": {
            "prompt": prompt,
            "duration": duration,
            "aspect_ratio": aspect,
            "mode": mode,
            "version": version,
            "cfg_scale": 0.5,
        },
    }
    r = requests.post(f"{API_BASE}/task", json=body, headers=HEADERS, timeout=60)
    payload = r.json()
    if r.status_code != 200 or payload.get("code") != 200:
        print(f"  ❌ Submit failed for {item_name}: HTTP {r.status_code} {payload}")
        return None
    task_id = payload["data"]["task_id"]
    print(f"  🎬 Submitted {item_name} on kling {version} {mode} (task {task_id})")
    return {"task_id": task_id, "item": item_name, "model": f"kling-{version}-{mode}", "prompt": prompt}


def video_url_from_output(output):
    """PiAPI puts the video URL in different places depending on the Kling tier."""
    if not output:
        return None
    for key in ("video_url", "video"):
        if isinstance(output.get(key), str) and output[key]:
            return output[key]
    for work in output.get("works") or []:
        video = work.get("video") or {}
        url = video.get("resource_without_watermark") or video.get("resource")
        if url:
            return url
    return None


def poll_tasks(tasks, timeout_s=1800):
    pending = {t["task_id"]: t for t in tasks}
    deadline = time.time() + timeout_s
    results = []
    while pending and time.time() < deadline:
        time.sleep(15)
        for task_id, task in list(pending.items()):
            try:
                r = requests.get(f"{API_BASE}/task/{task_id}", headers=HEADERS, timeout=60)
                payload = r.json()
            except requests.RequestException as e:
                print(f"  ⚠  Poll error for {task['item']}: {e}")
                continue
            data = payload.get("data") or {}
            status = (data.get("status") or "").lower()
            if status == "completed":
                url = video_url_from_output(data.get("output"))
                if not url:
                    print(f"  ❌ {task['item']} completed but no video URL: {data.get('output')}")
                else:
                    usage = (data.get("meta") or {}).get("usage") or {}
                    results.append({**task, "url": url, "usage": usage})
                del pending[task_id]
            elif status == "failed":
                print(f"  ❌ {task['item']} failed: {data.get('error')}")
                del pending[task_id]
    for t in pending.values():
        print(f"  ⏰ {t['item']} timed out (task {t['task_id']})")
    return results


def normalize(path):
    """720x720 square, H.264 CRF 25, no audio — the app-ready format."""
    tmp = path + ".norm.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", path,
         "-vf", "scale=720:720", "-c:v", "libx264", "-crf", "25",
         "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
         "-an", tmp],
        check=True,
    )
    os.replace(tmp, path)


def download(result, duration):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, f"{result['item']}.mp4")
    r = requests.get(result["url"], timeout=120)
    r.raise_for_status()
    with open(output_path, "wb") as f:
        f.write(r.content)
    raw_mb = len(r.content) / (1024 * 1024)
    archive_to_genlab(output_path, result["prompt"], result["model"], result["item"],
                      notes=f"piapi, {duration}s {ASPECT_RATIO}",
                      provider="piapi")
    normalize(output_path)
    final_kb = os.path.getsize(output_path) / 1024
    usage = result.get("usage") or {}
    spent = f"{usage.get('consume')} {usage.get('type')}" if usage.get("consume") else "n/a"
    print(f"  ✅ Saved: {output_path} (raw {raw_mb:.1f}MB → {final_kb:.0f}KB, billed: {spent})")


def main():
    parser = argparse.ArgumentParser(description="Generate action videos via PiAPI (Kling)")
    parser.add_argument("--item", action="append", required=True, help="Verb to generate (repeatable)")
    parser.add_argument("--version", default="2.6", help="Kling version, e.g. 2.6 or 3.0")
    parser.add_argument("--mode", default="std", choices=["std", "pro"], help="Kling quality tier")
    parser.add_argument("--duration", type=int, default=DURATION_SECONDS, choices=[5, 10],
                        help="Clip length in seconds")
    parser.add_argument("--aspect", default=ASPECT_RATIO, choices=["1:1", "16:9", "9:16"],
                        help="Output aspect ratio")
    parser.add_argument("--force", action="store_true", help="Overwrite existing clips")
    args = parser.parse_args()

    if not API_KEY:
        sys.exit("PIAPI_API_KEY is not set")

    unknown = [i for i in args.item if i not in VERBS]
    if unknown:
        sys.exit(f"No prompt in VERBS for: {', '.join(unknown)} — add it to generate_action_videos.py first")

    tasks = []
    for item in args.item:
        if not args.force and os.path.exists(os.path.join(OUTPUT_DIR, f"{item}.mp4")):
            print(f"  ⏭  Skipping {item}.mp4 (already exists)")
            continue
        t = submit_task(item, VERBS[item], args.version, args.mode, args.duration, args.aspect)
        if t:
            tasks.append(t)

    if not tasks:
        print("Nothing to do")
        return 0

    print(f"\n⏳ Polling {len(tasks)} task(s)...")
    results = poll_tasks(tasks)
    for res in results:
        download(res, args.duration)

    print(f"\n📊 {len(results)}/{len(tasks)} clips done")
    return 0 if len(results) == len(tasks) else 1


if __name__ == "__main__":
    sys.exit(main())
