import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useQB } from '../../context/QBContext';
import { formatBytes, formatSpeed } from '../../utils/format';

interface GeneralTabProps {
  hash: string;
}

interface TorrentProperties {
  save_path: string;
  creation_date: number;
  comment: string;
  total_wasted: number;
  total_uploaded: number;
  total_downloaded: number;
  total_uploaded_session: number;
  total_downloaded_session: number;
  up_limit: number;
  dl_limit: number;
  time_elapsed: number;
  seeding_time: number;
  nb_connections: number;
  nb_connections_limit: number;
  share_ratio: number;
  addition_date: number;
  completion_date: number;
  created_by: string;
  dl_speed_avg: number;
  up_speed_avg: number;
  eta: number;
  last_seen: number;
  peers: number;
  peers_total: number;
  pieces_have: number;
  pieces_num: number;
  reannounce: number;
  seeds: number;
  seeds_total: number;
  total_size: number;
}

const GeneralTab: React.FC<GeneralTabProps> = ({ hash }) => {
  const { t } = useTranslation();
  const { currentContainerId } = useQB();
  const [properties, setProperties] = useState<TorrentProperties | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      if (!hash || !currentContainerId) return;
      try {
        setLoading(true);
        const response = await axios.get(`/api/torrents/${hash}/properties`, {
          params: { containerId: currentContainerId }
        });
        setProperties(response.data);
      } catch (error) {
        console.error('Failed to fetch torrent properties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
    const interval = setInterval(fetchProperties, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, [hash, currentContainerId]);

  if (loading && !properties) {
    return <div className="p-4 text-center text-gray-500">{t('common.loading')}</div>;
  }

  if (!properties) {
    return <div className="p-4 text-center text-gray-500">{t('common.error')}</div>;
  }

  const formatDate = (timestamp: number) => {
    if (timestamp <= 0) return '-';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatDuration = (seconds: number) => {
    if (seconds <= 0) return '-';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) parts.push(`${s}s`);
    return parts.join(' ');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 text-sm overflow-auto h-full">
      <div className="space-y-4">
        <section>
          <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">{t('details.transfer')}</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-gray-500">{t('details.total_downloaded')}:</div>
            <div>{formatBytes(properties.total_downloaded)} ({formatBytes(properties.total_downloaded_session)} {t('details.session')})</div>
            
            <div className="text-gray-500">{t('details.total_uploaded')}:</div>
            <div>{formatBytes(properties.total_uploaded)} ({formatBytes(properties.total_uploaded_session)} {t('details.session')})</div>
            
            <div className="text-gray-500">{t('details.wasted')}:</div>
            <div>{formatBytes(properties.total_wasted)}</div>
            
            <div className="text-gray-500">{t('details.ratio')}:</div>
            <div>{properties.share_ratio.toFixed(2)}</div>

            <div className="text-gray-500">{t('details.connections')}:</div>
            <div>{properties.nb_connections} ({properties.nb_connections_limit === -1 ? t('common.unlimited') : properties.nb_connections_limit} {t('details.max')})</div>
          </div>
        </section>

        <section>
          <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">{t('details.information')}</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-gray-500">{t('details.save_path')}:</div>
            <div className="truncate" title={properties.save_path}>{properties.save_path}</div>
            
            <div className="text-gray-500">{t('details.created_on')}:</div>
            <div>{formatDate(properties.creation_date)}</div>
            
            <div className="text-gray-500">{t('details.added_on')}:</div>
            <div>{formatDate(properties.addition_date)}</div>
            
            <div className="text-gray-500">{t('details.completed_on')}:</div>
            <div>{formatDate(properties.completion_date)}</div>

            <div className="text-gray-500">{t('details.hash')}:</div>
            <div className="truncate font-mono text-xs" title={hash}>{hash}</div>
            
            <div className="text-gray-500">{t('details.comment')}:</div>
            <div className="truncate" title={properties.comment}>{properties.comment || '-'}</div>
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <section>
          <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">{t('details.limits')}</h3>
          <div className="grid grid-cols-2 gap-2">
             <div className="text-gray-500">{t('details.dl_limit')}:</div>
             <div>{properties.dl_limit === -1 ? t('common.unlimited') : formatSpeed(properties.dl_limit)}</div>
             
             <div className="text-gray-500">{t('details.up_limit')}:</div>
             <div>{properties.up_limit === -1 ? t('common.unlimited') : formatSpeed(properties.up_limit)}</div>
          </div>
        </section>

        <section>
          <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">{t('details.elapsed')}</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-gray-500">{t('details.time_elapsed')}:</div>
            <div>{formatDuration(properties.time_elapsed)}</div>
            
            <div className="text-gray-500">{t('details.seeding_time')}:</div>
            <div>{formatDuration(properties.seeding_time)}</div>
            
            <div className="text-gray-500">{t('details.eta')}:</div>
            <div>{formatDuration(properties.eta)}</div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default GeneralTab;
