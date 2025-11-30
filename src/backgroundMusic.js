// 8-bit casino background music - looping and subtle
let musicContext = null;
let musicInterval = null;
let isMusicPlaying = false;

// Extended 8-bit casino melody - longer with variations
const melodyPattern = [
  // PHRASE 1: Main theme
  { note: 523, duration: 0.2 }, // C
  { note: 659, duration: 0.2 }, // E
  { note: 784, duration: 0.2 }, // G
  { note: 659, duration: 0.2 }, // E
  { note: 523, duration: 0.2 }, // C
  { note: 659, duration: 0.2 }, // E
  { note: 784, duration: 0.4 }, // G

  { note: 587, duration: 0.2 }, // D
  { note: 698, duration: 0.2 }, // F
  { note: 880, duration: 0.2 }, // A
  { note: 698, duration: 0.2 }, // F
  { note: 587, duration: 0.2 }, // D
  { note: 698, duration: 0.2 }, // F
  { note: 880, duration: 0.4 }, // A

  // PHRASE 2: High variation
  { note: 1047, duration: 0.2 }, // High C
  { note: 784, duration: 0.2 }, // G
  { note: 1047, duration: 0.2 }, // High C
  { note: 784, duration: 0.2 }, // G
  { note: 880, duration: 0.2 }, // A
  { note: 659, duration: 0.2 }, // E
  { note: 784, duration: 0.4 }, // G

  { note: 988, duration: 0.2 }, // B
  { note: 880, duration: 0.2 }, // A
  { note: 784, duration: 0.2 }, // G
  { note: 659, duration: 0.2 }, // E
  { note: 784, duration: 0.2 }, // G
  { note: 659, duration: 0.2 }, // E
  { note: 523, duration: 0.4 }, // C

  // PHRASE 3: Bouncy pattern
  { note: 659, duration: 0.2 }, // E
  { note: 784, duration: 0.2 }, // G
  { note: 659, duration: 0.2 }, // E
  { note: 698, duration: 0.2 }, // F
  { note: 880, duration: 0.2 }, // A
  { note: 698, duration: 0.2 }, // F
  { note: 784, duration: 0.4 }, // G

  { note: 587, duration: 0.2 }, // D
  { note: 698, duration: 0.2 }, // F
  { note: 587, duration: 0.2 }, // D
  { note: 659, duration: 0.2 }, // E
  { note: 784, duration: 0.2 }, // G
  { note: 659, duration: 0.2 }, // E
  { note: 698, duration: 0.4 }, // F

  // PHRASE 4: Ascending energy
  { note: 523, duration: 0.2 }, // C
  { note: 587, duration: 0.2 }, // D
  { note: 659, duration: 0.2 }, // E
  { note: 698, duration: 0.2 }, // F
  { note: 784, duration: 0.2 }, // G
  { note: 880, duration: 0.2 }, // A
  { note: 988, duration: 0.2 }, // B
  { note: 1047, duration: 0.2 }, // High C

  // PHRASE 5: Repeat main theme (variation)
  { note: 523, duration: 0.2 }, // C
  { note: 659, duration: 0.2 }, // E
  { note: 784, duration: 0.2 }, // G
  { note: 659, duration: 0.2 }, // E
  { note: 523, duration: 0.2 }, // C
  { note: 659, duration: 0.2 }, // E
  { note: 784, duration: 0.4 }, // G

  { note: 587, duration: 0.2 }, // D
  { note: 698, duration: 0.2 }, // F
  { note: 880, duration: 0.2 }, // A
  { note: 698, duration: 0.2 }, // F
  { note: 587, duration: 0.2 }, // D
  { note: 698, duration: 0.2 }, // F
  { note: 880, duration: 0.4 }, // A

  // PHRASE 6: Sparkly arpeggios
  { note: 523, duration: 0.2 }, // C
  { note: 659, duration: 0.2 }, // E
  { note: 784, duration: 0.2 }, // G
  { note: 1047, duration: 0.2 }, // High C
  { note: 784, duration: 0.2 }, // G
  { note: 659, duration: 0.2 }, // E
  { note: 523, duration: 0.4 }, // C

  { note: 587, duration: 0.2 }, // D
  { note: 698, duration: 0.2 }, // F
  { note: 880, duration: 0.2 }, // A
  { note: 1175, duration: 0.2 }, // High D
  { note: 880, duration: 0.2 }, // A
  { note: 698, duration: 0.2 }, // F
  { note: 587, duration: 0.4 }, // D

  // PHRASE 7: Build to finish
  { note: 659, duration: 0.2 }, // E
  { note: 784, duration: 0.2 }, // G
  { note: 880, duration: 0.2 }, // A
  { note: 1047, duration: 0.2 }, // High C
  { note: 880, duration: 0.2 }, // A
  { note: 784, duration: 0.2 }, // G
  { note: 659, duration: 0.4 }, // E

  // PHRASE 8: Final resolution
  { note: 523, duration: 0.2 }, // C
  { note: 659, duration: 0.2 }, // E
  { note: 784, duration: 0.2 }, // G
  { note: 1047, duration: 0.4 }, // High C
  { note: 784, duration: 0.2 }, // G
  { note: 659, duration: 0.2 }, // E
  { note: 523, duration: 0.4 }, // C

  // PHRASE 9: Descending cascade
  { note: 1047, duration: 0.2 }, // High C
  { note: 988, duration: 0.2 }, // B
  { note: 880, duration: 0.2 }, // A
  { note: 784, duration: 0.2 }, // G
  { note: 698, duration: 0.2 }, // F
  { note: 659, duration: 0.2 }, // E
  { note: 587, duration: 0.2 }, // D
  { note: 523, duration: 0.4 }, // C

  // PHRASE 10: Playful jumps
  { note: 523, duration: 0.2 }, // C
  { note: 784, duration: 0.2 }, // G
  { note: 523, duration: 0.2 }, // C
  { note: 880, duration: 0.2 }, // A
  { note: 659, duration: 0.2 }, // E
  { note: 1047, duration: 0.2 }, // High C
  { note: 784, duration: 0.4 }, // G

  { note: 587, duration: 0.2 }, // D
  { note: 880, duration: 0.2 }, // A
  { note: 587, duration: 0.2 }, // D
  { note: 988, duration: 0.2 }, // B
  { note: 698, duration: 0.2 }, // F
  { note: 1175, duration: 0.2 }, // High D
  { note: 880, duration: 0.4 }, // A

  // PHRASE 11: Grand finale callback
  { note: 523, duration: 0.2 }, // C
  { note: 659, duration: 0.2 }, // E
  { note: 784, duration: 0.2 }, // G
  { note: 659, duration: 0.2 }, // E
  { note: 523, duration: 0.2 }, // C
  { note: 659, duration: 0.2 }, // E
  { note: 784, duration: 0.2 }, // G
  { note: 1047, duration: 0.6 }, // High C (long triumphant ending)
  { note: 0, duration: 0.2 }, // Brief pause before loop
];

