#!/usr/bin/env python3
"""Setter sammen «Hva hadde skjedd om det regnet nøtter?» fra genererte klipp og lyd.

Bruk: python3 bygg_video.py <arbeidsmappe> <utfil.mp4>
Arbeidsmappen må inneholde clips/1..9.mp4 og audio/1..9.mp3, hail.mp3, bonk.mp3, music.mp3.
"""
import os
import subprocess
import sys

W, H, FPS = 720, 1280, 24
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

LINJER = {
    1: "Hva hadde skjedd om det plutselig regnet … nøtter?",
    2: "En hasselnøtt fra skyene treffer deg i femti kilometer i timen.",
    3: "Men maten skal fram, uansett vær.",
    4: "Bilene får bulker, og takrennene tettes på minutter.",
    5: "En plastpose hjelper i hvert fall ikke.",
    6: "Men ekornene har sitt livs beste dag.",
    7: "Knuste nøtter gjør veien glatt som såpe.",
    8: "Og for nøtteallergikere blir selve lufta farlig.",
    9: "Men hei – gratis snacks resten av året!",
}
HAGL_SCENER = {2, 3, 4, 5, 6, 7}  # scener med nøttehagl-lyd


def varighet(path):
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "csv=p=0", path])
    return float(out)


def bryt(tekst, maks=22):
    ord_, linjer, cur = tekst.split(), [], ""
    for o in ord_:
        if len(cur) + len(o) + 1 > maks and cur:
            linjer.append(cur)
            cur = o
        else:
            cur = f"{cur} {o}".strip()
    linjer.append(cur)
    return linjer


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def main(d, ut):
    tmp = os.path.join(d, "tmp")
    os.makedirs(tmp, exist_ok=True)
    segs = []
    for i in range(1, 10):
        klipp, tale = f"{d}/clips/{i}.mp4", f"{d}/audio/{i}.mp3"
        kv, tv = varighet(klipp), varighet(tale)
        dur = max(kv, tv + 0.45)
        fart = dur / kv
        # Teksting: store hvite bokstaver med svart kant, nederst i midten
        tekstfiler = []
        for n, l in enumerate(bryt(LINJER[i])):
            p = f"{tmp}/t{i}_{n}.txt"
            with open(p, "w") as f:
                f.write(l)
            tekstfiler.append(p)
        draws = [
            f"drawtext=fontfile={FONT}:textfile={p}:fontsize=46:fontcolor=white:"
            f"borderw=5:bordercolor=black:x=(w-tw)/2:y=h*0.70+{n * 60}"
            for n, p in enumerate(tekstfiler)
        ]
        vf = (f"setpts={fart:.4f}*PTS,scale={W}:{H}:force_original_aspect_ratio=increase,"
              f"crop={W}:{H},fps={FPS}," + ",".join(draws))
        # Lyd: fortellerstemme + valgfri hagl + 'tok' i scene 1
        inputs = ["-i", klipp, "-i", tale]
        mix = ["[1:a]adelay=150|150,volume=1.25[v]"]
        labels = ["[v]"]
        if i in HAGL_SCENER:
            inputs += ["-stream_loop", "-1", "-i", f"{d}/audio/hail.mp3"]
            mix.append("[2:a]volume=0.22[h]")
            labels.append("[h]")
        if i == 1:
            idx = inputs.count("-i")
            inputs += ["-i", f"{d}/audio/bonk.mp3"]
            mix.append(f"[{idx}:a]adelay=900|900,volume=0.9[b]")
            labels.append("[b]")
        mix.append(f"{''.join(labels)}amix=inputs={len(labels)}:duration=first:normalize=0,"
                   f"apad,atrim=0:{dur:.3f}[a]")
        seg = f"{tmp}/seg{i}.mp4"
        run(["ffmpeg", "-y", *inputs, "-filter_complex",
             f"[0:v]{vf}[vv];" + ";".join(mix),
             "-map", "[vv]", "-map", "[a]", "-t", f"{dur:.3f}",
             "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
             "-c:a", "aac", "-ar", "44100", "-ac", "2", seg])
        segs.append(seg)
        print(f"scene {i}: klipp {kv:.2f}s, tale {tv:.2f}s -> {dur:.2f}s")

    liste = f"{tmp}/liste.txt"
    with open(liste, "w") as f:
        f.writelines(f"file '{s}'\n" for s in segs)
    samlet = f"{tmp}/samlet.mp4"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", liste, "-c", "copy", samlet])
    total = varighet(samlet)
    # Bakgrunnsmusikk lavt under, tones ut på slutten
    run(["ffmpeg", "-y", "-i", samlet, "-i", f"{d}/audio/music.mp3", "-filter_complex",
         f"[1:a]volume=0.18,afade=t=out:st={total - 1.5:.2f}:d=1.5[m];"
         f"[0:a][m]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89[a]",
         "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
         "-movflags", "+faststart", ut])
    print(f"Ferdig: {ut} ({total:.1f}s)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
