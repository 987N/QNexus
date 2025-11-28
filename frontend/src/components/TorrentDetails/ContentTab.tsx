import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useQB } from '../../context/QBContext';
import { formatBytes } from '../../utils/format';
import { File as FileIcon, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';

interface ContentTabProps {
  hash: string;
}

interface TorrentFile {
  index: number;
  name: string;
  size: number;
  progress: number;
  priority: number; // 0: Do not download, 1: Normal, 6: High, 7: Maximal
  is_seed: boolean;
  piece_range: [number, number];
  availability: number;
}

interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  fileIndex?: number;
  size: number;
  progress: number;
  priority: number; // 0: Skip, 1: Normal, 2: Mixed (for folders)
  children: Record<string, TreeNode>;
  expanded: boolean;
}

const ContentTab: React.FC<ContentTabProps> = ({ hash }) => {
  const { t } = useTranslation();
  const { currentContainerId } = useQB();
  const [files, setFiles] = useState<TorrentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const fetchFiles = async () => {
    if (!hash || !currentContainerId) return;
    try {
      const response = await axios.get(`/api/torrents/${hash}/files`, {
        params: { containerId: currentContainerId }
      });
      setFiles(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchFiles();
    const interval = setInterval(fetchFiles, 5000);
    return () => clearInterval(interval);
  }, [hash, currentContainerId]);

  // Build Tree Structure
  const tree = useMemo(() => {
    const root: TreeNode = {
      name: 'root',
      path: '',
      isFile: false,
      size: 0,
      progress: 0,
      priority: 0,
      children: {},
      expanded: true
    };

    files.forEach(file => {
      const parts = file.name.split('/');
      let currentNode = root;
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!currentNode.children[part]) {
          currentNode.children[part] = {
            name: part,
            path: currentPath,
            isFile: index === parts.length - 1,
            fileIndex: index === parts.length - 1 ? file.index : undefined,
            size: 0,
            progress: 0,
            priority: 0,
            children: {},
            expanded: expandedPaths.has(currentPath)
          };
        }
        currentNode = currentNode.children[part];
        
        // Accumulate size and progress for folders (simplified)
        // Actual folder progress calculation is complex, here we just use file data for leaves
      });
    });

    // Calculate folder stats (recursive)
    const calculateStats = (node: TreeNode) => {
      if (node.isFile) {
        const file = files[node.fileIndex!];
        node.size = file.size;
        node.progress = file.progress;
        node.priority = file.priority;
        return;
      }

      let totalSize = 0;
      let totalDownloaded = 0;
      let hasNormal = false;
      let hasSkip = false;

      Object.values(node.children).forEach(child => {
        calculateStats(child);
        totalSize += child.size;
        totalDownloaded += child.size * child.progress;
        
        if (child.priority > 0) hasNormal = true;
        else hasSkip = true;
      });

      node.size = totalSize;
      node.progress = totalSize > 0 ? totalDownloaded / totalSize : 0;
      
      if (hasNormal && hasSkip) node.priority = 2; // Mixed
      else if (hasNormal) node.priority = 1; // Normal
      else node.priority = 0; // Skip
    };

    Object.values(root.children).forEach(calculateStats);
    return root.children;
  }, [files, expandedPaths]);

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const handlePriorityChange = async (node: TreeNode, checked: boolean) => {
    if (!currentContainerId) return;
    
    const newPriority = checked ? 1 : 0;
    let ids: number[] = [];

    const collectIds = (n: TreeNode) => {
      if (n.isFile) {
        ids.push(n.fileIndex!);
      } else {
        Object.values(n.children).forEach(collectIds);
      }
    };
    collectIds(node);

    try {
      await axios.post('/api/torrents/filePrio', {
        hash,
        id: ids.join('|'),
        priority: newPriority,
        containerId: currentContainerId
      });
      // Optimistic update or wait for poll
      fetchFiles();
    } catch (error) {
      console.error('Failed to set priority:', error);
    }
  };

  const renderNode = (node: TreeNode, level: number) => {
    const isMixed = node.priority === 2;
    const isChecked = node.priority === 1 || isMixed;

    return (
      <div key={node.path}>
        <div 
          className={`flex items-center py-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-sm ${level > 0 ? 'border-l border-gray-100 dark:border-gray-800' : ''}`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          {/* Expand Toggle */}
          <div className="w-6 flex justify-center shrink-0">
            {!node.isFile && (
              <button onClick={() => toggleExpand(node.path)} className="text-gray-400 hover:text-gray-600">
                {node.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Checkbox */}
          <input
            type="checkbox"
            className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={isChecked}
            ref={input => {
              if (input) input.indeterminate = isMixed;
            }}
            onChange={(e) => handlePriorityChange(node, e.target.checked)}
          />

          {/* Icon */}
          <div className="mr-2 text-gray-400">
            {node.isFile ? <FileIcon className="w-4 h-4" /> : (node.expanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />)}
          </div>

          {/* Name */}
          <div className="flex-1 truncate select-none" title={node.name}>
            {node.name}
          </div>

          {/* Stats */}
          <div className="w-24 text-right text-gray-500 text-xs shrink-0">
            {formatBytes(node.size)}
          </div>
          <div className="w-20 text-right text-gray-500 text-xs shrink-0 px-2">
            {(node.progress * 100).toFixed(1)}%
          </div>
          <div className="w-20 text-right text-gray-500 text-xs shrink-0">
             {node.priority === 0 ? t('priority.do_not_download') : (node.priority === 2 ? t('common.mixed') : t('priority.normal'))}
          </div>
        </div>

        {/* Children */}
        {!node.isFile && node.expanded && (
          <div>
            {Object.values(node.children).sort((a, b) => {
                // Folders first, then files
                if (a.isFile === b.isFile) return a.name.localeCompare(b.name);
                return a.isFile ? 1 : -1;
            }).map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading && files.length === 0) {
    return <div className="p-4 text-center text-gray-500">{t('common.loading')}</div>;
  }

  return (
    <div className="overflow-auto h-full p-2">
      {/* Header */}
      <div className="flex items-center px-2 py-2 border-b border-gray-100 dark:border-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
        <div className="w-6"></div>
        <div className="w-6"></div>
        <div className="w-6"></div>
        <div className="flex-1">{t('table.name')}</div>
        <div className="w-24 text-right">{t('table.size')}</div>
        <div className="w-20 text-right px-2">{t('table.progress')}</div>
        <div className="w-20 text-right">{t('details.priority')}</div>
      </div>
      
      {Object.values(tree).sort((a, b) => {
          if (a.isFile === b.isFile) return a.name.localeCompare(b.name);
          return a.isFile ? 1 : -1;
      }).map(node => renderNode(node, 0))}
    </div>
  );
};

export default ContentTab;
