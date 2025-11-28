import { ChevronRight, Play, Pause, Plus, Trash2, Sun, Moon, Settings, FileText } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

interface TopBarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onStart?: () => void;
  onStop?: () => void;
  onAdd?: () => void;
  onDelete?: () => void;
  onSearch?: (query: string) => void;
  onSettings?: () => void;
  onLogs?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ 
  collapsed, 
  onToggleSidebar,
  onStart,
  onStop,
  onAdd,
  onDelete,
  onSearch,
  onSettings,
  onLogs
}) => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <header className="h-14 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 flex items-center justify-between px-4 shrink-0 transition-all duration-200 z-20">
      {/* Left: Sidebar Toggle */}
      <div className="flex items-center">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-2">
        {onSearch && (
          <div className="relative mr-2 hidden md:block">
            <input
              type="text"
              placeholder={t('common.search')}
              onChange={(e) => onSearch(e.target.value)}
              className="w-48 bg-gray-100/50 dark:bg-gray-800/50 border-none rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all backdrop-blur-sm"
            />
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all active:scale-95 text-gray-600 dark:text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400"
          title={theme === 'dark' ? '切换到日间模式' : '切换到夜间模式'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-800 mx-2" />

        <button 
          onClick={onStart}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all active:scale-95 text-green-600 dark:text-green-500 hover:bg-green-500/10"
          title={t('common.start')}
        >
          <Play className="w-5 h-5" />
        </button>
        <button 
          onClick={onStop}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all active:scale-95 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/10"
          title={t('common.stop')}
        >
          <Pause className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-800 mx-2" />
        <button 
          onClick={onAdd}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all active:scale-95 text-blue-600 dark:text-blue-500 hover:bg-blue-500/10"
          title={t('common.add')}
        >
          <Plus className="w-5 h-5" />
        </button>
        <button 
          onClick={onDelete}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all active:scale-95 text-red-600 dark:text-red-500 hover:bg-red-500/10"
          title={t('common.delete')}
        >
          <Trash2 className="w-5 h-5" />
        </button>
        <button 
          onClick={onSettings}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all active:scale-95 text-gray-600 dark:text-gray-400"
          title={t('common.settings')}
        >
          <Settings className="w-5 h-5" />
        </button>
        <button 
          onClick={onLogs}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all active:scale-95 text-gray-600 dark:text-gray-400"
          title={t('logs.title', 'Logs')}
        >
          <FileText className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
