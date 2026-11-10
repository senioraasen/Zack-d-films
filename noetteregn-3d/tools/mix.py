#!/usr/bin/env python3
"""Put voice, music and sound effects under the silent render and scale to 1080x1920.

Usage (from the project folder):
  python3 tools/mix.py <silent.mp4> <out.mp4>
Needs audio/vo.wav and, if present, audio/sfx/{music,hail,bonk}.mp3.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = (root / "src" / "timeline.js").read_text()
DURATION = float(re.search(r"DURATION = ([0-9.]+)", src).group(1))
LINES = json.loads(re.search(r"LINES = (\[.*?\]);\nexport const CAPTIONS", src, re.S).group(1))


def word_start(n, word):
    for w in LINES[n - 1]["words"]:
        if re.sub(r"[^a-zæøå]", "", w["w"].lower()) == word:
            return w["start"]
    return LINES[n - 1]["start"]


# Cut times, the same as in src/shots.js.
C = [0, LINES[1]["start"] - 0.05, LINES[2]["start"] - 0.1, LINES[3]["start"] - 0.05, LINES[4]["start"] - 0.05,
     word_start(5, "og") - 0.03, LINES[5]["start"] - 0.05, LINES[6]["start"] - 0.05, word_start(7, "så") - 0.03,
     LINES[8]["start"] - 0.05, DURATION]
HITS = [  # (time, volume) for the "tok" sound
    (C[1] - 0.55, 1.0),                 # nut on the old man's head
    (C[3] + 1.0, 1.0),                  # nut on the car roof (slow motion)
    (C[7] + (C[8] - C[7]) * 0.3, 1.0),  # tyre crushes the nut
    (C[8] + 1.45, 0.8),                 # courier lands on the road
]
HAIL = [(0.3, C[2] - 0.2), (C[4], C[7])]  # stretches with nut hail ambience


def main(silent, out):
    sfx = root / "audio" / "sfx"
    inputs = ["-i", silent, "-i", str(root / "audio" / "vo.wav")]
    filt = ["[1:a]aresample=48000,volume=1.0[vo]"]
    mix = ["[vo]"]
    k = 2
    if (sfx / "music.mp3").exists():
        inputs += ["-i", str(sfx / "music.mp3")]
        filt.append(f"[{k}:a]aresample=48000,atrim=0:{DURATION},volume=0.16,afade=t=out:st={DURATION - 1.5}:d=1.5[mu]")
        mix.append("[mu]"); k += 1
    if (sfx / "hail.mp3").exists():
        for i, (a, b) in enumerate(HAIL):
            inputs += ["-stream_loop", "-1", "-i", str(sfx / "hail.mp3")]
            ms = int(a * 1000)
            filt.append(f"[{k}:a]aresample=48000,atrim=0:{b - a:.2f},afade=t=in:d=0.3,afade=t=out:st={b - a - 0.3:.2f}:d=0.3,"
                        f"volume=0.16,adelay={ms}|{ms}[h{i}]")
            mix.append(f"[h{i}]"); k += 1
    if (sfx / "bonk.mp3").exists():
        for i, (t, v) in enumerate(HITS):
            inputs += ["-i", str(sfx / "bonk.mp3")]
            ms = int(max(0, t - 0.05) * 1000)
            filt.append(f"[{k}:a]aresample=48000,volume={v},adelay={ms}|{ms}[b{i}]")
            mix.append(f"[b{i}]"); k += 1
    filt.append("".join(mix) + f"amix=inputs={len(mix)}:normalize=0:duration=longest,atrim=0:{DURATION},"
                "loudnorm=I=-14:TP=-1.5[a]")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filt),
                    "-map", "0:v", "-map", "[a]", "-vf", "scale=1080:1920:flags=lanczos",
                    "-c:v", "libx264", "-crf", "17", "-preset", "slow", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-shortest", out], check=True)
    print("wrote", out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
