import React, { useState, useEffect } from 'react';
import { X, Folder } from 'lucide-react';
import axios from 'axios';
import { useQB } from '../../context/QBContext';

import { useTranslation } from 'react-i18next';

interface SetCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  hashes: string[];
  onSuccess: () => void;
}

const SetCategoryModal: React.FC<SetCategoryModalProps> = ({ isOpen, onClose, hashes, onSuccess }) => {
  const [category, setCategory] = useState('');
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { currentContainerId } = useQB();
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen && currentContainerId) {
      setCategory('');
      axios.get(`/api/torrents/filters?containerId=${currentContainerId}`)
        .then(res => {
          setExistingCategories(res.data.categories.map((c: any) => c.label));
        })
        .catch(console.error);
    }
  }, [isOpen, currentContainerId]);

  const handleSubmit = async () => {
    if (!currentContainerId) return;
    setLoading(true);
    try {
      await axios.post('/api/torrents/setCategory', {
        hashes: hashes.join('|'),
        category,
        containerId: currentContainerId
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to set category:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-md rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 transition-colors duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 rounded-t-xl">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Folder className="w-5 h-5 mr-2 text-blue-500" />
            {t('modals.set_category_title')}
          </h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('common.delete_confirm_message', { count: hashes.length }).replace('删除', '设置分类').replace('delete', 'set category for')}
          </p>
          
          <div className="relative">
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('add_torrent.category')}</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
              placeholder={t('modals.new_category')}
              autoFocus
            />
            {showDropdown && existingCategories.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto">
                {existingCategories.filter(c => c.toLowerCase().includes(category.toLowerCase())).map(cat => (
                  <div
                    key={cat}
                    className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? t('common.save') + '...' : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetCategoryModal;
