import React, { useState, useEffect } from "react";
import {
  Server,
  ChevronDown,
  Tag,
  Folder,
  Activity,
  ArrowDown,
  ArrowUp,
  Plus,
  Edit2,
  Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useQB } from "../../context/QBContext";
import AddCategoryModal from "../Modals/AddCategoryModal";
import EditCategoryModal from "../Modals/EditCategoryModal";
import DeleteCategoryModal from "../Modals/DeleteCategoryModal";

// Types
interface SidebarProps {
  qbContainers: any[];
  currentContainerId: number | null;
  onContainerChange: (id: number) => void;
  filters: any;
  onFilterChange: (type: string, value: string) => void;
  speedData: any[];
  stats: any;
  collapsed: boolean;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  qbContainers,
  currentContainerId,
  onContainerChange,
  filters,
  onFilterChange,
  speedData,
  stats,
  collapsed
}) => {
  const { t } = useTranslation();
  const { uiSettings } = useQB();
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ name: string; savePath: string } | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  const [expandedSections, setExpandedSectionsState] = useState<
    Record<string, boolean>
  >(() => {
    // Restore from localStorage on initialization
    const saved = localStorage.getItem("sidebarExpandedSections");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {
          status: true,
          categories: true,
          tags: false,
          trackers: false,
          folders: false,
        };
      }
    }
    return {
      status: true,
      categories: true,
      tags: false,
      trackers: false,
      folders: false,
    };
  });

  // Wrapper to save to localStorage when toggling sections
  const setExpandedSections = (
    updater: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => {
    setExpandedSectionsState((prev) => {
      const newState = updater(prev);
      localStorage.setItem("sidebarExpandedSections", JSON.stringify(newState));
      return newState;
    });
  };

  const [filterOptions, setFilterOptions] = useState<{
    categories: Array<{ label: string; count: number }>;
    trackers: Array<{ label: string; count: number }>;
    tags: Array<{ label: string; count: number }>;
    save_paths: Array<{ label: string; count: number }>;
  }>({
    categories: [],
    trackers: [],
    tags: [],
    save_paths: [],
  });

  const [allCategories, setAllCategories] = useState<Record<string, any>>({});

  useEffect(() => {
    if (currentContainerId) {
      fetchFilters();
      fetchCategories();
    }
  }, [currentContainerId]);

  const fetchFilters = async () => {
    try {
      const res = await axios.get(
        `/api/torrents/filters?containerId=${currentContainerId}`
      );
      setFilterOptions(res.data);
    } catch (err) {
      console.error("Failed to fetch filters", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(
        `/api/torrents/categories?containerId=${currentContainerId}`
      );
      setAllCategories(res.data || {});
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const currentContainer = qbContainers.find(
    (c) => c.id === currentContainerId
  );

  const formatSpeed = (bytes: number) => {
    if (bytes === 0) return "0 B/s";
    const k = 1024;
    const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Merge all categories with filter counts
  const mergedCategories = Object.keys(allCategories).map(catName => {
    const filterItem = filterOptions.categories.find(c => c.label === catName);
    return {
      label: catName,
      count: filterItem ? filterItem.count : 0,
      savePath: allCategories[catName].savePath
    };
  });

  // Also include categories that might be in filters but not in allCategories (uncategorized is handled separately usually, but just in case)
  filterOptions.categories.forEach(f => {
    if (!allCategories[f.label]) {
      mergedCategories.push({ label: f.label, count: f.count, savePath: '' });
    }
  });
  
  // Deduplicate by label
  const uniqueCategories = Array.from(new Map(mergedCategories.map(item => [item.label, item])).values());


  return (
    <motion.aside
      initial={false}
      animate={{ 
        width: collapsed ? 0 : 256,
        opacity: collapsed ? 0 : 1
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={clsx(
        "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col h-screen relative overflow-hidden transition-all duration-300 ease-in-out z-20",
        collapsed && "border-r-0"
      )}
    >
      {/* Content - Only visible when expanded */}
      <div className="flex-1 flex flex-col min-h-0 w-64">
        {/* 1. QB Switcher */}
        <div className="px-2.5 py-2 border-b border-gray-200 dark:border-gray-800">
          <div className="relative group">
            <button className="w-full flex items-center justify-between bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-2.5 py-1.5 rounded-lg transition-colors">
              <div className="flex items-center space-x-2 truncate">
                <Server className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">
                  {currentContainer
                    ? currentContainer.name
                    : t("common.select_qb")}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* Dropdown */}
            <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl hidden group-hover:block z-50">
              {qbContainers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onContainerChange(c.id)}
                  className={clsx(
                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg",
                    currentContainerId === c.id
                      ? "text-blue-500 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300"
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Speed Chart */}
        <div className="w-full bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
          {/* Speed Info Header */}
          <div className="px-3 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-medium text-green-600 dark:text-green-500">
              <ArrowDown className="w-3 h-3" />
              <span>
                {speedData.length > 0
                  ? formatSpeed(speedData[speedData.length - 1].dlspeed)
                  : "0 B/s"}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs font-medium text-blue-600 dark:text-blue-500">
              <ArrowUp className="w-3 h-3" />
              <span>
                {speedData.length > 0
                  ? formatSpeed(speedData[speedData.length - 1].upspeed)
                  : "0 B/s"}
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="h-20 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={speedData}>
                <defs>
                  <linearGradient id="colorDl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "none",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                  itemStyle={{ padding: 0 }}
                  labelStyle={{ display: "none" }}
                  formatter={(value: number) => formatSpeed(value)}
                />
                <Area
                  type="monotone"
                  dataKey="dlspeed"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorDl)"
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="upspeed"
                  stroke="#3B82F6"
                  fillOpacity={1}
                  fill="url(#colorUp)"
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filters (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-1.5 py-0.5 space-y-0 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          {/* Status Filter */}
          {uiSettings.filters.status && (
            <FilterSection
              title={t("sidebar.status")}
              icon={Activity}
              expanded={expandedSections.status}
              onToggle={() => toggleSection("status")}
            >
              <FilterItem
                label={t("sidebar.all")}
                count={stats?.total}
                active={filters.status === ""}
                onClick={() => onFilterChange("status", "")}
              />
              <FilterItem
                label={t("sidebar.downloading")}
                count={stats?.downloading}
                active={filters.status === "downloading"}
                onClick={() => onFilterChange("status", "downloading")}
              />
              <FilterItem
                label={t("sidebar.seeding")}
                count={stats?.seeding}
                active={filters.status === "seeding"}
                onClick={() => onFilterChange("status", "seeding")}
              />
              <FilterItem
                label={t("sidebar.completed")}
                count={stats?.completed}
                active={filters.status === "completed"}
                onClick={() => onFilterChange("status", "completed")}
              />
              <FilterItem
                label={t("sidebar.active")}
                count={stats?.active}
                active={filters.status === "active"}
                onClick={() => onFilterChange("status", "active")}
              />
              <FilterItem
                label={t("sidebar.paused")}
                count={stats?.paused}
                active={filters.status === "paused"}
                onClick={() => onFilterChange("status", "paused")}
              />
              <FilterItem
                label={t("sidebar.checking")}
                count={stats?.checking}
                active={filters.status === "checking"}
                onClick={() => onFilterChange("status", "checking")}
              />
              <FilterItem
                label={t("sidebar.error")}
                count={stats?.error}
                active={filters.status === "error"}
                onClick={() => onFilterChange("status", "error")}
              />
            </FilterSection>
          )}

          {/* Categories */}
          {uiSettings.filters.categories && (
            <FilterSection
              title={t("sidebar.categories")}
              icon={Folder}
              expanded={expandedSections.categories}
              onToggle={() => toggleSection("categories")}
              onAdd={() => setIsAddCategoryModalOpen(true)}
            >
              <FilterItem
                label={t("sidebar.all")}
                active={!filters.category}
                onClick={() => onFilterChange("category", "")}
              />
              {uniqueCategories.map((item) => (
                <FilterItem
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  active={filters.category === item.label}
                  onClick={() => onFilterChange("category", item.label)}
                  onEdit={() => setEditingCategory({ name: item.label, savePath: item.savePath })}
                  onDelete={() => setDeletingCategory(item.label)}
                />
              ))}
            </FilterSection>
          )}

          {/* Tags */}
          {uiSettings.filters.tags && (
            <FilterSection
              title={t("sidebar.tags")}
              icon={Tag}
              expanded={expandedSections.tags}
              onToggle={() => toggleSection("tags")}
            >
              <FilterItem
                label={t("sidebar.all")}
                active={!filters.tag}
                onClick={() => onFilterChange("tag", "")}
              />
              {filterOptions.tags.map((item) => (
                <FilterItem
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  active={filters.tag === item.label}
                  onClick={() => onFilterChange("tag", item.label)}
                />
              ))}
            </FilterSection>
          )}

          {/* Trackers */}
          {uiSettings.filters.trackers && (
            <FilterSection
              title={t("sidebar.trackers")}
              icon={Server}
              expanded={expandedSections.trackers}
              onToggle={() => toggleSection("trackers")}
            >
              <FilterItem
                label={t("sidebar.all")}
                active={!filters.tracker}
                onClick={() => onFilterChange("tracker", "")}
              />
              {filterOptions.trackers.map((item) => (
                <FilterItem
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  active={filters.tracker === item.label}
                  onClick={() => onFilterChange("tracker", item.label)}
                />
              ))}
            </FilterSection>
          )}

          {/* Folders */}
          {uiSettings.filters.folders && (
            <FilterSection
              title={t("sidebar.folders")}
              icon={Folder}
              expanded={expandedSections.folders}
              onToggle={() => toggleSection("folders")}
            >
              <FilterItem
                label={t("sidebar.all")}
                active={!filters.save_path}
                onClick={() => onFilterChange("save_path", "")}
              />
              {filterOptions.save_paths.map((item) => (
                <FilterItem
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  active={filters.save_path === item.label}
                  onClick={() => onFilterChange("save_path", item.label)}
                />
              ))}
            </FilterSection>
          )}
        </div>
      </div> 
      
      <AddCategoryModal
        isOpen={isAddCategoryModalOpen}
        onClose={() => setIsAddCategoryModalOpen(false)}
        onSuccess={() => {
          fetchCategories();
        }}
      />

      {editingCategory && (
        <EditCategoryModal
          isOpen={true}
          onClose={() => setEditingCategory(null)}
          onSuccess={() => {
            fetchCategories();
            fetchFilters();
          }}
          categoryName={editingCategory.name}
          currentSavePath={editingCategory.savePath}
        />
      )}

      {deletingCategory && (
        <DeleteCategoryModal
          isOpen={true}
          onClose={() => setDeletingCategory(null)}
          onSuccess={() => {
            fetchCategories();
            fetchFilters();
          }}
          categoryName={deletingCategory}
        />
      )}
    </motion.aside>
  );
};

const FilterSection: React.FC<{
  title: string;
  icon: any;
  expanded: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  children: React.ReactNode;
}> = ({ title, icon: Icon, expanded, onToggle, onAdd, children }) => (
  <div className="mb-0.5">
    <div className="w-full flex items-center justify-between px-2 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group">
      <button
        onClick={onToggle}
        className="flex items-center space-x-2 flex-1"
      >
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{title}</span>
      </button>
      <div className="flex items-center space-x-1">
        {onAdd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Add"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onToggle}>
          <motion.div
            animate={{ rotate: expanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-3 h-3" />
          </motion.div>
        </button>
      </div>
    </div>
    <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="mt-0.5 ml-1.5 pl-1.5 border-l border-gray-200 dark:border-gray-800 space-y-0">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const FilterItem: React.FC<{
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}> = ({ label, count, active, onClick, onEdit, onDelete }) => (
  <div
    className={clsx(
      "w-full flex items-center justify-between px-2 py-1 text-xs rounded-md transition-colors group/item",
      active
        ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
        : "text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
    )}
  >
    <button onClick={onClick} className="flex-1 text-left truncate">
      {label}
    </button>
    <div className="flex items-center space-x-1">
      {count !== undefined && <span className="text-gray-500 dark:text-gray-600">{count}</span>}
      {(onEdit || onDelete) && (
        <div className="hidden group-hover/item:flex items-center space-x-1 pl-1">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Edit"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  </div>
);

export default Sidebar;
