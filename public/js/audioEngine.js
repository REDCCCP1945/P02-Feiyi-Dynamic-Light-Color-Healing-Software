export default class AmbientAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.analyser = null;
    this.nodes = [];
    this.timers = [];
    this.volume = 0.5;
    this.breathFreq = 0.12;
    this.track = "guzheng";
    this.running = false;
    this.modTimer = null;
    this.startedAt = 0;
  }

  ensureContext() {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error("当前浏览器不支持Web Audio");
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.0001;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.82;
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    return this.ctx;
  }

  noiseBuffer(seconds) {
    const length = Math.floor(this.ctx.sampleRate * (seconds || 4));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = 0.97 * last + 0.03 * white;
      data[i] = last * 2.2;
    }
    return buffer;
  }

  pluck(freq, duration, gainValue, type) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || "triangle";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.995, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.05);
    this.nodes.push(osc, gain);
    if (this.nodes.length > 80) this.nodes.splice(0, 20);
  }

  startTrack() {
    if (this.track === "guzheng") {
      const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 392.0, 329.63];
      let index = 0;
      const play = () => {
        this.pluck(notes[index % notes.length], 2.6, 0.16, "triangle");
        this.pluck(notes[index % notes.length] * 2, 1.6, 0.035, "sine");
        index += 1;
      };
      play();
      this.timers.push(setInterval(play, 2400));
    } else if (this.track === "bianzhong") {
      const notes = [196.0, 220.0, 261.63, 293.66, 349.23, 392.0];
      let index = 0;
      const play = () => {
        this.pluck(notes[index % notes.length], 4.2, 0.14, "sine");
        this.pluck(notes[index % notes.length] * 2.01, 2.4, 0.045, "triangle");
        index += 1;
      };
      play();
      this.timers.push(setInterval(play, 3600));
    } else if (this.track === "chiba") {
      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuffer(5);
      source.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 680;
      filter.Q.value = 0.8;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.09;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      source.start();
      this.nodes.push(source, filter, gain);
      const drone = this.ctx.createOscillator();
      const droneGain = this.ctx.createGain();
      drone.type = "sine";
      drone.frequency.value = 146.83;
      droneGain.gain.value = 0.05;
      drone.connect(droneGain);
      droneGain.connect(this.master);
      drone.start();
      this.nodes.push(drone, droneGain);
    } else if (this.track === "rain") {
      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuffer(6);
      source.loop = true;
      const high = this.ctx.createBiquadFilter();
      high.type = "highpass";
      high.frequency.value = 420;
      const low = this.ctx.createBiquadFilter();
      low.type = "lowpass";
      low.frequency.value = 3600;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.13;
      source.connect(high);
      high.connect(low);
      low.connect(gain);
      gain.connect(this.master);
      source.start();
      this.nodes.push(source, high, low, gain);
    }
  }

  async start(track, breathFreq, volume) {
    this.stop();
    this.track = track || "guzheng";
    this.breathFreq = breathFreq || 0.12;
    this.volume = volume === undefined ? 0.5 : volume;
    this.ensureContext();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.startedAt = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.master.gain.exponentialRampToValueAtTime(Math.max(0.001, this.volume), this.ctx.currentTime + 1.2);
    this.startTrack();
    this.modTimer = setInterval(() => {
      if (!this.running && this.ctx) return;
      const elapsed = this.ctx.currentTime - this.startedAt;
      const factor = 0.86 + 0.14 * Math.sin(2 * Math.PI * this.breathFreq * elapsed);
      const target = Math.max(0.001, this.volume * factor);
      this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
    }, 120);
    this.running = true;
    return true;
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value)));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(Math.max(0.001, this.volume), this.ctx.currentTime, 0.1);
    }
  }

  setBreath(freq) {
    this.breathFreq = Number(freq) || 0.12;
  }

  getLevels(bands) {
    const count = bands || 18;
    if (!this.analyser) return new Array(count).fill(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    const levels = [];
    const span = Math.floor(data.length / count) || 1;
    for (let i = 0; i < count; i += 1) {
      let sum = 0;
      for (let j = 0; j < span; j += 1) sum += data[i * span + j] || 0;
      levels.push(Math.round(sum / span));
    }
    return levels;
  }

  stop() {
    this.timers.forEach(function (timer) { clearInterval(timer); });
    this.timers = [];
    if (this.modTimer) {
      clearInterval(this.modTimer);
      this.modTimer = null;
    }
    this.nodes.forEach(function (node) {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {
        void e;
      }
    });
    this.nodes = [];
    if (this.master && this.ctx) {
      try {
        this.master.gain.cancelScheduledValues(this.ctx.currentTime);
        this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
      } catch (e) {
        void e;
      }
    }
    this.running = false;
  }
}
