// ── Sync Manager ──
// Pushes offline-queued sessions to Supabase when connectivity returns

import * as offlineDb from "./offlineDb";
import * as db from "./db";

let syncing = false;
let listeners = [];

export function onSyncChange(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

function notify(status) {
  listeners.forEach(fn => {
    try { fn(status); } catch {}
  });
}

export async function syncPendingSessions() {
  if (syncing || !offlineDb.isOnline()) return { synced: 0, failed: 0 };
  syncing = true;

  const pending = await offlineDb.getPendingSessions();
  
  // Nothing to sync — exit quietly
  if (pending.length === 0) {
    syncing = false;
    return { synced: 0, failed: 0, pendingCount: 0 };
  }

  notify({ syncing: true, pendingCount: pending.length });
  let synced = 0;
  let failed = 0;

  for (const session of pending) {
    try {
      // Extract the session data (remove offline metadata)
      const { offlineId, createdAt, synced: _s, syncedAt: _sa, coMentorIds, notificationPayload, ypFeedback, ...sessionPayload } = session;

      // Create the session in Supabase
      const { data, error } = await db.createSession({
        mentorId: sessionPayload.mentorId,
        youngPersonId: sessionPayload.youngPersonId,
        date: sessionPayload.date,
        focusStep: sessionPayload.focusStep,
        sessionLength: sessionPayload.sessionLength,
        partnerOrg: sessionPayload.partnerOrg,
        isGroup: sessionPayload.isGroup,
        groupId: sessionPayload.groupId,
        scores: sessionPayload.scores,
        quick: sessionPayload.quick,
        stepAverages: sessionPayload.stepAverages,
        notes: sessionPayload.notes,
        mentorReflection: sessionPayload.mentorReflection,
        safeguarding: sessionPayload.safeguarding,
        coMentorIds: coMentorIds || [],
      });

      if (error) {
        console.error(`Sync failed for ${offlineId}:`, error);
        failed++;
        continue;
      }

      // Send notifications (fire-and-forget)
      if (notificationPayload) {
        try { db.sendSessionNotifications(notificationPayload); } catch {}
      }

      // Save YP feedback if present
      if (ypFeedback && data?.id) {
        try {
          await db.saveYPFeedback({
            sessionId: data.id,
            youngPersonId: sessionPayload.youngPersonId,
            responses: ypFeedback,
          });
        } catch {}
      }

      // Mark as synced
      await offlineDb.markSessionSynced(offlineId);
      synced++;
    } catch (err) {
      console.error(`Sync error for ${session.offlineId}:`, err);
      failed++;
    }
  }

  // Clean up synced sessions
  if (synced > 0) {
    await offlineDb.removeSyncedSessions();
  }

  syncing = false;
  const pendingCount = await offlineDb.getAllPendingCount();
  notify({ syncing: false, synced, failed, pendingCount });
  return { synced, failed, pendingCount };
}

// Auto-sync when coming back online
export function startAutoSync() {
  if (typeof window === "undefined") return;

  const handleOnline = async () => {
    const count = await offlineDb.getAllPendingCount();
    if (count > 0) {
      console.log("[Pathways] Back online — syncing", count, "pending sessions...");
      syncPendingSessions();
    }
  };

  window.addEventListener("online", handleOnline);

  // Also sync on visibility change (user opens app)
  document.addEventListener("visibilitychange", async () => {
    if (!document.hidden && offlineDb.isOnline()) {
      const count = await offlineDb.getAllPendingCount();
      if (count > 0) syncPendingSessions();
    }
  });

  // Initial sync check — only if there's actually something to sync
  if (offlineDb.isOnline()) {
    setTimeout(async () => {
      const count = await offlineDb.getAllPendingCount();
      if (count > 0) syncPendingSessions();
    }, 2000);
  }

  return () => window.removeEventListener("online", handleOnline);
}
