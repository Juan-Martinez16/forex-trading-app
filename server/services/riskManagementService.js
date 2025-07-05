class RiskManagementService {
  static validateSettings(settings) {
    const validation = {
      isValid: true,
      errors: []
    };

    // Validate account balance
    if (settings.balance < 100) {
      validation.isValid = false;
      validation.errors.push('Account balance must be at least $100');
    }

    if (settings.balance > 1000000) {
      validation.isValid = false;
      validation.errors.push('Account balance cannot exceed $1,000,000');
    }

    // Validate risk per trade
    if (settings.riskPerTrade < 0.1 || settings.riskPerTrade > 5) {
      validation.isValid = false;
      validation.errors.push('Risk per trade must be between 0.1% and 5%');
    }

    // Validate daily loss limit
    if (settings.dailyLossLimit < 1 || settings.dailyLossLimit > 10) {
      validation.isValid = false;
      validation.errors.push('Daily loss limit must be between 1% and 10%');
    }

    // Risk per trade should not exceed daily loss limit
    if (settings.riskPerTrade > settings.dailyLossLimit) {
      validation.isValid = false;
      validation.errors.push('Risk per trade cannot exceed daily loss limit');
    }

    // Validate max trades
    if (settings.maxTrades < 1 || settings.maxTrades > 20) {
      validation.isValid = false;
      validation.errors.push('Maximum trades per day must be between 1 and 20');
    }

    return validation;
  }

  static calculatePositionSize(accountBalance, riskPerTrade, entryPrice, stopLoss, pair = 'EUR/USD') {
    try {
      // Calculate risk amount in account currency
      const riskAmount = accountBalance * (riskPerTrade / 100);
      
      // Calculate pip value (simplified for major pairs)
      const pipValue = this.getPipValue(pair, accountBalance);
      
      // Calculate stop distance in pips
      const stopDistance = Math.abs(entryPrice - stopLoss) * 10000;
      
      // Calculate position size
      const positionSize = riskAmount / (stopDistance * pipValue);
      
      return {
        positionSize: Math.round(positionSize * 100) / 100, // Round to 2 decimal places
        riskAmount,
        stopDistance,
        pipValue
      };
    } catch (error) {
      console.error('Error calculating position size:', error);
      return null;
    }
  }

  static getPipValue(pair, accountBalance = 10000) {
    // Simplified pip value calculation for USD account
    const pipValues = {
      'EUR/USD': 1,
      'GBP/USD': 1,
      'USD/JPY': 0.01,
      'USD/CHF': 1
    };
    
    return pipValues[pair] || 1;
  }

  static getCurrentRiskAnalysis() {
    // Mock current risk analysis - in production this would be calculated from real data
    return {
      accountHealth: {
        status: 'healthy', // healthy, warning, critical
        dailyPnL: -45.50,
        dailyPnLPercent: -0.46,
        maxDrawdown: -2.1,
        consecutiveLosses: 1,
        riskUtilization: 35.2 // Percentage of daily risk limit used
      },
      positionRisk: {
        openPositions: 0,
        totalExposure: 0,
        correlationRisk: 'low', // low, medium, high
        leverageRatio: 1.0
      },
      tradeHistory: {
        totalTrades: 3,
        winRate: 66.7,
        avgRiskReward: 1.8,
        profitFactor: 1.4,
        maxConsecutiveLosses: 2
      },
      riskLimits: {
        dailyLossLimit: 250, // In account currency
        maxTradesRemaining: 2,
        riskPerTrade: 100,
        correlationLimit: 0.85
      },
      alerts: [
        {
          type: 'info',
          message: 'Risk utilization is within normal parameters',
          timestamp: new Date()
        }
      ]
    };
  }
}

module.exports = RiskManagementService;