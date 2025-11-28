import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useQB } from '../context/QBContext';
import { useTranslation } from 'react-i18next';

interface BottomBarProps {
  stats: any;
}

const BottomBar: React.FC<BottomBarProps> = ({ stats }) => {
  const { filteredTorrentCount } = useQB();
  const { t } = useTranslation();

  const formatSpeed = (bytes: number) => {
    if (bytes === 0) return '0 KB/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <footer className="h-8 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 text-xs text-gray-600 dark:text-gray-400 shrink-0 z-20 transition-colors duration-200">
      {/* Left: Torrent Count */}
      <div className="flex items-center space-x-4">
        <span>{t('bottom_bar.total_torrents')}: {filteredTorrentCount}</span>
      </div>

      {/* Right: Global Speed Limits & Transfer Stats */}
      <div className="flex items-center space-x-6">
        {/* Global Speed Limits */}
        {(stats?.dl_limit > 0 || stats?.up_limit > 0) && (
          <div className="flex items-center space-x-3 border-r border-gray-200 dark:border-gray-800 pr-6">
            <span className="text-gray-500">{t('bottom_bar.limits')}:</span>
            <div className="flex items-center space-x-2">
              <span className="flex items-center">
                <ArrowDown className="w-3 h-3 mr-1" />
                {stats.dl_limit > 0 ? formatSpeed(stats.dl_limit) : '∞'}
              </span>
              <span className="flex items-center">
                <ArrowUp className="w-3 h-3 mr-1" />
                {stats.up_limit > 0 ? formatSpeed(stats.up_limit) : '∞'}
              </span>
            </div>
          </div>
        )}

        {/* Transfer Stats */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-green-600 dark:text-green-500 flex items-center">
              <ArrowDown className="w-3 h-3 mr-1" />
              {t('bottom_bar.total_downloaded')}: {formatSize(stats?.total_downloaded || 0)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-blue-600 dark:text-blue-500 flex items-center">
              <ArrowUp className="w-3 h-3 mr-1" />
              {t('bottom_bar.total_uploaded')}: {formatSize(stats?.total_uploaded || 0)}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default BottomBar;
