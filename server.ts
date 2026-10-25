import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const STATE_FILE_PATH = path.resolve(process.cwd(), '.realtime-portal-state.json');

interface PresenceSession {
  sessionId: string;
  userId: string | null;
  username: string | null;
  isRegistered: boolean;
  lastActiveAt: number;
}

// Authoritative in-memory state + disk persistence for instant multi-user sync
let authoritativeState: Record<string, unknown> | null = null;
let latestChatPatch: Record<string, unknown> | null = null;
let stateVersion = Date.now();
let chatVersion = Date.now();
let lastChatSenderTabId: string | null = null;
const presenceMap = new Map<string, PresenceSession>();

try {
  if (fs.existsSync(STATE_FILE_PATH)) {
    const raw = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      authoritativeState = parsed;
      latestChatPatch = {
        liveChatMessages: parsed.liveChatMessages || [],
        privateChatMessages: parsed.privateChatMessages || [],
        privateChatStatuses: parsed.privateChatStatuses || {},
        chatTypingMap: parsed.chatTypingMap || {},
        chatPenalties: parsed.chatPenalties || [],
        userBlockedMap: parsed.userBlockedMap || {},
      };
    }
  }
} catch {
  authoritativeState = null;
}

let diskSaveTimer: ReturnType<typeof setTimeout> | null = null;
function saveStateToDisk(state: Record<string, unknown>) {
  if (diskSaveTimer) {
    clearTimeout(diskSaveTimer);
  }
  diskSaveTimer = setTimeout(() => {
    fs.promises
      .writeFile(STATE_FILE_PATH, JSON.stringify(state), 'utf-8')
      .catch(() => {
        // ignore disk write errors in read-only environments
      });
  }, 400);
}

function computeOnlineStats() {
  const now = Date.now();
  for (const [key, sess] of presenceMap.entries()) {
    if (now - sess.lastActiveAt > 10000) {
      presenceMap.delete(key);
    }
  }
  const registeredMap = new Map<string, string>();
  let guestsCount = 0;

  for (const sess of presenceMap.values()) {
    if (sess.isRegistered && sess.userId) {
      registeredMap.set(sess.userId, sess.username || 'مستخدم مسجل');
    } else {
      guestsCount += 1;
    }
  }

  const registeredCount = registeredMap.size;
  const totalOnline = Math.max(1, registeredCount + guestsCount);
  return {
    totalOnline,
    registeredCount,
    guestsCount,
    registeredUsernames: Array.from(registeredMap.values()),
  };
}

// Connected SSE clients for <10ms instant broadcast to all users
const sseClients = new Set<express.Response>();
const SSE_FLUSH_PADDING = `: ${' '.repeat(2048)}\n`;

