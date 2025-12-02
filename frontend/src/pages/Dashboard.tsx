
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
  const { currentContainerId, setFilteredTorrentCount } = useQB();
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



// ... inside component ...
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

