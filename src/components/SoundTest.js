import "./SoundTest.css";
import { playSpinStartSound, startContinuousSpinSound } from "../spinSounds";

export default function SoundTest({
  onPlaySpin,
  onPlayWin,
  onPlayLose,
  onPlayJackpot,
  onPlayReelStop,
}) {
  return (
    <div className="sound-test">
      <div className="sound-test-title">🔊 Sound Test</div>
      <div className="sound-test-buttons">
        <div className="sound-group">
          <div className="sound-group-title">Spin Sounds</div>
          <button onClick={playSpinStartSound}>Start Sound (Bad)</button>
          <button onClick={startContinuousSpinSound}>Reel Spin</button>
          <button onClick={onPlayReelStop}>Reel Stop (Good!)</button>
        </div>
        <div className="sound-group">
          <div className="sound-group-title">Result Sounds</div>
          <button onClick={onPlayWin}>Win</button>
          <button onClick={onPlayLose}>Lose</button>
          <button onClick={onPlayJackpot}>Jackpot</button>
        </div>
      </div>
    </div>
  );
}