let currentNoteIndex = 0;

const playNextNote = () => {
  if (!isMusicPlaying || !musicContext) return;

  const noteData = melodyPattern[currentNoteIndex];

  if (noteData.note > 0) {
    // Play the note
    const osc = musicContext.createOscillator();
    const gain = musicContext.createGain();

    osc.connect(gain);
    gain.connect(musicContext.destination);

    osc.type = "square"; // 8-bit sound
    osc.frequency.value = noteData.note;

    // Low volume - 0.8% so it's audible but subtle
    gain.gain.setValueAtTime(0.008, musicContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0005,
      musicContext.currentTime + noteData.duration
    );

    osc.start(musicContext.currentTime);
    osc.stop(musicContext.currentTime + noteData.duration);
  }

  // Move to next note
  currentNoteIndex = (currentNoteIndex + 1) % melodyPattern.length;

  // Schedule next note
  setTimeout(playNextNote, noteData.duration * 1000);
};

export const startBackgroundMusic = () => {
  if (isMusicPlaying) return;

  musicContext = new (window.AudioContext || window.webkitAudioContext)();
  isMusicPlaying = true;
  currentNoteIndex = 0;

  playNextNote();
};

export const stopBackgroundMusic = () => {
  isMusicPlaying = false;
  if (musicContext) {
    musicContext.close();
    musicContext = null;
  }
};

export const isMusicActive = () => isMusicPlaying;