function broadcastSseEvent(eventType: string, payload: unknown) {
  const dataString = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n${SSE_FLUSH_PADDING}\n`;
  for (const client of sseClients) {
    try {
      client.write(dataString);
      (client as unknown as { flush?: () => void }).flush?.();
    } catch {
      sseClients.delete(client);
    }
  }
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '50mb' }));

  // 1. Live SSE Stream for instant real-time updates (Public Chat, Private Chat, Settings, Utilities, Posts)
  app.get('/api/realtime/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    req.socket?.setNoDelay?.(true);
    res.flushHeaders?.();

    sseClients.add(res);

    // Send initial state & presence immediately upon connection
    if (authoritativeState) {
      res.write(
        `event: state_update\ndata: ${JSON.stringify({
          version: stateVersion,
          state: authoritativeState,
          senderTabId: 'server_init',
        })}\n${SSE_FLUSH_PADDING}\n`
      );
    }
    res.write(
      `event: presence_update\ndata: ${JSON.stringify(computeOnlineStats())}\n${SSE_FLUSH_PADDING}\n`
    );

    const keepAliveTimer = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAliveTimer);
        sseClients.delete(res);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAliveTimer);
      sseClients.delete(res);
    });
  });

  // 2. Get current authoritative state
  app.get('/api/realtime/state', (_req, res) => {
    res.json({
      version: stateVersion,
      state: authoritativeState,
      onlineStats: computeOnlineStats(),
    });
  });

  // 3. Publish state update & immediately broadcast to all connected clients
  app.post('/api/realtime/sync', (req, res) => {
    const { state, senderTabId } = req.body || {};
    if (!state || typeof state !== 'object') {
      res.status(400).json({ error: 'Invalid state payload' });
      return;
    }

    const storeInteractionsMap: Record<string, unknown> = {};
    if (Array.isArray(state.stores)) {
      for (const st of state.stores as Array<Record<string, unknown>>) {
        if (st && typeof st.id === 'string') {
          storeInteractionsMap[st.id] = {
            likes: Array.isArray(st.likes) ? st.likes : [],
            dislikes: Array.isArray(st.dislikes) ? st.dislikes : [],
            ratings: st.ratings && typeof st.ratings === 'object' ? st.ratings : {},
            viewsCount: typeof st.viewsCount === 'number' ? st.viewsCount : 0,
            comments: Array.isArray(st.comments) ? st.comments : [],
          };
        }
      }
    }

    authoritativeState = state;
    stateVersion = Date.now();
    chatVersion = stateVersion;
    lastChatSenderTabId = senderTabId || null;
    latestChatPatch = {
      liveChatMessages: state.liveChatMessages || [],
      privateChatMessages: state.privateChatMessages || [],
      privateChatStatuses: state.privateChatStatuses || {},
      chatTypingMap: state.chatTypingMap || {},
      chatPenalties: state.chatPenalties || [],
      userBlockedMap: state.userBlockedMap || {},
      buySellPosts: state.buySellPosts || [],
      storeInteractionsMap,
    };

    broadcastSseEvent('state_update', {
      version: stateVersion,
      state: authoritativeState,
      senderTabId: senderTabId || null,
    });

    saveStateToDisk(state);
    res.json({ ok: true, version: stateVersion });
  });

  // 4. Ultra-fast Live Chat, Typing & Online Presence delta GET/POST endpoints (< 15ms)
  app.get('/api/realtime/chat-fast', (req, res) => {
    const since = Number(req.query.since || 0);
    const onlineStats = computeOnlineStats();
    res.setHeader('Cache-Control', 'no-store');
    if (since > 0 && since === chatVersion) {
      res.json({ changed: false, version: chatVersion, onlineStats });
      return;
    }
    res.json({
      changed: true,
      version: chatVersion,
      chatPatch: latestChatPatch,
      senderTabId: lastChatSenderTabId,
      onlineStats,
    });
  });

  app.post('/api/realtime/chat-fast', (req, res) => {
    const { chatPatch, senderTabId } = req.body || {};
    if (!chatPatch || typeof chatPatch !== 'object') {
      res.status(400).json({ error: 'Invalid chatPatch' });
      return;
    }

    chatVersion = Date.now();
    stateVersion = chatVersion;
    lastChatSenderTabId = senderTabId || null;
    latestChatPatch = {
      ...(latestChatPatch || {}),
      ...chatPatch,
    };

    // Broadcast to SSE clients FIRST before any disk work for 0ms latency
    broadcastSseEvent('chat_fast_update', {
      version: chatVersion,
      chatPatch: latestChatPatch,
      senderTabId: senderTabId || null,
      onlineStats: computeOnlineStats(),
    });

    if (authoritativeState) {
      const prevSettings =
        (authoritativeState.settings as Record<string, unknown>) || {};
      const patchSettings =
        (chatPatch.settings as Record<string, unknown>) || {};
      let mergedStores = authoritativeState.stores;
      if (
        Array.isArray(authoritativeState.stores) &&
        chatPatch.storeInteractionsMap &&
        typeof chatPatch.storeInteractionsMap === 'object'
      ) {
        const map = chatPatch.storeInteractionsMap as Record<
          string,
          Record<string, unknown>
        >;
        mergedStores = (authoritativeState.stores as Array<Record<string, unknown>>).map(
          (st) => {
            const id = typeof st.id === 'string' ? st.id : '';
            const delta = id ? map[id] : undefined;
            if (!delta) return st;
            return {
              ...st,
              likes: Array.isArray(delta.likes) ? delta.likes : st.likes,
              dislikes: Array.isArray(delta.dislikes) ? delta.dislikes : st.dislikes,
              ratings:
                delta.ratings && typeof delta.ratings === 'object'
                  ? delta.ratings
                  : st.ratings,
              viewsCount:
                typeof delta.viewsCount === 'number' ? delta.viewsCount : st.viewsCount,
              comments: Array.isArray(delta.comments) ? delta.comments : st.comments,
            };
          }
        );
      }
      const nextState: Record<string, unknown> = {
        ...authoritativeState,
        ...chatPatch,
        stores: mergedStores,
        settings: {
          ...prevSettings,
          ...patchSettings,
        },
      };
      authoritativeState = nextState;
      saveStateToDisk(nextState);
    }

    res.json({ ok: true, version: chatVersion, onlineStats: computeOnlineStats() });
  });

  // 5. Real-time multi-device online presence heartbeat
  app.post('/api/realtime/presence', (req, res) => {
    const { sessionId, userId, username, isRegistered, remove } = req.body || {};
    if (sessionId && typeof sessionId === 'string') {
      if (remove) {
        presenceMap.delete(sessionId);
      } else {
        presenceMap.set(sessionId, {
          sessionId,
          userId: userId || null,
          username: username || null,
          isRegistered: Boolean(isRegistered),
          lastActiveAt: Date.now(),
        });
      }
    }
    const stats = computeOnlineStats();
    broadcastSseEvent('presence_update', stats);
    res.json(stats);
  });

  // Mount Vite in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Real-time server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
