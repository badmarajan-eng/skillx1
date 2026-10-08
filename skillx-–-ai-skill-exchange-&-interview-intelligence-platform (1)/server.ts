import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.use(express.json());
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "SkillX Backend is running" });
  });

  app.post("/api/interview/save", (req, res) => {
    const { userId, config, stats, transcript, tabSwitches } = req.body;
    console.log("Saving interview result:", { userId, config, stats, tabSwitches });
    // In a real app, this would save to a database
    res.json({ success: true, message: "Interview result saved successfully" });
  });

  app.post("/api/interview/analyze", async (req, res) => {
    const { transcript, role, experience } = req.body;
    
    console.log("Analyzing interview for role:", role);
    
    // In a real app, this would call Gemini API server-side
    // For now, we'll return a success message and let the client handle the heavy lifting
    // or we could implement the Gemini call here if we had the API key in process.env
    
    res.json({ 
      success: true, 
      message: "Analysis started",
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/mentors", (req, res) => {
    // This could fetch from Firestore using Admin SDK
    res.json({
      success: true,
      mentors: [
        { id: '1', name: 'Sarah Chen', role: 'Frontend' },
        { id: '2', name: 'Marcus Rodriguez', role: 'Backend' }
      ]
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
