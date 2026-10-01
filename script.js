/**
 * ============================================================================
 * BIRTHDAY SURPRISE CARD — VANILLA JAVASCRIPT
 * ============================================================================
 * Arsitektur State / Scene:
 *   OPENING -> GIFT -> LETTER -> MESSAGE -> CELEBRATION
 *
 * Fitur:
 * - State machine perpindahan scene tanpa reload halaman
 * - Efek partikel bintang & hati melayang (HTML5 Canvas)
 * - Efek ledakan Confetti & Sparkle (HTML5 Canvas)
 * - Animasi pembukaan kotak hadiah & amplop surat
 * - Efek mengetik (typing reveal) yang mendukung karakter Emoji dengan aman
 * - Kue ulang tahun interaktif (tiup & nyalakan lilin)
 * - Web Audio API Synthesizer (musik latar & efek suara tanpa file MP3 eksternal)
 * - Dukungan penuh prefers-reduced-motion & layar mobile/desktop
 * ============================================================================
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. KONFIGURASI & DATA UTAMA
     ========================================================================== */

  /** Daftar state scene sesuai alur pengalaman pengguna */
  const SCENES = {
    OPENING: 'OPENING',
    GIFT: 'GIFT',
    LETTER: 'LETTER',
    MESSAGE: 'MESSAGE',
    CELEBRATION: 'CELEBRATION',
  };

  /** Isi pesan surat ulang tahun (dipertahankan sesuai aslinya) */
  const LETTER_CONTENT = `Selamat ulang tahun yaa sayang kuh ea ❤️

Selalu sabar sama anak, selalu memberi contoh yang baik, serta doain mereka agar menjadi anak yang baik dan berbakti sama orang tua.

Dan pastinya berharap aja semoga mereka akan selalu lucu di mata kamu muehehehe 🤭

Gak tau mo nulis apa lagi, yang penting jangan capek belajar buat menjadi orangtua yang baik.

Semoga selalu diberi kesabaran, kesehatan, kebahagiaan, dan kekuatan buat menjalani semuanya.

Happy Birthday yaa sayang ❤️🎂`;

  /** Deteksi preferensi reduced motion dari sistem pengguna */
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  /* ==========================================================================
     2. WEB AUDIO SYNTHESIZER (TANPA FILE EKSTERNAL)
     ========================================================================== */

  const SoundEngine = {
    ctx: null,
    isMuted: false,
    isPlayingBgm: false,
    bgmTimer: null,
    noteIndex: 0,

    /** Inisialisasi AudioContext setelah interaksi pengguna pertama */
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },

    /** Membunyikan satu nada lembut seperti kotak musik (music box) */
    playTone(freq, duration = 0.35, type = 'sine', volume = 0.08, delay = 0) {
      if (this.isMuted || !this.ctx) return;

      try {
        const now = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration + 0.05);
      } catch (_err) {
        // Abaikan jika browser memblokir audio sementara
      }
    },

    /** Efek suara tombol ditekan */
    playClick() {
      this.init();
      this.playTone(587.33, 0.14, 'sine', 0.07, 0); // D5
      this.playTone(880.0, 0.2, 'triangle', 0.06, 0.05); // A5
    },

    /** Efek suara saat kotak hadiah bergoyang */
    playGiftShake() {
      this.init();
      const freqs = [330, 392, 349, 440, 392, 493.88];
      freqs.forEach((f, idx) => {
        this.playTone(f, 0.11, 'triangle', 0.06, idx * 0.11);
      });
    },

    /** Efek suara saat hadiah terbuka */
    playGiftOpen() {
      this.init();
      const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5 E5 G5 C6 E6
      chord.forEach((f, idx) => {
        this.playTone(f, 0.55, 'sine', 0.08, idx * 0.07);
      });
    },

    /** Efek suara saat amplop surat dibuka */
    playEnvelopeOpen() {
      this.init();
      const notes = [440, 554.37, 659.25, 880]; // A major warm
      notes.forEach((f, idx) => {
        this.playTone(f, 0.45, 'sine', 0.065, idx * 0.08);
      });
    },

    /** Efek suara ketikan halus */
    playTypeTick() {
      if (this.isMuted || !this.ctx) return;
      const pitch = 720 + Math.random() * 180;
      this.playTone(pitch, 0.045, 'sine', 0.022, 0);
    },

    /** Efek suara tiup lilin & terkabulnya doa */
    playCandleBlow() {
      this.init();
      const sparkleNotes = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5];
      sparkleNotes.forEach((f, idx) => {
        this.playTone(f, 0.6, 'triangle', 0.07, 0.15 + idx * 0.08);
      });
    },

    /** Efek suara fanfare perayaan */
    playCelebrationFanfare() {
      this.init();
      const notes = [
        { f: 523.25, d: 0.22, t: 0 },
        { f: 659.25, d: 0.22, t: 0.12 },
        { f: 783.99, d: 0.22, t: 0.24 },
        { f: 1046.5, d: 0.75, t: 0.38 },
      ];
      notes.forEach((n) => {
        this.playTone(n.f, n.d, 'triangle', 0.085, n.t);
      });
    },

    /** Melodi kotak musik lembut "Happy Birthday" di latar belakang */
    startBackgroundMusic() {
      this.init();
      if (this.isPlayingBgm) return;
      this.isPlayingBgm = true;

      // Melodi Happy Birthday (frekuensi Hz & durasi ketukan)
      const melody = [
        { f: 392.0, ms: 380 }, // G4
        { f: 392.0, ms: 260 }, // G4
        { f: 440.0, ms: 520 }, // A4
        { f: 392.0, ms: 520 }, // G4
        { f: 523.25, ms: 520 }, // C5
        { f: 493.88, ms: 950 }, // B4

        { f: 392.0, ms: 380 }, // G4
        { f: 392.0, ms: 260 }, // G4
        { f: 440.0, ms: 520 }, // A4
        { f: 392.0, ms: 520 }, // G4
        { f: 587.33, ms: 520 }, // D5
        { f: 523.25, ms: 950 }, // C5

        { f: 392.0, ms: 380 }, // G4
        { f: 392.0, ms: 260 }, // G4
        { f: 783.99, ms: 520 }, // G5
        { f: 659.25, ms: 520 }, // E5
        { f: 523.25, ms: 520 }, // C5
        { f: 493.88, ms: 520 }, // B4
        { f: 440.0, ms: 850 }, // A4

        { f: 698.46, ms: 380 }, // F5
        { f: 698.46, ms: 260 }, // F5
        { f: 659.25, ms: 520 }, // E5
        { f: 523.25, ms: 520 }, // C5
        { f: 587.33, ms: 520 }, // D5
        { f: 523.25, ms: 1400 }, // C5
      ];

      const playNextNote = () => {
        if (!this.isPlayingBgm) return;
        const note = melody[this.noteIndex];
        if (!this.isMuted) {
          this.playTone(note.f, (note.ms / 1000) * 1.15, 'sine', 0.042, 0);
        }
        this.noteIndex = (this.noteIndex + 1) % melody.length;
        const pauseMultiplier = this.noteIndex === 0 ? 1800 : note.ms;
        this.bgmTimer = window.setTimeout(playNextNote, pauseMultiplier);
      };

      playNextNote();
    },

    /** Toggle Mute / Unmute */
    toggleMute() {
      this.init();
      this.isMuted = !this.isMuted;
      if (!this.isMuted && !this.isPlayingBgm) {
        this.startBackgroundMusic();
      }
      return this.isMuted;
    },
  };

  /* ==========================================================================
     3. CANVAS PARTIKEL LATAR BELAKANG (BINTANG, GLOW, & HATI)
     ========================================================================== */

  const BackgroundCanvas = {
    canvas: null,
    ctx: null,
    particles: [],
    width: 0,
    height: 0,
    currentScene: SCENES.OPENING,

    init() {
      this.canvas = document.getElementById('bg-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      this.resize();
      window.addEventListener('resize', () => this.resize());

      const count = prefersReducedMotion ? 18 : window.innerWidth < 600 ? 38 : 65;
      for (let i = 0; i < count; i++) {
        this.particles.push(this.createParticle());
      }

      this.animate();
    },

    resize() {
      if (!this.canvas) return;
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    },

    createParticle() {
      const types = ['star', 'glow', 'heart'];
      const type =
        Math.random() < 0.22 ? 'heart' : types[Math.floor(Math.random() * 2)];
      return {
        x: Math.random() * (this.width || window.innerWidth),
        y: Math.random() * (this.height || window.innerHeight),
        size: type === 'heart' ? 8 + Math.random() * 8 : 1.4 + Math.random() * 2.8,
        speedY: -(0.18 + Math.random() * 0.45),
        speedX: (Math.random() - 0.5) * 0.3,
        alpha: 0.2 + Math.random() * 0.65,
        twinkleSpeed: 0.008 + Math.random() * 0.02,
        twinkleDir: Math.random() > 0.5 ? 1 : -1,
        type,
        color:
          Math.random() > 0.45
            ? 'rgba(255, 214, 138,'
            : 'rgba(255, 162, 196,',
      };
    },

    drawHeart(ctx, x, y, size, alpha) {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      const topCurveHeight = size * 0.3;
      ctx.moveTo(0, topCurveHeight);
      ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
      ctx.bezierCurveTo(
        -size / 2,
        (size + topCurveHeight) / 2,
        0,
        (size + topCurveHeight) / 1.4,
        0,
        size
      );
      ctx.bezierCurveTo(
        0,
        (size + topCurveHeight) / 1.4,
        size / 2,
        (size + topCurveHeight) / 2,
        size / 2,
        topCurveHeight
      );
      ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 115, 158, ${alpha * 0.65})`;
      ctx.fill();
      ctx.restore();
    },

    animate() {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.width, this.height);

      const speedMultiplier =
        this.currentScene === SCENES.CELEBRATION ? 1.6 : 1;

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];

        if (!prefersReducedMotion) {
          p.y += p.speedY * speedMultiplier;
          p.x += p.speedX;
          p.alpha += p.twinkleSpeed * p.twinkleDir;

          if (p.alpha >= 0.9) {
            p.alpha = 0.9;
            p.twinkleDir = -1;
          } else if (p.alpha <= 0.15) {
            p.alpha = 0.15;
            p.twinkleDir = 1;
          }

          if (p.y < -20) {
            p.y = this.height + 20;
            p.x = Math.random() * this.width;
          }
          if (p.x < -20) p.x = this.width + 20;
          if (p.x > this.width + 20) p.x = -20;
        }

        if (
          p.type === 'heart' &&
          (this.currentScene === SCENES.LETTER ||
            this.currentScene === SCENES.MESSAGE ||
            this.currentScene === SCENES.CELEBRATION)
        ) {
          this.drawHeart(this.ctx, p.x, p.y, p.size, p.alpha);
        } else {
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          this.ctx.fillStyle = `${p.color} ${p.alpha})`;
          this.ctx.shadowBlur = 8;
          this.ctx.shadowColor = 'rgba(255, 190, 215, 0.6)';
          this.ctx.fill();
          this.ctx.shadowBlur = 0;
        }
      }

      requestAnimationFrame(() => this.animate());
    },
  };

  /* ==========================================================================
     4. CONFETTI & SPARKLE ENGINE (CANVAS)
     ========================================================================== */

  const ConfettiEngine = {
    canvas: null,
    ctx: null,
    pieces: [],
    isRunning: false,

    colors: [
      '#FF5C8A',
      '#FFD166',
      '#FF9EBB',
      '#C896FF',
      '#7BDFF2',
      '#FFF8FB',
      '#F4A261',
    ],

    init() {
      this.canvas = document.getElementById('confetti-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
    },

    resize() {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    },

    /** Membuat partikel confetti baru */
    spawnBurst(options = {}) {
      if (!this.canvas) return;
      const count = prefersReducedMotion
        ? Math.min(15, options.count || 25)
        : options.count || 55;
      const originX =
        options.x !== undefined ? options.x : this.canvas.width / 2;
      const originY =
        options.y !== undefined ? options.y : this.canvas.height * 0.55;
      const spread = options.spread || Math.PI * 1.2;
      const baseSpeed = options.speed || 9;

      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
        const velocity = baseSpeed * (0.45 + Math.random() * 0.85);
        const shapePool = ['rect', 'circle', 'heart'];
        const shape = shapePool[Math.floor(Math.random() * shapePool.length)];

        this.pieces.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * velocity + (Math.random() - 0.5) * 2,
          vy: Math.sin(angle) * velocity - Math.random() * 2,
          gravity: 0.22 + Math.random() * 0.1,
          drag: 0.985,
          size: 6 + Math.random() * 6,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 11,
          color: this.colors[Math.floor(Math.random() * this.colors.length)],
          alpha: 1,
          decay: 0.006 + Math.random() * 0.007,
          shape,
        });
      }

      if (!this.isRunning) {
        this.isRunning = true;
        this.loop();
      }
    },

    /** Ledakan besar beruntun untuk Scene Perayaan */
    launchGrandFinale() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      this.spawnBurst({ x: w * 0.5, y: h * 0.55, count: 75, speed: 12 });

      if (!prefersReducedMotion) {
        window.setTimeout(() => {
          this.spawnBurst({ x: w * 0.22, y: h * 0.65, count: 50, speed: 11 });
          this.spawnBurst({ x: w * 0.78, y: h * 0.65, count: 50, speed: 11 });
        }, 350);

        window.setTimeout(() => {
          this.spawnBurst({ x: w * 0.5, y: h * 0.35, count: 65, speed: 10 });
        }, 800);
      }
    },

    loop() {
      if (!this.ctx || !this.canvas) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (let i = this.pieces.length - 1; i >= 0; i--) {
        const p = this.pieces[i];
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.y > this.canvas.height + 40) {
          this.pieces.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.globalAlpha = Math.max(0, p.alpha);
        this.ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          this.ctx.beginPath();
          this.ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (p.shape === 'heart') {
          const s = p.size * 0.85;
          this.ctx.beginPath();
          this.ctx.moveTo(0, s * 0.3);
          this.ctx.bezierCurveTo(0, 0, -s / 2, 0, -s / 2, s * 0.3);
          this.ctx.bezierCurveTo(-s / 2, s * 0.65, 0, s * 0.8, 0, s);
          this.ctx.bezierCurveTo(0, s * 0.8, s / 2, s * 0.65, s / 2, s * 0.3);
          this.ctx.bezierCurveTo(s / 2, 0, 0, 0, 0, s * 0.3);
          this.ctx.fill();
        } else {
          this.ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        }

        this.ctx.restore();
      }

      if (this.pieces.length > 0) {
        requestAnimationFrame(() => this.loop());
      } else {
        this.isRunning = false;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    },
  };

  /* ==========================================================================
     5. BALON & HATI MELAYANG INTERAKTIF (SCENE CELEBRATION)
     ========================================================================== */

  const FloatingCelebration = {
    container: null,
    spawnInterval: null,
    icons: ['🎈', '❤️', '🎈', '💖', '✨', '🎈', '🎉', '💗'],

    init() {
      this.container = document.getElementById('floating-elements-layer');
    },

    start() {
      if (!this.container || prefersReducedMotion) return;
      this.stop();

      // Munculkan beberapa balon & hati di awal
      for (let i = 0; i < 6; i++) {
        window.setTimeout(() => this.spawnOne(), i * 350);
      }

      this.spawnInterval = window.setInterval(() => {
        this.spawnOne();
      }, 1300);
    },

    stop() {
      if (this.spawnInterval) {
        clearInterval(this.spawnInterval);
        this.spawnInterval = null;
      }
      if (this.container) {
        this.container.innerHTML = '';
      }
    },

    spawnOne() {
      if (!this.container) return;
      const el = document.createElement('div');
      el.className = 'floating-balloon';
      el.textContent =
        this.icons[Math.floor(Math.random() * this.icons.length)];

      const leftPos = 6 + Math.random() * 88;
      const duration = 7 + Math.random() * 5;
      el.style.left = `${leftPos}%`;
      el.style.animationDuration = `${duration}s`;

      // Interaksi: klik balon untuk meletuskan confetti kecil!
      el.addEventListener('click', (e) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        SoundEngine.playClick();
        ConfettiEngine.spawnBurst({
          x: cx,
          y: cy,
          count: 24,
          speed: 7,
        });
        el.remove();
        e.stopPropagation();
      });

      this.container.appendChild(el);

      window.setTimeout(() => {
        if (el.parentNode) {
          el.remove();
        }
      }, duration * 1000);
    },
  };

  /* ==========================================================================
     6. PENGONTROL UTAMA APLIKASI & SCENE STATE MACHINE
     ========================================================================== */

  const BirthdayApp = {
    currentScene: SCENES.OPENING,
    isGiftOpening: false,
    isEnvelopeOpening: false,
    typingTimer: null,
    isTyping: false,
    isCandleBlown: false,

    init() {
      BackgroundCanvas.init();
      ConfettiEngine.init();
      FloatingCelebration.init();
      this.bindEvents();
      this.updateStepIndicator(SCENES.OPENING);
    },

    /** Menghubungkan seluruh interaksi tombol dan elemen */
    bindEvents() {
      // Tombol Audio Mute / Unmute
      const btnAudio = document.getElementById('btn-audio-toggle');
      if (btnAudio) {
        btnAudio.addEventListener('click', () => {
          const muted = SoundEngine.toggleMute();
          const icon = document.getElementById('audio-icon');
          const label = document.getElementById('audio-label');
          btnAudio.setAttribute('aria-pressed', String(!muted));
          if (icon) icon.textContent = muted ? '🔇' : '🔊';
          if (label) label.textContent = muted ? 'Suara: OFF' : 'Suara: ON';
        });
      }

      // SCENE 1: Tombol "Buka Surprise 🎁"
      const btnOpenSurprise = document.getElementById('btn-open-surprise');
      if (btnOpenSurprise) {
        btnOpenSurprise.addEventListener('click', (e) => {
          SoundEngine.playClick();
          SoundEngine.startBackgroundMusic();

          const rect = e.currentTarget.getBoundingClientRect();
          ConfettiEngine.spawnBurst({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            count: 38,
            speed: 8.5,
          });

          window.setTimeout(() => {
            this.transitionToScene(SCENES.GIFT);
          }, 320);
        });
      }

      // SCENE 2: Tombol "Buka Hadiahnya 🎁" atau klik langsung pada Kotak Hadiah
      const btnOpenGift = document.getElementById('btn-open-gift');
      const giftArea = document.getElementById('gift-interactive-area');

      const handleGiftOpen = () => this.openGiftSequence();
      if (btnOpenGift) {
        btnOpenGift.addEventListener('click', handleGiftOpen);
      }
      if (giftArea) {
        giftArea.addEventListener('click', handleGiftOpen);
        giftArea.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleGiftOpen();
          }
        });
      }

      // SCENE 3A: Tombol "Buka Surat 💌" atau klik pada Amplop
      const btnOpenLetter = document.getElementById('btn-open-letter');
      const envelopeArea = document.getElementById('envelope-interactive-area');

      const handleLetterOpen = () => this.openEnvelopeSequence();
      if (btnOpenLetter) {
        btnOpenLetter.addEventListener('click', handleLetterOpen);
      }
      if (envelopeArea) {
        envelopeArea.addEventListener('click', handleLetterOpen);
        envelopeArea.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleLetterOpen();
          }
        });
      }

      // SCENE 3B: Tombol Skip Typing
      const btnSkipTyping = document.getElementById('btn-skip-typing');
      if (btnSkipTyping) {
        btnSkipTyping.addEventListener('click', () => {
          SoundEngine.playClick();
          this.completeTypingImmediately();
        });
      }

      // SCENE 3B: Tombol "Ada satu lagi... 👀" menuju Perayaan
      const btnToCelebration = document.getElementById('btn-to-celebration');
      if (btnToCelebration) {
        btnToCelebration.addEventListener('click', () => {
          SoundEngine.playCelebrationFanfare();
          this.transitionToScene(SCENES.CELEBRATION);
        });
      }

      // SCENE 4: Interaksi Tiup Lilin pada Kue Ulang Tahun
      const btnBlowCandle = document.getElementById('btn-blow-candle');
      const interactiveCake = document.getElementById('interactive-cake');

      const handleCandleToggle = () => this.toggleBirthdayCandle();
      if (btnBlowCandle) {
        btnBlowCandle.addEventListener('click', handleCandleToggle);
      }
      if (interactiveCake) {
        interactiveCake.addEventListener('click', handleCandleToggle);
        interactiveCake.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCandleToggle();
          }
        });
      }

      // SCENE 4: Tombol Confetti Tambahan
      const btnMoreConfetti = document.getElementById('btn-more-confetti');
      if (btnMoreConfetti) {
        btnMoreConfetti.addEventListener('click', () => {
          SoundEngine.playCelebrationFanfare();
          ConfettiEngine.launchGrandFinale();
        });
      }

      // SCENE 4: Tombol Baca Surat Lagi
      const btnRereadLetter = document.getElementById('btn-reread-letter');
      if (btnRereadLetter) {
        btnRereadLetter.addEventListener('click', () => {
          SoundEngine.playClick();
          FloatingCelebration.stop();
          this.transitionToScene(SCENES.MESSAGE, true);
        });
      }

      // SCENE 4: Tombol Ulangi Surprise dari Awal
      const btnReplay = document.getElementById('btn-replay-surprise');
      if (btnReplay) {
        btnReplay.addEventListener('click', () => {
          SoundEngine.playClick();
          this.resetAndReplay();
        });
      }
    },

    /** Mengatur perpindahan antar scene dengan animasi transisi yang mulus */
    transitionToScene(targetScene, skipTypingOnReread = false) {
      const sceneMap = {
        [SCENES.OPENING]: document.getElementById('scene-opening'),
        [SCENES.GIFT]: document.getElementById('scene-gift'),
        [SCENES.LETTER]: document.getElementById('scene-letter'),
        [SCENES.MESSAGE]: document.getElementById('scene-letter'),
        [SCENES.CELEBRATION]: document.getElementById('scene-celebration'),
      };

      const currentEl = sceneMap[this.currentScene];
      const nextEl = sceneMap[targetScene];

      this.currentScene = targetScene;
      document.body.setAttribute('data-scene', targetScene);
      BackgroundCanvas.currentScene = targetScene;
      this.updateStepIndicator(targetScene);

      // Jika berpindah di dalam container #scene-letter (LETTER -> MESSAGE)
      if (currentEl === nextEl && targetScene === SCENES.MESSAGE) {
        const envelopeView = document.getElementById('envelope-view');
        const messageView = document.getElementById('message-view');
        if (envelopeView) envelopeView.hidden = true;
        if (messageView) messageView.hidden = false;
        this.startLetterTyping(skipTypingOnReread);
        return;
      }

      if (currentEl && currentEl !== nextEl) {
        currentEl.classList.remove('active');
        currentEl.classList.add('exiting');
      }

      const transitionDelay = prefersReducedMotion ? 50 : 380;

      window.setTimeout(() => {
        if (currentEl && currentEl !== nextEl) {
          currentEl.hidden = true;
          currentEl.classList.remove('exiting');
        }

        if (nextEl) {
          // Pastikan sub-view sesuai jika masuk ke LETTER atau MESSAGE
          if (targetScene === SCENES.LETTER) {
            const envelopeView = document.getElementById('envelope-view');
            const messageView = document.getElementById('message-view');
            if (envelopeView) envelopeView.hidden = false;
            if (messageView) messageView.hidden = true;
          } else if (targetScene === SCENES.MESSAGE) {
            const envelopeView = document.getElementById('envelope-view');
            const messageView = document.getElementById('message-view');
            if (envelopeView) envelopeView.hidden = true;
            if (messageView) messageView.hidden = false;
          }

          nextEl.hidden = false;
          // Paksa reflow agar transisi CSS berjalan
          void nextEl.offsetWidth;
          nextEl.classList.add('active');
        }

        if (targetScene === SCENES.MESSAGE) {
          this.startLetterTyping(skipTypingOnReread);
        } else if (targetScene === SCENES.CELEBRATION) {
          ConfettiEngine.launchGrandFinale();
          FloatingCelebration.start();
        }
      }, transitionDelay);
    },

    /** Memperbarui indikator tahapan di bagian atas layar */
    updateStepIndicator(scene) {
      const order = [
        SCENES.OPENING,
        SCENES.GIFT,
        SCENES.LETTER,
        SCENES.CELEBRATION,
      ];
      const normalizedScene = scene === SCENES.MESSAGE ? SCENES.LETTER : scene;
      const activeIdx = order.indexOf(normalizedScene);

      const dots = document.querySelectorAll('.step-dot');
      dots.forEach((dot, idx) => {
        dot.classList.remove('active', 'completed');
        if (idx === activeIdx) {
          dot.classList.add('active');
        } else if (idx < activeIdx) {
          dot.classList.add('completed');
        }
      });
    },

    /** Urutan Animasi Scene 2: Guncang Kotak Hadiah -> Buka Pita & Tutup -> Confetti */
    openGiftSequence() {
      if (this.isGiftOpening) return;
      this.isGiftOpening = true;

      const giftBox = document.getElementById('gift-box');
      const giftStage = document.getElementById('gift-interactive-area');
      const giftHint = document.getElementById('gift-hint-text');
      const btnOpenGift = document.getElementById('btn-open-gift');

      if (btnOpenGift) {
        btnOpenGift.disabled = true;
        btnOpenGift.querySelector('.btn-text').textContent =
          'Membuka Hadiah... ✨';
      }

      if (giftHint) {
        giftHint.textContent = 'Waduh gerak-gerak sendiri... 1... 2... 3! 🎉';
      }

      // Langkah 1: Shake kotak hadiah
      SoundEngine.playGiftShake();
      if (giftBox) {
        giftBox.classList.add('is-shaking');
      }

      const shakeDuration = prefersReducedMotion ? 150 : 720;

      // Langkah 2: Pita & Tutup Kotak Terbuka + Ledakan Confetti
      window.setTimeout(() => {
        SoundEngine.playGiftOpen();
        if (giftBox) giftBox.classList.remove('is-shaking');
        if (giftStage) giftStage.classList.add('is-opened');

        const rect = giftStage
          ? giftStage.getBoundingClientRect()
          : {
              left: window.innerWidth / 2,
              top: window.innerHeight / 2,
              width: 0,
              height: 0,
            };

        ConfettiEngine.spawnBurst({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height * 0.4,
          count: 65,
          speed: 11,
        });

        // Langkah 3: Pindah ke Scene Surat setelah animasi hadiah terbuka
        window.setTimeout(
          () => {
            this.transitionToScene(SCENES.LETTER);
          },
          prefersReducedMotion ? 300 : 1050
        );
      }, shakeDuration);
    },

    /** Urutan Animasi Scene 3: Buka Amplop -> Kertas Keluar -> Tampilkan Isi Surat */
    openEnvelopeSequence() {
      if (this.isEnvelopeOpening) return;
      this.isEnvelopeOpening = true;

      const envelope = document.getElementById('envelope');
      const btnOpenLetter = document.getElementById('btn-open-letter');

      if (btnOpenLetter) {
        btnOpenLetter.disabled = true;
        btnOpenLetter.querySelector('.btn-text').textContent =
          'Membuka Surat... 💌';
      }

      SoundEngine.playEnvelopeOpen();
      if (envelope) {
        envelope.classList.add('is-opening');
      }

      // Confetti ringan yang hangat saat amplop terbuka
      ConfettiEngine.spawnBurst({
        x: window.innerWidth / 2,
        y: window.innerHeight * 0.45,
        count: 32,
        speed: 7.5,
      });

      const openDelay = prefersReducedMotion ? 200 : 950;
      window.setTimeout(() => {
        this.transitionToScene(SCENES.MESSAGE);
      }, openDelay);
    },

    /** Efek Mengetik (Typing Effect) pada Kertas Surat */
    startLetterTyping(instant = false) {
      const typedContainer = document.getElementById('letter-typed-text');
      const cursorEl = document.getElementById('typing-cursor');
      const skipWrap = document.getElementById('skip-typing-wrap');
      const footerEl = document.getElementById('letter-footer');

      if (!typedContainer) return;

      if (this.typingTimer) {
        clearTimeout(this.typingTimer);
        this.typingTimer = null;
      }

      if (instant || prefersReducedMotion) {
        this.completeTypingImmediately();
        return;
      }

      this.isTyping = true;
      typedContainer.textContent = '';
      if (cursorEl) cursorEl.classList.remove('is-hidden');
      if (skipWrap) skipWrap.hidden = false;
      if (footerEl) footerEl.hidden = true;

      // Gunakan Array.from agar emoji multi-byte tidak terpotong di tengah karakter
      const chars = Array.from(LETTER_CONTENT);
      let index = 0;

      const typeNextChar = () => {
        if (!this.isTyping) return;

        if (index < chars.length) {
          const ch = chars[index];
          typedContainer.textContent += ch;
          index++;

          // Bunyikan klik halus setiap beberapa karakter huruf
          if (index % 4 === 0 && ch.trim() !== '') {
            SoundEngine.playTypeTick();
          }

          // Jeda alami: lebih lama sedikit setelah tanda titik atau baris baru
          let delay = 28;
          if (ch === '\n') {
            delay = 220;
          } else if (ch === '.' || ch === ',' || ch === '!') {
            delay = 140;
          }

          this.typingTimer = window.setTimeout(typeNextChar, delay);
        } else {
          this.finishTypingState();
        }
      };

      this.typingTimer = window.setTimeout(typeNextChar, 260);
    },

    /** Menyelesaikan seluruh teks surat secara instan (jika tombol skip ditekan) */
    completeTypingImmediately() {
      this.isTyping = false;
      if (this.typingTimer) {
        clearTimeout(this.typingTimer);
        this.typingTimer = null;
      }

      const typedContainer = document.getElementById('letter-typed-text');
      if (typedContainer) {
        typedContainer.textContent = LETTER_CONTENT;
      }
      this.finishTypingState();
    },

    /** Menampilkan tanda tangan dan tombol lanjut setelah surat selesai diketik */
    finishTypingState() {
      this.isTyping = false;
      const cursorEl = document.getElementById('typing-cursor');
      const skipWrap = document.getElementById('skip-typing-wrap');
      const footerEl = document.getElementById('letter-footer');

      if (cursorEl) cursorEl.classList.add('is-hidden');
      if (skipWrap) skipWrap.hidden = true;
      if (footerEl) {
        footerEl.hidden = false;
      }
    },

    /** Interaksi Meniup atau Menyalakan Kembali Lilin Ulang Tahun */
    toggleBirthdayCandle() {
      const flame = document.getElementById('candle-flame');
      const smoke = document.getElementById('candle-smoke');
      const wishText = document.getElementById('wish-status-text');
      const btnText = document.getElementById('btn-blow-candle-text');

      if (!this.isCandleBlown) {
        // Tiup lilin
        this.isCandleBlown = true;
        SoundEngine.playCandleBlow();

        if (flame) flame.classList.add('is-blown-out');
        if (smoke) {
          smoke.classList.remove('is-active');
          void smoke.offsetWidth;
          smoke.classList.add('is-active');
        }

        if (wishText) {
          wishText.textContent =
            'Yeay! Semoga semua doa & harapan baikmu terkabul yaa! Aamiin 🤲❤️✨';
          wishText.classList.add('wish-granted');
        }

        if (btnText) {
          btnText.textContent = 'Nyalakan Lilin Lagi 🔥';
        }

        ConfettiEngine.launchGrandFinale();
      } else {
        // Nyalakan kembali lilin
        this.isCandleBlown = false;
        SoundEngine.playClick();

        if (flame) flame.classList.remove('is-blown-out');
        if (smoke) smoke.classList.remove('is-active');

        if (wishText) {
          wishText.textContent =
            'Lilinnya nyala lagi! Boleh berdoa & tiup lagi kok 🕯️✨';
          wishText.classList.remove('wish-granted');
        }

        if (btnText) {
          btnText.textContent = 'Tiup Lilinnya 🕯️💨';
        }
      }
    },

    /** Mengulang seluruh kejutan dari Scene 1 tanpa me-reload halaman */
    resetAndReplay() {
      FloatingCelebration.stop();

      // Reset state kotak hadiah
      this.isGiftOpening = false;
      const giftBox = document.getElementById('gift-box');
      const giftStage = document.getElementById('gift-interactive-area');
      const giftHint = document.getElementById('gift-hint-text');
      const btnOpenGift = document.getElementById('btn-open-gift');

      if (giftBox) giftBox.classList.remove('is-shaking');
      if (giftStage) giftStage.classList.remove('is-opened');
      if (giftHint) {
        giftHint.textContent =
          'Kotaknya agak goyang-goyang tuh, coba kita buka sekarang!';
      }
      if (btnOpenGift) {
        btnOpenGift.disabled = false;
        btnOpenGift.querySelector('.btn-text').textContent = 'Buka Hadiahnya 🎁';
      }

      // Reset state amplop & surat
      this.isEnvelopeOpening = false;
      const envelope = document.getElementById('envelope');
      const btnOpenLetter = document.getElementById('btn-open-letter');
      if (envelope) envelope.classList.remove('is-opening');
      if (btnOpenLetter) {
        btnOpenLetter.disabled = false;
        btnOpenLetter.querySelector('.btn-text').textContent = 'Buka Surat 💌';
      }

      // Reset lilin kue
      if (this.isCandleBlown) {
        this.toggleBirthdayCandle();
      }

      this.transitionToScene(SCENES.OPENING);
    },
  };

  // Jalankan aplikasi setelah DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BirthdayApp.init());
  } else {
    BirthdayApp.init();
  }
})();
