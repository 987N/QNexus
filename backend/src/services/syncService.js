const db = require('../db/db');
const QBClient = require('./qbClient');

class SyncService {
  constructor() {
    this.interval = null;
    this.syncIntervalMs = 2000; // Sync every 2 seconds (提升实时性)
    this.websocketService = null;
  }

  setWebSocketService(wss) {
    this.websocketService = wss;
  }

  start() {
    if (this.interval) return;
    console.log('[SyncService] Starting sync service...');
    this.syncAll();
    this.interval = setInterval(() => this.syncAll(), this.syncIntervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async syncAll() {
    const containers = db.prepare('SELECT * FROM qb_containers').all();
    
    for (const container of containers) {
      this.syncContainer(container);
    }
  }

  async syncContainer(container) {
    const client = new QBClient(container);
    
    try {
      const torrents = await client.getTorrents();
      
      const insert = db.prepare(`
        INSERT OR REPLACE INTO torrents (
          hash, container_id, name, size, progress, dlspeed, upspeed, 
          downloaded, uploaded,
          state, eta, category, tags, tracker, save_path, added_on, completion_on, last_activity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const deleteOld = db.prepare(`
        DELETE FROM torrents 
        WHERE container_id = ? AND hash NOT IN (${torrents.map(() => '?').join(',')})
      `);

      let hasChanges = false;

      db.transaction(() => {
        // Update/Insert current torrents
        for (const t of torrents) {
          const result = insert.run(
            t.hash, container.id, t.name, t.size, t.progress, t.dlspeed, t.upspeed,
            t.downloaded || 0, t.uploaded || 0,
            t.state, t.eta, t.category, t.tags, t.tracker, t.save_path, t.added_on, t.completion_on, t.last_activity
          );
          if (result.changes > 0) {
            hasChanges = true;
          }
        }

        // Remove deleted torrents
        if (torrents.length > 0) {
            const result = deleteOld.run(container.id, ...torrents.map(t => t.hash));
            if (result.changes > 0) {
              hasChanges = true;
            }
        } else {
            // If no torrents returned, clear all for this container
            const result = db.prepare('DELETE FROM torrents WHERE container_id = ?').run(container.id);
            if (result.changes > 0) {
              hasChanges = true;
            }
        }

        // Update sync status
        db.prepare('INSERT OR REPLACE INTO sync_status (container_id, last_sync, status, error) VALUES (?, ?, ?, ?)')
          .run(container.id, Date.now(), 'success', null);
      })();

      // 如果数据有变化，推送 WebSocket 通知
      if (hasChanges && this.websocketService) {
        this.websocketService.broadcastToContainer(container.id, {
          type: 'torrents_updated',
          containerId: container.id,
          timestamp: Date.now()
        });
      }

    } catch (error) {
      // Ignore foreign key constraint errors (container deleted during sync)
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        return;
      }
      console.error(`[SyncService] Failed to sync container ${container.name}:`, error.message);
      try {
        db.prepare('INSERT OR REPLACE INTO sync_status (container_id, last_sync, status, error) VALUES (?, ?, ?, ?)')
          .run(container.id, Date.now(), 'error', error.message);
      } catch (statusError) {
        // Ignore if we can't update status (e.g. container deleted)
      }
    }
  }
}

module.exports = new SyncService();
