// Tiny WebAudio synth: no sound files, every blip is built from oscillators at run time.
// The alarm hum rises with the meter; a soft chime marks the Sunstone, a low thud the catch.
export function createAudio() {
  let context = null;
  let hum = null;
  let humGain = null;

  function ensure() {
    if (context) return true;
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return false;
      context = new Ctor();
      hum = context.createOscillator();
      hum.type = 'sawtooth';
      hum.frequency.value = 55;
      humGain = context.createGain();
      humGain.gain.value = 0;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 220;
      hum.connect(filter).connect(humGain).connect(context.destination);
      hum.start();
      return true;
    } catch {
      return false;
    }
  }

  function blip(frequency, seconds, type, volume, when = 0) {
    if (!ensure()) return;
    try {
      if (context.state === 'suspended') void context.resume();
      const start = context.currentTime + when;
      const osc = context.createOscillator();
      osc.type = type;
      osc.frequency.value = frequency;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
      osc.connect(gain).connect(context.destination);
      osc.start(start);
      osc.stop(start + seconds + 0.05);
    } catch {
      // Sound is garnish: a blocked context never stops the game.
    }
  }

  return {
    unlock() {
      ensure();
    },
    setAlarm(level) {
      if (!ensure() || !humGain) return;
      try {
        if (context.state === 'suspended') void context.resume();
        humGain.gain.setTargetAtTime(level > 5 ? 0.02 + (level / 100) * 0.05 : 0, context.currentTime, 0.2);
        hum.frequency.setTargetAtTime(55 + level * 0.9, context.currentTime, 0.2);
      } catch {
        // Ignore audio failures.
      }
    },
    loot() {
      blip(880, 0.25, 'sine', 0.18);
      blip(1318, 0.35, 'sine', 0.15, 0.09);
    },
    caught() {
      blip(110, 0.5, 'square', 0.16);
      blip(73, 0.7, 'square', 0.14, 0.12);
    },
    win() {
      blip(523, 0.2, 'triangle', 0.16);
      blip(659, 0.2, 'triangle', 0.16, 0.12);
      blip(784, 0.4, 'triangle', 0.18, 0.24);
    },
    dart() {
      blip(1200, 0.08, 'square', 0.08);
    },
    smoke() {
      blip(300, 0.3, 'sine', 0.1);
    },
  };
}
