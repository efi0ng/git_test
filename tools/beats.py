#!/usr/bin/env python3
"""Analyse a music track for toonkit: tempo, first-beat offset and per-frame
energy envelopes, written into a video's video.json + energy.json.

    python3 tools/beats.py videos/dale-30s/track.mp3 --start 42.0 --video videos/dale-30s

--start   where in the song the 30 s excerpt begins (seconds)
--video   video folder to update (sets bpm/offset/audioStart, writes energy.json)
--bpm     force a tempo instead of detecting it

Needs only numpy and ffmpeg.
"""
import argparse
import json
import os
import subprocess

import numpy as np

SR = 22050


def load(path, start, dur):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(start), '-t', str(dur), '-i', path,
           '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def stft_mag(x, n=2048, hop=512):
    win = np.hanning(n).astype(np.float32)
    frames = 1 + (len(x) - n) // hop
    idx = np.arange(n)[None, :] + hop * np.arange(frames)[:, None]
    return np.abs(np.fft.rfft(x[idx] * win, axis=1)), hop


def onset_envelope(mag, band=None):
    if band is not None:
        freqs = np.fft.rfftfreq((mag.shape[1] - 1) * 2, 1 / SR)
        mag = mag[:, (freqs >= band[0]) & (freqs < band[1])]
    logm = np.log1p(mag * 10)
    flux = np.maximum(0, np.diff(logm, axis=0)).sum(axis=1)
    flux = np.concatenate([[0], flux])
    flux -= np.convolve(flux, np.ones(16) / 16, mode='same')
    return np.maximum(flux, 0)


def tempo(env, fps, lo=75, hi=150):
    env = env - env.mean()
    ac = np.correlate(env, env, mode='full')[len(env) - 1:]
    ac = ac / (ac[0] + 1e-9)
    lags = np.arange(len(ac))
    bpms = 60 * fps / np.maximum(lags, 1)
    mask = (bpms >= lo) & (bpms <= hi) & (lags * 4 < len(ac))
    # Score each beat period by self-similarity at 1, 2 and 4 beats (a bar):
    # syncopated patterns like dembow's 3+3+2 otherwise fool a single-lag
    # peak into a 4/3 tempo. Mild prior toward ~100 bpm for half/double.
    pick = lambda m: ac[np.minimum(len(ac) - 1, np.round(lags * m).astype(int))]
    comb = pick(1) + 0.8 * pick(2) + 0.8 * pick(4)
    weight = np.exp(-0.5 * (np.log2(bpms / 100) / 0.8) ** 2)
    score = np.where(mask, comb * weight, -np.inf)
    lag = int(np.argmax(score))
    # Parabolic refinement.
    if 1 <= lag < len(ac) - 1:
        a, b, c = ac[lag - 1], ac[lag], ac[lag + 1]
        lag = lag + 0.5 * (a - c) / (a - 2 * b + c + 1e-9)
    return 60 * fps / lag


def phase(env, fps, bpm):
    period = 60 * fps / bpm
    best, best_off = -1, 0.0
    for off in np.linspace(0, period, 200, endpoint=False):
        pos = np.arange(off, len(env) - 1, period)
        s = env[np.round(pos).astype(int)].sum()
        if s > best:
            best, best_off = s, off
    return best_off / fps


def band_energy(mag, lo, hi):
    freqs = np.fft.rfftfreq((mag.shape[1] - 1) * 2, 1 / SR)
    m = (freqs >= lo) & (freqs < hi)
    e = np.sqrt((mag[:, m] ** 2).mean(axis=1))
    return e / (np.percentile(e, 98) + 1e-9)


def resample(sig, src_fps, dst_fps, n):
    t = np.arange(n) / dst_fps
    return np.interp(t, np.arange(len(sig)) / src_fps, sig)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('audio')
    ap.add_argument('--start', type=float, default=0.0)
    ap.add_argument('--duration', type=float, default=30.0)
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--bpm', type=float)
    ap.add_argument('--video')
    a = ap.parse_args()

    x = load(a.audio, a.start, a.duration)
    mag, hop = stft_mag(x)
    env_fps = SR / hop
    env = onset_envelope(mag)
    bpm = a.bpm or tempo(env, env_fps)
    # Kicks land on the beat in most Latin urban styles: align the grid to
    # low-band onsets. Flux peaks once the kick is well inside the analysis
    # window, so shift by ~0.83 window (calibrated on tools/dembow.py output).
    period = 60 / bpm
    off = (phase(onset_envelope(mag, (30, 160)), env_fps, bpm) + 0.83 * 2048 / SR) % period
    # Keep beat 0 at the excerpt start: choose --start on a downbeat.
    if off > period / 2:
        off -= period
    n = int(round(a.duration * a.fps))
    smooth = lambda s: np.convolve(s, np.ones(3) / 3, mode='same')
    energy = {
        'low': resample(smooth(band_energy(mag, 30, 160)), env_fps, a.fps, n),
        'mid': resample(smooth(band_energy(mag, 300, 3000)), env_fps, a.fps, n),
        'high': resample(smooth(band_energy(mag, 5000, 11000)), env_fps, a.fps, n),
        'rms': resample(smooth(band_energy(mag, 30, 11000)), env_fps, a.fps, n),
    }
    energy = {k: [round(float(min(1.5, v)), 3) for v in arr] for k, arr in energy.items()}
    print(f'bpm {bpm:.2f}  first beat at {off:.3f}s')

    if a.video:
        cfg_path = os.path.join(a.video, 'video.json')
        cfg = json.load(open(cfg_path))
        cfg.update({'bpm': round(bpm, 3), 'offset': round(off, 3), 'audioStart': a.start,
                    'audio': os.path.relpath(a.audio, a.video), 'energy': 'energy.json'})
        json.dump(cfg, open(cfg_path, 'w'), indent=2, ensure_ascii=False)
        json.dump(energy, open(os.path.join(a.video, 'energy.json'), 'w'))
        print('updated', cfg_path)


if __name__ == '__main__':
    main()
