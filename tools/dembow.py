#!/usr/bin/env python3
"""Synthesize an original, royalty-free dembow (reggaeton) beat: kick, dembow
snare, hats, guira, cowbell, timbal fills, 808-style bass, chord stabs and a
brass hook. Used as the soundtrack for videos/dale-30s.

    python3 tools/dembow.py assets/music/dale-beat.wav --bpm 96 --bars 13
    ffmpeg -i assets/music/dale-beat.wav -af "lowpass=f=15000,alimiter=limit=0.89" -b:a 192k assets/music/dale-beat.mp3

Arrangement matches videos/dale-30s: filtered intro bar, drop on bar 1,
riser into bar 7, big finale, hit + tail at bar 11. Pure numpy.
"""
import argparse
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def env(n, attack=0.002, decay=0.2):
    t = np.arange(n) / SR
    a = np.minimum(1, t / max(attack, 1e-4))
    return a * np.exp(-t / decay)


def kick(dur=0.45):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env(n, 0.001, 0.16) * 1.0 + rng.normal(0, 1, n) * env(n, 0.0005, 0.004) * 0.3


def snare(dur=0.22):
    n = int(SR * dur)
    t = np.arange(n) / SR
    noise = rng.normal(0, 1, n)
    noise = noise - np.convolve(noise, np.ones(6) / 6, mode='same')  # crude high-pass
    tone = np.sin(2 * np.pi * 190 * t) * env(n, 0.001, 0.05)
    return (noise * env(n, 0.001, 0.07) * 0.55 + tone * 0.5)


def hat(dur=0.05, open_=False):
    n = int(SR * (0.22 if open_ else dur))
    noise = rng.normal(0, 1, n)
    noise = np.diff(np.diff(noise, prepend=0), prepend=0)  # bright
    return noise * env(n, 0.0005, 0.08 if open_ else 0.012) * 0.18


def guira(dur=0.07, accent=False):
    """Metal scraper: band-limited noise with a fast rasp."""
    n = int(SR * (0.12 if accent else dur))
    t = np.arange(n) / SR
    noise = np.diff(rng.normal(0, 1, n), prepend=0)
    rasp = 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 140 * t))
    return noise * rasp * env(n, 0.004, 0.05 if accent else 0.025) * (0.16 if accent else 0.09)


def cowbell(dur=0.18):
    n = int(SR * dur)
    t = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * 562 * t)) + np.sign(np.sin(2 * np.pi * 845 * t))
    s = np.convolve(s, np.ones(4) / 4, mode='same')
    return s * env(n, 0.001, 0.06) * 0.12


def brass(freq, dur):
    """Synth-brass stab: detuned saws with a filter 'blat' on the attack."""
    n = int(SR * dur)
    s = (saw(freq, n) + saw(freq * 1.004, n) + 0.5 * saw(freq * 2.002, n)) / 2.5
    t = np.arange(n) / SR
    k = 3 + int(9 * np.exp(-t[0] * 0))  # base smoothing width
    bright = np.convolve(s, np.ones(3) / 3, mode='same')
    dark = np.convolve(s, np.ones(k * 3) / (k * 3), mode='same')
    mixw = np.exp(-t * 18)
    s = bright * mixw + dark * (1 - mixw)
    a = np.minimum(1, t / 0.012) * np.where(t < dur * 0.75, 1.0, np.maximum(0, 1 - (t - dur * 0.75) / (dur * 0.25)))
    return s * a * 0.45


def timbal(freq, dur=0.25):
    n = int(SR * dur)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * t) + 0.4 * np.sin(2 * np.pi * freq * 2.7 * t)) * env(n, 0.001, 0.09) * 0.4


def saw(freq, n):
    t = np.arange(n) / SR
    return 2 * ((t * freq) % 1) - 1


def lowpass(x, alpha):
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += alpha * (x[i] - acc)
        y[i] = acc
    return y


def stab(freqs, dur=0.18):
    n = int(SR * dur)
    s = sum(saw(f, n) + saw(f * 1.006, n) for f in freqs) / (2 * len(freqs))
    s = np.convolve(s, np.ones(5) / 5, mode='same')
    return s * env(n, 0.003, 0.08) * 0.5


def bass(freq, dur):
    n = int(SR * dur)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.25 * np.tanh(3 * np.sin(2 * np.pi * freq * t))
    return s * env(n, 0.004, dur * 0.7) * 0.55


