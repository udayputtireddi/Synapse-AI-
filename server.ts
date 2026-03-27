import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Meeting } from "./src/types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let meetings: Meeting[] = [];

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API: Get all meetings
  app.get("/api/meetings", (req, res) => {
    res.json(meetings);
  });

  // API: Save a meeting
  app.post("/api/meetings", (req, res) => {
    const meeting = req.body;
    meetings.push(meeting);
    res.json(meeting);
  });

  // API: Update a meeting
  app.put("/api/meetings/:id", (req, res) => {
    const { id } = req.params;
    const updatedMeeting = req.body;
    meetings = meetings.map(m => m.id === id ? updatedMeeting : m);
    res.json(updatedMeeting);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Synapse AI Server running on http://localhost:${PORT}`);
  });
}

startServer();
