import React from "react";
import SlotReel from "./SlotReel";
import "./SlotMachine.css";

export default function SlotMachine({
  reels,
  isSpinning,
  isWinning,
  result,
  stoppedReels,
  stoppingReels,
  onReelStop,
}) {
  return (
    <div className="slot-machine">
      {/* MORE LED strips! */}
      <div className="led-strip-top">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="led" />
        ))}
      </div>

      <div className="led-strip-bottom">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="led" />
        ))}
      </div>

      <div className="led-strip left">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="led" />
        ))}
      </div>
      <div className="led-strip right">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="led" />
        ))}
      </div>

      <div className="reels-container">
        {/* Side dots */}
        <div className="side-dots left">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="dot" />
          ))}
        </div>

        <div className="reels-row">
          <SlotReel
            symbol={reels[0]}
            isSpinning={isSpinning && !stoppedReels[0] && !stoppingReels[0]}
            isStopping={stoppingReels[0]}
            isWinning={isWinning}
            reelIndex={0}
            onStop={onReelStop}
          />
          <SlotReel
            symbol={reels[1]}
            isSpinning={isSpinning && !stoppedReels[1] && !stoppingReels[1]}
            isStopping={stoppingReels[1]}
            isWinning={isWinning}
            reelIndex={1}
            onStop={onReelStop}
          />
          <SlotReel
            symbol={reels[2]}
            isSpinning={isSpinning && !stoppedReels[2] && !stoppingReels[2]}
            isStopping={stoppingReels[2]}
            isWinning={isWinning}
            reelIndex={2}
            onStop={onReelStop}
          />
        </div>

        {/* Side dots */}
        <div className="side-dots right">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="dot" />
          ))}
        </div>
      </div>
    </div>
  );
}
