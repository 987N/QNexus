import React, { useEffect, useState, useRef } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useQB } from '../../context/QBContext';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LogEntry {
  id: number;
  message: string;
  timestamp: number;
  type: number; // 1: Normal, 2: Info, 4: Warning, 8: Critical
}

const LogsModal: React.FC<LogsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { currentContainerId } = useQB();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    if (!currentContainerId) return;
    try {
      setLoading(true);
      const response = await axios.get('/api/logs', {
        params: { containerId: currentContainerId, lastKnownId: -1 }
      });
      // qBittorrent returns logs in reverse order usually? Or we sort them?
      // API returns array of objects.
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, currentContainerId]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!isOpen) return null;

  const getLogColor = (type: number) => {
    if (type & 8) return 'text-red-600 dark:text-red-400'; // Critical
    if (type & 4) return 'text-yellow-600 dark:text-yellow-400'; // Warning
    if (type & 2) return 'text-blue-600 dark:text-blue-400'; // Info
    return 'text-gray-700 dark:text-gray-300'; // Normal
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('logs.title', 'Logs')}</h2>
          <div className="flex items-center space-x-2">
            <button 
              onClick={fetchLogs} 
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title={t('common.refresh', 'Refresh')}
            >
              <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900">
          {logs.map((log) => (
            <div key={log.id} className={`mb-1 ${getLogColor(log.type)}`}>
              <span className="opacity-50 mr-2">[{formatTime(log.timestamp)}]</span>
              <span>{log.message}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default LogsModal;
