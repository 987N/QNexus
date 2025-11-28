import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  count: number;
  onClose: () => void;
  onConfirm: (deleteFiles: boolean) => Promise<void>;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ isOpen, count, onClose, onConfirm }) => {
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(deleteFiles);
      onClose();
    } catch (error) {
      console.error('Failed to delete torrents:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-md rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 transition-colors duration-200">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-red-100 dark:bg-red-500/10 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">确认删除</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              确定要删除选中的 {count} 个种子吗？此操作无法撤销。
            </p>
            
            <div className="flex items-center mb-6">
              <input
                type="checkbox"
                id="deleteFiles"
                checked={deleteFiles}
                onChange={(e) => setDeleteFiles(e.target.checked)}
                className="rounded bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-red-600 focus:ring-0 focus:ring-offset-0"
              />
              <label htmlFor="deleteFiles" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                同时删除硬盘上的文件
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
