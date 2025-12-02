import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import TorrentTable from '../components/TorrentTable/TorrentTable';
import TopBar from '../components/TopBar';
import AddTorrentModal from '../components/Modals/AddTorrentModal';
import DeleteConfirmModal from '../components/Modals/DeleteConfirmModal';
import SettingsModal from '../components/Modals/SettingsModal';
import SetCategoryModal from '../components/Modals/SetCategoryModal';
import SetTagsModal from '../components/Modals/SetTagsModal';
import LogsModal from '../components/Modals/LogsModal';
import { useQB } from '../context/QBContext';
import ContextMenu from '../components/ContextMenu';
import DetailsPanel from '../components/TorrentDetails/DetailsPanel';
import { useWebSocket } from '../hooks/useWebSocket';

interface DashboardProps {
  filters?: any;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ filters: propFilters, sidebarCollapsed = false, onToggleSidebar = () => {} }) => {
  const { currentContainerId, setFilteredTorrentCount, qbContainers } = useQB();
  const [torrents, setTorrents] = useState<any[]>([]);
  
  // Initialize sort from cookies or default
  const [sortBy, setSortBy] = useState(Cookies.get('sortBy') || 'added_on');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((Cookies.get('sortOrder') as 'asc' | 'desc') || 'desc');
  
  const [loading, setLoading] = useState(false);
  const [selectedHashes, setSelectedHashes] = useState<Set<string>>(new Set());
  
  // State for search (local to Dashboard/TopBar)
  const [search, setSearch] = useState('');

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean } | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSetCategoryModalOpen, setIsSetCategoryModalOpen] = useState(false);
  const [isSetTagsModalOpen, setIsSetTagsModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  
  // Details Panel State
  const [detailsHash, setDetailsHash] = useState<string | null>(null);

  // Fetch torrents
  const fetchTorrents = async () => {
    if (!currentContainerId) {
      console.log('No currentContainerId, skipping fetch');
      return;
    }

    // Don't set loading true on every poll
    try {
      const res = await axios.get('/api/torrents/list', {
        params: {
          containerId: currentContainerId,
          ...propFilters, // Use filters passed from Layout
          search: search || undefined,
          sortBy,
          sortOrder
        }
      });
      setTorrents(res.data.torrents);
      setFilteredTorrentCount(res.data.total);
    } catch (error) {
      console.error('Failed to fetch torrents:', error);
    } finally {
      setLoading(false);
    }
  };

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  const { isConnected, lastMessage, subscribe } = useWebSocket(wsUrl);

  // Subscribe to container updates
  useEffect(() => {
    if (currentContainerId && isConnected) {
      subscribe(currentContainerId);
    }
  }, [currentContainerId, isConnected, subscribe]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage?.type === 'torrents_updated' && lastMessage.containerId === currentContainerId) {
      fetchTorrents();
    }
  }, [lastMessage, currentContainerId]);

  // Initial fetch and polling fallback
  useEffect(() => {
    setLoading(true);
    fetchTorrents().then(() => setLoading(false));

    // Only poll if WebSocket is NOT connected
    let interval: ReturnType<typeof setTimeout>;
    if (!isConnected) {
      interval = setInterval(fetchTorrents, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentContainerId, propFilters, search, sortBy, sortOrder, isConnected]);

  // Persist sort settings
  useEffect(() => {
    Cookies.set('sortBy', sortBy);
    Cookies.set('sortOrder', sortOrder);
  }, [sortBy, sortOrder]);

  const handleSort = (column: string) => {
    const newOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(column);
    setSortOrder(newOrder);
    Cookies.set('sortBy', column);
    Cookies.set('sortOrder', newOrder);
  };

  const handleSelectionChange = (newSelection: Set<string>) => {
    setSelectedHashes(newSelection);
  };

  // Actions
  const handleStart = async () => {
    if (selectedHashes.size === 0) return;
    try {
      await axios.post('/api/torrents/resume', {
        hashes: Array.from(selectedHashes).join('|'),
        containerId: currentContainerId
      });
      setTimeout(fetchTorrents, 500);
    } catch (err) {
      console.error('Failed to start torrents:', err);
    }
  };

  const handleStop = async () => {
    if (selectedHashes.size === 0) return;
    try {
      await axios.post('/api/torrents/pause', {
        hashes: Array.from(selectedHashes).join('|'),
        containerId: currentContainerId
      });
      setTimeout(fetchTorrents, 500);
    } catch (err) {
      console.error('Failed to stop torrents:', err);
    }
  };

  const handleDelete = async (deleteFiles: boolean) => {
    if (!currentContainerId) return;
    try {
      await axios.post('/api/torrents/delete', {
        hashes: Array.from(selectedHashes).join('|'),
        containerId: currentContainerId,
        deleteFiles
      });
      setSelectedHashes(new Set());
      setIsDeleteModalOpen(false);
      fetchTorrents();
    } catch (err) {
      console.error('Failed to delete torrents:', err);
    }
  };

  const handleContextAction = async (action: string) => {
    if (!currentContainerId || selectedHashes.size === 0) return;
    
    const hashes = Array.from(selectedHashes).join('|');
    
    try {
      switch (action) {
        case 'resume':
          await axios.post('/api/torrents/resume', { hashes, containerId: currentContainerId });
          break;
        case 'pause':
          await axios.post('/api/torrents/pause', { hashes, containerId: currentContainerId });
          break;
        case 'delete':
          setIsDeleteModalOpen(true);
          break;
        case 'reannounce':
          await axios.post('/api/torrents/reannounce', { hashes, containerId: currentContainerId });
          break;
        case 'recheck':
          await axios.post('/api/torrents/recheck', { hashes, containerId: currentContainerId });
          break;
        case 'setTags':
          setIsSetTagsModalOpen(true);
          break;
        case 'setCategory':
          setIsSetCategoryModalOpen(true);
          break;
        case 'export':
          // Trigger download
          const exportUrl = `/api/torrents/export?hash=${hashes.split('|')[0]}&containerId=${currentContainerId}`;
          window.open(exportUrl, '_blank');
          break;
        case 'copy':
          const torrent = torrents.find(t => t.hash === hashes.split('|')[0]);
          if (torrent) {
            const text = `Name: ${torrent.name}\nHash: ${torrent.hash}\nMagnet: magnet:?xt=urn:btih:${torrent.hash}&dn=${encodeURIComponent(torrent.name)}`;
            await navigator.clipboard.writeText(text);
          }
          break;
      }
      // Refresh list after action (except for modals)
      if (['resume', 'pause', 'reannounce', 'recheck'].includes(action)) {
        setTimeout(fetchTorrents, 500);
      }
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const handleRowContextMenu = (e: React.MouseEvent, hash: string) => {
    e.preventDefault();
    if (!selectedHashes.has(hash)) {
      setSelectedHashes(new Set([hash]));
    }
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      visible: true
    });
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Show welcome screen if no containers
  if (qbContainers.length === 0 && !loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md mx-4">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">欢迎使用 QNexus</h2>
          <p className="text-gray-500 dark:text-gray-400">
            还没有配置 qBittorrent 客户端。请先添加一个客户端以开始使用。
          </p>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors w-full flex items-center justify-center space-x-2"
          >
            <span>添加客户端</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      <TopBar 
        collapsed={sidebarCollapsed}
        onToggleSidebar={onToggleSidebar}
        onSearch={setSearch} 
        onAdd={() => setIsAddModalOpen(true)}
        onDelete={() => selectedHashes.size > 0 && setIsDeleteModalOpen(true)}
        onSettings={() => setIsSettingsModalOpen(true)}
        onLogs={() => setIsLogsModalOpen(true)}
        onStart={handleStart}
        onStop={handleStop}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <TorrentTable 
          torrents={torrents}
          loading={loading}
          selectedHashes={selectedHashes}
          onSelectionChange={handleSelectionChange}
          onContextAction={handleContextAction}
          onRowContextMenu={handleRowContextMenu}
          onRowDoubleClick={(hash) => setDetailsHash(hash)}
          onSort={handleSort}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />
        
        <DetailsPanel 
          hash={detailsHash}
          onClose={() => setDetailsHash(null)}
        />
        
        {contextMenu && contextMenu.visible && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onAction={handleContextAction}
            onClose={() => setContextMenu(null)}
            selectedCount={selectedHashes.size}
          />
        )}
      </main>

      <AddTorrentModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={() => fetchTorrents()}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        count={selectedHashes.size}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <SetCategoryModal
        isOpen={isSetCategoryModalOpen}
        onClose={() => setIsSetCategoryModalOpen(false)}
        hashes={Array.from(selectedHashes)}
        onSuccess={fetchTorrents}
      />

      <SetTagsModal
        isOpen={isSetTagsModalOpen}
        onClose={() => setIsSetTagsModalOpen(false)}
        hashes={Array.from(selectedHashes)}
        initialTags={selectedHashes.size === 1 
          ? torrents.find(t => t.hash === Array.from(selectedHashes)[0])?.tags || '' 
          : ''}
        onSuccess={fetchTorrents}
      />

      <LogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
