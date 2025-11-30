// Spin start and continuous spinning sounds
let spinningSound = null;

// CLASSIC CASINO SPIN START - quick and satisfying
export const playSpinStartSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Quick double-tap - like hitting the spin button
  const tap1 = audioContext.createOscillator();
  const tap1Gain = audioContext.createGain();
  tap1.connect(tap1Gain);
  tap1Gain.connect(audioContext.destination);
  tap1.frequency.value = 300;
  tap1.type = "square";
  tap1Gain.gain.setValueAtTime(0.18, audioContext.currentTime);
  tap1Gain.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 0.06
  );
  tap1.start(audioContext.currentTime);
  tap1.stop(audioContext.currentTime + 0.06);

  // Second tap slightly higher
  setTimeout(() => {
    const tap2 = audioContext.createOscillator();
    const tap2Gain = audioContext.createGain();
    tap2.connect(tap2Gain);
    tap2Gain.connect(audioContext.destination);
    tap2.frequency.value = 400;
    tap2.type = "square";
    tap2Gain.gain.setValueAtTime(0.15, audioContext.currentTime);
    tap2Gain.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.06
    );
    tap2.start(audioContext.currentTime);
    tap2.stop(audioContext.currentTime + 0.06);
  }, 50);
};

// CONTINUOUS SPINNING SOUND - tick tick tick
export const startContinuousSpinSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  const tickInterval = setInterval(() => {
    if (!spinningSound) {
      clearInterval(tickInterval);
      return;
    }

    const tickOsc = audioContext.createOscillator();
    const tickGain = audioContext.createGain();
    tickOsc.connect(tickGain);
    tickGain.connect(audioContext.destination);

    tickOsc.frequency.value = 400;
    tickOsc.type = "square";

    tickGain.gain.setValueAtTime(0.01, audioContext.currentTime); // 1% volume
    tickGain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.05
    );

    tickOsc.start(audioContext.currentTime);
    tickOsc.stop(audioContext.currentTime + 0.05);
  }, 100); // Tick every 100ms

  // Store reference to stop it later
  spinningSound = { interval: tickInterval, context: audioContext };
};

// FULL SPIN SOUND - start + continuous
export const playSpinSound = () => {
  playSpinStartSound();
  setTimeout(() => {
    startContinuousSpinSound();
  }, 200);
};

export const stopSpinSound = () => {
  if (spinningSound) {
    clearInterval(spinningSound.interval);
    spinningSound = null;
  }
};

// REEL STOP SOUND - this one is good!
export const playReelStopSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.frequency.value = 150;
  oscillator.type = "square";
  gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 0.1
  );
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
};
