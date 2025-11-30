import React, { useMemo, useState, useCallback, useEffect } from "react";
import SlotMachine from "./components/SlotMachine";
import Confetti from "./components/Confetti";
import Controls from "./components/Controls";
import InvestorPanel from "./components/InvestorPanel";

import { playJackpotSound } from "./jackpotSound";
import { playSpinSound, stopSpinSound, playReelStopSound } from "./spinSounds";
import {
  startBackgroundMusic,
  stopBackgroundMusic,
  isMusicActive,
} from "./backgroundMusic";
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { serialize } from "borsh";
import "./App.css";

require("@solana/wallet-adapter-react-ui/styles.css");

const playWinSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Ascending 8-bit beeps
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C, E, G, C
  notes.forEach((freq, i) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = freq;
    osc.type = "square"; // 8-bit sound
    const startTime = audioContext.currentTime + i * 0.08;
    gain.gain.setValueAtTime(0.15, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
    osc.start(startTime);
    osc.stop(startTime + 0.1);
  });

  // Coin dropping sounds - harmonious notes
  const coinNotes = [1046.5, 1174.7, 1318.5, 1046.5, 1174.7, 1318.5]; // C, D, E repeating
  coinNotes.forEach((freq, i) => {
    const coinOsc = audioContext.createOscillator();
    const coinGain = audioContext.createGain();
    coinOsc.connect(coinGain);
    coinGain.connect(audioContext.destination);

    coinOsc.type = "sine";
    coinOsc.frequency.value = freq;

    const startTime = audioContext.currentTime + 0.25 + i * 0.12;
    coinGain.gain.setValueAtTime(0.1, startTime);
    coinGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

    coinOsc.start(startTime);
    coinOsc.stop(startTime + 0.15);
  });
};

const playLoseSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    100,
    audioContext.currentTime + 0.4
  );
  oscillator.type = "sawtooth";
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.005,
    audioContext.currentTime + 0.4
  );
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.4);
};

const PROGRAM_IDS = {
  devnet: "BKRecs26BZsPzijdvzL5dL1xEKYrWdR4fNj1mXwtaWDK",
  "mainnet-beta": "BKRecs26BZsPzijdvzL5dL1xEKYrWdR4fNj1mXwtaWDK", // TODO: Deploy to mainnet and update this
};
const BANKROLL_SEED = "bankroll";

// Map roll to slot symbols (updated for new payout table)
const getSymbolsFromRoll = (roll) => {
  console.log({roll});
  if (roll === 0) return ["💎", "💎", "💎"]; // 20x (0.5%)
  if (roll <= 2) return ["🍒", "🍒", "🍒"]; // 10x (1%)
  if (roll <= 8) return ["🍋", "🍋", "🍋"]; // 5x (3%)
  if (roll <= 18) return ["🍊", "🍊", "🍊"]; // 4x (5%)

  if (roll <= 38) {
    // 2x - 💎💎 + random other symbol (10%)
    const others = ["🍒", "🍋", "🍊"];
    return ["💎", "💎", others[roll % 3]];
  }

  if (roll <= 68) {
    // 1x - 🍒🍒 + random other symbol (15%)
    const others = ["🍋", "🍊", "💎"];
    return ["🍒", "🍒", others[roll % 3]];
  }

  // Near misses for excitement
  if (roll <= 90) {
    const others = ["💎", "🍒", "🍊"];
    return ["🍋", "🍋", others[roll % 3]]; 
  }

  if (roll <= 100) {
    const others = ["💎", "🍒", "🍋"];
    return ["🍊", "🍊", others[roll % 3]]; 
  }

  if (roll <= 110) {
    const others = ["🍊", "🍒", "🍋"];
    return [others[roll % 3], "💎", "💎"]; 
  }

  // Lose - all three must be different (65.5%)
  const symbols = ["🍒", "🍋", "🍊", "💎"];
  const first = symbols[roll % 4];
  const remaining = symbols.filter((s) => s !== first);
  const second = remaining[(roll + 1) % 3];
  const third = remaining.filter((s) => s !== second)[0];
  return [first, second, third];
};

