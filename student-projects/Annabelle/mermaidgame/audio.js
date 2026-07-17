class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.oceanDroneGain = null;
        this.windGain = null;
        this.machineryOsc = null;
        this.machineryGain = null;
        this.machineryLFO = null;
        this.danOsc = null;
        this.danGain = null;
        this.isInitialized = false;
        this.nextCreatureTime = 0;
    }

    init() {
        if (this.isInitialized) return;

        const AudioContextClass = (window.AudioContext || window.webkitAudioContext);
        this.ctx = new AudioContextClass();
        
        // Master Compressor to prevent clipping
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
        compressor.knee.setValueAtTime(30, this.ctx.currentTime);
        compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
        compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
        compressor.connect(this.ctx.destination);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.6;
        this.masterGain.connect(compressor);

        this.startAmbience();
        this.startMachineryLoop();
        this.isInitialized = true;
        this.resume();
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    createNoiseBuffer() {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    startAmbience() {
        if (!this.ctx || !this.masterGain) return;

        // 1. Deep Ocean Drone
        const noiseBuffer = this.createNoiseBuffer();
        if (!noiseBuffer) return;

        const deepSrc = this.ctx.createBufferSource();
        deepSrc.buffer = noiseBuffer;
        deepSrc.loop = true;

        const deepFilter = this.ctx.createBiquadFilter();
        deepFilter.type = 'lowpass';
        deepFilter.frequency.value = 180;

        this.oceanDroneGain = this.ctx.createGain();
        this.oceanDroneGain.gain.value = 0.8;

        deepSrc.connect(deepFilter);
        deepFilter.connect(this.oceanDroneGain);
        this.oceanDroneGain.connect(this.masterGain);
        deepSrc.start();

        // 2. Surface Wind/Waves
        const windSrc = this.ctx.createBufferSource();
        windSrc.buffer = noiseBuffer;
        windSrc.loop = true;

        const windFilter = this.ctx.createBiquadFilter();
        windFilter.type = 'highpass';
        windFilter.frequency.value = 600;
        
        const windCut = this.ctx.createBiquadFilter();
        windCut.type = 'lowpass';
        windCut.frequency.value = 2000;

        this.windGain = this.ctx.createGain();
        this.windGain.gain.value = 0;

        windSrc.connect(windFilter);
        windFilter.connect(windCut);
        windCut.connect(this.windGain);
        this.windGain.connect(this.masterGain);
        windSrc.start();
    }

    startMachineryLoop() {
        if (!this.ctx || !this.masterGain) return;

        this.machineryOsc = this.ctx.createOscillator();
        this.machineryOsc.type = 'sawtooth';
        this.machineryOsc.frequency.value = 55;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;

        this.machineryLFO = this.ctx.createOscillator();
        this.machineryLFO.type = 'sine';
        this.machineryLFO.frequency.value = 4;

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 100;

        this.machineryLFO.connect(lfoGain);
        lfoGain.connect(filter.frequency); 

        this.machineryGain = this.ctx.createGain();
        this.machineryGain.gain.value = 0;

        this.machineryOsc.connect(filter);
        filter.connect(this.machineryGain);
        this.machineryGain.connect(this.masterGain);
        
        this.machineryOsc.start();
        this.machineryLFO.start();
    }

    update(player, entities) {
        if (!this.ctx || !this.isInitialized) return;
        const now = this.ctx.currentTime;

        // 1. Surface/Depth Ambience Mix
        // Assuming SURFACE_Y is 0 or near top. 
        // In our game, y=0 is top.
        const depth = player.y;
        const windVol = Math.max(0, 1 - depth / 600);
        const droneVol = Math.min(0.8, Math.max(0.2, depth / 400));

        if (this.windGain) this.windGain.gain.setTargetAtTime(windVol * 0.4, now, 0.5);
        if (this.oceanDroneGain) this.oceanDroneGain.gain.setTargetAtTime(droneVol, now, 0.5);

        // 2. Proximity - Enemies
        let nearestEnemyDist = Infinity;

        entities.forEach(ent => {
            // Simple distance check
            const dist = Math.hypot(ent.x - player.x, ent.y - player.y);
            if (dist < nearestEnemyDist) nearestEnemyDist = dist;
        });

        const maxHearDist = 600;
        const enemyVol = Math.max(0, 1 - nearestEnemyDist / maxHearDist);

        if (this.machineryGain) {
            this.machineryGain.gain.setTargetAtTime(enemyVol * enemyVol * 0.4, now, 0.2);
        }

        // 3. Random Distant Creatures
        if (now > this.nextCreatureTime) {
            this.playCreatureCall();
            this.nextCreatureTime = now + 15 + Math.random() * 20;
        }
    }

    playCreatureCall() {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 2);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.5);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 3);

        panner.pan.value = Math.random() * 2 - 1;

        osc.connect(panner);
        panner.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 3.5);
    }

    playCollect() {
        if (!this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;
        [440, 554, 659, 880].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 1);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 1.1);
        });
    }

    playImpact() {
        if (!this.ctx || !this.masterGain) return;
        
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playBreach() {
        if (!this.ctx || !this.masterGain) return;
        const noise = this.createNoiseBuffer();
        if (!noise) return;

        const now = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = noise;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.linearRampToValueAtTime(1200, now + 0.25);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        src.start(now);
        src.stop(now + 0.4);
    }

    playSwim() {
        if (!this.ctx || !this.masterGain) return;
        const noise = this.createNoiseBuffer();
        if (!noise) return;
        
        const src = this.ctx.createBufferSource();
        src.buffer = noise;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, this.ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.3);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        src.start();
    }
}

const audioManager = new AudioManager();
