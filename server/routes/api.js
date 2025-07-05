const express = require('express');
const router = express.Router();
const Joi = require('joi');
const OpportunityService = require('../services/opportunityService');
const IndicatorService = require('../services/indicatorService');
const RiskManagementService = require('../services/riskManagementService');

// Validation schemas
const settingsSchema = Joi.object({
  balance: Joi.number().min(100).max(1000000).required(),
  riskPerTrade: Joi.number().min(0.1).max(5).required(),
  dailyLossLimit: Joi.number().min(1).max(10).required(),
  maxTrades: Joi.number().min(1).max(20).required()
});

const assessmentParamsSchema = Joi.object({
  pairs: Joi.array().items(Joi.string().valid('EUR/USD', 'GBP/USD')).default(['EUR/USD', 'GBP/USD']),
  minScore: Joi.number().min(50).max(100).default(70)
});

// Middleware for request validation
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }
    next();
  };
};

// GET /api/market-data
router.get('/market-data', (req, res) => {
  try {
    // This would come from the global market data state in server.js
    // For now, we'll return mock data
    const marketData = {
      'EUR/USD': {
        price: 1.0855,
        spread: 1.1,
        atr: 0.0085,
        vwapSlope: 0.0003,
        rsi: 52,
        adx: 28,
        regime: 'trending',
        correlation: 0.82,
        lastUpdate: new Date()
      },
      'GBP/USD': {
        price: 1.2645,
        spread: 1.5,
        atr: 0.0112,
        vwapSlope: -0.0001,
        rsi: 48,
        adx: 22,
        regime: 'ranging',
        correlation: 0.82,
        lastUpdate: new Date()
      }
    };

    res.json({
      success: true,
      data: marketData,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market data'
    });
  }
});

// GET /api/market-data/:pair
router.get('/market-data/:pair', (req, res) => {
  try {
    const { pair } = req.params;
    
    if (!['EUR/USD', 'GBP/USD'].includes(pair)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency pair'
      });
    }

    // Mock data for specific pair
    const pairData = {
      'EUR/USD': {
        price: 1.0855,
        spread: 1.1,
        atr: 0.0085,
        vwapSlope: 0.0003,
        rsi: 52,
        adx: 28,
        regime: 'trending',
        correlation: 0.82,
        lastUpdate: new Date(),
        historicalData: []
      },
      'GBP/USD': {
        price: 1.2645,
        spread: 1.5,
        atr: 0.0112,
        vwapSlope: -0.0001,
        rsi: 48,
        adx: 22,
        regime: 'ranging',
        correlation: 0.82,
        lastUpdate: new Date(),
        historicalData: []
      }
    };

    res.json({
      success: true,
      data: pairData[pair],
      timestamp: new Date()
    });
  } catch (error) {
    console.error(`Error fetching data for ${req.params.pair}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pair data'
    });
  }
});

// POST /api/assess-opportunities
router.post('/assess-opportunities', validateRequest(assessmentParamsSchema), async (req, res) => {
  try {
    const { pairs, minScore } = req.body;
    
    // Mock market data - in production this would come from real data providers
    const marketData = {
      'EUR/USD': {
        price: 1.0855,
        spread: 1.1,
        atr: 0.0085,
        vwapSlope: 0.0003,
        rsi: 52,
        adx: 28,
        regime: 'trending',
        correlation: 0.82,
        lastUpdate: new Date()
      },
      'GBP/USD': {
        price: 1.2645,
        spread: 1.5,
        atr: 0.0112,
        vwapSlope: -0.0001,
        rsi: 48,
        adx: 22,
        regime: 'ranging',
        correlation: 0.82,
        lastUpdate: new Date()
      }
    };

    const opportunities = await OpportunityService.assessAllPairs(marketData);
    const filteredOpportunities = opportunities.filter(opp => 
      pairs.includes(opp.pair) && opp.score >= minScore
    );

    res.json({
      success: true,
      data: filteredOpportunities,
      count: filteredOpportunities.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error assessing opportunities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assess opportunities'
    });
  }
});

// GET /api/opportunities
router.get('/opportunities', (req, res) => {
  try {
    const { limit = 10, pair, minScore } = req.query;
    
    // Mock opportunities data
    let opportunities = [
      {
        id: '1',
        pair: 'EUR/USD',
        setup: 'Trend Continuation',
        score: 85,
        entry: 1.0855,
        stopLoss: 1.0825,
        takeProfit: 1.0915,
        riskReward: 2.0,
        confidence: 'high',
        timestamp: new Date(),
        regime: 'trending'
      },
      {
        id: '2',
        pair: 'GBP/USD',
        setup: 'Liquidity Reversal',
        score: 73,
        entry: 1.2645,
        stopLoss: 1.2675,
        takeProfit: 1.2600,
        riskReward: 1.5,
        confidence: 'medium',
        timestamp: new Date(),
        regime: 'ranging'
      }
    ];

    // Apply filters
    if (pair) {
      opportunities = opportunities.filter(opp => opp.pair === pair);
    }
    
    if (minScore) {
      opportunities = opportunities.filter(opp => opp.score >= parseInt(minScore));
    }

    // Apply limit
    opportunities = opportunities.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: opportunities,
      count: opportunities.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunities'
    });
  }
});

// POST /api/settings
router.post('/settings', validateRequest(settingsSchema), (req, res) => {
  try {
    const settings = req.body;
    
    // Validate risk management rules
    const validation = RiskManagementService.validateSettings(settings);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings',
        details: validation.errors
      });
    }

    // In production, save to database
    console.log('Settings updated:', settings);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

// GET /api/settings
router.get('/settings', (req, res) => {
  try {
    // Mock settings - in production, fetch from database
    const settings = {
      balance: 10000,
      riskPerTrade: 1,
      dailyLossLimit: 2.5,
      maxTrades: 3,
      strategyParams: {
        minOpportunityScore: 70,
        atrPeriod: 14,
        rsiPeriod: 14,
        newsBuffer: 30
      },
      dataProvider: {
        provider: 'MetaTrader 5',
        apiKey: '***hidden***',
        connected: false
      }
    };

    res.json({
      success: true,
      data: settings,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

// GET /api/economic-calendar
router.get('/economic-calendar', (req, res) => {
  try {
    const { date } = req.query;
    
    // Mock economic calendar data
    const events = [
      {
        time: '09:30',
        event: 'EUR CPI Flash Estimate',
        impact: 'high',
        currency: 'EUR',
        forecast: '2.4%',
        previous: '2.6%',
        status: 'upcoming'
      },
      {
        time: '14:30',
        event: 'USD Initial Jobless Claims',
        impact: 'medium',
        currency: 'USD',
        forecast: '220K',
        previous: '218K',
        status: 'upcoming'
      },
      {
        time: '16:00',
        event: 'USD Existing Home Sales',
        impact: 'low',
        currency: 'USD',
        forecast: '4.10M',
        previous: '4.15M',
        status: 'upcoming'
      }
    ];

    res.json({
      success: true,
      data: events,
      date: date || new Date().toISOString().split('T')[0],
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching economic calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch economic calendar'
    });
  }
});

module.exports = router;