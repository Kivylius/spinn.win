import { useState, useEffect, useCallback } from "react";
import {
  Transaction,
  SystemProgram,
  TransactionInstruction,
  PublicKey,
} from "@solana/web3.js";
import { serialize } from "borsh";
import "./InvestorPanel.css";

class DepositInstruction {
  constructor(fields) {
    this.instruction = 2; // Deposit variant
    this.amount = fields.amount;
  }
}

class WithdrawInstruction {
  constructor(fields) {
    this.instruction = 3; // Withdraw variant
    this.shares = fields.shares;
  }
}

const depositSchema = new Map([
  [
    DepositInstruction,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["amount", "u64"],
      ],
    },
  ],
]);

const withdrawSchema = new Map([
  [
    WithdrawInstruction,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["shares", "u64"],
      ],
    },
  ],
]);

const MIN_RESERVE = 0.01; // 0.01 SOL minimum reserve (program enforced)
const SAFE_RESERVE = 1.0; // 1.0 SOL safe reserve for withdrawals

// Format large numbers (e.g., 21500000000 -> "21.5B")
const formatShares = (shares) => {
  if (shares >= 1e9) {
    return `${(shares / 1e9).toFixed(1)}B`;
  } else if (shares >= 1e6) {
    return `${(shares / 1e6).toFixed(1)}M`;
  } else if (shares >= 1e3) {
    return `${(shares / 1e3).toFixed(1)}K`;
  }
  return shares.toString();
};

