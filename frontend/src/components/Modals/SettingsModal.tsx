import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Server, Layout, Trash2, Edit, Save, Check } from 'lucide-react';
import { clsx } from 'clsx';
import axios from 'axios';
import { useQB } from '../../context/QBContext';
import { useTranslation } from 'react-i18next';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sortable Item Component
const SortableItem = ({ id, label, visible, onToggle }: { id: string, label: string, visible: boolean, onToggle: () => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-colors mb-2",
        visible 
          ? "bg-white dark:bg-gray-800 border-blue-500/50" 
          : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60"
      )}
    >
      <div className="flex items-center space-x-3">
        <button {...attributes} {...listeners} className="cursor-grab hover:text-gray-900 dark:hover:text-white text-gray-400 dark:text-gray-500">
          <GripVertical className="w-4 h-4" />
        </button>
        <span className={visible ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}>{label}</span>
      </div>
      <button
        onClick={onToggle}
        className={clsx(
          "w-5 h-5 rounded border flex items-center justify-center transition-colors",
          visible ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
        )}
      >
        {visible && <Check className="w-3 h-3 text-white" />}
      </button>
    </div>
  );
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { qbContainers, fetchContainers, uiSettings, setUiSettings } = useQB();
  const [activeTab, setActiveTab] = useState<'clients' | 'display'>('clients');
  const { t, i18n } = useTranslation();
  
  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ... (Client Settings State) ...
  const [editingId, setEditingId] = useState<number | null>(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    host: '',
    port: '',
    username: '',
    password: ''
  });

  const [activeId, setActiveId] = useState<string | null>(null);

  if (!isOpen) return null;

  // ... (Client Actions) ...
  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/api/qb-containers/${editingId}`, clientForm);
      } else {
        await axios.post('/api/qb-containers', clientForm);
      }
      setEditingId(null);
      setClientForm({ name: '', host: '', port: '', username: '', password: '' });
      fetchContainers();
    } catch (err) {
      console.error(err);
      alert('Operation failed');
    }
  };

  const handleEditClient = (container: any) => {
    setEditingId(container.id);
    setClientForm({
      name: container.name,
      host: container.host,
      port: container.port,
      username: container.username,
      password: ''
    });
  };

  const handleDeleteClient = async (id: number) => {
    if (!window.confirm(t('settings.clients.delete_confirm'))) return;
    try {
      await axios.delete(`/api/qb-containers/${id}`);
      fetchContainers();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Display Actions ---

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (over && active.id !== over.id) {
      const oldIndex = uiSettings.columns.findIndex((c: { id: string }) => c.id === active.id);
      const newIndex = uiSettings.columns.findIndex((c: { id: string }) => c.id === over.id);
      
      setUiSettings({
        ...uiSettings,
        columns: arrayMove(uiSettings.columns, oldIndex, newIndex)
      });
    }
  };

  const toggleColumn = (columnId: string) => {
    setUiSettings({
      ...uiSettings,
      columns: uiSettings.columns.map((col: { id: string; visible: boolean }) => 
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    });
  };

  const getColumnLabel = (id: string) => {
    const labels: Record<string, string> = {
      name: t('table.name'),
      size: t('table.size'),
      progress: t('table.progress'),
      status: t('table.status'),
      seeds: t('table.seeds'),
      peers: t('table.peers'),
      down_speed: t('table.dlspeed'),
      up_speed: t('table.upspeed'),
      eta: t('table.eta'),
      ratio: t('table.ratio'),
      added_on: t('table.added_on'),
      completed_on: t('table.completed_on'),
      category: t('table.category'),
      tags: t('table.tags'),
      tracker: t('table.tracker')
    };
    return labels[id] || id;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-2xl h-[80vh] rounded-xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-800 transition-colors duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.title')}</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#252527]">
            <div className="p-2 space-y-1">
              <button
                onClick={() => setActiveTab('clients')}
                className={clsx(
                  "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeTab === 'clients' 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800"
                )}
              >
                <Server className="w-4 h-4" />
                <span>{t('settings.clients.title')}</span>
              </button>
              <button
                onClick={() => setActiveTab('display')}
                className={clsx(
                  "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeTab === 'display' 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800"
                )}
              >
                <Layout className="w-4 h-4" />
                <span>{t('settings.display.title')}</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-[#1c1c1e]">
            {activeTab === 'clients' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.clients.title')}</h3>
                  <button className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
                    <Server className="w-4 h-4" />
                    <span>{t('settings.clients.add_client')}</span>
                  </button>
                </div>

                {/* Client List */}
                <div className="space-y-2">
                  {qbContainers.map((container: any) => (
                    <div key={container.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{container.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{container.host}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleEditClient(container)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClient(container.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add/Edit Form */}
                <div className="bg-gray-50 dark:bg-gray-800/30 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
                    {editingId ? t('settings.clients.edit_client') : t('settings.clients.add_new_client')}
                  </h4>
                  <form onSubmit={handleClientSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('settings.clients.name')}</label>
                        <input
                          type="text"
                          required
                          value={clientForm.name}
                          onChange={e => setClientForm({...clientForm, name: e.target.value})}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                          placeholder="My Server"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('settings.clients.host')}</label>
                        <input
                          type="text"
                          required
                          value={clientForm.host}
                          onChange={e => setClientForm({...clientForm, host: e.target.value})}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                          placeholder="192.168.1.100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('settings.clients.port')}</label>
                        <input
                          type="number"
                          required
                          value={clientForm.port}
                          onChange={e => setClientForm({...clientForm, port: e.target.value})}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                          placeholder="8080"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('settings.clients.username')}</label>
                        <input
                          type="text"
                          required
                          value={clientForm.username}
                          onChange={e => setClientForm({...clientForm, username: e.target.value})}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                          placeholder="admin"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('settings.clients.password')}</label>
                        <input
                          type="password"
                          value={clientForm.password}
                          onChange={e => setClientForm({...clientForm, password: e.target.value})}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                          placeholder={editingId ? t('settings.clients.password_placeholder') : ""}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        <span>{editingId ? t('settings.clients.save_edit') : t('settings.clients.save_add')}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'display' && (
              <div className="space-y-8">
                {/* Language */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">{t('common.language')}</h4>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => {
                        setUiSettings({...uiSettings, language: 'zh'});
                        i18n.changeLanguage('zh');
                      }}
                      className={clsx(
                        "px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center space-x-2",
                        uiSettings.language === 'zh' 
                          ? "bg-blue-600 border-blue-600 text-white" 
                          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600"
                      )}
                    >
                      <span>简体中文</span>
                      {uiSettings.language === 'zh' && <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setUiSettings({...uiSettings, language: 'en'});
                        i18n.changeLanguage('en');
                      }}
                      className={clsx(
                        "px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center space-x-2",
                        uiSettings.language === 'en' 
                          ? "bg-blue-600 border-blue-600 text-white" 
                          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600"
                      )}
                    >
                      <span>English</span>
                      {uiSettings.language === 'en' && <Check className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sidebar Filters */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">{t('settings.display.sidebar_filters')}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'status', label: t('sidebar.status') },
                      { id: 'categories', label: t('sidebar.categories') },
                      { id: 'tags', label: t('sidebar.tags') },
                      { id: 'trackers', label: t('sidebar.trackers') },
                      { id: 'folders', label: t('sidebar.folders') }
                    ].map((filter) => (
                      <div 
                        key={filter.id}
                        className={clsx(
                          "flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer",
                          uiSettings.filters[filter.id as keyof typeof uiSettings.filters] 
                            ? "bg-white dark:bg-gray-800 border-blue-500/50" 
                            : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60"
                        )}
                        onClick={() => setUiSettings({
                          ...uiSettings,
                          filters: {
                            ...uiSettings.filters,
                            [filter.id]: !uiSettings.filters[filter.id as keyof typeof uiSettings.filters]
                          }
                        })}
                      >
                        <span className={uiSettings.filters[filter.id as keyof typeof uiSettings.filters] ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}>
                          {filter.label}
                        </span>
                        <div className={clsx(
                          "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                          uiSettings.filters[filter.id as keyof typeof uiSettings.filters]
                            ? "bg-blue-600 border-blue-600" 
                            : "border-gray-300 dark:border-gray-600"
                        )}>
                          {uiSettings.filters[filter.id as keyof typeof uiSettings.filters] && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Columns */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">{t('settings.display.columns')}</h4>
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={uiSettings.columns.map((c: { id: string }) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="grid grid-cols-1 gap-2">
                        {uiSettings.columns.map((col: { id: string; visible: boolean }) => (
                          <SortableItem
                            key={col.id}
                            id={col.id}
                            label={getColumnLabel(col.id)}
                            visible={col.visible}
                            onToggle={() => toggleColumn(col.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                    <DragOverlay>
                      {activeId ? (
                        <SortableItem
                          id={activeId}
                          label={getColumnLabel(activeId)}
                          visible={uiSettings.columns.find((c: { id: string }) => c.id === activeId)?.visible ?? true}
                          onToggle={() => {}}
                        />
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
