import React, { useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  Tag, 
  Folder, 
  Download, 
  Copy
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAction: (action: string) => void;
  selectedCount: number;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onAction, selectedCount }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Adjust position to keep menu within viewport
  const style: React.CSSProperties = {
    top: y,
    left: x,
  };
  
  // Simple adjustment logic (can be improved)
  if (menuRef.current) {
    const rect = menuRef.current.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) {
      style.left = x - rect.width;
    }
    if (y + rect.height > window.innerHeight) {
      style.top = y - rect.height;
    }
  }

  const MenuItem: React.FC<{ 
    icon: React.ElementType; 
    label: string; 
    action: string; 
    danger?: boolean;
    separator?: boolean;
  }> = ({ icon: Icon, label, action, danger, separator }) => (
    <>
      <button
        className={`w-full flex items-center px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
          danger ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300' : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white'
        }`}
        onClick={() => {
          onAction(action);
          onClose();
        }}
      >
        <Icon className="w-4 h-4 mr-3" />
        <span>{label}</span>
      </button>
      {separator && <div className="border-t border-gray-200 dark:border-gray-700 my-1" />}
    </>
  );

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 overflow-hidden"
      style={style}
    >
      <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 mb-1">
        {t('context_menu.selected_count', { count: selectedCount })}
      </div>
      
      <MenuItem icon={Play} label={t('context_menu.start')} action="resume" />
      <MenuItem icon={Pause} label={t('context_menu.pause')} action="pause" />
      <MenuItem icon={Trash2} label={t('context_menu.delete')} action="delete" danger separator />
      
      <MenuItem icon={RefreshCw} label={t('context_menu.reannounce')} action="reannounce" />
      <MenuItem icon={CheckCircle} label={t('context_menu.recheck')} action="recheck" separator />
      
      <MenuItem icon={Tag} label={t('context_menu.set_tags')} action="setTags" />
      <MenuItem icon={Folder} label={t('context_menu.set_category')} action="setCategory" />
      
      <MenuItem icon={Download} label={t('context_menu.export')} action="export" />
      <MenuItem icon={Copy} label={t('context_menu.copy_info')} action="copy" />
    </div>
  );
};

export default ContextMenu;
