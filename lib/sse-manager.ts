type SseClient = {
  send: (data: any) => void;
  close: () => void;
};

// Global registry of SSE clients. Storing on global object prevents
// losing clients during HMR (Hot Module Replacement) in development.
const globalForSse = global as unknown as {
  sseClients?: Map<string, Set<SseClient>>;
};

const clients = globalForSse.sseClients || new Map<string, Set<SseClient>>();

if (process.env.NODE_ENV !== "production") {
  globalForSse.sseClients = clients;
}

export function registerSseClient(userId: string, client: SseClient) {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId)!.add(client);
}

export function unregisterSseClient(userId: string, client: SseClient) {
  const userClients = clients.get(userId);
  if (userClients) {
    userClients.delete(client);
    if (userClients.size === 0) {
      clients.delete(userId);
    }
  }
}

export function broadcastToUser(userId: string, notification: any) {
  const userClients = clients.get(userId);
  if (userClients) {
    const transformed = {
      id: notification.id,
      user_id: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      category: notification.category,
      is_read: notification.isRead,
      action_url: notification.actionUrl,
      metadata: notification.metadata,
      created_at: notification.createdAt,
      updated_at: notification.updatedAt,
    };
    userClients.forEach((client) => {
      try {
        client.send(transformed);
      } catch (err) {
        console.error(`Failed to send notification via SSE to user ${userId}:`, err);
      }
    });
  }
}