def place(buf, sound, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sound))
    buf[i:j] += sound[: j - i] * gain


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('--bpm', type=float, default=96)
    ap.add_argument('--bars', type=int, default=13)
    a = ap.parse_args()
    spb = 60 / a.bpm
    total = a.bars * 4 * spb + 2
    drums = np.zeros(int(SR * total))
    music = np.zeros_like(drums)

    # Am - F - C - G (as bass roots + stab triads).
    prog = [(110.0, [220.0, 261.63, 329.63]), (87.31, [174.61, 220.0, 261.63]),
            (130.81, [261.63, 329.63, 392.0]), (98.0, [196.0, 246.94, 293.66])]
    hook = [659.25, 587.33, 523.25, 587.33, 659.25, 783.99, 659.25, 523.25]

    K, S = kick(), snare()
    for bar in range(a.bars):
        intro = bar == 0
        ending = bar >= 11
        root, chord = prog[bar % 4]
        for beat in range(4):
            tb = (bar * 4 + beat) * spb
            gb = bar * 4 + beat
            if ending and gb > 44:
                continue
            if not intro:
                place(drums, K, tb, 1.0)
            # Dembow snare: the "a" of 1 and the "and" of 2 in each 2-beat cell.
            if beat % 2 == 0:
                place(drums, S, tb + 0.75 * spb, 0.9 if not intro else 0.5)
            else:
                place(drums, S, tb + 0.5 * spb, 0.9 if not intro else 0.5)
            for e in range(2):
                place(drums, hat(open_=(e == 1 and beat % 2 == 1)), tb + e * spb / 2, 1.0)
            if not intro:
                place(music, bass(root, spb * 0.9), tb, 1.0)
            # Stabs on the dembow accents.
            for off in ((0.75,) if beat % 2 == 0 else (0.5,)):
                place(music, stab(chord), tb + off * spb, 0.8 if not intro else 0.4)
        # Lead hook in the finale section (bars 7-10), 8ths.
        if 7 <= bar <= 10:
            for k in range(8):
                f = hook[k] if bar % 2 == 1 else hook[(k + 3) % 8]
                place(music, stab([f], 0.16) * 0.7, (bar * 4 + k * 0.5) * spb, 0.7)
        # Guira in 16ths (accent on the beat) + cowbell on the off-beats.
        if not intro:
            for k in range(16):
                gt = (bar * 4 + k * 0.25) * spb
                if ending and gt > 44 * spb:
                    break
                place(drums, guira(accent=(k % 4 == 0)), gt, 1.0)
            for k in range(4):
                if not (ending and bar * 4 + k >= 44):
                    place(drums, cowbell(), (bar * 4 + k + 0.5) * spb, 0.8 if bar >= 7 else 0.5)
        # Brass hook answers on bars 2-3, 4-5 and 8-10: "da-da DAA, da-DAA".
        if bar in (2, 4, 6, 8, 9, 10):
            riff = [(0.0, 0.2, 440.0), (0.5, 0.2, 440.0), (1.0, 0.45, 523.25), (2.5, 0.2, 493.88), (3.0, 0.55, 440.0)]
            if bar % 4 == 2 and bar != 2:
                riff = [(0.0, 0.2, 523.25), (0.5, 0.2, 587.33), (1.0, 0.45, 659.25), (2.5, 0.2, 587.33), (3.0, 0.55, 523.25)]
            for off, d, f in riff:
                place(music, brass(f, d * spb * 2), (bar * 4 + off) * spb, 0.9)
                place(music, brass(f / 2, d * spb * 2), (bar * 4 + off) * spb, 0.5)
        # Timbal fill at the end of every second bar.
        if bar % 2 == 1 and not ending:
            for k, f in enumerate([420, 380, 340, 300]):
                place(drums, timbal(f), (bar * 4 + 3 + k * 0.25) * spb, 0.9)

    # Riser into the finale (beats 24-28).
    rs, re_ = 24 * spb, 28 * spb
    n = int((re_ - rs) * SR)
    t = np.linspace(0, 1, n)
    riser = rng.normal(0, 1, n) * t ** 2 * 0.25
    riser = np.diff(riser, prepend=0) * 3
    place(drums, riser, rs, 1.0)
    # Final hit at beat 44 with a long tail.
    place(drums, kick(1.2), 44 * spb, 1.3)
    crash = rng.normal(0, 1, int(SR * 2.5)) * env(int(SR * 2.5), 0.001, 0.9) * 0.25
    place(drums, crash, 44 * spb, 1.0)
    place(music, stab(prog[0][1], 2.0) * 1.2, 44 * spb, 1.0)

    # Muffle the intro bar (filter sweep opens into the drop).
    ib = int(4 * spb * SR)
    music[:ib] = lowpass(music[:ib], 0.08)

    mix = drums * 0.9 + music * 0.7
    mix = np.tanh(mix * 1.3) * 0.6
    stereo = np.stack([mix, np.roll(mix, 9) * 0.98], axis=1)
    pcm = (np.clip(stereo, -1, 1) * 32767).astype(np.int16)
    with wave.open(a.out, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('wrote', a.out, f'{total:.1f}s')


if __name__ == '__main__':
    main()
