const { v4: uuidv4 } = require("uuid");

class OpportunityService {
  static async assessAllPairs(marketData) {
    const opportunities = [];

    for (const [pair, data] of Object.entries(marketData)) {
      try {
        const opportunity = await this.assessSinglePair(pair, data, marketData);
        if (opportunity) {
          opportunities.push(opportunity);
        }
      } catch (error) {
        console.error(`Error assessing ${pair}:`, error);
      }
    }

    return opportunities;
  }

  static async assessSinglePair(pair, data, allMarketData) {
    // Calculate opportunity score
    const score = this.calculateOpportunityScore(data, allMarketData);

    // Only create opportunities for scores > 70
    if (score < 70) {
      return null;
    }

    // Determine setup type based on market regime
    const setup = this.determineSetupType(data);

    // Calculate entry, stop loss, and take profit
    const levels = this.calculateTradingLevels(data, setup);

    // Calculate risk-reward ratio
    const riskReward = this.calculateRiskReward(levels);

    // Validate minimum risk-reward requirement
    if (riskReward < 1.5) {
      return null;
    }

    // Get confidence level
    const confidence = this.getConfidenceLevel(score);

    // Create opportunity object
    return {
      id: uuidv4(),
      pair,
      setup,
      score: Math.round(score),
      entry: parseFloat(levels.entry.toFixed(5)),
      stopLoss: parseFloat(levels.stopLoss.toFixed(5)),
      takeProfit: parseFloat(levels.takeProfit.toFixed(5)),
      riskReward: parseFloat(riskReward.toFixed(2)),
      confidence,
      timestamp: new Date(),
      regime: data.regime,
      analysis: this.generateAnalysis(data, setup, confidence),
    };
  }

  static calculateOpportunityScore(data, allMarketData) {
    let score = 50; // Base score

    // VWAP slope scoring based on regime
    if (data.regime === "trending") {
      if (Math.abs(data.vwapSlope) > 0.0001) {
        score += 15;
      }
      if (Math.abs(data.vwapSlope) > 0.0003) {
        score += 10; // Bonus for strong trend
      }
    }

    // RSI scoring based on regime
    if (data.regime === "trending") {
      // For trending markets, look for RSI between 45-65
      if (data.rsi >= 45 && data.rsi <= 65) {
        score += 12;
      } else if (data.rsi >= 40 && data.rsi <= 70) {
        score += 6;
      }
    } else {
      // For ranging/volatile markets, look for extreme RSI
      if (data.rsi > 70 || data.rsi < 30) {
        score += 15;
      } else if (data.rsi > 65 || data.rsi < 35) {
        score += 8;
      }
    }

    // ADX scoring (trend strength)
    if (data.adx > 30) {
      score += 12;
    } else if (data.adx > 25) {
      score += 8;
    } else if (data.adx < 20) {
      score += 5; // Good for reversal strategies
    }

    // Spread scoring
    const normalSpread = data.pair === "EUR/USD" ? 1.2 : 1.8;
    if (data.spread <= normalSpread) {
      score += 10;
    } else if (data.spread <= normalSpread * 1.2) {
      score += 5;
    } else {
      score -= 10; // Penalize high spreads
    }

    // Random market structure scoring (simulated)
    score += Math.random() * 20;

    return Math.max(0, Math.min(100, score));
  }

  static determineSetupType(data) {
    return data.regime === "trending"
      ? "Trend Continuation"
      : "Liquidity Reversal";
  }

  static calculateTradingLevels(data, setup) {
    const entry = data.price;
    let stopLoss, takeProfit;

    if (setup === "Trend Continuation") {
      // Trend continuation setup
      const stopMultiplier = 1.5;
      const profitMultiplier = 2.0;

      if (data.vwapSlope > 0) {
        // Bullish trend
        stopLoss = entry - data.atr * stopMultiplier;
        takeProfit = entry + data.atr * profitMultiplier;
      } else {
        // Bearish trend
        stopLoss = entry + data.atr * stopMultiplier;
        takeProfit = entry - data.atr * profitMultiplier;
      }
    } else {
      // Liquidity reversal setup
      const stopMultiplier = 1.0;
      const profitMultiplier = 1.5;

      if (data.rsi > 70) {
        // Bearish reversal
        stopLoss = entry + data.atr * stopMultiplier;
        takeProfit = entry - data.atr * profitMultiplier;
      } else {
        // Bullish reversal
        stopLoss = entry - data.atr * stopMultiplier;
        takeProfit = entry + data.atr * profitMultiplier;
      }
    }

    return { entry, stopLoss, takeProfit };
  }

  static calculateRiskReward(levels) {
    const risk = Math.abs(levels.entry - levels.stopLoss);
    const reward = Math.abs(levels.takeProfit - levels.entry);
    return reward / risk;
  }

  static getConfidenceLevel(score) {
    if (score >= 85) return "high";
    if (score >= 75) return "medium";
    return "low";
  }

  static generateAnalysis(data, setup, confidence) {
    const regime = data.regime;
    const trendDirection = data.vwapSlope > 0 ? "bullish" : "bearish";
    const rsiCondition =
      data.rsi > 70 ? "overbought" : data.rsi < 30 ? "oversold" : "neutral";

    let analysis = `${setup} setup detected in ${regime} market conditions. `;

    if (setup === "Trend Continuation") {
      analysis += `VWAP slope indicates ${trendDirection} momentum with ADX at ${data.adx.toFixed(
        1
      )} confirming trend strength. `;
    } else {
      analysis += `RSI shows ${rsiCondition} conditions suggesting potential reversal. `;
    }

    analysis += `Entry at current market price with ${confidence} confidence based on technical confluence and risk management criteria.`;

    return analysis;
  }
}

module.exports = OpportunityService;
