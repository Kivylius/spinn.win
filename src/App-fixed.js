// Replace lines 108-167 in App.js with this:

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
  if (roll <= 80) {
    const others = ["💎", "🍊", "🍋"];
    return ["🍒", "🍒", others[roll % 3]];
  }

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
