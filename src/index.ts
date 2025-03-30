import "dotenv/config";
import "./corn";
import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Health check
app.get("/health", (req, res) => {
  res.send("OK");
});

// Ping endpoint
app.get("/ping", (req, res) => {
  res.send("OK");
});

const PORT = process.env.PORT ?? 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const keepServerAlive = () => {
  // Array of endpoints to ping
  const endpoints = ["/", "/health", "/ping"];

  // Random interval between 4-5 minutes (avoiding exact 5-minute intervals)
  const getRandomInterval = () => 4 * 60 * 1000 + Math.random() * (60 * 1000);

  // Ping random endpoint
  const pingServer = () => {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const serverUrl = process.env.SERVER_URL ?? "http://localhost:3000";

    axios.get(`${serverUrl}${endpoint}`).catch((error) => {
      console.log(`Keep-alive request to ${endpoint} failed:`, error.message);
    });

    // Schedule next ping with random interval
    setTimeout(pingServer, getRandomInterval());
  };

  // Start the first ping
  pingServer();
};

keepServerAlive();
