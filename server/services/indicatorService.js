class IndicatorService {
  static async calculateIndicators(pair, period = '1h', limit = 50) {
    try {
      // In production, this would fetch real price data and calculate indicators
      // For demo purposes, we'll generate mock indicator data
      
      const mockData = this.generateMockPriceData(pair, limit);
      
      return {
        vwap: this.calculateVWAP(mockData),
        rsi: this.calculateRSI(mockData),
        atr: this.calculateATR(mockData),
        adx: this.calculateADX(mockData),
        pivotPoints: this.calculatePivotPoints(mockData)
      };
    } catch (error) {
      console.error('Error calculating indicators:', error);
      throw error;
    }
  }

  static generateMockPriceData(pair, periods) {
    const basePrice = pair === 'EUR/USD' ? 1.0855 : 1.2645;
    const data = [];
    let currentPrice = basePrice;
    
    for (let i = periods; i > 0; i--) {
      const change = (Math.random() - 0.5) * 0.002;
      currentPrice = Math.max(0, currentPrice + change);
      
      const high = currentPrice + Math.random() * 0.001;
      const low = currentPrice - Math.random() * 0.001;
      const volume = Math.floor(Math.random() * 1000) + 500;
      
      data.push({
        timestamp: new Date(Date.now() - i * 3600000), // Hour intervals
        open: currentPrice,
        high,
        low,
        close: currentPrice,
        volume
      });
    }
    
    return data.reverse();
  }

  static calculateVWAP(data) {
    let totalVolume = 0;
    let totalVolumePrice = 0;
    const vwapData = [];
    
    for (let i = 0; i < data.length; i++) {
      const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
      totalVolumePrice += typicalPrice * data[i].volume;
      totalVolume += data[i].volume;
      
      const vwap = totalVolumePrice / totalVolume;
      vwapData.push({
        timestamp: data[i].timestamp,
        value: vwap,
        slope: i > 0 ? vwap - vwapData[i-1].value : 0
      });
    }
    
    return vwapData;
  }

  static calculateRSI(data, period = 14) {
    if (data.length < period + 1) return [];
    
    const rsiData = [];
    const changes = [];
    
    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i].close - data[i-1].close);
    }
    
    // Calculate initial average gains and losses
    let avgGain = 0;
    let avgLoss = 0;
    
    for (let i = 0; i < period; i++) {
      if (changes[i] > 0) {
        avgGain += changes[i];
      } else {
        avgLoss += Math.abs(changes[i]);
      }
    }
    
    avgGain /= period;
    avgLoss /= period;
    
    // Calculate RSI
    for (let i = period; i < changes.length; i++) {
      const change = changes[i];
      
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
      }
      
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      
      rsiData.push({
        timestamp: data[i + 1].timestamp,
        value: rsi
      });
    }
    
    return rsiData;
  }

  static calculateATR(data, period = 14) {
    if (data.length < period + 1) return [];
    
    const atrData = [];
    const trueRanges = [];
    
    // Calculate true ranges
    for (let i = 1; i < data.length; i++) {
      const tr1 = data[i].high - data[i].low;
      const tr2 = Math.abs(data[i].high - data[i-1].close);
      const tr3 = Math.abs(data[i].low - data[i-1].close);
      const trueRange = Math.max(tr1, tr2, tr3);
      trueRanges.push(trueRange);
    }
    
    // Calculate ATR
    let atrSum = 0;
    for (let i = 0; i < period; i++) {
      atrSum += trueRanges[i];
    }
    
    let atr = atrSum / period;
    atrData.push({
      timestamp: data[period].timestamp,
      value: atr
    });
    
    for (let i = period; i < trueRanges.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i]) / period;
      atrData.push({
        timestamp: data[i + 1].timestamp,
        value: atr
      });
    }
    
    return atrData;
  }

  static calculateADX(data, period = 14) {
    if (data.length < period * 2) return [];
    
    const adxData = [];
    const dmPlus = [];
    const dmMinus = [];
    const trueRanges = [];
    
    // Calculate directional movements and true ranges
    for (let i = 1; i < data.length; i++) {
      const highDiff = data[i].high - data[i-1].high;
      const lowDiff = data[i-1].low - data[i].low;
      
      dmPlus.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
      dmMinus.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
      
      const tr1 = data[i].high - data[i].low;
      const tr2 = Math.abs(data[i].high - data[i-1].close);
      const tr3 = Math.abs(data[i].low - data[i-1].close);
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    // Calculate smoothed values and ADX
    for (let i = period - 1; i < dmPlus.length; i++) {
      const smoothedDMPlus = dmPlus.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
      const smoothedDMMinus = dmMinus.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
      const smoothedTR = trueRanges.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
      
      const diPlus = (smoothedDMPlus / smoothedTR) * 100;
      const diMinus = (smoothedDMMinus / smoothedTR) * 100;
      const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
      
      adxData.push({
        timestamp: data[i + 1].timestamp,
        value: dx
      });
    }
    
    return adxData;
  }

  static calculatePivotPoints(data) {
    if (data.length === 0) return {};
    
    const lastDay = data[data.length - 1];
    const high = lastDay.high;
    const low = lastDay.low;
    const close = lastDay.close;
    
    const pivot = (high + low + close) / 3;
    
    return {
      pivot,
      r1: 2 * pivot - low,
      r2: pivot + (high - low),
      r3: high + 2 * (pivot - low),
      s1: 2 * pivot - high,
      s2: pivot - (high - low),
      s3: low - 2 * (high - pivot)
    };
  }
}

module.exports = IndicatorService;