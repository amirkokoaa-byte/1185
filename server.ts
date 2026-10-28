import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const STATE_FILE_PATH = path.resolve(process.cwd(), '.realtime-portal-state.json');
const ARCHIVE_FILE_PATH = path.resolve(
  process.cwd(),
  '.realtime-portal-cumulative-archive.json'
);

interface PresenceSession {
  sessionId: string;
  visitorId: string;
  userId: string | null;
  username: string | null;
  isRegistered: boolean;
  lastActiveAt: number;
}

// Authoritative in-memory state + disk persistence + Permanent Cumulative Archive for instant multi-user sync & full historical recovery
let authoritativeState: Record<string, unknown> | null = null;
let cumulativeArchiveState: Record<string, unknown> | null = null;
let latestChatPatch: Record<string, unknown> | null = null;
let stateVersion = Date.now();
let chatVersion = Date.now();
let lastChatSenderTabId: string | null = null;
const presenceMap = new Map<string, PresenceSession>();

try {
  if (fs.existsSync(ARCHIVE_FILE_PATH)) {
    const rawArchive = fs.readFileSync(ARCHIVE_FILE_PATH, 'utf-8');
    const parsedArchive = JSON.parse(rawArchive);
    if (parsedArchive && typeof parsedArchive === 'object') {
      cumulativeArchiveState = parsedArchive;
    }
  }
} catch {
  cumulativeArchiveState = null;
}

try {
  if (fs.existsSync(STATE_FILE_PATH)) {
    const raw = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      authoritativeState = parsed;
      if (!cumulativeArchiveState) {
        cumulativeArchiveState = { ...parsed, deletedRecordIds: [] };
      }
      latestChatPatch = {
        users: parsed.users || [],
        topBanners: parsed.topBanners || [],
        squareAds: parsed.squareAds || [],
        popupAd: parsed.popupAd,
        serviceNumbers: parsed.serviceNumbers || [],
        liveChatMessages: parsed.liveChatMessages || [],
        privateChatMessages: parsed.privateChatMessages || [],
        privateChatStatuses: parsed.privateChatStatuses || {},
        chatTypingMap: parsed.chatTypingMap || {},
        chatPenalties: parsed.chatPenalties || [],
        userBlockedMap: parsed.userBlockedMap || {},
        privateChatReports: parsed.privateChatReports || [],
        messages: parsed.messages || [],
        buySellPosts: parsed.buySellPosts || [],
        communityPosts: parsed.communityPosts || [],
        settings: parsed.settings || {},
        deletedRecordIds: parsed.deletedRecordIds || [],
      };
    }
  }
} catch {
  authoritativeState = null;
}

function mergeArrayByIdServer(
  prevList: unknown,
  nextList: unknown,
  deletedSet: Set<string>
): Array<Record<string, unknown>> {
  const prev = Array.isArray(prevList) ? (prevList as Array<Record<string, unknown>>) : [];
  const next = Array.isArray(nextList) ? (nextList as Array<Record<string, unknown>>) : [];
  const map = new Map<string, Record<string, unknown>>();
  for (const item of prev) {
    if (item && typeof item.id === 'string' && !deletedSet.has(item.id)) {
      map.set(item.id, item);
    }
  }
  for (const item of next) {
    if (item && typeof item.id === 'string' && !deletedSet.has(item.id)) {
      map.set(item.id, item);
    }
  }
  const result: Array<Record<string, unknown>> = [];
  const added = new Set<string>();
  for (const item of next) {
    if (item && typeof item.id === 'string' && map.has(item.id) && !added.has(item.id)) {
      result.push(map.get(item.id)!);
      added.add(item.id);
    }
  }
  for (const item of prev) {
    if (item && typeof item.id === 'string' && map.has(item.id) && !added.has(item.id)) {
      result.push(map.get(item.id)!);
      added.add(item.id);
    }
  }
  return result;
}

function mergeAdCampaignsServer(
  prevList: unknown,
  nextList: unknown,
  deletedSet: Set<string>
): Array<Record<string, unknown>> {
  const merged = mergeArrayByIdServer(prevList, nextList, deletedSet);
  const nowMs = Date.now();
  return merged.filter((item) => {
    if (!item) return false;
    if (typeof item.expiresAt === 'string' && item.expiresAt.trim()) {
      const expMs = new Date(item.expiresAt).getTime();
      if (!Number.isNaN(expMs) && expMs <= nowMs) return false;
    }
    return true;
  });
}

