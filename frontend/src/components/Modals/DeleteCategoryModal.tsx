import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useQB } from '../../context/QBContext';

import ModalWrapper from './ModalWrapper';

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categoryName: string;
}

const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  categoryName
}) => {
  const [loading, setLoading] = useState(false);
  const { currentContainerId } = useQB();
  const { t } = useTranslation();

  // Removed early return to allow AnimatePresence to work

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await axios.post('/api/torrents/deleteCategory', {
        containerId: currentContainerId,
        categories: categoryName
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to delete category:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} className="w-full max-w-md">
      <div className="bg-white dark:bg-[#1C1C1E] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 transition-colors duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C1C1E]">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span>{t('category.delete_title')}</span>
          </h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 bg-white dark:bg-[#1C1C1E]">
          <p className="text-gray-600 dark:text-gray-300">
            {t('category.delete_confirm', { name: categoryName })}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-end space-x-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('common.deleting') : t('common.delete')}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

export default DeleteCategoryModal;
