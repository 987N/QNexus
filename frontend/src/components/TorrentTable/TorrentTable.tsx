import React, { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";
import Cookies from "js-cookie";
import type { Torrent } from "../../types";

interface ColumnDef {
  id: string;
  label: string;
  width: number;
  minWidth: number;
  render: (torrent: Torrent) => React.ReactNode;
}

import { useQB } from "../../context/QBContext";
import { useTranslation } from "react-i18next";

interface TorrentTableProps {
  torrents: Torrent[];
  onSort: (field: string) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  selectedHashes: Set<string>;
  onSelectionChange: (hashes: Set<string>) => void;
  onRowContextMenu?: (e: React.MouseEvent, hash: string) => void;
  onRowDoubleClick?: (hash: string) => void;
  onContextAction?: (action: string) => void;
  loading?: boolean;
}

import { List } from "react-window";

// Hook for container dimensions
function useContainerDimensions(ref: React.RefObject<HTMLDivElement | null>) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return dimensions;
}

interface RowData {
  torrents: Torrent[];
  selectedHashes: Set<string>;
  visibleColumns: ColumnDef[];
  columnWidths: Record<string, number>;
  totalWidth: number;
  onRowClick: (e: React.MouseEvent, hash: string) => void;
  onRowDoubleClick?: (hash: string) => void;
  onContextMenu: (e: React.MouseEvent, hash: string) => void;
}

const Row = ({
  index,
  style,
  data,
}: {
  index: number;
  style: React.CSSProperties;
  data: RowData;
}) => {
  const {
    torrents,
    selectedHashes,
    visibleColumns,
    columnWidths,
    totalWidth,
    onRowClick,
    onRowDoubleClick,
    onContextMenu,
  } = data;
  const torrent = torrents[index];
  if (!torrent) return <></>; // strict ReactElement return

  const isSelected = selectedHashes.has(torrent.hash);

  return (
    <div
      style={{ ...style, minWidth: totalWidth }}
      className={clsx(
        "flex items-center transition-colors duration-150 text-sm cursor-pointer border-l-2",
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500"
          : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600"
      )}
      onClick={(e) => onRowClick(e, torrent.hash)}
      onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(torrent.hash)}
      onContextMenu={(e) => onContextMenu(e, torrent.hash)}
    >
      {visibleColumns.map((col) => (
        <div
          key={col.id}
          className="px-4 py-2 truncate shrink-0"
          style={{ width: columnWidths[col.id] || col.width }}
        >
          {col.render(torrent)}
        </div>
      ))}
    </div>
  );
};