function mergeUsersServer(
  prevUsers: unknown,
  nextUsers: unknown,
  deletedSet: Set<string>
): Array<Record<string, unknown>> {
  const prev = Array.isArray(prevUsers) ? (prevUsers as Array<Record<string, unknown>>) : [];
  const next = Array.isArray(nextUsers) ? (nextUsers as Array<Record<string, unknown>>) : [];
  const isDeleted = (u: Record<string, unknown>) => {
    const id = typeof u.id === 'string' ? u.id : '';
    const uname = typeof u.username === 'string' ? u.username.trim().toLowerCase() : '';
    const acc = typeof u.accountName === 'string' ? u.accountName.trim().toLowerCase() : '';
    return (
      (id && deletedSet.has(id)) ||
      (uname && deletedSet.has(`user:${uname}`)) ||
      (acc && deletedSet.has(`acc:${acc}`))
    );
  };
  const map = new Map<string, Record<string, unknown>>();
  for (const u of prev) {
    if (u && !isDeleted(u)) {
      const k = String(u.accountName || u.username || u.id || '').toLowerCase();
      if (k) map.set(k, u);
    }
  }
  for (const u of next) {
    if (u && !isDeleted(u)) {
      const k = String(u.accountName || u.username || u.id || '').toLowerCase();
      if (k) map.set(k, u);
    }
  }
  return Array.from(map.values());
}

function mergeSettingsServer(
  prevSettings: Record<string, unknown> | undefined,
  nextSettings: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!prevSettings) return nextSettings || {};
  if (!nextSettings) return prevSettings;
  const prevTs = typeof prevSettings.updatedAt === 'number' ? prevSettings.updatedAt : 0;
  const nextTs = typeof nextSettings.updatedAt === 'number' ? nextSettings.updatedAt : 0;
  if (prevTs > nextTs) {
    return {
      ...nextSettings,
      ...prevSettings,
    };
  }
  return {
    ...prevSettings,
    ...nextSettings,
  };
}

let diskSaveTimer: ReturnType<typeof setTimeout> | null = null;
let archiveSaveTimer: ReturnType<typeof setTimeout> | null = null;

function mergeIntoCumulativeArchive(incoming: Record<string, unknown>) {
  const emptyDeleted = new Set<string>();
  const base = cumulativeArchiveState || {};
  cumulativeArchiveState = {
    ...base,
    ...incoming,
    deletedRecordIds: [],
    users: mergeUsersServer(base.users, incoming.users, emptyDeleted),
    stores: mergeArrayByIdServer(base.stores, incoming.stores, emptyDeleted),
    serviceNumbers: mergeArrayByIdServer(
      base.serviceNumbers,
      incoming.serviceNumbers,
      emptyDeleted
    ),
    tawsilaRides: mergeArrayByIdServer(
      base.tawsilaRides,
      incoming.tawsilaRides,
      emptyDeleted
    ),
    communityPosts: mergeArrayByIdServer(
      base.communityPosts,
      incoming.communityPosts,
      emptyDeleted
    ),
    utilitySubmissions: mergeArrayByIdServer(
      base.utilitySubmissions,
      incoming.utilitySubmissions,
      emptyDeleted
    ),
    utilityPosts: mergeArrayByIdServer(
      base.utilityPosts,
      incoming.utilityPosts,
      emptyDeleted
    ),
    buySellPosts: mergeArrayByIdServer(
      base.buySellPosts,
      incoming.buySellPosts,
      emptyDeleted
    ),
    topBanners: mergeArrayByIdServer(
      base.topBanners,
      incoming.topBanners,
      emptyDeleted
    ),
    squareAds: mergeArrayByIdServer(
      base.squareAds,
      incoming.squareAds,
      emptyDeleted
    ),
    messages: mergeArrayByIdServer(base.messages, incoming.messages, emptyDeleted),
    privateChatMessages: mergeArrayByIdServer(
      base.privateChatMessages,
      incoming.privateChatMessages,
      emptyDeleted
    ),
    liveChatMessages: mergeArrayByIdServer(
      base.liveChatMessages,
      incoming.liveChatMessages,
      emptyDeleted
    ),
    settings: mergeSettingsServer(
      base.settings as Record<string, unknown> | undefined,
      incoming.settings as Record<string, unknown> | undefined
    ),
  };

  if (archiveSaveTimer) {
    clearTimeout(archiveSaveTimer);
  }
  archiveSaveTimer = setTimeout(() => {
    if (cumulativeArchiveState) {
      fs.promises
        .writeFile(ARCHIVE_FILE_PATH, JSON.stringify(cumulativeArchiveState), 'utf-8')
        .catch(() => {});
    }
  }, 450);
}

