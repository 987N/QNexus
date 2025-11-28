import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ModalWrapper from './ModalWrapper';
import axios from 'axios';
import { useQB } from '../../context/QBContext';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [category, setCategory] = useState('');
  const [savePath, setSavePath] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingSavePaths, setExistingSavePaths] = useState<string[]>([]);
  const [showSavePathDropdown, setShowSavePathDropdown] = useState(false);
  
  const { currentContainerId } = useQB();
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen && currentContainerId) {
      // Fetch existing save paths for autocomplete
      axios.get(`/api/torrents/filters?containerId=${currentContainerId}`)
        .then(res => {
          setExistingSavePaths(res.data.save_paths?.map((p: any) => p.label) || []);
        })
        .catch(console.error);
        
      // Reset form
      setCategory('');
      setSavePath('');
    }
  }, [isOpen, currentContainerId]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!category.trim()) return;
    
    setLoading(true);
    try {
      await axios.post('/api/torrents/createCategory', {
        containerId: currentContainerId,
        category: category.trim(),
        savePath: savePath.trim()
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} className="w-full max-w-md">
      <div className="bg-white dark:bg-[#1C1C1E] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 transition-colors duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C1C1E]">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('category.add_title')}</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 bg-white dark:bg-[#1C1C1E]">
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('category.name')}</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
              placeholder={t('category.name_placeholder')}
              autoFocus
            />
          </div>
          
          <div className="relative">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('category.save_path')}</label>
            <input
              type="text"
              value={savePath}
              onChange={(e) => setSavePath(e.target.value)}
              onFocus={() => setShowSavePathDropdown(true)}
              onBlur={() => setTimeout(() => setShowSavePathDropdown(false), 200)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
              placeholder={t('category.save_path_placeholder')}
            />
            {showSavePathDropdown && existingSavePaths.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-40 overflow-y-auto">
                {existingSavePaths.filter(p => p.toLowerCase().includes(savePath.toLowerCase())).map(path => (
                  <div
                    key={path}
                    className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => setSavePath(path)}
                  >
                    {path}
                  </div>
                ))}
              </div>
            )}
          </div>
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
            disabled={loading || !category.trim()}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('common.saving') : t('common.create')}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

export default AddCategoryModal;
