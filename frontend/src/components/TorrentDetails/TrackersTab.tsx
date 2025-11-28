import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useQB } from '../../context/QBContext';

interface TrackersTabProps {
  hash: string;
}

interface Tracker {
  url: string;
  status: number; // 0: Disabled, 1: Not contacted, 2: Working, 3: Updating, 4: Not working
  tier: number;
  num_peers: number;
  num_seeds: number;
  num_leeches: number;
  num_downloaded: number;
  msg: string;
}

const TrackersTab: React.FC<TrackersTabProps> = ({ hash }) => {
  const { t } = useTranslation();
  const { currentContainerId } = useQB();
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrackers = async () => {
      if (!hash || !currentContainerId) return;
      try {
        setLoading(true);
        const response = await axios.get(`/api/torrents/${hash}/trackers`, {
          params: { containerId: currentContainerId }
        });
        setTrackers(response.data);
      } catch (error) {
        console.error('Failed to fetch trackers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrackers();
    const interval = setInterval(fetchTrackers, 3000);
    return () => clearInterval(interval);
  }, [hash, currentContainerId]);

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return t('tracker.disabled');
      case 1: return t('tracker.not_contacted');
      case 2: return t('tracker.working');
      case 3: return t('tracker.updating');
      case 4: return t('tracker.not_working');
      default: return t('common.unknown');
    }
  };

  if (loading && trackers.length === 0) {
    return <div className="p-4 text-center text-gray-500">{t('common.loading')}</div>;
  }

  return (
    <div className="overflow-auto h-full">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
          <tr>
            <th className="px-4 py-2 font-medium text-gray-500">#</th>
            <th className="px-4 py-2 font-medium text-gray-500">URL</th>
            <th className="px-4 py-2 font-medium text-gray-500">{t('table.status')}</th>
            <th className="px-4 py-2 font-medium text-gray-500">{t('details.peers')}</th>
            <th className="px-4 py-2 font-medium text-gray-500">{t('details.seeds')}</th>
            <th className="px-4 py-2 font-medium text-gray-500">{t('details.message')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {trackers.map((tracker, index) => (
            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="px-4 py-2">{tracker.tier}</td>
              <td className="px-4 py-2 truncate max-w-xs" title={tracker.url}>{tracker.url}</td>
              <td className="px-4 py-2">{getStatusText(tracker.status)}</td>
              <td className="px-4 py-2">{tracker.num_peers}</td>
              <td className="px-4 py-2">{tracker.num_seeds}</td>
              <td className="px-4 py-2 truncate max-w-xs" title={tracker.msg}>{tracker.msg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrackersTab;
