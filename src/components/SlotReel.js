import { useEffect, useRef } from "react";
import "./SlotReel.css";

// Fixed strip of symbols that repeats
const SYMBOL_STRIP = ["🍒", "🍋", "🍊", "💎"];
const SYMBOL_HEIGHT = 180;

export default function SlotReel({
  symbol,
  isSpinning,
  isWinning,
  isStopping,
  reelIndex = 0,
  onStop,
}) {
  const stripRef = useRef(null);
  const animationRef = useRef(null);
  const positionRef = useRef(0);
  const velocityRef = useRef(0);
  const targetRef = useRef(null);

  useEffect(() => {
    if (!stripRef.current) return;

    // Initialize position
    if (positionRef.current === 0 && !isSpinning && !isStopping) {
      positionRef.current = reelIndex * SYMBOL_HEIGHT;
      stripRef.current.style.transform = `translateY(-${positionRef.current}px)`;
    }

    if (isSpinning || isStopping) {
      const animate = () => {
        const stripLength = SYMBOL_STRIP.length * SYMBOL_HEIGHT; // 720px

        if (isStopping && targetRef.current === null) {
          // Calculate target position when stopping starts
          const targetIndex = SYMBOL_STRIP.indexOf(symbol);
          if (targetIndex !== -1) {
            const currentPos = positionRef.current;
            const posInCycle = currentPos % stripLength;
            const targetPosInCycle = targetIndex * SYMBOL_HEIGHT;

            // Calculate offset to target
            let offset = targetPosInCycle - posInCycle;
            if (offset <= 0) {
              offset += stripLength;
            }

            // Add 2 more full rotations
            offset += stripLength * 2;

            targetRef.current = currentPos + offset;

            // console.log(
            //   `🎯 Reel ${reelIndex}: pos=${currentPos.toFixed(
            //     0
            //   )}px, target=${targetRef.current.toFixed(0)}px (${symbol})`
            // );
          }
        }

        if (isStopping && targetRef.current !== null) {
          // Smooth deceleration
          const distance = targetRef.current - positionRef.current;

          if (distance < 1) {
            // Snap to exact target
            positionRef.current = targetRef.current;
            velocityRef.current = 0;

            // Normalize position to loop
            const normalizedPos = positionRef.current % stripLength;
            stripRef.current.style.transform = `translateY(-${normalizedPos}px)`;

            // console.log(
            //   `✅ Reel ${reelIndex}: STOPPED at ${normalizedPos.toFixed(
            //     0
            //   )}px (${symbol})`
            // );

            // Call onStop callback immediately when reel lands
            if (onStop) {
              onStop(reelIndex);
            }

            if (animationRef.current) {
              cancelAnimationFrame(animationRef.current);
              animationRef.current = null;
            }
            return;
          }

          // Smoother ease-out with cubic easing
          const progress = distance / (stripLength * 2);
          velocityRef.current = Math.max(
            2,
            Math.min(35, distance * 0.1 * (1 + progress))
          );
        } else {
          // Constant spinning speed
          velocityRef.current = 35;
        }

        positionRef.current += velocityRef.current;

        // Loop position during spinning (not during stopping)
        let displayPos = positionRef.current;
        if (!isStopping && displayPos >= stripLength * 10) {
          positionRef.current = displayPos % stripLength;
          displayPos = positionRef.current;
        }

        stripRef.current.style.transform = `translateY(-${displayPos}px)`;

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } else {
      // Reset for next spin
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      velocityRef.current = 0;
      targetRef.current = null;
    }
  }, [isSpinning, isStopping, symbol, reelIndex]);

  // Create enough copies for smooth scrolling (50 copies = 9,000px)
  const displayStrip = [];
  for (let i = 0; i < 50; i++) {
    displayStrip.push(...SYMBOL_STRIP);
  }

  return (
    <div className={`reel ${isWinning ? "winning" : ""}`}>
      <div ref={stripRef} className="reel-strip">
        {displayStrip.map((s, i) => (
          <div key={i} className="symbol">
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}
