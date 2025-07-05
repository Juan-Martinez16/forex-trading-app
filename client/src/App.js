import React, { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Target,
  Shield,
} from "lucide-react";
import io from "socket.io-client";

const ForexAssessmentApp = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [marketData, setMarketData] = useState({
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
    },
  });

  const [opportunities, setOpportunities] = useState([]);
  const [accountSettings, setAccountSettings] = useState({
    balance: 10000,
    riskPerTrade: 1,
    dailyLossLimit: 2.5,
    maxTrades: 3,
    currentPnL: 0,
    tradesCount: 0,
  });

  const [alerts, setAlerts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const socketRef = useRef(null);

  const [newsEvents, setNewsEvents] = useState([
    {
      time: "09:30",
      event: "EUR CPI Flash Estimate",
      impact: "high",
      status: "upcoming",
    },
    {
      time: "14:30",
      event: "USD Initial Jobless Claims",
      impact: "medium",
      status: "upcoming",
    },
    {
      time: "16:00",
      event: "USD Existing Home Sales",
      impact: "low",
      status: "upcoming",
    },
  ]);

  // WebSocket connection
  useEffect(() => {
    // Connect to backend on port 5001
    socketRef.current = io(
      process.env.REACT_APP_WS_URL || "http://localhost:5001"
    );

    socketRef.current.on("connect", () => {
      console.log("Connected to backend server on port 5001");
      setConnectionStatus("connected");
      addAlert("Connected to trading server", "success");
    });

    socketRef.current.on("disconnect", () => {
      console.log("Disconnected from backend server");
      setConnectionStatus("disconnected");
      addAlert("Disconnected from trading server", "warning");
    });

    socketRef.current.on("marketData", (data) => {
      setMarketData(data);
    });

    socketRef.current.on("opportunities", (data) => {
      setOpportunities(data);
    });

    socketRef.current.on("alert", (alert) => {
      addAlert(alert.message, alert.type);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Test API connection
  const testApiConnection = async () => {
    try {
      const response = await fetch(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:5001/api"
        }/market-data`
      );
      if (response.ok) {
        addAlert("API connection successful", "success");
        return true;
      }
    } catch (error) {
      console.error("API connection failed:", error);
      addAlert("API connection failed", "error");
      return false;
    }
  };

  // Manual opportunity assessment
  const assessOpportunities = () => {
    if (socketRef.current && connectionStatus === "connected") {
      socketRef.current.emit("assessOpportunities");
      addAlert("Assessing new opportunities...", "info");
    } else {
      addAlert("Not connected to server", "error");
    }
  };

  const addAlert = (message, type) => {
    const alert = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date(),
    };
    setAlerts((prev) => [alert, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    }, 5000);
  };

  const formatPrice = (price) => {
    if (typeof price !== "number") return "0.00000";
    return price.toFixed(5);
  };

  const formatTime = (date) => {
    if (!date) return "N/A";
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "N/A";
      return dateObj.toLocaleTimeString();
    } catch (error) {
      return "N/A";
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-blue-400 mb-2">
              Forex Trading Assessment Dashboard
            </h1>
            <p className="text-gray-400">
              Real-time opportunity analysis for EUR/USD and GBP/USD
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div
              className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                connectionStatus === "connected" ? "bg-green-600" : "bg-red-600"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-green-300"
                    : "bg-red-300"
                }`}
              ></div>
              <span>
                {connectionStatus === "connected"
                  ? "Connected"
                  : "Disconnected"}
              </span>
            </div>
            <button
              onClick={testApiConnection}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors"
            >
              Test API
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status Alert */}
      {connectionStatus === "disconnected" && (
        <div className="mb-4 p-4 bg-red-600 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle size={20} className="mr-2" />
            <span>
              Unable to connect to trading server on port 5001. Make sure the
              backend is running.
            </span>
          </div>
        </div>
      )}

      {/* Alerts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-3 rounded-lg shadow-lg transition-all duration-300 ${
              alert.type === "success"
                ? "bg-green-600"
                : alert.type === "warning"
                ? "bg-yellow-600"
                : alert.type === "info"
                ? "bg-blue-600"
                : "bg-red-600"
            }`}
          >
            <div className="flex items-center space-x-2">
              {alert.type === "success" ? (
                <CheckCircle size={16} />
              ) : alert.type === "info" ? (
                <Activity size={16} />
              ) : (
                <AlertTriangle size={16} />
              )}
              <span className="text-sm">{alert.message}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex space-x-4 mb-6 border-b border-gray-700">
        {["dashboard", "opportunities", "analysis", "settings"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 capitalize transition-colors ${
              activeTab === tab
                ? "border-b-2 border-blue-400 text-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Market Data Cards */}
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(marketData).map(([pair, data]) => (
              <div key={pair} className="bg-gray-800 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-blue-400">
                      {pair}
                    </h3>
                    <p className="text-2xl font-bold">
                      {formatPrice(data.price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                        data.regime === "trending"
                          ? "bg-green-600"
                          : data.regime === "ranging"
                          ? "bg-yellow-600"
                          : "bg-red-600"
                      }`}
                    >
                      {data.regime === "trending" ? (
                        <TrendingUp size={12} className="mr-1" />
                      ) : data.regime === "ranging" ? (
                        <Activity size={12} className="mr-1" />
                      ) : (
                        <TrendingDown size={12} className="mr-1" />
                      )}
                      {data.regime.toUpperCase()}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Updated: {formatTime(data.lastUpdate)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-700 p-3 rounded">
                    <p className="text-xs text-gray-400">Spread</p>
                    <p className="text-lg font-semibold">{data.spread} pips</p>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <p className="text-xs text-gray-400">ATR</p>
                    <p className="text-lg font-semibold">
                      {(data.atr * 10000).toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <p className="text-xs text-gray-400">RSI</p>
                    <p
                      className={`text-lg font-semibold ${
                        data.rsi > 70
                          ? "text-red-400"
                          : data.rsi < 30
                          ? "text-green-400"
                          : "text-white"
                      }`}
                    >
                      {data.rsi.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <p className="text-xs text-gray-400">ADX</p>
                    <p className="text-lg font-semibold">
                      {data.adx.toFixed(1)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">VWAP Slope:</span>
                    <span
                      className={`text-sm font-semibold ${
                        data.vwapSlope > 0.0001
                          ? "text-green-400"
                          : data.vwapSlope < -0.0001
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {data.vwapSlope > 0 ? "+" : ""}
                      {(data.vwapSlope * 10000).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">Correlation:</span>
                    <span className="text-sm font-semibold">
                      {(data.correlation * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Status */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Shield size={20} className="mr-2 text-blue-400" />
                Account Status
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Balance</span>
                  <span className="font-semibold">
                    ${accountSettings.balance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Daily P&L</span>
                  <span
                    className={`font-semibold ${
                      accountSettings.currentPnL >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    ${accountSettings.currentPnL.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Trades Today</span>
                  <span className="font-semibold">
                    {accountSettings.tradesCount}/{accountSettings.maxTrades}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      (Math.abs(accountSettings.currentPnL) /
                        accountSettings.balance) *
                        100 >
                      2
                        ? "bg-red-500"
                        : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (Math.abs(accountSettings.currentPnL) /
                          (accountSettings.balance * 0.025)) *
                          100
                      )}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400">
                  Risk used:{" "}
                  {(
                    (Math.abs(accountSettings.currentPnL) /
                      accountSettings.balance) *
                    100
                  ).toFixed(1)}
                  % / 2.5%
                </p>
              </div>
            </div>

            {/* News Events */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Clock size={20} className="mr-2 text-blue-400" />
                Economic Calendar
              </h3>
              <div className="space-y-3">
                {newsEvents.map((event, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-700 rounded"
                  >
                    <div>
                      <p className="text-sm font-medium">{event.time}</p>
                      <p className="text-xs text-gray-400">{event.event}</p>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs ${
                        event.impact === "high"
                          ? "bg-red-600"
                          : event.impact === "medium"
                          ? "bg-yellow-600"
                          : "bg-green-600"
                      }`}
                    >
                      {event.impact.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Opportunities Tab */}
      {activeTab === "opportunities" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Trading Opportunities</h2>
            <button
              onClick={assessOpportunities}
              disabled={connectionStatus !== "connected"}
              className={`px-4 py-2 rounded-lg transition-colors ${
                connectionStatus === "connected"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-600 cursor-not-allowed"
              }`}
            >
              {connectionStatus === "connected"
                ? "Refresh Analysis"
                : "Not Connected"}
            </button>
          </div>

          {opportunities.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-400">
                No trading opportunities detected at the moment.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                The system continuously monitors market conditions.
              </p>
              {connectionStatus !== "connected" && (
                <p className="text-sm text-red-400 mt-2">
                  Please ensure the backend server is running on port 5001.
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {opportunities.map((opp) => (
                <div key={opp.id} className="bg-gray-800 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-blue-400">
                        {opp.pair}
                      </h3>
                      <p className="text-gray-400">{opp.setup}</p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded text-sm font-semibold ${
                          opp.confidence === "high"
                            ? "bg-green-600"
                            : opp.confidence === "medium"
                            ? "bg-yellow-600"
                            : "bg-red-600"
                        }`}
                      >
                        Score: {opp.score}%
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(opp.timestamp)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-gray-700 p-3 rounded">
                      <p className="text-xs text-gray-400">Entry</p>
                      <p className="text-lg font-semibold text-blue-400">
                        {formatPrice(opp.entry)}
                      </p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <p className="text-xs text-gray-400">Stop Loss</p>
                      <p className="text-lg font-semibold text-red-400">
                        {formatPrice(opp.stopLoss)}
                      </p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <p className="text-xs text-gray-400">Take Profit</p>
                      <p className="text-lg font-semibold text-green-400">
                        {formatPrice(opp.takeProfit)}
                      </p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <p className="text-xs text-gray-400">Risk:Reward</p>
                      <p className="text-lg font-semibold">
                        1:{opp.riskReward}
                      </p>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <p className="text-xs text-gray-400">Regime</p>
                      <p className="text-lg font-semibold capitalize">
                        {opp.regime}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-gray-700 rounded">
                    <p className="text-sm">
                      <span className="text-gray-400">Analysis:</span>{" "}
                      {opp.analysis ||
                        `${opp.setup} setup detected in ${opp.regime} market conditions with ${opp.confidence} confidence.`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === "analysis" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Market Analysis</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Price Chart */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                EUR/USD Price Movement
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={[
                    { time: "09:00", price: 1.084 },
                    { time: "10:00", price: 1.0845 },
                    { time: "11:00", price: 1.085 },
                    { time: "12:00", price: 1.0855 },
                    { time: "13:00", price: 1.0852 },
                    { time: "14:00", price: 1.0855 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" />
                  <YAxis
                    domain={["dataMin - 0.001", "dataMax + 0.001"]}
                    stroke="#9CA3AF"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "none",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#9CA3AF" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#60A5FA"
                    strokeWidth={2}
                    dot={{ fill: "#60A5FA" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Connection Status */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">System Status</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Backend Connection</span>
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      connectionStatus === "connected"
                        ? "bg-green-600"
                        : "bg-red-600"
                    }`}
                  >
                    {connectionStatus === "connected"
                      ? "Active"
                      : "Disconnected"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Server Port</span>
                  <span className="font-mono text-blue-400">5001</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>WebSocket URL</span>
                  <span className="font-mono text-sm text-blue-400">
                    {process.env.REACT_APP_WS_URL || "http://localhost:5001"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>API URL</span>
                  <span className="font-mono text-sm text-blue-400">
                    {process.env.REACT_APP_API_URL ||
                      "http://localhost:5001/api"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Settings</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Settings */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Account Balance ($)
                  </label>
                  <input
                    type="number"
                    value={accountSettings.balance}
                    onChange={(e) =>
                      setAccountSettings((prev) => ({
                        ...prev,
                        balance: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Risk Per Trade (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={accountSettings.riskPerTrade}
                    onChange={(e) =>
                      setAccountSettings((prev) => ({
                        ...prev,
                        riskPerTrade: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Daily Loss Limit (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={accountSettings.dailyLossLimit}
                    onChange={(e) =>
                      setAccountSettings((prev) => ({
                        ...prev,
                        dailyLossLimit: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Max Trades Per Day
                  </label>
                  <input
                    type="number"
                    value={accountSettings.maxTrades}
                    onChange={(e) =>
                      setAccountSettings((prev) => ({
                        ...prev,
                        maxTrades: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Connection Settings */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                Connection Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Backend URL
                  </label>
                  <input
                    type="text"
                    value={
                      process.env.REACT_APP_WS_URL || "http://localhost:5001"
                    }
                    readOnly
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Configured via environment variables
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    API Endpoint
                  </label>
                  <input
                    type="text"
                    value={
                      process.env.REACT_APP_API_URL ||
                      "http://localhost:5001/api"
                    }
                    readOnly
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white opacity-50"
                  />
                </div>
                <div className="mt-4 flex space-x-4">
                  <button
                    onClick={testApiConnection}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    Test API Connection
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    Reload App
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForexAssessmentApp;
