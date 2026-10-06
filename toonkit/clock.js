// Clock: turns a frame number into musical time. Everything that should
// move with the music reads from the object returned by `at(frame)`.

export class Clock {
  constructor({ fps = 30, bpm = 100, offset = 0, duration = 30, beatsPerBar = 4, energy = null }) {
    this.fps = fps;
    this.bpm = bpm;
    this.offset = offset; // seconds into the video where beat 0 lands
    this.duration = duration;
    this.beatsPerBar = beatsPerBar;
    this.frames = Math.round(duration * fps);
    this.energy = energy; // optional per-frame loudness envelopes from tools/beats.py
  }

  beatAt(t) {
    return ((t - this.offset) * this.bpm) / 60;
  }

  timeOfBeat(b) {
    return this.offset + (b * 60) / this.bpm;
  }

  at(frame) {
    const t = frame / this.fps;
    const beat = this.beatAt(t);
    const bar = beat / this.beatsPerBar;
    const e = this.energy;
    const pick = (k) => (e && e[k] ? e[k][Math.min(e[k].length - 1, frame)] ?? 0 : null);
    return {
      frame,
      t,
      beat,
      bar,
      beatFrac: ((beat % 1) + 1) % 1,
      // 1 on the beat, decaying to 0 — great for punches and flashes.
      pulse: (decay = 6) => Math.exp(-(((beat % 1) + 1) % 1) * decay),
      // Same, on a subdivision (2 = eighths, 4 = sixteenths).
      pulseOn: (div, decay = 6) => Math.exp(-((((beat * div) % 1) + 1) % 1) * decay),
      // Dembow accent pattern (the reggaeton "boom-ch-boom-chick").
      dembow: (decay = 9) => {
        const cyc = ((beat % 2) + 2) % 2;
        let best = 1e9;
        for (const h of [0, 0.75, 1, 1.5]) {
          const d = cyc - h;
          if (d >= 0) best = Math.min(best, d);
        }
        return Math.exp(-best * decay);
      },
      low: pick('low'),
      mid: pick('mid'),
      high: pick('high'),
      rms: pick('rms'),
      clock: this,
    };
  }
}

// Scene list helper: scenes = [{ from, to, draw(state, local) }, ...] in
// bars. `local` = 0..1 progress through the scene plus bar/beat offsets.
export function runScenes(scenes, state, unit = 'bar') {
  const pos = unit === 'bar' ? state.bar : state.t;
  for (const s of scenes) {
    if (pos >= s.from && pos < s.to) {
      const u = (pos - s.from) / (s.to - s.from);
      const startBeat = unit === 'bar' ? s.from * state.clock.beatsPerBar : state.clock.beatAt(s.from);
      s.draw(state, { u, beat: state.beat - startBeat, bar: pos - s.from, scene: s });
    }
  }
}
