import path from "path";
import app from "./api/index";

const PORT = 3000;

// Serve Vite dev server or static distribution locally
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Dynamic import to avoid Vercel bundler failing on serverless API build
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    import("express").then(({ default: express }) => {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start the server locally if not running inside Vercel's serverless environment
if (!process.env.VERCEL) {
  startServer();
}

export default app;
