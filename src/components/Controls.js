import React from "react";
import "./Controls.css";

export default function Controls({
  bet,
  onBetChange,
  onSpin,
  spinning,
  maxBet,
  result,
}) {
  const decreaseBet = () => {
    const newBet = Math.max(0.001, bet - 0.001);
    onBetChange(newBet);
  };

  const increaseBet = () => {
    const newBet = Math.min(maxBet || 1, bet + 0.001);
    onBetChange(newBet);
  };

  const setMinBet = () => {
    onBetChange(0.001);
  };

  const setMaxBet = () => {
    onBetChange(maxBet || 1);
  };

  return (
    <div className="controls-wrapper">
      {/* Status bar - always visible */}
      <div className="status-bar">
        <div className="status-display">
          <div className="status-label">TOTAL BET / MAX WIN</div>
          <div className="status-value">
            {bet.toFixed(4)} / {(bet * 20).toFixed(4)} SOL
          </div>
        </div>

        <div
          className={`status-display ${
            result ? (result.win ? "win-display" : "lose-display") : ""
          }`}
        >
          <div className="status-label">
            {result ? (result.win ? "WIN" : "LOSE") : "WIN/LOSE"}
          </div>
          <div className="status-value">
            {result
              ? result.win
                ? `+${result.payout.toFixed(4)} SOL`
                : "0.00 SOL"
              : "0.00 SOL"}
          </div>
        </div>
      </div>

      <div className="controls">
        <button
          className="control-btn bet-minus"
          onClick={decreaseBet}
          disabled={spinning}
        >
          BET
          <br />−
        </button>

        <button
          className="control-btn bet-plus"
          onClick={increaseBet}
          disabled={spinning}
        >
          BET
          <br />+
        </button>

        <button
          className="control-btn min-btn"
          onClick={setMinBet}
          disabled={spinning}
        >
          MIN
        </button>

        <button
          className={`control-btn max-btn ${bet === maxBet ? "active" : ""}`}
          onClick={setMaxBet}
          disabled={spinning}
        >
          MAX
        </button>

        <button
          className="control-btn spin-btn"
          onClick={onSpin}
          disabled={spinning}
        >
          {spinning ? "..." : "SPIN"}
        </button>
      </div>
    </div>
  );
}
