import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import multer from "multer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Multer for file uploads (simulated for now, would normally go to Cloud Storage)
  const storage = multer.memoryStorage();
  const upload = multer({ storage });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "e-AWAS Pro API is running" });
  });

  // Mock endpoint for photo upload (in a real app, this would upload to Firebase Storage)
  app.post("/api/upload", upload.single("photo"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    // In a real app, you'd upload to Storage and get a URL.
    // Here we'll return a placeholder URL for the demo.
    const placeholderUrl = `https://picsum.photos/seed/${Date.now()}/800/600`;
    res.json({ url: placeholderUrl });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`e-AWAS Pro Server running on http://localhost:${PORT}`);
  });
}

startServer();
