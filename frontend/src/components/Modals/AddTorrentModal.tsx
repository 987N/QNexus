import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Upload,
  Link as LinkIcon,
  File as FileIcon,
  Check,
} from "lucide-react";
import { clsx } from "clsx";
import axios from "axios";
import { useQB } from "../../context/QBContext";
import { useTranslation } from "react-i18next";
import ModalWrapper from "./ModalWrapper";

interface AddTorrentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: any) => Promise<void>;
}

const AddTorrentModal: React.FC<AddTorrentModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"url" | "file">("url");
  const [urls, setUrls] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState({
    savepath: "",
    category: "",
    tags: "",
    paused: false,
  });
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [existingSavePaths, setExistingSavePaths] = useState<string[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showSavePathDropdown, setShowSavePathDropdown] = useState(false);
  const { currentContainerId } = useQB();

  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen && currentContainerId) {
      // Fetch existing categories and tags
      axios
        .get(`/api/torrents/filters?containerId=${currentContainerId}`)
        .then((res) => {
          setExistingTags(res.data.tags?.map((t: any) => t.label) || []);
          setExistingSavePaths(
            res.data.save_paths?.map((p: any) => p.label) || []
          );
        })
        .catch(console.error);

      // Fetch all categories (including empty ones)
      axios
        .get(`/api/torrents/categories?containerId=${currentContainerId}`)
        .then((res) => {
          setExistingCategories(Object.keys(res.data || {}));
        })
        .catch(console.error);

      // Fetch default save path
      axios
        .get(`/api/preferences?containerId=${currentContainerId}`)
        .then((res) => {
          if (res.data && res.data.save_path) {
            setOptions((prev) => ({ ...prev, savepath: res.data.save_path }));
          }
        })
        .catch(console.error);
    }
  }, [isOpen, currentContainerId]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();

      if (options.savepath) formData.append("savepath", options.savepath);
      if (options.category) formData.append("category", options.category);
      if (options.tags) formData.append("tags", options.tags);
      if (options.paused) formData.append("paused", "true");
      formData.append("containerId", currentContainerId?.toString() || "");

      if (activeTab === "url") {
        if (!urls.trim()) return;
        formData.append("urls", urls);
      } else {
        if (files.length === 0) return;
        files.forEach((file) => {
          formData.append("torrents", file);
        });
      }

      await axios.post("/api/torrents/add", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      onClose();
      // Reset form
      setUrls("");
      setFiles([]);
      setOptions({ savepath: "", category: "", tags: "", paused: false });
    } catch (error) {
      console.error("Failed to add torrent:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      className="w-full max-w-2xl"
    >
      <div className="bg-white dark:bg-[#1C1C1E] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 transition-colors duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C1C1E]">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {t("add_torrent.title")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C1C1E]">
          <button
            onClick={() => setActiveTab("url")}
            className={clsx(
              "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2",
              activeTab === "url"
                ? "text-blue-600 border-b-2 border-blue-600 bg-gray-50 dark:bg-gray-800/50"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/30"
            )}
          >
            <LinkIcon className="w-4 h-4" />
            <span>{t("add_torrent.tab_url")}</span>
          </button>
          <button
            onClick={() => setActiveTab("file")}
            className={clsx(
              "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2",
              activeTab === "file"
                ? "text-blue-600 border-b-2 border-blue-600 bg-gray-50 dark:bg-gray-800/50"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/30"
            )}
          >
            <FileIcon className="w-4 h-4" />
            <span>{t("add_torrent.tab_file")}</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 bg-white dark:bg-[#1C1C1E] max-h-[60vh] overflow-y-auto custom-scrollbar">
          {activeTab === "url" ? (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                {t("add_torrent.urls_label")}
              </label>
              <textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                className="w-full h-32 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none font-mono"
                placeholder={t("add_torrent.urls_placeholder")}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                {t("add_torrent.files_label")}
              </label>
              <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t("add_torrent.drop_text")}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".torrent"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                    >
                      <span className="truncate">{file.name}</span>
                      <button
                        onClick={() =>
                          setFiles(files.filter((_, idx) => idx !== i))
                        }
                        className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t("add_torrent.savepath")}
              </label>
              <input
                type="text"
                value={options.savepath}
                onChange={(e) =>
                  setOptions({ ...options, savepath: e.target.value })
                }
                onFocus={() => setShowSavePathDropdown(true)}
                onBlur={() =>
                  setTimeout(() => setShowSavePathDropdown(false), 200)
                }
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                placeholder={t("add_torrent.savepath_placeholder")}
              />
              {showSavePathDropdown && existingSavePaths.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto">
                  {existingSavePaths
                    .filter((p) =>
                      p.toLowerCase().includes(options.savepath.toLowerCase())
                    )
                    .map((path) => (
                      <div
                        key={path}
                        className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() =>
                          setOptions({ ...options, savepath: path })
                        }
                      >
                        {path}
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className="relative">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t("add_torrent.category")}
              </label>
              <input
                type="text"
                value={options.category}
                onChange={(e) =>
                  setOptions({ ...options, category: e.target.value })
                }
                onFocus={() => setShowCategoryDropdown(true)}
                onBlur={() =>
                  setTimeout(() => setShowCategoryDropdown(false), 200)
                }
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
              {showCategoryDropdown && existingCategories.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto">
                  {existingCategories
                    .filter((c) =>
                      c.toLowerCase().includes(options.category.toLowerCase())
                    )
                    .map((cat) => (
                      <div
                        key={cat}
                        className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() =>
                          setOptions({ ...options, category: cat })
                        }
                      >
                        {cat}
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className="col-span-2 relative">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t("add_torrent.tags")}
              </label>
              <input
                type="text"
                value={options.tags}
                onChange={(e) =>
                  setOptions({ ...options, tags: e.target.value })
                }
                onFocus={() => setShowTagDropdown(true)}
                onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
              {showTagDropdown && existingTags.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto">
                  {existingTags.map((tag) => (
                    <div
                      key={tag}
                      className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center"
                      onClick={() => {
                        const currentTags = options.tags
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean);
                        if (!currentTags.includes(tag)) {
                          setOptions({
                            ...options,
                            tags: [...currentTags, tag].join(", "),
                          });
                        } else {
                          setOptions({
                            ...options,
                            tags: currentTags
                              .filter((t) => t !== tag)
                              .join(", "),
                          });
                        }
                      }}
                    >
                      <span
                        className={clsx(
                          "w-4 h-4 mr-2 border rounded flex items-center justify-center",
                          options.tags
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean)
                            .includes(tag)
                            ? "bg-blue-500 border-blue-500"
                            : "border-gray-400"
                        )}
                      >
                        {options.tags
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean)
                          .includes(tag) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </span>
                      {tag}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="paused"
              checked={options.paused}
              onChange={(e) =>
                setOptions({ ...options, paused: e.target.checked })
              }
              className="rounded bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-0 focus:ring-offset-0"
            />
            <label
              htmlFor="paused"
              className="ml-2 text-sm text-gray-600 dark:text-gray-400"
            >
              {t("add_torrent.paused")}
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-end space-x-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              loading ||
              (activeTab === "url" && !urls) ||
              (activeTab === "file" && files.length === 0)
            }
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("add_torrent.submitting") : t("add_torrent.submit")}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

export default AddTorrentModal;
