// EPIC JACKPOT SOUND - Vegas style celebration!
export const playJackpotSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // 1. ASCENDING ARPEGGIO - Rising victory melody
  const createAscendingArpeggio = () => {
    // Major scale ascending - sounds like winning!
    const victoryNotes = [523, 587, 659, 698, 784, 880, 988, 1047]; // C major scale
    victoryNotes.forEach((freq, i) => {
      const note = audioContext.createOscillator();
      const noteGain = audioContext.createGain();
      note.connect(noteGain);
      noteGain.connect(audioContext.destination);

      note.type = "triangle";
      note.frequency.value = freq;

      const startTime = audioContext.currentTime + i * 0.08;
      noteGain.gain.setValueAtTime(0.25, startTime);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      note.start(startTime);
      note.stop(startTime + 0.3);
    });
  };

  // 2. FANFARE TRUMPETS - Triumphant brass section
  const createFanfare = () => {
    const fanfareNotes = [523, 659, 784, 1047]; // C, E, G, C (major chord)
    fanfareNotes.forEach((freq, i) => {
      const trumpet = audioContext.createOscillator();
      const trumpetGain = audioContext.createGain();
      trumpet.connect(trumpetGain);
      trumpetGain.connect(audioContext.destination);

      trumpet.type = "square";
      trumpet.frequency.value = freq;

      const startTime = audioContext.currentTime + 0.3 + i * 0.15;
      trumpetGain.gain.setValueAtTime(0.2, startTime);
      trumpetGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

      trumpet.start(startTime);
      trumpet.stop(startTime + 0.8);
    });
  };

  // 3. RAPID BELLS - Cascading celebration bells
  const createBells = () => {
    for (let i = 0; i < 20; i++) {
      const bell = audioContext.createOscillator();
      const bellGain = audioContext.createGain();
      bell.connect(bellGain);
      bellGain.connect(audioContext.destination);

      bell.type = "sine";
      // Alternating high and low bells
      bell.frequency.value = i % 2 === 0 ? 1400 : 1050;

      const startTime = audioContext.currentTime + 0.5 + i * 0.08;
      bellGain.gain.setValueAtTime(0.25, startTime);
      bellGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

      bell.start(startTime);
      bell.stop(startTime + 0.1);
    }
  };

  // 4. COIN AVALANCHE - Metallic coins clanging and bouncing
  const createCoinAvalanche = () => {
    for (let i = 0; i < 25; i++) {
      // Each coin has multiple harmonics for metallic sound
      const frequencies = [1200, 1800, 2400]; // Metallic harmonics

      frequencies.forEach((baseFreq, harmonic) => {
        const coin = audioContext.createOscillator();
        const coinGain = audioContext.createGain();

        coin.connect(coinGain);
        coinGain.connect(audioContext.destination);

        coin.type = "sine";
        coin.frequency.value = baseFreq + Math.random() * 200;

        const startTime = audioContext.currentTime + 0.8 + i * 0.06;
        const volume = 0.08 / (harmonic + 1); // Quieter harmonics

        coinGain.gain.setValueAtTime(volume, startTime);
        coinGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

        coin.start(startTime);
        coin.stop(startTime + 0.15);
      });
    }
  };

  // 5. BASS BOOM - Deep satisfying thump
  const createBassBoom = () => {
    const bass = audioContext.createOscillator();
    const bassGain = audioContext.createGain();
    bass.connect(bassGain);
    bassGain.connect(audioContext.destination);

    bass.type = "sine";
    bass.frequency.setValueAtTime(80, audioContext.currentTime);
    bass.frequency.exponentialRampToValueAtTime(
      40,
      audioContext.currentTime + 0.3
    );

    bassGain.gain.setValueAtTime(0.4, audioContext.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.3
    );

    bass.start(audioContext.currentTime);
    bass.stop(audioContext.currentTime + 0.3);
  };

  // FIRE ALL SOUNDS!
  createBassBoom();
  createAscendingArpeggio();
  createFanfare();
  // createBells(); // TESTING - is this the tiptoeing sound?
  // createCoinAvalanche(); // COMMENTED OUT - sounds like tapping glass
};