function saveStateToDisk(state: Record<string, unknown>) {
  mergeIntoCumulativeArchive(state);
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

// Real-time online stats based on live active heartbeats (45s TTL) + online registered users
const LIVE_PRESENCE_TTL_MS = 45000;

function computeOnlineStats() {
  const now = Date.now();
  for (const [key, sess] of presenceMap.entries()) {
    if (now - sess.lastActiveAt > LIVE_PRESENCE_TTL_MS) {
      presenceMap.delete(key);
    }
  }

  const registeredMap = new Map<string, string>();
  const registeredVisitorIds = new Set<string>();
  const guestVisitorIds = new Set<string>();

  if (authoritativeState && Array.isArray(authoritativeState.users)) {
    for (const u of authoritativeState.users as Array<Record<string, unknown>>) {
      if (u && u.isOnline === true && !u.isBanned && typeof u.username === 'string') {
        const displayUsername = u.username.trim();
        if (displayUsername) {
          registeredMap.set(displayUsername.toLowerCase(), displayUsername);
        }
      }
    }
  }

  for (const sess of presenceMap.values()) {
    if (sess.isRegistered && (sess.username || sess.userId)) {
      const displayUsername = (sess.username || 'مستخدم مسجل').trim();
      const mapKey = displayUsername.toLowerCase() || sess.userId || sess.sessionId;
      registeredMap.set(mapKey, displayUsername);
      if (sess.visitorId) {
        registeredVisitorIds.add(sess.visitorId);
      }
    }
  }

  for (const sess of presenceMap.values()) {
    if (!sess.isRegistered) {
      const vKey = sess.visitorId || sess.sessionId;
      if (!registeredVisitorIds.has(vKey)) {
        guestVisitorIds.add(vKey);
      }
    }
  }

  const registeredCount = registeredMap.size;
  const guestsCount = guestVisitorIds.size;
  const totalOnline = registeredCount + guestsCount;
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

  // 2B. Get permanent cumulative archive state (all inputs since site creation up to today)
  app.get('/api/realtime/archive', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      archive: cumulativeArchiveState || authoritativeState,
      activeState: authoritativeState,
    });
  });

  // 2C. Full authoritative state replacement on Import / Historical Restore
  app.post('/api/realtime/restore-full', (req, res) => {
    const { state, senderTabId } = req.body || {};
    if (!state || typeof state !== 'object') {
      res.status(400).json({ error: 'Invalid state payload' });
      return;
    }

    const restoredState: Record<string, unknown> = {
      ...state,
      deletedRecordIds: Array.isArray(state.deletedRecordIds)
        ? state.deletedRecordIds
        : [],
    };

    authoritativeState = restoredState;
    stateVersion = Date.now();
    chatVersion = stateVersion;
    lastChatSenderTabId = senderTabId || null;

    const storeInteractionsMap: Record<string, unknown> = {};
    if (Array.isArray(restoredState.stores)) {
      for (const st of restoredState.stores as Array<Record<string, unknown>>) {
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

    latestChatPatch = {
      users: restoredState.users || [],
      topBanners: restoredState.topBanners || [],
      squareAds: restoredState.squareAds || [],
      popupAd: restoredState.popupAd,
      serviceNumbers: restoredState.serviceNumbers || [],
      liveChatMessages: restoredState.liveChatMessages || [],
      privateChatMessages: restoredState.privateChatMessages || [],
      privateChatStatuses: restoredState.privateChatStatuses || {},
      chatTypingMap: restoredState.chatTypingMap || {},
      chatPenalties: restoredState.chatPenalties || [],
      userBlockedMap: restoredState.userBlockedMap || {},
      privateChatReports: restoredState.privateChatReports || [],
      messages: restoredState.messages || [],
      buySellPosts: restoredState.buySellPosts || [],
      communityPosts: restoredState.communityPosts || [],
      settings: restoredState.settings || {},
      deletedRecordIds: restoredState.deletedRecordIds || [],
      storeInteractionsMap,
    };

    broadcastSseEvent('state_update', {
      version: stateVersion,
      state: authoritativeState,
      senderTabId: senderTabId || null,
    });

    saveStateToDisk(restoredState);
    res.json({ ok: true, version: stateVersion });
  });

  // 3. Publish state update & immediately broadcast to all connected clients
  app.post('/api/realtime/sync', (req, res) => {
    const { state, senderTabId } = req.body || {};
    if (!state || typeof state !== 'object') {
      res.status(400).json({ error: 'Invalid state payload' });
      return;
    }

    const prevDeleted = Array.isArray(authoritativeState?.deletedRecordIds)
      ? (authoritativeState!.deletedRecordIds as string[])
      : [];
    const nextDeleted = Array.isArray(state.deletedRecordIds)
      ? (state.deletedRecordIds as string[])
      : [];
    const deletedSet = new Set<string>([...prevDeleted, ...nextDeleted]);
    const deletedRecordIds = Array.from(deletedSet);

    const mergedState: Record<string, unknown> = authoritativeState
      ? {
          ...authoritativeState,
          ...state,
          deletedRecordIds,
          users: mergeUsersServer(authoritativeState.users, state.users, deletedSet),
          stores: mergeArrayByIdServer(authoritativeState.stores, state.stores, deletedSet),
          serviceNumbers: mergeArrayByIdServer(
            authoritativeState.serviceNumbers,
            state.serviceNumbers,
            deletedSet
          ),
          tawsilaRides: mergeArrayByIdServer(
            authoritativeState.tawsilaRides,
            state.tawsilaRides,
            deletedSet
          ),
          communityPosts: mergeArrayByIdServer(
            authoritativeState.communityPosts,
            state.communityPosts,
            deletedSet
          ),
          utilitySubmissions: mergeArrayByIdServer(
            authoritativeState.utilitySubmissions,
            state.utilitySubmissions,
            deletedSet
          ),
          utilityPosts: mergeArrayByIdServer(
            authoritativeState.utilityPosts,
            state.utilityPosts,
            deletedSet
          ),
          buySellPosts: mergeArrayByIdServer(
            authoritativeState.buySellPosts,
            state.buySellPosts,
            deletedSet
          ),
          topBanners: mergeAdCampaignsServer(
            authoritativeState.topBanners,
            state.topBanners,
            deletedSet
          ),
          squareAds: mergeAdCampaignsServer(
            authoritativeState.squareAds,
            state.squareAds,
            deletedSet
          ),
          messages: mergeArrayByIdServer(
            authoritativeState.messages,
            state.messages,
            deletedSet
          ),
          privateChatMessages: mergeArrayByIdServer(
            authoritativeState.privateChatMessages,
            state.privateChatMessages,
            deletedSet
          ),
          settings: mergeSettingsServer(
            authoritativeState.settings as Record<string, unknown> | undefined,
            state.settings as Record<string, unknown> | undefined
          ),
        }
      : { ...state, deletedRecordIds };

    const storeInteractionsMap: Record<string, unknown> = {};
    if (Array.isArray(mergedState.stores)) {
      for (const st of mergedState.stores as Array<Record<string, unknown>>) {
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

    authoritativeState = mergedState;
    stateVersion = Date.now();
    chatVersion = stateVersion;
    lastChatSenderTabId = senderTabId || null;
    latestChatPatch = {
      users: mergedState.users || [],
      topBanners: mergedState.topBanners || [],
      squareAds: mergedState.squareAds || [],
      popupAd: mergedState.popupAd,
      serviceNumbers: mergedState.serviceNumbers || [],
      liveChatMessages: mergedState.liveChatMessages || [],
      privateChatMessages: mergedState.privateChatMessages || [],
      privateChatStatuses: mergedState.privateChatStatuses || {},
      chatTypingMap: mergedState.chatTypingMap || {},
      chatPenalties: mergedState.chatPenalties || [],
      userBlockedMap: mergedState.userBlockedMap || {},
      privateChatReports: mergedState.privateChatReports || [],
      messages: mergedState.messages || [],
      buySellPosts: mergedState.buySellPosts || [],
      communityPosts: mergedState.communityPosts || [],
      settings: mergedState.settings || {},
      deletedRecordIds,
      storeInteractionsMap,
    };

    broadcastSseEvent('state_update', {
      version: stateVersion,
      state: authoritativeState,
      senderTabId: senderTabId || null,
    });

    saveStateToDisk(mergedState);
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

    const prevDeleted = Array.isArray(authoritativeState?.deletedRecordIds)
      ? (authoritativeState!.deletedRecordIds as string[])
      : [];
    const nextDeleted = Array.isArray(chatPatch.deletedRecordIds)
      ? (chatPatch.deletedRecordIds as string[])
      : [];
    const deletedSet = new Set<string>([...prevDeleted, ...nextDeleted]);
    const deletedRecordIds = Array.from(deletedSet);

    chatVersion = Date.now();
    stateVersion = chatVersion;
    lastChatSenderTabId = senderTabId || null;
    latestChatPatch = {
      ...(latestChatPatch || {}),
      ...chatPatch,
      deletedRecordIds,
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
        (chatPatch.settings as Record<string, unknown>) || undefined;
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
        mergedStores = (authoritativeState.stores as Array<Record<string, unknown>>)
          .filter((st) => !(st && typeof st.id === 'string' && deletedSet.has(st.id)))
          .map((st) => {
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
          });
      }
      const mergedServiceNumbers = chatPatch.serviceNumbers
        ? mergeArrayByIdServer(
            authoritativeState.serviceNumbers,
            chatPatch.serviceNumbers,
            deletedSet
          )
        : authoritativeState.serviceNumbers;
      if (latestChatPatch && Array.isArray(mergedServiceNumbers)) {
        latestChatPatch.serviceNumbers = mergedServiceNumbers;
      }
      const nextState: Record<string, unknown> = {
        ...authoritativeState,
        ...chatPatch,
        deletedRecordIds,
        users: chatPatch.users
          ? mergeUsersServer(authoritativeState.users, chatPatch.users, deletedSet)
          : authoritativeState.users,
        topBanners: mergeAdCampaignsServer(
          authoritativeState.topBanners,
          chatPatch.topBanners,
          deletedSet
        ),
        squareAds: mergeAdCampaignsServer(
          authoritativeState.squareAds,
          chatPatch.squareAds,
          deletedSet
        ),
        stores: mergedStores,
        serviceNumbers: mergedServiceNumbers,
        settings: mergeSettingsServer(prevSettings, patchSettings),
      };
      authoritativeState = nextState;
      saveStateToDisk(nextState);
    }

    res.json({ ok: true, version: chatVersion, onlineStats: computeOnlineStats() });
  });

  // 5. Real-time multi-device online presence heartbeat
  app.post('/api/realtime/presence', (req, res) => {
    const { sessionId, visitorId, userId, username, isRegistered, remove } =
      req.body || {};
    if (sessionId && typeof sessionId === 'string') {
      if (remove) {
        presenceMap.delete(sessionId);
      } else {
        presenceMap.set(sessionId, {
          sessionId,
          visitorId:
            typeof visitorId === 'string' && visitorId ? visitorId : sessionId,
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

  // Periodic 2-second cleanup to broadcast instant presence drop when a session times out
  let lastBroadcastPresenceKey = '';
  setInterval(() => {
    const stats = computeOnlineStats();
    const key = `${stats.totalOnline}:${stats.registeredCount}:${stats.guestsCount}:${stats.registeredUsernames.join(',')}`;
    if (key !== lastBroadcastPresenceKey) {
      lastBroadcastPresenceKey = key;
      broadcastSseEvent('presence_update', stats);
    }
  }, 2000);

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

    // Serve a clean, non-failing @vite/client so cached or active clients never throw WebSocket or SendBeforeConnectError
    app.get('/@vite/client', async (req, res, next) => {
      try {
        const transformed = await vite.transformRequest(req.url);
        if (transformed && transformed.code) {
          const safeCode = transformed.code
            .replace(
              'const socket = options.createConnection();',
              'const socket = { OPEN: 1, readyState: 1, addEventListener() {}, removeEventListener() {}, send() {}, close() {} };'
            )
            .replace(
              /reject\(\/\*\s*@__PURE__\s*\*\/\s*new Error\("WebSocket closed without opened\."\)\)/g,
              'resolve()'
            )
            .replace(
              /reject\(new Error\("WebSocket closed without opened\."\)\)/g,
              'resolve()'
            )
            .replace(
              /throw new SendBeforeConnectError\([^)]*\);/g,
              'return;'
            )
            .replace(
              'ws.send(JSON.stringify(data));',
              'ws?.send?.(JSON.stringify(data));'
            );
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.status(200).send(safeCode);
          return;
        }
      } catch {
        // fallback to default vite middleware
      }
      next();
    });

    app.get('/@vite-plugin-pwa/pwa-entry-point-loaded', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res
        .status(200)
        .send(
          'export function registerDevSW() {}\nexport default registerDevSW;\n'
        );
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Complete RFC 6455 WebSocket handshake for any cached @vite/client attempting vite-hmr upgrade
  httpServer.on('upgrade', (req, socket) => {
    try {
      const key = req.headers['sec-websocket-key'];
      if (!key || typeof key !== 'string') {
        socket.destroy();
        return;
      }
      const acceptKey = crypto
        .createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');
      const protocol = req.headers['sec-websocket-protocol'];
      const headers = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${acceptKey}`,
      ];
      if (protocol) {
        headers.push(
          `Sec-WebSocket-Protocol: ${String(protocol).split(',')[0].trim()}`
        );
      }
      socket.write(headers.join('\r\n') + '\r\n\r\n');
      socket.on('error', () => {});
    } catch {
      try {
        socket.destroy();
      } catch {}
    }
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Real-time server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