const TorrentTable: React.FC<TorrentTableProps> = ({
  torrents,
  onSort,
  sortBy,
  sortOrder,
  selectedHashes,
  onSelectionChange,
  onRowContextMenu,
  onRowDoubleClick,
}) => {
  const { uiSettings } = useQB();
  const { t } = useTranslation();

  // Formatters (kept as is)
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSec: number): string => {
    if (bytesPerSec === 0) return "0 B/s";
    const kbps = bytesPerSec / 1024;
    if (kbps < 1024) return `${kbps.toFixed(1)} KB/s`;
    const mbps = kbps / 1024;
    return `${mbps.toFixed(2)} MB/s`;
  };

  const formatETA = (eta: number): string => {
    if (eta < 0 || eta === 8640000) return "∞";
    if (eta === 0) return "";
    const days = Math.floor(eta / 86400);
    const hours = Math.floor((eta % 86400) / 3600);
    const minutes = Math.floor((eta % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatTime = (timestamp: number): string => {
    if (!timestamp) return "-";
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatRatio = (ratio: number): string => {
    return ratio === -1 ? "∞" : ratio.toFixed(2);
  };

  const getStateIcon = (state: string) => {
    if (!state) return "•";
    const icons: Record<string, string> = {
      downloading: "⬇",
      uploading: "⬆",
      pausedDL: "⏸",
      pausedUP: "⏸",
      stalledDL: "⏸",
      stalledUP: "⏸",
      error: "⚠",
      missingFiles: "❌",
      checkingUP: "🔄",
      checkingDL: "🔄",
      queuedDL: "⏳",
      queuedUP: "⏳",
      metaDL: "⬇",
      forcedDL: "⬇",
      forcedUP: "⬆",
    };
    return icons[state] || "•";
  };

  const getStateColor = (state: string) => {
    if (!state) return "text-gray-500 dark:text-gray-400";
    if (state.includes("error") || state.includes("missing"))
      return "text-red-600 dark:text-red-400";
    if (state.includes("paused") || state.includes("stalled"))
      return "text-gray-500 dark:text-gray-400";
    if (state.includes("downloading") || state.includes("DL"))
      return "text-green-600 dark:text-green-400";
    if (state.includes("uploading") || state.includes("UP"))
      return "text-blue-600 dark:text-blue-400";
    if (state.includes("checking"))
      return "text-yellow-600 dark:text-yellow-400";
    return "text-gray-500 dark:text-gray-400";
  };

  // --- Columns Configuration ---
  const columnDefs: Record<string, ColumnDef> = {
    name: {
      id: "name",
      label: t("table.name"),
      width: 400,
      minWidth: 150,
      render: (t) => (
        <div className="flex items-center space-x-2 overflow-hidden">
          <span
            className={clsx("text-lg shrink-0", getStateColor(t.state || ""))}
          >
            {getStateIcon(t.state || "")}
          </span>
          <span
            className="truncate text-gray-900 dark:text-gray-200"
            title={t.name || ""}
          >
            {t.name || "Unknown"}
          </span>
        </div>
      ),
    },
    size: {
      id: "size",
      label: t("table.size"),
      width: 100,
      minWidth: 60,
      render: (t) => (
        <span className="text-gray-700 dark:text-gray-300">
          {formatSize(t.size || 0)}
        </span>
      ),
    },
    progress: {
      id: "progress",
      label: t("table.progress"),
      width: 140,
      minWidth: 80,
      render: (t) => (
        <div className="flex items-center space-x-2 w-full">
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className={clsx(
                "h-full transition-all",
                (t.progress || 0) === 1 ? "bg-blue-500" : "bg-green-500"
              )}
              style={{ width: `${(t.progress || 0) * 100}%` }}
            />
          </div>
          <span className="text-xs w-10 text-right text-gray-700 dark:text-gray-300">
            {((t.progress || 0) * 100).toFixed(1)}%
          </span>
        </div>
      ),
    },
    dlspeed: {
      id: "dlspeed",
      label: t("table.dlspeed"),
      width: 120,
      minWidth: 70,
      render: (t) => (
        <span className="text-green-600 dark:text-green-400">
          {formatSpeed(t.dlspeed || 0)}
        </span>
      ),
    },
    upspeed: {
      id: "upspeed",
      label: t("table.upspeed"),
      width: 120,
      minWidth: 70,
      render: (t) => (
        <span className="text-blue-600 dark:text-blue-400">
          {formatSpeed(t.upspeed || 0)}
        </span>
      ),
    },
    eta: {
      id: "eta",
      label: t("table.eta"),
      width: 100,
      minWidth: 60,
      render: (t) => (
        <span className="text-gray-700 dark:text-gray-300">
          {formatETA(t.eta || 0)}
        </span>
      ),
    },
    ratio: {
      id: "ratio",
      label: t("table.ratio"),
      width: 90,
      minWidth: 50,
      render: (t) => (
        <span className="text-gray-700 dark:text-gray-300">
          {formatRatio(t.ratio || 0)}
        </span>
      ),
    },
    downloaded: {
      id: "downloaded",
      label: t("table.downloaded"),
      width: 100,
      minWidth: 60,
      render: (t) => (
        <span className="text-gray-700 dark:text-gray-300">
          {formatSize(t.downloaded || 0)}
        </span>
      ),
    },
    uploaded: {
      id: "uploaded",
      label: t("table.uploaded"),
      width: 100,
      minWidth: 60,
      render: (t) => (
        <span className="text-gray-700 dark:text-gray-300">
          {formatSize(t.uploaded || 0)}
        </span>
      ),
    },
    seeds: {
      id: "seeds",
      label: t("table.seeds"),
      width: 90,
      minWidth: 50,
      render: (t) => (
        <span className="text-gray-700 dark:text-gray-300">{`${
          t.num_seeds || 0
        } (${t.num_complete || 0})`}</span>
      ),
    },
    peers: {
      id: "peers",
      label: t("table.peers"),
      width: 90,
      minWidth: 50,
      render: (t) => (
        <span className="text-gray-700 dark:text-gray-300">{`${
          t.num_leechs || 0
        } (${t.num_incomplete || 0})`}</span>
      ),
    },
    added_on: {
      id: "added_on",
      label: t("table.added_on"),
      width: 160,
      minWidth: 100,
      render: (t) => (
        <span className="text-gray-700 dark:text-gray-300">
          {formatTime(t.added_on || 0)}
        </span>
      ),
    },
    tracker: {
      id: "tracker",
      label: t("table.tracker"),
      width: 200,
      minWidth: 100,
      render: (t) => (
        <span
          className="truncate text-gray-700 dark:text-gray-300"
          title={t.tracker || ""}
        >
          {t.tracker || ""}
        </span>
      ),
    },
    save_path: {
      id: "save_path",
      label: t("table.save_path"),
      width: 200,
      minWidth: 100,
      render: (t) => (
        <span
          className="truncate text-gray-700 dark:text-gray-300"
          title={t.save_path || ""}
        >
          {t.save_path || ""}
        </span>
      ),
    },
    category: {
      id: "category",
      label: t("table.category"),
      width: 120,
      minWidth: 60,
      render: (t) => (
        <span className="text-gray-700 dark:text-gray-300">
          {t.category || ""}
        </span>
      ),
    },
    tags: {
      id: "tags",
      label: t("table.tags"),
      width: 120,
      minWidth: 60,
      render: (t) => (
        <span className="text-gray-700 dark:text-gray-300">{t.tags || ""}</span>
      ),
    },
  };

  // Construct columns based on uiSettings order and visibility
  const visibleColumns = uiSettings.columns
    .filter((col) => col.visible)
    .map((col) => columnDefs[col.id])
    .filter(Boolean); // Filter out any undefined columns if IDs don't match

  // Selection logic
  const lastSelectedHash = useRef<string | null>(null);

  const handleRowClick = (e: React.MouseEvent, hash: string) => {
    e.preventDefault();

    const isMultiSelect = e.metaKey || e.ctrlKey;
    const isRangeSelect = e.shiftKey;

    let newSelection = new Set(selectedHashes);

    if (
      isRangeSelect &&
      lastSelectedHash.current &&
      torrents.some((t) => t.hash === lastSelectedHash.current)
    ) {
      const lastIndex = torrents.findIndex(
        (t) => t.hash === lastSelectedHash.current
      );
      const currentIndex = torrents.findIndex((t) => t.hash === hash);

      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);

      const rangeHashes = torrents.slice(start, end + 1).map((t) => t.hash);

      if (!isMultiSelect) {
        newSelection.clear();
      }

      rangeHashes.forEach((h) => newSelection.add(h));
    } else if (isMultiSelect) {
      if (newSelection.has(hash)) {
        newSelection.delete(hash);
      } else {
        newSelection.add(hash);
        lastSelectedHash.current = hash;
      }
    } else {
      newSelection.clear();
      newSelection.add(hash);
      lastSelectedHash.current = hash;
    }

    onSelectionChange(newSelection);
  };

  // --- Resizing Logic ---
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => {
      const saved = Cookies.get("columnWidths");
      return saved ? JSON.parse(saved) : {};
    }
  );

  const resizingRef = useRef<{
    startX: number;
    startWidth: number;
    columnId: string;
  } | null>(null);

  // Persist column widths
  useEffect(() => {
    if (Object.keys(columnWidths).length > 0) {
      Cookies.set("columnWidths", JSON.stringify(columnWidths));
    }
  }, [columnWidths]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        const allHashes = new Set(torrents.map((t) => t.hash));
        onSelectionChange(allHashes);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [torrents, onSelectionChange]);

  const handleContextMenu = (e: React.MouseEvent, hash: string) => {
    e.preventDefault();
    if (!selectedHashes.has(hash)) {
      const newSelection = new Set<string>();
      newSelection.add(hash);
      onSelectionChange(newSelection);
      lastSelectedHash.current = hash;
    }
    if (onRowContextMenu) onRowContextMenu(e, hash);
  };

  const handleResizeStart = (
    e: React.MouseEvent,
    columnId: string,
    currentWidth: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = {
      startX: e.pageX,
      startWidth: currentWidth,
      columnId,
    };
    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
    document.body.style.cursor = "col-resize";
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { startX, startWidth, columnId } = resizingRef.current;
    const diff = e.pageX - startX;
    const colDef = columnDefs[columnId];
    const minWidth = colDef ? colDef.minWidth : 50;
    const newWidth = Math.max(minWidth, startWidth + diff);
    setColumnWidths((prev) => ({ ...prev, [columnId]: newWidth }));
  };

  const handleResizeEnd = () => {
    resizingRef.current = null;
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);
    document.body.style.cursor = "";
  };

  // Container refs for auto-sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: containerWidth, height: containerHeight } =
    useContainerDimensions(containerRef);

  const headerRef = useRef<HTMLDivElement>(null);

  // Sync scroll
  const handleScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    if (headerRef.current) {
      headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  if (!torrents) return null;

  const totalWidth = visibleColumns.reduce(
    (acc, col) => acc + (columnWidths[col.id] || col.width),
    0
  );

  const rowPropsData: RowData = {
    torrents,
    selectedHashes,
    visibleColumns,
    columnWidths,
    totalWidth,
    onRowClick: handleRowClick,
    onRowDoubleClick,
    onContextMenu: handleContextMenu,
  };

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden relative select-none"
      ref={containerRef}
    >
      {/* Header - Separate static container */}
      <div
        ref={headerRef}
        className="flex overflow-hidden bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-nowrap"
        style={{ width: containerWidth }}
      >
        {visibleColumns.map((col) => (
          <div
            key={col.id}
            className="relative flex items-center px-4 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 group shrink-0"
            style={{ width: columnWidths[col.id] || col.width }}
            onClick={() => onSort(col.id)}
          >
            <span className="truncate">{col.label}</span>
            {sortBy === col.id && (
              <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
            )}
            {/* Resizer */}
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 z-20"
              onMouseDown={(e) =>
                handleResizeStart(e, col.id, columnWidths[col.id] || col.width)
              }
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ))}
        {/* Filler to ensure header background extends if columns < container width - optional */}
        <div className="flex-1" />
      </div>

      {/* Virtualized Body */}
      {containerWidth > 0 && containerHeight > 0 && (
        <List
          className="custom-scrollbar"
          style={{ width: containerWidth, height: containerHeight - 40 }}
          rowCount={torrents.length}
          rowHeight={40}
          rowComponent={Row}
          rowProps={{ data: rowPropsData } as any}
          onScroll={handleScroll}
        />
      )}
    </div>
  );
};

export default TorrentTable;
