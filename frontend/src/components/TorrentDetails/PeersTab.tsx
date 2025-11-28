import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useQB } from '../../context/QBContext';
import { formatBytes, formatSpeed } from '../../utils/format';

interface PeersTabProps {
  hash: string;
}

interface Peer {
  client: string;
  country: string;
  country_code: string;
  dl_speed: number;
  up_speed: number;
  downloaded: number;
  uploaded: number;
  ip: string;
  port: number;
  progress: number;
  connection_type: string;
  flags: string;
}

const PeersTab: React.FC<PeersTabProps> = ({ hash }) => {
  const { t } = useTranslation();
  const { currentContainerId } = useQB();
  const [peers, setPeers] = useState<Record<string, Peer>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPeers = async () => {
      if (!hash || !currentContainerId) return;
      try {
        setLoading(true);
        const response = await axios.get(`/api/torrents/${hash}/peers`, {
          params: { containerId: currentContainerId }
        });
        setPeers(response.data);
      } catch (error) {
        console.error('Failed to fetch peers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPeers();
    const interval = setInterval(fetchPeers, 3000);
    return () => clearInterval(interval);
  }, [hash, currentContainerId]);

  const peerList = Object.values(peers);

  if (loading && peerList.length === 0) {
    return <div className="p-4 text-center text-gray-500">{t('common.loading')}</div>;
  }

  return (
    <div className="overflow-auto h-full">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
          <tr>
            <th className="px-4 py-2 font-medium text-gray-500">IP</th>
            <th className="px-4 py-2 font-medium text-gray-500">{t('details.client')}</th>
            <th className="px-4 py-2 font-medium text-gray-500">{t('details.flags')}</th>
            <th className="px-4 py-2 font-medium text-gray-500">{t('table.progress')}</th>
            <th className="px-4 py-2 font-medium text-gray-500">{t('table.dlspeed')}</th>
            <th className="px-4 py-2 font-medium text-gray-500">{t('table.upspeed')}</th>
            <th className="px-4 py-2 font-medium text-gray-500">{t('details.downloaded')}</th>
            <th className="px-4 py-2 font-medium text-gray-500">{t('details.uploaded')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {peerList.map((peer, index) => (
            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="px-4 py-2 flex items-center space-x-2">
                {peer.country_code && (
                    <span title={peer.country}>{peer.country_code}</span>
                )}
                <span>{peer.ip}:{peer.port}</span>
              </td>
              <td className="px-4 py-2 truncate max-w-xs" title={peer.client}>{peer.client}</td>
              <td className="px-4 py-2">{peer.flags}</td>
              <td className="px-4 py-2">{(peer.progress * 100).toFixed(1)}%</td>
              <td className="px-4 py-2">{formatSpeed(peer.dl_speed)}</td>
              <td className="px-4 py-2">{formatSpeed(peer.up_speed)}</td>
              <td className="px-4 py-2">{formatBytes(peer.downloaded)}</td>
              <td className="px-4 py-2">{formatBytes(peer.uploaded)}</td>
            </tr>
          ))}
          {peerList.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                {t('common.no_data')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PeersTab;
