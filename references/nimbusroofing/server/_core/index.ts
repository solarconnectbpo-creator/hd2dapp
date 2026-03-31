import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { applySecurityMiddleware } from "../security";
import { weatherMonitoringService } from "../weatherMonitoringService";
import { realtimeNotifications } from "../realtimeNotifications";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Apply security middleware FIRST (before body parser)
  applySecurityMiddleware(app);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Public REST API
  const { setupPublicApi } = await import("../publicApi");
  setupPublicApi(app);
  
  // Twilio webhooks
  const { setupTwilioWebhooks } = await import("../twilioWebhooks");
  setupTwilioWebhooks(app);
  
  // SendGrid webhooks
  const { handleSendGridWebhook } = await import("../sendgridWebhooks");
  app.post('/webhooks/sendgrid/events', handleSendGridWebhook);
  
  // Video sitemap
  const { generateVideoSitemap } = await import("../videoSitemap");
  app.get('/video-sitemap.xml', async (req, res) => {
    try {
      const xml = await generateVideoSitemap();
      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error('[Video Sitemap] Error generating sitemap:', error);
      res.status(500).send('Error generating video sitemap');
    }
  });
  
  // Real-time notifications (SSE)
  app.get('/api/notifications/stream', (req, res) => {
    const clientId = req.query.clientId as string || `client_${Date.now()}`;
    const userId = (req as any).user?.id || 1; // Default to admin for now
    realtimeNotifications.addClient(clientId, res, userId);
  });
  
  // Notification stats endpoint
  app.get('/api/notifications/stats', (req, res) => {
    res.json(realtimeNotifications.getStats());
  });
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Start weather monitoring service
    weatherMonitoringService.startMonitoring().catch(err => {
      console.error("[Weather Monitor] Failed to start:", err);
    });
  });
}

startServer().catch(console.error);
