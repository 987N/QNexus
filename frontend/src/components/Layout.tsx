import React, { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import BottomBar from './BottomBar';
import Dashboard from '../pages/Dashboard';
import { useQB } from '../context/QBContext';
import SettingsModal from './Modals/SettingsModal';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = () => {
  const { qbContainers, currentContainerId, setCurrentContainerId, filteredTorrentCount } = useQB();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      return newState;
    });
  };

  const handleContainerChange = (id: number) => {
    setCurrentContainerId(id);
  };

  // Filter state
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    tag: '',
    tracker: '',
    save_path: '',
    search: ''
  });

  const handleFilterChange = (type: string, value: string) => {
    setFilters(prev => ({ ...prev, [type]: value }));
  };

  // Speed data and stats
  const [speedData, setSpeedData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});

  // Fetch stats periodically
  React.useEffect(() => {
    const fetchStats = async () => {
      if (!currentContainerId) return;
      try {
        const res = await axios.get('/api/torrents/stats', {
          params: { containerId: currentContainerId }
        });
        setStats(res.data);
        
        // Update speed data for chart
        setSpeedData(prev => {
          const newData = [...prev, {
            time: new Date().toLocaleTimeString(),
            dlspeed: res.data.total_dlspeed,
            upspeed: res.data.total_upspeed
          }];
          // Keep last 60 data points
          return newData.slice(-60);
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, [currentContainerId]);

  return (
    <div className="flex h-screen overflow-hidden relative transition-colors duration-200">
      {/* Content Wrapper */}
      <div className="relative z-10 flex w-full h-full">
      <Sidebar 
        qbContainers={qbContainers}
        currentContainerId={currentContainerId}
        onContainerChange={handleContainerChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        speedData={speedData}
        stats={stats}
        collapsed={sidebarCollapsed}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-hidden relative bg-white dark:bg-gray-950 transition-colors duration-200">
          <Routes>
            <Route path="*" element={
              <Dashboard 
                filters={filters} 
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={handleSidebarToggle}
              />
            } />
          </Routes>
        </main>

        <BottomBar stats={{...stats, total_torrents: filteredTorrentCount}} />
      </div>

      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
};

export default Layout;