export default function InvestorPanel({
  publicKey,
  connection,
  sendTransaction,
  bankrollPDA,
  programId,
  bankroll,
  fetchBankroll,
  isOpen,
  setIsOpen,
}) {
  const [investorData, setInvestorData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allInvestors, setAllInvestors] = useState([]);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const fetchInvestorData = useCallback(async () => {
    try {
      // Get investor PDA
      const [investorPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("investor"), publicKey.toBuffer()],
        programId
      );

      const investorAccount = await connection.getAccountInfo(investorPDA);

      if (!investorAccount) {
        // No investment yet
        setInvestorData(null);
        return;
      }

      // Parse investor account: owner (32 bytes) + shares (8 bytes)
      const shares = investorAccount.data.readBigUInt64LE(32);

      // Get bankroll account to read total_shares
      const bankrollAccount = await connection.getAccountInfo(bankrollPDA);
      if (!bankrollAccount) return;

      // Parse bankroll: total_pool (8 bytes) + total_shares (8 bytes)
      const totalShares = bankrollAccount.data.readBigUInt64LE(8);

      // Calculate value
      const bankrollBalance = await connection.getBalance(bankrollPDA);
      const value =
        Number(totalShares) > 0
          ? (Number(shares) * bankrollBalance) / Number(totalShares) / 1e9
          : 0;

      // Calculate max withdrawable (leaving SAFE_RESERVE)
      const bankrollBalanceSOL = bankrollBalance / 1e9;
      const availablePool = Math.max(0, bankrollBalanceSOL - SAFE_RESERVE);
      const maxWithdrawableValue = Math.min(value, availablePool);
      const maxWithdrawableShares =
        Number(totalShares) > 0 && bankrollBalanceSOL > 0
          ? Math.floor((maxWithdrawableValue / bankrollBalanceSOL) * Number(totalShares))
          : 0;

      setInvestorData({
        shares: Number(shares),
        totalShares: Number(totalShares),
        value,
        maxWithdrawableShares,
        maxWithdrawableValue,
        totalInvested: 0, // Will be calculated from transaction history
        profit: 0,
      });
    } catch (err) {
      console.error("Error fetching investor data:", err);
      setInvestorData(null);
    }
  }, [publicKey, connection, bankrollPDA, programId]);

  const fetchTransactionHistory = useCallback(async () => {
    if (!publicKey || loadingHistory) return;
    
    // Check cache first
    const cacheKey = `tx_history_${publicKey.toString()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Use cache if less than 5 minutes old
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        setTransactionHistory(data);
        setHistoryLoaded(true);
        // Update profit if we have investor data
        if (investorData && data.length > 0) {
          const totalDeposited = data.filter(tx => tx.type === "Deposit").reduce((sum, tx) => sum + tx.amount, 0);
          const totalWithdrawn = data.filter(tx => tx.type === "Withdraw").reduce((sum, tx) => sum + tx.amount, 0);
          const totalInvested = totalDeposited - totalWithdrawn;
          const profit = investorData.value - totalInvested;
          setInvestorData(prev => ({ ...prev, totalInvested, profit }));
        }
        return;
      }
    }
    
    setLoadingHistory(true);
    try {
      const [investorPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("investor"), publicKey.toBuffer()],
        programId
      );

      // Get transaction signatures for this investor PDA
      const signatures = await connection.getSignaturesForAddress(investorPDA, { limit: 20 });
      
      const transactions = [];
      let totalDeposited = 0;
      let totalWithdrawn = 0;

      // Process in smaller batches to avoid rate limits
      for (let i = 0; i < Math.min(signatures.length, 10); i++) {
        const sig = signatures[i];
        try {
          const tx = await connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });
          
          if (!tx || !tx.meta) continue;

          // Check if this is a deposit or withdraw by looking at instruction data
          const programIx = tx.transaction.message.instructions.find(
            (ix) => ix.programId?.toString() === programId.toString()
          );

          if (!programIx) continue;

          // Get the actual transfer amount from balance changes
          // The bankroll PDA is typically at index 1 (after the user at index 0)
          // Check all accounts to find the bankroll
          let type = "Unknown";
          let amount = 0;
          
          const bankrollPDAStr = bankrollPDA.toString();
          
          // Search through all account keys
          for (let idx = 0; idx < tx.meta.preBalances.length; idx++) {
            // Get the account key at this index
            let accountKey = null;
            if (tx.transaction.message.accountKeys[idx]) {
              const key = tx.transaction.message.accountKeys[idx];
              accountKey = typeof key === 'string' ? key : (key.pubkey ? key.pubkey.toString() : key.toString());
            }
            
            // Check if this is the bankroll PDA
            if (accountKey === bankrollPDAStr) {
              const preBalance = tx.meta.preBalances[idx] / 1e9;
              const postBalance = tx.meta.postBalances[idx] / 1e9;
              const change = postBalance - preBalance;
              
              if (change > 0) {
                type = "Deposit";
                amount = change;
                totalDeposited += amount;
              } else if (change < 0) {
                type = "Withdraw";
                amount = Math.abs(change);
                totalWithdrawn += amount;
              }
              break;
            }
          }

          transactions.push({
            signature: sig.signature,
            type,
            amount,
            timestamp: sig.blockTime,
            success: !tx.meta.err,
          });
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.error("Error parsing transaction:", err);
        }
      }

      setTransactionHistory(transactions);
      setHistoryLoaded(true);

      // Cache the results
      const cacheKey = `tx_history_${publicKey.toString()}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        data: transactions,
        timestamp: Date.now()
      }));

      // Calculate profit based on transaction history
      if (investorData) {
        const totalInvested = totalDeposited - totalWithdrawn;
        const profit = investorData.value - totalInvested;
        setInvestorData(prev => ({ ...prev, totalInvested, profit }));
      }
    } catch (err) {
      console.error("Error fetching transaction history:", err);
      setTransactionHistory([]);
      setHistoryLoaded(true);
    } finally {
      setLoadingHistory(false);
    }
  }, [connection, publicKey, programId, investorData, loadingHistory]);

  const fetchAllInvestors = useCallback(async () => {
    try {
      // Get all accounts owned by the program with "investor" seed
      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          { dataSize: 40 }, // InvestorAccount size: 32 (pubkey) + 8 (shares)
        ],
      });

      // Get bankroll for total shares
      const bankrollAccount = await connection.getAccountInfo(bankrollPDA);
      if (!bankrollAccount) return;
      const totalShares = bankrollAccount.data.readBigUInt64LE(8);

      const investors = accounts.map((account) => {
        const owner = new PublicKey(account.account.data.slice(0, 32));
        const shares = account.account.data.readBigUInt64LE(32);
        const ownership = Number(totalShares) > 0
          ? (Number(shares) / Number(totalShares)) * 100
          : 0;

        return {
          address: owner.toString(),
          shares: Number(shares),
          ownership,
        };
      });

      // Sort by ownership descending
      investors.sort((a, b) => b.ownership - a.ownership);
      setAllInvestors(investors);
    } catch (err) {
      console.error("Error fetching all investors:", err);
      setAllInvestors([]);
    }
  }, [connection, programId, bankrollPDA]);

  useEffect(() => {
    if (publicKey && isOpen) {
      fetchInvestorData();
      fetchAllInvestors();
    }
  }, [publicKey, isOpen, bankroll, fetchInvestorData, fetchAllInvestors]);

  // Separate effect for preloading transaction history (only once when panel opens)
  useEffect(() => {
    if (publicKey && isOpen && !historyLoaded) {
      fetchTransactionHistory();
    }
  }, [publicKey, isOpen, historyLoaded]);

  // Recalculate profit when both investor data and transaction history are loaded
  useEffect(() => {
    if (investorData && historyLoaded && transactionHistory.length > 0) {
      const totalDeposited = transactionHistory.filter(tx => tx.type === "Deposit").reduce((sum, tx) => sum + tx.amount, 0);
      const totalWithdrawn = transactionHistory.filter(tx => tx.type === "Withdraw").reduce((sum, tx) => sum + tx.amount, 0);
      const totalInvested = totalDeposited - totalWithdrawn;
      const profit = investorData.value - totalInvested;
      setInvestorData(prev => ({ ...prev, totalInvested, profit }));
    }
  }, [investorData?.value, historyLoaded, transactionHistory]);

  const handleDeposit = async () => {
    if (!publicKey) return;
    setLoading(true);

    try {
      const amount = prompt("Enter SOL amount to invest (min 0.1 SOL):", "1");
      if (!amount) {
        setLoading(false);
        return;
      }

      const lamports = Math.floor(parseFloat(amount) * 1e9);

      if (lamports < 100_000_000) {
        alert("Minimum investment is 0.1 SOL");
        setLoading(false);
        return;
      }

      // Get investor PDA
      const [investorPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("investor"), publicKey.toBuffer()],
        programId
      );

      const instruction = new DepositInstruction({ amount: lamports });
      const data = serialize(depositSchema, instruction);

      const ix = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: bankrollPDA, isSigner: false, isWritable: true },
          { pubkey: investorPDA, isSigner: false, isWritable: true },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ],
        programId: programId,
        data: Buffer.from(data),
      });

      const transaction = new Transaction().add(ix);
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      alert(`Successfully invested ${amount} SOL! 🎉`);
      // Clear cache to force refetch
      localStorage.removeItem(`tx_history_${publicKey.toString()}`);
      setHistoryLoaded(false);
      fetchBankroll();
      fetchInvestorData();
    } catch (err) {
      console.error("Investment error:", err);
      alert("Investment failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!publicKey || !investorData) return;
    setLoading(true);

    try {
      const solAmount = parseFloat(withdrawAmount);
      
      if (isNaN(solAmount) || solAmount <= 0) {
        alert("Please enter a valid amount");
        setLoading(false);
        return;
      }

      if (solAmount > investorData.maxWithdrawableValue) {
        alert(`Maximum withdrawable is ${investorData.maxWithdrawableValue.toFixed(4)} SOL`);
        setLoading(false);
        return;
      }

      // Convert SOL to shares
      const shares = Math.floor((solAmount / investorData.value) * investorData.shares);

      // Get investor PDA
      const [investorPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("investor"), publicKey.toBuffer()],
        programId
      );

      const instruction = new WithdrawInstruction({ shares: Number(shares) });
      const data = serialize(withdrawSchema, instruction);

      const ix = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: bankrollPDA, isSigner: false, isWritable: true },
          { pubkey: investorPDA, isSigner: false, isWritable: true },
        ],
        programId: programId,
        data: Buffer.from(data),
      });

      const transaction = new Transaction().add(ix);
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      alert(`Successfully withdrew ${solAmount.toFixed(4)} SOL! 🎉`);
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      // Clear cache to force refetch
      localStorage.removeItem(`tx_history_${publicKey.toString()}`);
      setHistoryLoaded(false);
      fetchBankroll();
      fetchInvestorData();
    } catch (err) {
      console.error("Withdrawal error:", err);
      alert("Withdrawal failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) return null;

  return (
    <>
      {isOpen && (
        <div className="investor-modal">
          <div className="investor-content">
            <button className="close-btn" onClick={() => setIsOpen(false)}>
              ✕
            </button>

            <h2>💼 Investor Dashboard</h2>

            <div className="investor-stats">
              <div className="stat-card">
                <div className="stat-label">Current Value</div>
                <div className="stat-value">
                  {investorData
                    ? `${investorData.value.toFixed(4)} SOL`
                    : "0 SOL"}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Total Invested</div>
                <div className="stat-value">
                  {investorData && historyLoaded
                    ? `${investorData.totalInvested.toFixed(4)} SOL`
                    : "---"}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Ownership</div>
                <div className="stat-value">
                  {investorData && investorData.totalShares > 0
                    ? `${(
                        (investorData.shares / investorData.totalShares) *
                        100
                      ).toFixed(2)}%`
                    : "0%"}
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "5px" }}>
                  {investorData ? `${formatShares(investorData.shares)} shares` : ""}
                </div>
              </div>

              <div className="stat-card profit">
                <div className="stat-label">Profit/Loss</div>
                <div className="stat-value">
                  {investorData && historyLoaded
                    ? `${
                        investorData.profit >= 0 ? "+" : ""
                      }${investorData.profit.toFixed(4)} SOL`
                    : "---"}
                </div>
              </div>
            </div>

            <div className="investor-info">
              <p>
                💡 Invest in the casino bankroll and earn from the 5% house
                edge!
              </p>
              <p>
                📊 Total Bankroll:{" "}
                <strong>{bankroll ? bankroll.toFixed(4) : "0"} SOL</strong>
              </p>
              <p>⚠️ Min investment: 0.1 SOL | Safe reserve: {SAFE_RESERVE} SOL</p>
              {investorData && (
                <p>
                  💰 Max withdrawable:{" "}
                  <strong>{investorData.maxWithdrawableValue.toFixed(4)} SOL</strong>
                  {" "}({investorData.maxWithdrawableShares.toLocaleString()} shares)
                </p>
              )}
            </div>

            {transactionHistory.length > 0 && (
              <div className="investor-list">
                <h3>📜 Your Transaction History (Last 10)</h3>
                <div className="investor-table">
                  {transactionHistory.map((tx, idx) => (
                    <div key={idx} className="investor-row">
                      <span className="investor-address">
                        {tx.type === "Deposit" ? "💰" : "💸"} {tx.type}
                      </span>
                      <span className="investor-ownership">
                        {tx.amount.toFixed(4)} SOL
                      </span>
                      <span className="investor-ownership">
                        {new Date(tx.timestamp * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allInvestors.length > 0 && (
              <div className="investor-list">
                <h3>All Investors ({allInvestors.length})</h3>
                <div className="investor-table">
                  {allInvestors.map((inv, idx) => (
                    <div key={idx} className="investor-row">
                      <span className="investor-address">
                        {inv.address.slice(0, 4)}...{inv.address.slice(-4)}
                        {inv.address === publicKey?.toString() && " (You)"}
                      </span>
                      <span className="investor-ownership">
                        {inv.ownership.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="investor-actions">
              <button
                className="invest-btn"
                onClick={handleDeposit}
                disabled={loading}
              >
                💰 Invest
              </button>
              <button
                className="withdraw-btn"
                onClick={() => {
                  setWithdrawAmount(investorData?.maxWithdrawableValue?.toFixed(4) || "");
                  setShowWithdrawModal(true);
                }}
                disabled={loading || !investorData || investorData.shares === 0}
              >
                💸 Withdraw
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="investor-modal" style={{ zIndex: 3000 }}>
          <div className="investor-content" style={{ maxWidth: "400px" }}>
            <button className="close-btn" onClick={() => setShowWithdrawModal(false)}>
              ✕
            </button>

            <h2>💸 Withdraw Funds</h2>

            <div className="investor-info">
              <p>
                💰 Your investment: <strong>{investorData?.value.toFixed(4)} SOL</strong>
              </p>
              <p>
                📊 Your shares: <strong>{investorData?.shares.toLocaleString()}</strong>
              </p>
              <p>
                ✅ Max withdrawable: <strong>{investorData?.maxWithdrawableValue.toFixed(4)} SOL</strong>
              </p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                💡 Share value: {investorData ? (investorData.value / investorData.shares * 1e9).toFixed(6) : "0"} SOL per share
              </p>
            </div>

            <div style={{ marginTop: "20px" }}>
              <label style={{ display: "block", marginBottom: "10px", color: "#ffd700" }}>
                Amount to withdraw (SOL):
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max={investorData?.maxWithdrawableValue}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.0000"
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "18px",
                  borderRadius: "8px",
                  border: "2px solid rgba(255, 215, 0, 0.3)",
                  background: "rgba(0, 0, 0, 0.5)",
                  color: "#fff",
                  textAlign: "center",
                }}
              />
              <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setWithdrawAmount((investorData?.maxWithdrawableValue * 0.25).toFixed(4))}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "rgba(255, 215, 0, 0.2)",
                    border: "1px solid rgba(255, 215, 0, 0.3)",
                    borderRadius: "4px",
                    color: "#ffd700",
                    cursor: "pointer",
                  }}
                >
                  25%
                </button>
                <button
                  onClick={() => setWithdrawAmount((investorData?.maxWithdrawableValue * 0.5).toFixed(4))}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "rgba(255, 215, 0, 0.2)",
                    border: "1px solid rgba(255, 215, 0, 0.3)",
                    borderRadius: "4px",
                    color: "#ffd700",
                    cursor: "pointer",
                  }}
                >
                  50%
                </button>
                <button
                  onClick={() => setWithdrawAmount(investorData?.maxWithdrawableValue.toFixed(4))}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "rgba(255, 215, 0, 0.2)",
                    border: "1px solid rgba(255, 215, 0, 0.3)",
                    borderRadius: "4px",
                    color: "#ffd700",
                    cursor: "pointer",
                  }}
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="investor-actions" style={{ marginTop: "20px" }}>
              <button
                className="withdraw-btn"
                onClick={handleWithdraw}
                disabled={loading || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                style={{ width: "100%" }}
              >
                {loading ? "Processing..." : "Confirm Withdrawal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
