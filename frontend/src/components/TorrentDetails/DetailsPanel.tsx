import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import GeneralTab from './GeneralTab';
import TrackersTab from './TrackersTab';
import PeersTab from './PeersTab';
import ContentTab from './ContentTab';

interface DetailsPanelProps {
  hash: string | null;
  onClose: () => void;
}

const DetailsPanel: React.FC<DetailsPanelProps> = ({ hash, onClose }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'general' | 'trackers' | 'peers' | 'content'>('general');
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Resizable logic
  const [height, setHeight] = useState(parseInt(Cookies.get('detailsPanelHeight') || '320'));
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startY.current - e.clientY;
      const newHeight = Math.min(Math.max(startHeight.current + delta, 200), window.innerHeight * 0.8);
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        Cookies.set('detailsPanelHeight', height.toString());
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [height]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection and default drag behavior
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = height;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  if (!hash) return null;

  const tabs = [
    { id: 'general', label: t('details.general') },
    { id: 'trackers', label: t('details.trackers') },
    { id: 'peers', label: t('details.peers') },
    { id: 'content', label: t('details.content') },
  ];

  return (
    <div 
      className={`bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-75 relative`}
      style={{ height: isExpanded ? height : 40 }}
    >
      {/* Resize Handle */}
      <div 
        className="h-2 bg-transparent hover:bg-blue-500/50 cursor-row-resize absolute -top-1 left-0 right-0 z-10"
        onMouseDown={handleMouseDown}
      />

      {/* Header / Tabs */}
      <div className="flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 h-10 shrink-0 select-none">
        <div className="flex items-center space-x-1 h-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setIsExpanded(true);
              }}
              className={`px-4 h-full text-sm font-medium border-b-2 transition-colors relative ${
                activeTab === tab.id && isExpanded
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && isExpanded && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-2">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500"
            >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <button 
                onClick={onClose}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-hidden relative"
          >
            {activeTab === 'general' && <GeneralTab hash={hash} />}
            {activeTab === 'trackers' && <TrackersTab hash={hash} />}
            {activeTab === 'peers' && <PeersTab hash={hash} />}
            {activeTab === 'content' && <ContentTab hash={hash} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DetailsPanel;
