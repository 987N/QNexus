import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';

interface QBContainer {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  created_at: string;
}

interface QBContextType {
  qbContainers: QBContainer[];
  currentContainerId: number | null;
  setCurrentContainerId: (id: number | null) => void;
  fetchContainers: () => Promise<void>;
  loading: boolean;
  filteredTorrentCount: number;
  setFilteredTorrentCount: (count: number) => void;
  uiSettings: {
    columns: Array<{ id: string; visible: boolean }>;
    filters: {
      status: boolean;
      categories: boolean;
      tags: boolean;
      trackers: boolean;
      folders: boolean;
    };
    language: string;
  };
  setUiSettings: (settings: any) => void;
}

const QBContext = createContext<QBContextType | undefined>(undefined);

export const QBProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [qbContainers, setQbContainers] = useState<QBContainer[]>([]);
  const [currentContainerId, setCurrentContainerIdState] = useState<number | null>(() => {
    // Restore from localStorage on initialization
    const saved = localStorage.getItem('currentContainerId');
    return saved ? parseInt(saved, 10) : null;
  });
  const [loading, setLoading] = useState(true);

  const [filteredTorrentCount, setFilteredTorrentCount] = useState(0);
  
  // UI Settings
  const [uiSettings, setUiSettingsState] = useState<{
    columns: Array<{ id: string; visible: boolean }>;
    filters: {
      status: boolean;
      categories: boolean;
      tags: boolean;
      trackers: boolean;
      folders: boolean;
    };
    language: string;
  }>(() => {
    const saved = localStorage.getItem('uiSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration: if old format (columnVisibility), convert to new format
      if (parsed.columnVisibility) {
        const defaultOrder = [
          'name', 'size', 'progress', 'dlspeed', 'upspeed', 'eta', 'ratio',
          'downloaded', 'uploaded', 'seeds', 'peers', 'added_on', 'tracker',
          'save_path', 'category', 'tags'
        ];
        return {
          columns: defaultOrder.map(id => ({
            id,
            visible: parsed.columnVisibility[id] ?? true
          })),
          filters: {
            status: true,
            categories: true,
            tags: true,
            trackers: true,
            folders: true
          },
          language: parsed.language || 'zh'
        };
      }
      // Ensure filters exist if loading from saved state that might not have them
      return {
        ...parsed,
        filters: {
          status: true,
          categories: true,
          tags: true,
          trackers: true,
          folders: true,
          ...parsed.filters
        }
      };
    }
    
    return {
      columns: [
        { id: 'name', visible: true },
        { id: 'size', visible: true },
        { id: 'progress', visible: true },
        { id: 'dlspeed', visible: true },
        { id: 'upspeed', visible: true },
        { id: 'eta', visible: true },
        { id: 'ratio', visible: true },
        { id: 'downloaded', visible: true },
        { id: 'uploaded', visible: true },
        { id: 'seeds', visible: true },
        { id: 'peers', visible: true },
        { id: 'added_on', visible: true },
        { id: 'tracker', visible: true },
        { id: 'save_path', visible: true },
        { id: 'category', visible: true },
        { id: 'tags', visible: true }
      ],
      filters: {
        status: true,
        categories: true,
        tags: true,
        trackers: true,
        folders: true
      },
      language: 'zh'
    };
  });

  const setUiSettings = (settings: any) => {
    setUiSettingsState(settings);
    localStorage.setItem('uiSettings', JSON.stringify(settings));
  };

  // Wrapper to save to localStorage when changing container
  const setCurrentContainerId = (id: number | null) => {
    setCurrentContainerIdState(id);
    if (id !== null) {
      localStorage.setItem('currentContainerId', id.toString());
    } else {
      localStorage.removeItem('currentContainerId');
    }
  };

  const fetchContainers = async () => {
    try {
      const res = await axios.get('/api/qb-containers');
      setQbContainers(res.data);
      
      // If no current container selected, or selected one is gone, select the first one
      if (res.data.length > 0) {
        if (!currentContainerId || !res.data.find((c: QBContainer) => c.id === currentContainerId)) {
          setCurrentContainerId(res.data[0].id);
        }
      } else {
        setCurrentContainerId(null);
      }
    } catch (err) {
      console.error('Failed to fetch QB containers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
  }, []);

  return (
    <QBContext.Provider value={{ 
      qbContainers, 
      currentContainerId, 
      setCurrentContainerId, 
      fetchContainers,
      loading,
      filteredTorrentCount,
      setFilteredTorrentCount,
      uiSettings,
      setUiSettings
    }}>
      {children}
    </QBContext.Provider>
  );
};

export const useQB = () => {
  const context = useContext(QBContext);
  if (context === undefined) {
    throw new Error('useQB must be used within a QBProvider');
  }
  return context;
};
