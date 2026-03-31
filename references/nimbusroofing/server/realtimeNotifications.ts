import { Response } from "express";

/**
 * Real-time notification system using Server-Sent Events (SSE)
 * Provides live updates for callback dashboard without WebSocket complexity
 */

interface SSEClient {
  id: string;
  res: Response;
  userId: number;
}

class RealtimeNotificationService {
  private clients: Map<string, SSEClient> = new Map();

  /**
   * Register a new SSE client
   */
  addClient(clientId: string, res: Response, userId: number) {
    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    // Store client
    this.clients.set(clientId, { id: clientId, res, userId });

    // Send initial connection message
    this.sendToClient(clientId, {
      type: "connected",
      message: "Real-time notifications connected",
      timestamp: new Date().toISOString(),
    });

    // Handle client disconnect
    res.on("close", () => {
      this.clients.delete(clientId);
      console.log(`[SSE] Client ${clientId} disconnected`);
    });

    console.log(`[SSE] Client ${clientId} connected. Total clients: ${this.clients.size}`);
  }

  /**
   * Send notification to specific client
   */
  sendToClient(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (client) {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }

  /**
   * Broadcast notification to all connected clients
   */
  broadcast(data: any) {
    this.clients.forEach((client) => {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
    console.log(`[SSE] Broadcasted to ${this.clients.size} clients:`, data.type);
  }

  /**
   * Send notification to specific user (all their connected clients)
   */
  sendToUser(userId: number, data: any) {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.userId === userId) {
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
        count++;
      }
    });
    console.log(`[SSE] Sent to user ${userId} (${count} clients):`, data.type);
  }

  /**
   * Notify about new callback request
   */
  notifyNewCallback(callback: any) {
    this.broadcast({
      type: "new_callback",
      data: callback,
      message: `New callback request from ${callback.name}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify about callback status update
   */
  notifyCallbackUpdate(callbackId: number, status: string, updatedBy: number) {
    this.broadcast({
      type: "callback_updated",
      data: { callbackId, status, updatedBy },
      message: `Callback #${callbackId} updated to ${status}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify about new lead
   */
  notifyNewLead(lead: any) {
    this.broadcast({
      type: "new_lead",
      data: lead,
      message: `New lead from ${lead.name}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify about SMS sent
   */
  notifySmsSent(callbackId: number, phone: string) {
    this.broadcast({
      type: "sms_sent",
      data: { callbackId, phone },
      message: `SMS sent to ${phone}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify about call initiated
   */
  notifyCallInitiated(callbackId: number, phone: string) {
    this.broadcast({
      type: "call_initiated",
      data: { callbackId, phone },
      message: `Call initiated to ${phone}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      totalClients: this.clients.size,
      clients: Array.from(this.clients.values()).map((c) => ({
        id: c.id,
        userId: c.userId,
      })),
    };
  }
}

// Singleton instance
export const realtimeNotifications = new RealtimeNotificationService();