const getMultiplierFromRoll = (roll) => {
  if (roll === 0) return 20;
  if (roll <= 2) return 10;
  if (roll <= 8) return 5;
  if (roll <= 18) return 4;
  if (roll <= 38) return 2;
  if (roll <= 68) return 1;
  return 0;
};

class SpinInstruction {
  constructor(fields) {
    this.instruction = 1; // Spin variant
    this.bet_lamports = fields.bet_lamports;
  }
}

const spinSchema = new Map([
  [
    SpinInstruction,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["bet_lamports", "u64"],
      ],
    },
  ],
]);

function SlotGame({ network, setNetwork }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [bet, setBet] = useState(0.001);
  
  const PROGRAM_ID = useMemo(() => new PublicKey(PROGRAM_IDS[network]), [network]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [reels, setReels] = useState(["🍒", "🍋", "🍊"]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [stoppedReels, setStoppedReels] = useState([false, false, false]);
  const [stoppingReels, setStoppingReels] = useState([false, false, false]);
  const [finalSymbols, setFinalSymbols] = useState(null);
  const [bankroll, setBankroll] = useState(null);
  const [maxBet, setMaxBet] = useState(null);
  const [musicEnabled, setMusicEnabled] = useState(false); // Start with music OFF
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false); // Track if user has spun once
  const [investorPanelOpen, setInvestorPanelOpen] = useState(false);

  const bankrollPDA = useMemo(() => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from(BANKROLL_SEED)],
      PROGRAM_ID
    );
    return pda;
  }, []);

  // Generate stars once, not on every render
  const backgroundStars = React.useMemo(() => {
    return [...Array(60)].map((_, i) => {
      const starTypes = ["✨", "⭐", "💫"];
      const star = starTypes[Math.floor(Math.random() * starTypes.length)];
      const size = 20 + Math.random() * 30;

      return {
        id: `bg-star-${i}`,
        star,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size,
        delay: Math.random() * 3,
        duration: 2 + Math.random() * 2,
      };
    });
  }, []);

  // Generate 300 dot stars
  const dotStars = React.useMemo(() => {
    return [...Array(300)].map((_, i) => ({
      id: `dot-${i}`,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1 + Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.5,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2,
    }));
  }, []);

  const fetchBankroll = useCallback(async () => {
    try {
      const balance = await connection.getBalance(bankrollPDA);
      setBankroll(balance / 1e9);
      
      // Max bet calculation must match the program:
      // Program uses: available_bankroll (balance - rent) / 67
      // Estimate rent as ~0.001 SOL for the bankroll account
      const rentExempt = 1500000; // ~0.0015 SOL (conservative estimate)
      const availableBalance = Math.max(0, balance - rentExempt);
      const maxBetLamports = Math.floor(availableBalance / 67);
      const newMaxBet = maxBetLamports / 1e9;
      setMaxBet(newMaxBet);

      // Auto-adjust current bet if it exceeds new max
      setBet((prevBet) => (prevBet > newMaxBet ? newMaxBet : prevBet));
    } catch (err) {
      console.error("Error fetching bankroll:", err);
    }
  }, [connection, bankrollPDA]);

  React.useEffect(() => {
    if (publicKey && !spinning) {
      fetchBankroll();
      const interval = setInterval(() => {
        // Only auto-refresh if not spinning
        if (!spinning) {
          fetchBankroll();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [publicKey, fetchBankroll, spinning]);

  // Auto-start music when component mounts
  React.useEffect(() => {
    if (musicEnabled && !isMusicActive()) {
      startBackgroundMusic();
    }
  }, [musicEnabled]);

  const handleSpin = async () => {
    if (!publicKey) return;

    // Auto-start music on first spin (only once)
    if (!hasPlayedOnce && !musicEnabled) {
      startBackgroundMusic();
      setMusicEnabled(true);
      setHasPlayedOnce(true);
    }

    // Validate bet before spinning (with small tolerance for floating point errors)
    if (maxBet && bet > maxBet + 0.0001) {
      alert(`Bet too high! Max bet is ${maxBet.toFixed(4)} SOL`);
      return;
    }

    setSpinning(true);
    setResult(null);

    try {
      const betLamports = Math.floor(bet * 1e9);

      const instruction = new SpinInstruction({ bet_lamports: betLamports });
      const data = serialize(spinSchema, instruction);

      const ix = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: bankrollPDA, isSigner: false, isWritable: true },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        programId: PROGRAM_ID,
        data: Buffer.from(data),
      });

      const transaction = new Transaction().add(ix);
      const signature = await sendTransaction(transaction, connection);

      await connection.confirmTransaction(signature, "confirmed");

      // NOW start the animation after transaction is confirmed
      playSpinSound();
      setIsSpinning(true);
      setStoppedReels([false, false, false]);
      setStoppingReels([false, false, false]);
      setFinalSymbols(null);

      const txDetails = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (txDetails?.meta?.logMessages) {
        const logs = txDetails.meta.logMessages.join("\n");
        const rollMatch = logs.match(/ROLL=(\d+)/);
        const winMatch = logs.match(/WIN=(\d+)/);
        const payoutMatch = logs.match(/PAYOUT=(\d+)/);

        if (rollMatch && winMatch && payoutMatch) {
          const roll = parseInt(rollMatch[1]);
          const win = parseInt(winMatch[1]) === 1;
          const payout = parseInt(payoutMatch[1]) / 1e9;
          const multiplier = getMultiplierFromRoll(roll);
          const symbols = getSymbolsFromRoll(roll);

          // Log backend response
          // console.log("🎰 Backend Response:", {
          //   roll,
          //   win,
          //   payout: `${payout} SOL`,
          //   multiplier: `${multiplier}x`,
          //   symbols,
          //   rawLogs: logs,
          // });

          setFinalSymbols(symbols);
          // Set final symbols immediately so they're ready
          setReels(symbols);

          // All reels spin together for 1 second, then stop one by one
          setTimeout(() => {
            // Start stopping first reel
            setStoppingReels([true, false, false]);

            // Wait for first reel to stop, then start second (variable time based on distance)
            setTimeout(() => {
              setStoppedReels([true, false, false]);
              setStoppingReels([false, false, false]);

              // Small delay before starting next reel
              setTimeout(() => {
                setStoppingReels([false, true, false]);

                // Wait for second reel to stop
                setTimeout(() => {
                  setStoppedReels([true, true, false]);
                  setStoppingReels([false, false, false]);

                  // Small delay before starting third reel
                  setTimeout(() => {
                    setStoppingReels([false, false, true]);

                    // Wait for third reel to stop
                    setTimeout(() => {
                      stopSpinSound(); // Stop the continuous spinning sound
                      setStoppedReels([true, true, true]);
                      setStoppingReels([false, false, false]);
                      setIsSpinning(false);

                      setResult({
                        roll,
                        win,
                        payout,
                        multiplier,
                      });

                      // Play win/lose sound IMMEDIATELY when last reel stops
                      if (win) {
                        playWinSound();
                        if (multiplier >= 10) {
                          playJackpotSound(); // DING DING DING!
                          setShowConfetti(true);
                          setTimeout(() => setShowConfetti(false), 3000);
                        }
                        // Re-enable after win sound (0.4s)
                        setTimeout(() => {
                          setSpinning(false);
                          // Update bankroll after win sound finishes
                          fetchBankroll();
                        }, 400);
                      } else {
                        playLoseSound();
                        // Re-enable after lose sound (0.4s)
                        setTimeout(() => {
                          setSpinning(false);
                          // Update bankroll after lose sound finishes
                          fetchBankroll();
                        }, 400);
                      }
                    }, 1500); // Third reel stop time
                  }, 300);
                }, 1500); // Second reel stop time
              }, 300);
            }, 1500); // First reel stop time
          }, 1000); // Initial spin time
        }
      }
    } catch (err) {
      setIsSpinning(false);
      setSpinning(false);
      setStoppedReels([false, false, false]);
      setStoppingReels([false, false, false]);

      console.error("Spin error:", err);
      console.error("Full error:", JSON.stringify(err, null, 2));

      let errorMsg = "Spin failed: ";
      if (err.message) {
        errorMsg += err.message;
      }
      if (err.logs) {
        console.error("Transaction logs:", err.logs);
        errorMsg += "\nCheck console for details";
      }

      alert(errorMsg);
    }
  };

  if (!publicKey) {
    return (
      <div className="container">
        <h1>🎰 Solana Slot Machine</h1>
        <p>Connect your wallet to play</p>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <>
      {/* Shimmer overlay */}
      <div className="shimmer-overlay" />

      {/* Dot stars - 300 of them! */}
      <div className="dot-stars">
        {dotStars.map((dot) => (
          <div
            key={dot.id}
            className="dot-star"
            style={{
              left: `${dot.left}%`,
              top: `${dot.top}%`,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              opacity: dot.opacity,
              animationDelay: `${dot.delay}s`,
              animationDuration: `${dot.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Background stars - truly random */}
      <div className="background-stars">
        {backgroundStars.map((s) => (
          <div
            key={s.id}
            className="background-star"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              fontSize: `${s.size}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          >
            {s.star}
          </div>
        ))}
      </div>

      {/* Floating elements in background */}
      <div className="floating-coins">
        {[...Array(15)].map((_, i) => {
          // Use sine/cosine for better distribution
          const angle = (i * 137.5) % 360; // Golden angle
          const radius = 30 + ((i * 23) % 40);
          const left = 50 + radius * Math.cos((angle * Math.PI) / 180);
          const top = 50 + radius * Math.sin((angle * Math.PI) / 180);

          return (
            <div
              key={`coin-${i}`}
              className="coin"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                animationDelay: `${i * 0.9}s`,
                animationDuration: `${15 + ((i * 1.3) % 8)}s`,
              }}
            >
              💰
            </div>
          );
        })}
        {[...Array(15)].map((_, i) => {
          // Different pattern for stars
          const angle = (i * 222.5) % 360; // Different golden-ish angle
          const radius = 25 + ((i * 31) % 45);
          const left = 50 + radius * Math.cos((angle * Math.PI) / 180);
          const top = 50 + radius * Math.sin((angle * Math.PI) / 180);

          return (
            <div
              key={`star-${i}`}
              className="coin"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                animationDelay: `${i * 0.7}s`,
                animationDuration: `${12 + ((i * 1.7) % 9)}s`,
                fontSize: "35px",
              }}
            >
              ⭐
            </div>
          );
        })}
      </div>

      <div className="container">
        <div className="header">
          <h1>🎰 Solana Slot Machine</h1>
          <div className="header-controls">
            <select
              className="network-selector"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              style={{
                padding: "12px 16px",
                borderRadius: "8px",
                border: "2px solid rgba(255, 215, 0, 0.3)",
                background: "rgba(0, 0, 0, 0.5)",
                color: "#ffd700",
                fontSize: "14px",
                cursor: "pointer",
                marginRight: "10px",
                height: "50px",
                maxWidth: "134px",
              }}
            >
              <option value="devnet">🧪 Devnet</option>
              <option value="mainnet-beta">🚀 Mainnet (Coming Soon)</option>
            </select>
            <WalletMultiButton />
          </div>
        </div>

        {bankroll !== null && (
          <div className="info">
            <div className="info-item">
              <div className="info-label">CASINO BANKROLL</div>
              <div className="info-value">{bankroll.toFixed(4)} SOL</div>
            </div>
            {maxBet && (
              <div className="info-item">
                <div className="info-label">MAX BET</div>
                <div className="info-value">{maxBet.toFixed(4)} SOL</div>
              </div>
            )}
          </div>
        )}

        <div className="game">
          <SlotMachine
            reels={reels}
            isSpinning={isSpinning}
            isWinning={result?.win || false}
            result={result}
            stoppedReels={stoppedReels}
            stoppingReels={stoppingReels}
            onReelStop={(reelIndex) => {
              // Delay sound slightly to match visual perception
              setTimeout(() => {
                playReelStopSound();
                // console.log(`🔊 Reel ${reelIndex} stop sound played`);
              }, 50);
            }}
          />

          <Confetti show={showConfetti} />

          <Controls
            bet={bet}
            onBetChange={setBet}
            onSpin={handleSpin}
            spinning={spinning}
            maxBet={maxBet}
            result={result}
          />
        </div>

        <div className="rules">
          <h3>Paytable</h3>
          <ul>
            <li className="jackpot-item">
              <span className="jackpot-badge">JACKPOT</span>
              <span className="emoji-with-chance">
                <span className="emoji">💎💎💎</span>
                <span className="chance">0.5%</span>
              </span>
              <span className="payout">x20</span>
            </li>
            <li className="jackpot-item">
              <span className="jackpot-badge">JACKPOT</span>
              <span className="emoji-with-chance">
                <span className="emoji">🍒🍒🍒</span>
                <span className="chance">1%</span>
              </span>
              <span className="payout">x10</span>
            </li>
            <li>
              <span className="emoji-with-chance">
                <span className="emoji">🍋🍋🍋</span>
                <span className="chance">3%</span>
              </span>
              <span className="payout">x5</span>
            </li>
            <li>
              <span className="emoji-with-chance">
                <span className="emoji">🍊🍊🍊</span>
                <span className="chance">5%</span>
              </span>
              <span className="payout">x4</span>
            </li>
            <li>
              <span className="emoji-with-chance">
                <span className="emoji">💎💎</span>
                <span className="chance">10%</span>
              </span>
              <span className="payout">x2</span>
            </li>
            <li>
              <span className="emoji-with-chance">
                <span className="emoji">🍒🍒</span>
                <span className="chance">15%</span>
              </span>
              <span className="payout">x1</span>
            </li>
            <li>Min bet: 0.001 SOL | Max: 1.5% of bankroll | RTP: 90%</li>
          </ul>
        </div>

        <div className="footer">
          🔍 Provably Fair • Bankroll:{" "}
          <a
            href={`https://explorer.solana.com/address/${bankrollPDA.toString()}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {bankrollPDA.toString().slice(0, 8)}...
            {bankrollPDA.toString().slice(-8)}
          </a>{" "}
          •{" "}
          <button
            className="fund-link"
            onClick={() => setInvestorPanelOpen(true)}
          >
            Invest
          </button>
        </div>
      </div>

      <InvestorPanel
        publicKey={publicKey}
        connection={connection}
        sendTransaction={sendTransaction}
        bankrollPDA={bankrollPDA}
        programId={PROGRAM_ID}
        bankroll={bankroll}
        fetchBankroll={fetchBankroll}
        isOpen={investorPanelOpen}
        setIsOpen={setInvestorPanelOpen}
      />

      {/* Floating Buttons */}
      <button
        className="floating-investor-btn"
        onClick={() => setInvestorPanelOpen(true)}
        title="Invest in Casino"
      >
        💼
      </button>
      
      <button
        className="floating-music-btn"
        onClick={() => {
          if (musicEnabled) {
            stopBackgroundMusic();
            setMusicEnabled(false);
          } else {
            startBackgroundMusic();
            setMusicEnabled(true);
          }
        }}
        title={musicEnabled ? "Music ON" : "Music OFF"}
      >
        {musicEnabled ? "🔊" : "🔇"}
      </button>
    </>
  );
}

export default function App() {
  const [network, setNetwork] = useState(WalletAdapterNetwork.Devnet);
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(() => [new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SlotGame network={network} setNetwork={setNetwork} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
