const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cron = require("node-cron");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Import services
const OpportunityService = require("./services/opportunityService");

// Import routes
const apiRoutes = require("./routes/api");

// Middleware
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", apiRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Global state for market data and opportunities
let marketData = {
  "EUR/USD": {
    price: 1.0855,
    spread: 1.1,
    atr: 0.0085,
    vwapSlope: 0.0003,
    rsi: 52,
    adx: 28,
    regime: "trending",
    correlation: 0.82,
    lastUpdate: new Date(),
    historicalData: [],
  },
  "GBP/USD": {
    price: 1.2645,
    spread: 1.5,
    atr: 0.0112,
    vwapSlope: -0.0001,
    rsi: 48,
    adx: 22,
    regime: "ranging",
    correlation: 0.82,
    lastUpdate: new Date(),
    historicalData: [],
  },
};

let opportunities = [];
let connectedClients = 0;

// WebSocket connection handling
io.on("connection", (socket) => {
  connectedClients++;
  console.log(`Client connected. Total clients: ${connectedClients}`);

  // Send initial data
  socket.emit("marketData", marketData);
  socket.emit("opportunities", opportunities);

  // Handle client requests
  socket.on("requestMarketData", () => {
    socket.emit("marketData", marketData);
  });

  socket.on("requestOpportunities", () => {
    socket.emit("opportunities", opportunities);
  });

  socket.on("assessOpportunities", async () => {
    try {
      const newOpportunities = await OpportunityService.assessAllPairs(
        marketData
      );
      opportunities = [...newOpportunities, ...opportunities.slice(0, 20)];
      io.emit("opportunities", opportunities);

      if (newOpportunities.length > 0) {
        io.emit("alert", {
          type: "success",
          message: `${newOpportunities.length} new trading opportunity detected!`,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error("Error assessing opportunities:", error);
      socket.emit("alert", {
        type: "error",
        message: "Error assessing trading opportunities",
        timestamp: new Date(),
      });
    }
  });

  socket.on("disconnect", () => {
    connectedClients--;
    console.log(`Client disconnected. Total clients: ${connectedClients}`);
  });
});

// Simulate real-time market data updates
const updateMarketData = async () => {
  try {
    // In production, replace this with real data provider calls
    Object.keys(marketData).forEach((pair) => {
      const data = marketData[pair];

      // Simulate price movement
      const change = (Math.random() - 0.5) * 0.001;
      data.price = Math.max(0, data.price + change);

      // Update indicators
      data.rsi = Math.max(
        0,
        Math.min(100, data.rsi + (Math.random() - 0.5) * 2)
      );
      data.adx = Math.max(
        0,
        Math.min(100, data.adx + (Math.random() - 0.5) * 1)
      );
      data.vwapSlope = data.vwapSlope + (Math.random() - 0.5) * 0.0002;

      // Update regime based on indicators
      if (data.adx > 25 && Math.abs(data.vwapSlope) > 0.0001) {
        data.regime = "trending";
      } else if (data.adx < 20) {
        data.regime = "ranging";
      } else {
        data.regime = "volatile";
      }

      data.lastUpdate = new Date();

      // Store historical data
      data.historicalData.push({
        timestamp: new Date(),
        price: data.price,
        rsi: data.rsi,
        adx: data.adx,
      });

      // Keep only last 100 points
      if (data.historicalData.length > 100) {
        data.historicalData = data.historicalData.slice(-100);
      }
    });

    // Broadcast updated data to all clients
    io.emit("marketData", marketData);

    // Randomly assess opportunities
    if (Math.random() > 0.7) {
      const newOpportunities = await OpportunityService.assessAllPairs(
        marketData
      );
      if (newOpportunities.length > 0) {
        opportunities = [...newOpportunities, ...opportunities.slice(0, 20)];
        io.emit("opportunities", opportunities);
        io.emit("alert", {
          type: "success",
          message: `${newOpportunities.length} new trading opportunity detected!`,
          timestamp: new Date(),
        });
      }
    }
  } catch (error) {
    console.error("Error updating market data:", error);
  }
};

// Schedule market data updates every 3 seconds
cron.schedule("*/15 * * * *", updateMarketData);

// Schedule opportunity assessment every 30 seconds
cron.schedule("*/30 * * * * *", async () => {
  try {
    const newOpportunities = await OpportunityService.assessAllPairs(
      marketData
    );
    if (newOpportunities.length > 0) {
      opportunities = [...newOpportunities, ...opportunities.slice(0, 20)];
      io.emit("opportunities", opportunities);
    }
  } catch (error) {
    console.error("Error in scheduled opportunity assessment:", error);
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Market data updates every 3 seconds`);
  console.log(`🔍 Opportunity assessment every 30 seconds`);
  console.log(
    `🌐 CORS enabled for: ${process.env.CLIENT_URL || "http://localhost:3000"}`
  );
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});
