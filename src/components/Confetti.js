import React from "react";
import "./Confetti.css";

export default function Confetti({ show }) {
  if (!show) return null;

  return (
    <>
      {/* Animated background flash */}
      <div className="win-flash" />

      {/* Confetti explosion */}
      <div className="confetti-container">
        {[...Array(100)].map((_, i) => {
          const drift = (Math.random() - 0.5) * 200;
          return (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${(i * 7 + Math.random() * 15) % 100}%`,
                animationDelay: `${Math.random() * 0.8}s`,
                animationDuration: `${3 + Math.random() * 2.5}s`,
                "--drift": `${drift}px`,
                background: [
                  "#ffd700",
                  "#ff0000",
                  "#00ff00",
                  "#00ffff",
                  "#ff00ff",
                  "#ffffff",
                ][Math.floor(Math.random() * 6)],
              }}
            />
          );
        })}
      </div>

      {/* Animated stars */}
      <div className="stars-container">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${(i * 17 + Math.random() * 20) % 100}%`,
              top: `${(i * 23 + Math.random() * 25) % 100}%`,
              animationDelay: `${(i * 0.15) % 2}s`,
              fontSize: `${25 + Math.random() * 35}px`,
            }}
          >
            ⭐
          </div>
        ))}
      </div>

      {/* Bling sparkles */}
      <div className="sparkles-container">
        {[...Array(35)].map((_, i) => (
          <div
            key={i}
            className="sparkle"
            style={{
              left: `${(i * 11 + Math.random() * 18) % 100}%`,
              top: `${(i * 13 + Math.random() * 20) % 100}%`,
              animationDelay: `${(i * 0.2) % 2.5}s`,
            }}
          >
            ✨
          </div>
        ))}
      </div>

      {/* Big WIN text */}
      <div className="big-win-text">💰 JACKPOT! 💰</div>
    </>
  );
}
