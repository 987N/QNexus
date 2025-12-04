const db = require('../db/db');
const QBClient = require('./qbClient');

class SyncService {
  constructor() {
    this.interval = null;
    this.syncIntervalMs = 2000; // Sync every 2 seconds (提升实时性)
    this.websocketService = null;

    // Prepare statements once
    this.stmtGetContainers = db.prepare('SELECT * FROM qb_containers');
    
    this.stmtInsertTorrent = db.prepare(`
      INSERT OR REPLACE INTO torrents (
        hash, container_id, name, size, progress, dlspeed, upspeed, 
        downloaded, uploaded,
        state, eta, category, tags, tracker, save_path, added_on, completion_on, last_activity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.stmtGetContainerHashes = db.prepare('SELECT hash FROM torrents WHERE container_id = ?');
    this.stmtDeleteTorrent = db.prepare('DELETE FROM torrents WHERE container_id = ? AND hash = ?');
    this.stmtDeleteAllContainerTorrents = db.prepare('DELETE FROM torrents WHERE container_id = ?');
    
    this.stmtUpdateSyncStatus = db.prepare('INSERT OR REPLACE INTO sync_status (container_id, last_sync, status, error) VALUES (?, ?, ?, ?)');
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
    // 如果没有客户端连接，跳过同步以节省资源
    if (this.websocketService && this.websocketService.getClientCount() === 0) {
      return;
    }

    const containers = this.stmtGetContainers.all();
    
    for (const container of containers) {
      this.syncContainer(container);
    }
  }

  async syncContainer(container) {
    const client = new QBClient(container);
    
    try {
      const torrents = await client.getTorrents();
      const currentHashes = new Set(torrents.map(t => t.hash));
      
      let hasChanges = false;

      const syncTransaction = db.transaction(() => {
        // 1. Insert/Update current torrents
        for (const t of torrents) {
          const result = this.stmtInsertTorrent.run(
            t.hash, container.id, t.name, t.size, t.progress, t.dlspeed, t.upspeed,
            t.downloaded || 0, t.uploaded || 0,
            t.state, t.eta, t.category, t.tags, t.tracker, t.save_path, t.added_on, t.completion_on, t.last_activity
          );
          if (result.changes > 0) {
            hasChanges = true;
          }
        }

        // 2. Delete missing torrents
        // Get all existing hashes for this container from DB
        const existingRows = this.stmtGetContainerHashes.all(container.id);
        
        if (torrents.length === 0) {
            // Optimization: if no torrents returned, delete all
            if (existingRows.length > 0) {
                this.stmtDeleteAllContainerTorrents.run(container.id);
                hasChanges = true;
            }
        } else {
            // Delete only those that are not in the current list
            for (const row of existingRows) {
                if (!currentHashes.has(row.hash)) {
                    this.stmtDeleteTorrent.run(container.id, row.hash);
                    hasChanges = true;
                }
            }
        }

        // 3. Update sync status
        this.stmtUpdateSyncStatus.run(container.id, Date.now(), 'success', null);
      });

      syncTransaction();

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
        this.stmtUpdateSyncStatus.run(container.id, Date.now(), 'error', error.message);
      } catch (statusError) {
        // Ignore if we can't update status (e.g. container deleted)
      }
    }
  }
}

module.exports = new SyncService();
