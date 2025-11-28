const axios = require('axios');

class QBClient {
  constructor(container) {
    this.container = container;
    this.baseUrl = `http://${container.host}:${container.port}`;
    this.cookie = null;
    this.appVersion = null;
    this.apiVersion = null;
  }

  async login() {
    try {
      console.log(`[QBClient] Logging in to ${this.baseUrl}...`);
      const response = await axios.post(`${this.baseUrl}/api/v2/auth/login`, 
        `username=${encodeURIComponent(this.container.username)}&password=${encodeURIComponent(this.container.password)}`,
        {
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': this.baseUrl,
            'Origin': this.baseUrl
          }
        }
      );

      // qBittorrent returns cookie in set-cookie header
      const cookies = response.headers['set-cookie'];
      if (cookies && cookies.length > 0) {
        this.cookie = cookies[0]; // Usually SID=...
        console.log('[QBClient] Login successful, cookie:', this.cookie);
        
        // Fetch versions after login
        await this.fetchVersions();
        
        return true;
      } else {
        // Some versions might not return cookie if already logged in or other auth method?
        // But usually it does.
        // Check if response body has "Ok."
        if (response.data === 'Ok.') {
             // If no cookie but Ok, maybe we need to handle it?
             // But usually SID is needed.
             console.warn('[QBClient] Login returned Ok but no cookie?');
        }
        throw new Error('Login failed: No cookie received');
      }
    } catch (error) {
      console.error('[QBClient] Login failed:', error.message);
      throw error;
    }
  }

  async fetchVersions() {
    try {
      const [appVerRes, apiVerRes] = await Promise.all([
        axios.get(`${this.baseUrl}/api/v2/app/version`, { headers: { Cookie: this.cookie } }),
        axios.get(`${this.baseUrl}/api/v2/app/webapiVersion`, { headers: { Cookie: this.cookie } })
      ]);
      this.appVersion = appVerRes.data;
      this.apiVersion = apiVerRes.data;
      console.log(`[QBClient] Connected to qBittorrent v${this.appVersion} (API v${this.apiVersion})`);
    } catch (err) {
      console.warn('[QBClient] Failed to fetch versions:', err.message);
      // Fallback or assume reasonably new version if failed, or old?
      // If /api/v2/app/version fails, it might be very old or network issue.
    }
  }

  // Helper to compare versions (semver-ish)
  isVersionAtLeast(targetVersion) {
    if (!this.appVersion) return true; // Assume true if unknown to try latest features? Or false? Let's assume true for now.
    // Simple version compare
    const v1 = this.appVersion.replace('v', '').split('.').map(Number);
    const v2 = targetVersion.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const num1 = v1[i] || 0;
      const num2 = v2[i] || 0;
      if (num1 > num2) return true;
      if (num1 < num2) return false;
    }
    return true;
  }

  async getTorrents() {
    if (!this.cookie) await this.login();
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/torrents/info`, {
        headers: { Cookie: this.cookie }
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        // Token expired?
        await this.login();
        const response = await axios.get(`${this.baseUrl}/api/v2/torrents/info`, {
          headers: { Cookie: this.cookie }
        });
        return response.data;
      }
      throw error;
    }
  }

  async getTransferInfo() {
    if (!this.cookie) await this.login();

    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/transfer/info`, {
        headers: { Cookie: this.cookie }
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        // Session expired, retry once
        await this.login();
        const response = await axios.get(`${this.baseUrl}/api/v2/transfer/info`, {
          headers: { Cookie: this.cookie }
        });
        return response.data;
      }
      throw error;
    }
  }

  async performAction(action, hashes, extraParams = {}) {
    if (!this.cookie) await this.login();
    
    // Actions: pause, resume, delete, etc.
    // URL: /api/v2/torrents/{action}
    try {
      console.log(`[QBClient] Performing action: ${action} on hashes: ${hashes}`, extraParams);
      
      const params = new URLSearchParams();
      params.append('hashes', hashes);
      
      Object.keys(extraParams).forEach(key => {
        params.append(key, extraParams[key]);
      });

      await axios.post(`${this.baseUrl}/api/v2/torrents/${action}`, 
        params.toString(),
        {
          headers: { 
            Cookie: this.cookie,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': this.baseUrl,
            'Origin': this.baseUrl
          }
        }
      );
      console.log(`[QBClient] Action ${action} successful`);
      return true;
    } catch (error) {
      console.error(`[QBClient] Action ${action} failed:`, error.message);
      if (error.response) {
          console.error(`[QBClient] Error response:`, error.response.status, error.response.data);
      }
      throw error;
    }
  }

  async exportTorrent(hash) {
    if (!this.cookie) await this.login();
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/torrents/export`, {
        params: { hash },
        headers: { Cookie: this.cookie },
        responseType: 'arraybuffer'
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        await this.login();
        const response = await axios.get(`${this.baseUrl}/api/v2/torrents/export`, {
          params: { hash },
          headers: { Cookie: this.cookie },
          responseType: 'arraybuffer'
        });
        return response.data;
      }
      throw error;
    }
  }

  async addTorrent(options) {
    if (!this.cookie) await this.login();

    const FormData = require('form-data');
    const form = new FormData();

    if (options.urls) {
      form.append('urls', options.urls);
    }
    
    if (options.torrents) {
      // options.torrents should be an array of { filename, buffer }
      options.torrents.forEach(file => {
        form.append('torrents', file.buffer, { filename: file.filename });
      });
    }

    if (options.savepath) form.append('savepath', options.savepath);
    if (options.category) form.append('category', options.category);
    
    // Tags were introduced in v4.2.0
    if (options.tags && this.isVersionAtLeast('4.2.0')) {
      form.append('tags', options.tags);
    }

    if (options.paused === 'true' || options.paused === true) {
      form.append('paused', 'true');
      form.append('stopped', 'true'); // Try legacy parameter as fallback
    }
    
    // contentLayout vs root_folder
    // v4.3.2+ uses contentLayout (Original, Subfolder, NoSubfolder)
    // Older uses root_folder (true/false)
    if (options.contentLayout) {
      if (this.isVersionAtLeast('4.3.2')) {
        form.append('contentLayout', options.contentLayout);
      } else {
        // Map contentLayout to root_folder
        // Original -> undefined (default)
        // Subfolder -> root_folder=true
        // NoSubfolder -> root_folder=false
        if (options.contentLayout === 'Subfolder') {
          form.append('root_folder', 'true');
        } else if (options.contentLayout === 'NoSubfolder') {
          form.append('root_folder', 'false');
        }
      }
    }

    if (options.ratioLimit) form.append('ratioLimit', options.ratioLimit);
    if (options.seedingTimeLimit) form.append('seedingTimeLimit', options.seedingTimeLimit);
    if (options.upLimit) form.append('upLimit', options.upLimit);
    if (options.dlLimit) form.append('dlLimit', options.dlLimit);

    try {
      await axios.post(`${this.baseUrl}/api/v2/torrents/add`, form, {
        headers: {
          ...form.getHeaders(),
          Cookie: this.cookie,
          'Referer': this.baseUrl,
          'Origin': this.baseUrl
        }
      });
      return true;
    } catch (error) {
      console.error(`[QBClient] Add torrent failed:`, error.message);
      throw error;
    }
  }

  async getTorrentProperties(hash) {
    if (!this.cookie) await this.login();
    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/torrents/properties`, {
        params: { hash },
        headers: { Cookie: this.cookie }
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        await this.login();
        const response = await axios.get(`${this.baseUrl}/api/v2/torrents/properties`, {
          params: { hash },
          headers: { Cookie: this.cookie }
        });
        return response.data;
      }
      throw error;
    }
  }

  async getTorrentTrackers(hash) {
    if (!this.cookie) await this.login();
    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/torrents/trackers`, {
        params: { hash },
        headers: { Cookie: this.cookie }
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        await this.login();
        const response = await axios.get(`${this.baseUrl}/api/v2/torrents/trackers`, {
          params: { hash },
          headers: { Cookie: this.cookie }
        });
        return response.data;
      }
      throw error;
    }
  }

  async getTorrentPeers(hash) {
    if (!this.cookie) await this.login();
    try {
      // Note: qBittorrent uses /api/v2/sync/torrentPeers for real-time updates with RID
      // But for a simple snapshot, we can try to use it without RID or check if there's a simpler endpoint.
      // Actually, /api/v2/sync/torrentPeers requires 'hash' and returns full data if 'rid' is 0 or missing.
      const response = await axios.get(`${this.baseUrl}/api/v2/sync/torrentPeers`, {
        params: { hash, rid: 0 },
        headers: { Cookie: this.cookie }
      });
      return response.data.peers || {}; // It returns { full_update: true, peers: { ... }, rid: ... }
    } catch (error) {
      if (error.response && error.response.status === 403) {
        await this.login();
        const response = await axios.get(`${this.baseUrl}/api/v2/sync/torrentPeers`, {
          params: { hash, rid: 0 },
          headers: { Cookie: this.cookie }
        });
        return response.data.peers || {};
      }
      throw error;
    }
  }

  async getTorrentFiles(hash) {
    if (!this.cookie) await this.login();
    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/torrents/files`, {
        params: { hash },
        headers: { Cookie: this.cookie }
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        await this.login();
        const response = await axios.get(`${this.baseUrl}/api/v2/torrents/files`, {
          params: { hash },
          headers: { Cookie: this.cookie }
        });
        return response.data;
      }
      throw error;
    }
  }

  async setFilePriority(hash, id, priority) {
    if (!this.cookie) await this.login();
    try {
      // /api/v2/torrents/filePrio
      // params: hash, id (file index or array of indices), priority
      const params = new URLSearchParams();
      params.append('hash', hash);
      params.append('id', id); // qBittorrent accepts pipe separated IDs for multiple files? No, usually just 'id'.
      // If id is array, we might need to join it with pipe '|'.
      // Let's check documentation or assume pipe for now.
      // Actually, standard is pipe separated.
      params.append('priority', priority);

      await axios.post(`${this.baseUrl}/api/v2/torrents/filePrio`, params.toString(), {
        headers: {
          Cookie: this.cookie,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      return true;
    } catch (error) {
       console.error('[QBClient] setFilePriority failed:', error.message);
       throw error;
    }
  }
  async getLog(lastKnownId = -1) {
    if (!this.cookie) await this.login();
    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/log/main`, {
        params: { last_known_id: lastKnownId },
        headers: { Cookie: this.cookie }
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        await this.login();
        const response = await axios.get(`${this.baseUrl}/api/v2/log/main`, {
          params: { last_known_id: lastKnownId },
          headers: { Cookie: this.cookie }
        });
        return response.data;
      }
      throw error;
    }
  }

  async getPreferences() {
    if (!this.cookie) await this.login();
    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/app/preferences`, {
        headers: { Cookie: this.cookie }
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        await this.login();
        const response = await axios.get(`${this.baseUrl}/api/v2/app/preferences`, {
          headers: { Cookie: this.cookie }
        });
        return response.data;
      }
      throw error;
    }
  }


  async createCategory(category, savePath = '') {
    if (!this.cookie) await this.login();
    try {
      const params = new URLSearchParams();
      params.append('category', category);
      params.append('savePath', savePath);

      await axios.post(`${this.baseUrl}/api/v2/torrents/createCategory`, params.toString(), {
        headers: {
          Cookie: this.cookie,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      return true;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        await this.login();
        const params = new URLSearchParams();
        params.append('category', category);
        params.append('savePath', savePath);

        await axios.post(`${this.baseUrl}/api/v2/torrents/createCategory`, params.toString(), {
          headers: {
            Cookie: this.cookie,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        return true;
      }

      throw error;
    }
  }

  async getCategories() {
    if (!this.cookie) await this.login();
    try {
      const response = await axios.get(`${this.baseUrl}/api/v2/torrents/categories`, {
        headers: { Cookie: this.cookie }
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        await this.login();
        const response = await axios.get(`${this.baseUrl}/api/v2/torrents/categories`, {
          headers: { Cookie: this.cookie }
        });
        return response.data;
      }
      throw error;
    }
  }

  async editCategory(category, savePath) {
    if (!this.cookie) await this.login();
    try {
      const params = new URLSearchParams();
      params.append('category', category);
      params.append('savePath', savePath);

      await axios.post(`${this.baseUrl}/api/v2/torrents/editCategory`, params.toString(), {
        headers: {
          Cookie: this.cookie,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      return true;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        await this.login();
        const params = new URLSearchParams();
        params.append('category', category);
        params.append('savePath', savePath);

        await axios.post(`${this.baseUrl}/api/v2/torrents/editCategory`, params.toString(), {
          headers: {
            Cookie: this.cookie,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        return true;
      }
      throw error;
    }
  }

  async deleteTorrents(hashes, deleteFiles = false) {
    if (!this.cookie) await this.login();
    try {
      const params = new URLSearchParams();
      params.append('hashes', hashes);
      params.append('deleteFiles', deleteFiles);

      await axios.post(`${this.baseUrl}/api/v2/torrents/delete`, params.toString(), {
        headers: {
          Cookie: this.cookie,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      return true;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        await this.login();
        const params = new URLSearchParams();
        params.append('hashes', hashes);
        params.append('deleteFiles', deleteFiles);

        await axios.post(`${this.baseUrl}/api/v2/torrents/delete`, params.toString(), {
          headers: {
            Cookie: this.cookie,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        return true;
      }
      throw error;
    }
  }

  async deleteCategory(categories) {
    if (!this.cookie) await this.login();
    try {
      const params = new URLSearchParams();
      params.append('categories', categories);

      await axios.post(`${this.baseUrl}/api/v2/torrents/removeCategories`, params.toString(), {
        headers: {
          Cookie: this.cookie,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      return true;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        await this.login();
        const params = new URLSearchParams();
        params.append('categories', categories);

        await axios.post(`${this.baseUrl}/api/v2/torrents/removeCategories`, params.toString(), {
          headers: {
            Cookie: this.cookie,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        return true;
      }
      throw error;
    }
  }
}

module.exports = QBClient;
