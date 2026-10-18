import React, { useState } from 'react';
import { useDrama, getCharacterLookForClip } from '../../context/DramaContext';
import { Episode, Clip, EpisodeFolder } from '../../types/drama';
import {
  Film,
  Download,
  Scissors,
  RotateCcw,
  Edit2,
  Layers,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  X,
  Search,
  Sparkles,
  Trash2,
  Folder,
  FolderPlus,
  FolderArchive,
  MoreVertical,
  CheckSquare,
  Square,
  Plus,
  ArrowRight,
  FolderCheck,
  Archive,
  Undo2,
  Check,
  Filter,
} from 'lucide-react';
import {
  formatClipSequenceLabel,
  formatEpisodeBadge,
  getDefaultClipFilename,
  getDefaultEpisodeFilename,
  padNumber,
} from '../../utils/naming';

interface ProjectsViewProps {
  onOpenCombine: (episodeNumber: number) => void;
}

const FOLDER_COLORS = [
  { id: 'blue', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', active: 'bg-blue-600 text-white border-blue-700' },
  { id: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', active: 'bg-amber-600 text-white border-amber-700' },
  { id: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', active: 'bg-emerald-600 text-white border-emerald-700' },
  { id: 'purple', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', active: 'bg-purple-600 text-white border-purple-700' },
  { id: 'rose', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', active: 'bg-rose-600 text-white border-rose-700' },
  { id: 'slate', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', active: 'bg-slate-800 text-white border-slate-900' },
];

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onOpenCombine }) => {
  const {
    currentProject,
    setActiveTab,
    setEditingClip,
    retryClip,
    renameClip,
    renameEpisode,
    downloadClipVideo,
    downloadEpisodeVideo,
    enqueueEpisode,
    characters,
    setClipCharacterLook,
    deleteEpisode,
    deleteEpisodes,
    addEpisode,
    createFolder,
    renameFolder,
    deleteFolder,
    moveEpisodeToFolder,
    moveEpisodesToFolder,
    exportFolderZip,
    undo,
    canUndo,
  } = useDrama();

  // Filters & Search
  const [activeFolderFilter, setActiveFolderFilter] = useState<string>('all');
  const [selectedEpFilter, setSelectedEpFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Batch Selection state
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedEpNumbers, setSelectedEpNumbers] = useState<number[]>([]);

  // Modals state
  const [deleteConfirmEpisode, setDeleteConfirmEpisode] = useState<Episode | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState<boolean>(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState<boolean>(false);
  const [folderToEdit, setFolderToEdit] = useState<EpisodeFolder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<EpisodeFolder | null>(null);
  const [moveModalState, setMoveModalState] = useState<{ isOpen: boolean; episodeNumbers: number[] }>({
    isOpen: false,
    episodeNumbers: [],
  });

  // Folder form fields
  const [folderNameInput, setFolderNameInput] = useState<string>('');
  const [folderColorInput, setFolderColorInput] = useState<string>('blue');
  const [folderDescInput, setFolderDescInput] = useState<string>('');
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);

  // Rename modal
  const [renamingItem, setRenamingItem] = useState<{
    type: 'clip' | 'episode';
    id: string;
    episodeNumber: number;
    currentName: string;
  } | null>(null);
  const [newNameInput, setNewNameInput] = useState<string>('');

  // Active clip preview modal
  const [previewClip, setPreviewClip] = useState<Clip | null>(null);

  if (!currentProject) {
    return (
      <div className="py-12 px-4 text-center">
        <h3 className="font-bold text-sm text-blue-950">No Episodes Found</h3>
        <p className="text-xs text-slate-500 mt-1">Create a drama series to begin producing episodes.</p>
      </div>
    );
  }

  const folders = currentProject.folders || [];

  // Filter episodes based on folder, episode dropdown, and search query
  const filteredEpisodes = currentProject.episodes.filter((ep) => {
    // 1. Folder filter
    if (activeFolderFilter !== 'all') {
      if (activeFolderFilter === 'unassigned') {
        if (ep.folderId) return false;
      } else {
        if (ep.folderId !== activeFolderFilter) return false;
      }
    }

    // 2. Episode dropdown filter
    if (selectedEpFilter !== 'all' && ep.episodeNumber !== selectedEpFilter) {
      return false;
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (ep.title || '').toLowerCase().includes(q);
      const matchSummary = (ep.summary || '').toLowerCase().includes(q);
      const matchClips = ep.clips.some(
        (c) => c.customFilename.toLowerCase().includes(q) || c.prompt.toLowerCase().includes(q)
      );
      if (!matchTitle && !matchSummary && !matchClips) return false;
    }

    return true;
  });

  // Rename handler
  const handleOpenRename = (type: 'clip' | 'episode', id: string, epNum: number, name: string) => {
    setRenamingItem({ type, id, episodeNumber: epNum, currentName: name });
    setNewNameInput(name);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingItem || !newNameInput.trim()) return;

    if (renamingItem.type === 'clip') {
      renameClip(renamingItem.id, newNameInput.trim());
    } else {
      renameEpisode(renamingItem.episodeNumber, newNameInput.trim());
    }
    setRenamingItem(null);
  };

  // Folder creation & editing
  const handleOpenCreateFolder = () => {
    setFolderToEdit(null);
    setFolderNameInput('');
    setFolderColorInput('blue');
    setFolderDescInput('');
    setIsCreateFolderModalOpen(true);
  };

  const handleOpenEditFolder = (folder: EpisodeFolder) => {
    setFolderToEdit(folder);
    setFolderNameInput(folder.name);
    setFolderColorInput(folder.color || 'blue');
    setFolderDescInput(folder.description || '');
    setIsCreateFolderModalOpen(true);
  };

  const handleSaveFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderNameInput.trim()) return;

    if (folderToEdit) {
      renameFolder(currentProject.id, folderToEdit.id, folderNameInput.trim());
    } else {
      const created = createFolder(currentProject.id, folderNameInput.trim(), folderColorInput, folderDescInput);
      setActiveFolderFilter(created.id);
    }
    setIsCreateFolderModalOpen(false);
  };

  // Handle single episode delete
  const handleConfirmDeleteSingle = () => {
    if (!deleteConfirmEpisode) return;
    deleteEpisode(currentProject.id, deleteConfirmEpisode.episodeNumber);
    setDeleteConfirmEpisode(null);
  };

  // Handle batch episodes delete
  const handleConfirmDeleteBatch = () => {
    if (selectedEpNumbers.length === 0) return;
    deleteEpisodes(currentProject.id, selectedEpNumbers);
    setSelectedEpNumbers([]);
    setIsSelectMode(false);
    setIsBatchDeleteModalOpen(false);
  };

  // Selection toggles
  const handleToggleSelectEp = (epNum: number) => {
    setSelectedEpNumbers((prev) =>
      prev.includes(epNum) ? prev.filter((n) => n !== epNum) : [...prev, epNum]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredNums = filteredEpisodes.map((e) => e.episodeNumber);
    const areAllSelected = allFilteredNums.every((n) => selectedEpNumbers.includes(n));
    if (areAllSelected) {
      setSelectedEpNumbers((prev) => prev.filter((n) => !allFilteredNums.includes(n)));
    } else {
      setSelectedEpNumbers((prev) => Array.from(new Set([...prev, ...allFilteredNums])));
    }
  };

  // Export folder as ZIP
  const handleExportActiveFolder = async () => {
    try {
      setIsExportingZip(true);
      await exportFolderZip(currentProject.id, activeFolderFilter === 'all' ? undefined : activeFolderFilter);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExportingZip(false);
    }
  };

  const activeFolderObj = folders.find((f) => f.id === activeFolderFilter);

  return (
    <div className="px-4 py-4 pb-24 space-y-4">
      {/* 1. Header with Title & Quick Controls */}
      <div className="space-y-3 border-b border-blue-100 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-blue-950 font-serif">
                Series Episodes & Folders
              </h2>
              {canUndo && (
                <button
                  type="button"
                  onClick={undo}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                  title="Undo last change"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Undo</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Manage, categorize in folders, export, or delete unwanted generated episodes.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded-lg font-bold border border-blue-200">
              {currentProject.episodes.length} Episodes
            </span>
          </div>
        </div>

        {/* 2. Series Folder Pill Tabs */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Folder className="w-3 h-3 text-blue-600" />
              <span>Series Storage Folders</span>
            </span>

            <div className="flex items-center gap-2">
              {activeFolderFilter !== 'all' && (
                <button
                  type="button"
                  onClick={handleExportActiveFolder}
                  disabled={isExportingZip}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  {isExportingZip ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <FolderArchive className="w-3 h-3" />
                  )}
                  <span>Export Folder ZIP</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenCreateFolder}
                className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>New Folder</span>
              </button>
            </div>
          </div>

          {/* Scrollable Folder Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            {/* All Episodes Tab */}
            <button
              type="button"
              onClick={() => setActiveFolderFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFolderFilter === 'all'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>All Episodes</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeFolderFilter === 'all' ? 'bg-blue-800/80 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {currentProject.episodes.length}
              </span>
            </button>

            {/* Custom Folders */}
            {folders.map((folder) => {
              const epCount = currentProject.episodes.filter((e) => e.folderId === folder.id).length;
              const isActive = activeFolderFilter === folder.id;

              return (
                <div key={folder.id} className="relative group shrink-0 flex items-center">
                  <button
                    type="button"
                    onClick={() => setActiveFolderFilter(folder.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-white hover:bg-blue-50/60 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>{folder.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-blue-800/80 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {epCount}
                    </span>
                  </button>

                  {/* Folder settings trigger on active folder */}
                  {isActive && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditFolder(folder)}
                      className="ml-1 p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title="Rename or configure folder"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* General / Unassigned folder if any exist without folder */}
            {currentProject.episodes.some((e) => !e.folderId) && (
              <button
                type="button"
                onClick={() => setActiveFolderFilter('unassigned')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeFolderFilter === 'unassigned'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <Folder className="w-3.5 h-3.5 opacity-70" />
                <span>General</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeFolderFilter === 'unassigned'
                      ? 'bg-blue-800/80 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {currentProject.episodes.filter((e) => !e.folderId).length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* 3. Filter Bar & Search */}
        <div className="flex items-center gap-2">
          <select
            value={selectedEpFilter}
            onChange={(e) =>
              setSelectedEpFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
            }
            className="flex-1 text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="all">All Filtered Episodes ({filteredEpisodes.length})</option>
            {filteredEpisodes.map((ep) => (
              <option key={ep.episodeNumber} value={ep.episodeNumber}>
                Episode {padNumber(ep.episodeNumber, 3)}: {ep.title}
              </option>
            ))}
          </select>

          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search prompts or clips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-7 pr-2 py-1.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* 4. Action Toolbar: Add Episode & Batch Selection Mode */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const created = addEpisode(
                  currentProject.id,
                  activeFolderFilter !== 'all' && activeFolderFilter !== 'unassigned'
                    ? activeFolderFilter
                    : undefined
                );
                setSelectedEpFilter(created.episodeNumber);
              }}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Episode</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                if (isSelectMode) setSelectedEpNumbers([]);
              }}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
                isSelectMode
                  ? 'bg-blue-600 text-white border-blue-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
            >
              {isSelectMode ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              <span>{isSelectMode ? 'Cancel Selection' : 'Select Episodes'}</span>
            </button>
          </div>

          {/* Batch operations toolbar when episodes are selected */}
          {isSelectMode && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-[11px] font-bold text-slate-600 hover:text-blue-600 px-2 py-1 cursor-pointer"
              >
                {selectedEpNumbers.length === filteredEpisodes.length ? 'Deselect All' : 'Select All'}
              </button>

              {selectedEpNumbers.length > 0 && (
                <>
                  {/* Batch Move to Folder */}
                  <button
                    type="button"
                    onClick={() =>
                      setMoveModalState({ isOpen: true, episodeNumbers: selectedEpNumbers })
                    }
                    className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Folder className="w-3 h-3" />
                    <span>Move ({selectedEpNumbers.length})</span>
                  </button>

                  {/* Batch Delete Unwanted Episodes */}
                  <button
                    type="button"
                    onClick={() => setIsBatchDeleteModalOpen(true)}
                    className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete ({selectedEpNumbers.length})</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. Episodes Feed */}
      <div className="space-y-4">
        {filteredEpisodes.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
            <Folder className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-extrabold text-sm text-slate-700">No episodes found in this view</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {activeFolderFilter !== 'all'
                ? `The folder "${activeFolderObj?.name || 'Selected'}" currently has no episodes filed in it.`
                : 'No episodes match your search or filter.'}
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setActiveFolderFilter('all')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                View All Episodes
              </button>
              <button
                type="button"
                onClick={() =>
                  addEpisode(
                    currentProject.id,
                    activeFolderFilter !== 'all' && activeFolderFilter !== 'unassigned'
                      ? activeFolderFilter
                      : undefined
                  )
                }
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                + Add Episode Here
              </button>
            </div>
          </div>
        ) : (
          filteredEpisodes.map((episode) => {
            const completedCount = episode.clips.filter((c) => {
              return (
                c.generationStatus === 'completed' &&
                c.outputVideoUrl &&
                !c.outputVideoUrl.includes('gtv-videos-bucket') &&
                !c.outputVideoUrl.includes('ForBiggerBlazes')
              );
            }).length;
            const canCombine = completedCount === episode.clips.length && episode.clips.length > 0;
            const episodeFilename =
              episode.combinedFilename || getDefaultEpisodeFilename(episode.episodeNumber);

            const displayedClips = episode.clips.filter((c) => {
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                  c.customFilename.toLowerCase().includes(q) ||
                  c.prompt.toLowerCase().includes(q)
                );
              }
              return true;
            });

            const isSelected = selectedEpNumbers.includes(episode.episodeNumber);
            const epFolderName = episode.folderName || (episode.folderId ? folders.find(f => f.id === episode.folderId)?.name : 'General');

            return (
              <div
                key={episode.episodeNumber}
                className={`bg-white border rounded-2xl p-4 shadow-2xs space-y-3 transition-all ${
                  isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
                }`}
              >
                {/* Episode Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Checkbox in select mode */}
                    {isSelectMode && (
                      <button
                        type="button"
                        onClick={() => handleToggleSelectEp(episode.episodeNumber)}
                        className="text-blue-600 cursor-pointer shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 fill-blue-600 text-white" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    )}

                    <span className="font-mono text-xs font-bold bg-blue-600 text-white px-2.5 py-0.5 rounded-lg shrink-0">
                      {formatEpisodeBadge(episode.episodeNumber)}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 truncate max-w-[140px]">
                          {episode.title || `Episode ${episode.episodeNumber}`}
                        </span>

                        <button
                          onClick={() =>
                            handleOpenRename(
                              'episode',
                              `ep_${episode.episodeNumber}`,
                              episode.episodeNumber,
                              episodeFilename
                            )
                          }
                          className="text-slate-400 hover:text-blue-600 cursor-pointer"
                          title="Rename combined episode file"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>

                        {/* Folder badge & folder switcher */}
                        <button
                          type="button"
                          onClick={() =>
                            setMoveModalState({ isOpen: true, episodeNumbers: [episode.episodeNumber] })
                          }
                          className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-slate-100 hover:bg-blue-50 border border-slate-200 text-slate-600 hover:text-blue-700 text-[9px] font-bold cursor-pointer transition-colors"
                          title="Change folder for this episode"
                        >
                          <Folder className="w-2.5 h-2.5 text-blue-600" />
                          <span className="truncate max-w-[100px]">{epFolderName}</span>
                        </button>
                      </div>

                      <span className="font-mono text-[9px] text-slate-400 block truncate max-w-[180px]">
                        {episodeFilename}
                      </span>
                    </div>
                  </div>

                  {/* Right Header Buttons: Combine, Download, Delete Episode */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {episode.isCombined && episode.combinedVideoUrl && (
                      <button
                        onClick={() => downloadEpisodeVideo(episode)}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
                        title="Download combined episode video"
                      >
                        <Download className="w-3 h-3" /> MP4
                      </button>
                    )}

                    <button
                      onClick={() => onOpenCombine(episode.episodeNumber)}
                      disabled={!canCombine}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        canCombine
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Layers className="w-3 h-3" />
                      {episode.isCombined ? 'Combined' : 'Combine'}
                    </button>

                    {/* DELETE UNWANTED EPISODE BUTTON */}
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmEpisode(episode)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                      title="Delete unwanted episode and its clips"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 5 Clips in mobile list */}
                <div className="space-y-2">
                  {displayedClips.map((clip) => {
                    const hasRealVideo = Boolean(
                      clip.outputVideoUrl &&
                      !clip.outputVideoUrl.includes('gtv-videos-bucket') &&
                      !clip.outputVideoUrl.includes('ForBiggerBlazes')
                    );
                    const isDone = clip.generationStatus === 'completed' && hasRealVideo;
                    const isRendering =
                      clip.generationStatus === 'rendering' ||
                      clip.generationStatus === 'generating' ||
                      (clip.generationStatus === 'completed' && !hasRealVideo);
                    const isFail = clip.generationStatus === 'failed';

                    return (
                      <div
                        key={clip.id}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2.5"
                      >
                        {/* Left: Thumbnail & Badges */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            onClick={() => setPreviewClip(clip)}
                            className={`w-11 h-14 rounded-lg flex items-center justify-center shrink-0 cursor-pointer ${
                              isDone
                                ? 'bg-slate-900 text-white shadow-xs'
                                : isRendering
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-200 text-slate-400'
                            }`}
                          >
                            {isDone ? (
                              <Play className="w-4 h-4 fill-white" />
                            ) : isRendering ? (
                              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[11px] font-bold text-blue-950">
                                Clip {clip.clipNumber} of 5
                              </span>
                              <span
                                className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-xs ${
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isRendering
                                    ? 'bg-amber-100 text-amber-800 font-extrabold animate-pulse'
                                    : isFail
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {isDone ? 'Completed' : isRendering ? 'Rendering...' : clip.generationStatus}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[9px] text-slate-600 truncate max-w-[130px]">
                                {clip.customFilename}
                              </span>
                              <button
                                onClick={() =>
                                  handleOpenRename(
                                    'clip',
                                    clip.id,
                                    clip.episodeNumber,
                                    clip.customFilename
                                  )
                                }
                                className="text-slate-400 hover:text-blue-600 cursor-pointer"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                            </div>

                            {/* Active Scene Lifestyle Look Badges (Interactive Switcher) */}
                            <div className="flex items-center gap-1 flex-wrap mt-0.5">
                              {characters
                                .filter((c) => c.isLocked)
                                .slice(0, 3)
                                .map((c) => {
                                  const activeLook = getCharacterLookForClip(c, clip);
                                  const validLooks = (c.stageLooks || []).filter((l) => Boolean(l.url));
                                  const hasMultiple = validLooks.length > 1;

                                  return (
                                    <div key={c.id} className="relative group/look">
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-blue-50/80 border border-blue-200/80 text-[8px] font-bold text-blue-900 cursor-pointer hover:bg-blue-100"
                                        title={`${c.name}: ${activeLook.lifestyleTag || activeLook.label}. Click to switch look for this scene.`}
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                        <span className="truncate max-w-[80px]">
                                          {c.name}: {activeLook.lifestyleTag || activeLook.label}
                                        </span>
                                      </span>

                                      {hasMultiple && (
                                        <select
                                          value={activeLook.id}
                                          onChange={(e) =>
                                            setClipCharacterLook(
                                              clip.episodeNumber,
                                              clip.clipNumber,
                                              c.id,
                                              e.target.value
                                            )
                                          }
                                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-[10px]"
                                          title={`Switch scene look for ${c.name}`}
                                        >
                                          {validLooks.map((l) => (
                                            <option key={l.id} value={l.id}>
                                              {c.name} Look: {l.lifestyleTag || l.label}
                                            </option>
                                          ))}
                                        </select>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingClip(clip);
                              setActiveTab('editor');
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                            title="Edit Clip"
                          >
                            <Scissors className="w-3.5 h-3.5" />
                          </button>

                          {isFail && (
                            <button
                              onClick={() => retryClip(clip.episodeNumber, clip.clipNumber)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                              title="Retry Generation"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isDone && clip.outputVideoUrl && (
                            <button
                              onClick={() => downloadClipVideo(clip)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                              title="Download MP4"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Episode Footer CTA: Batch generate this single episode */}
                <div className="pt-1">
                  <button
                    onClick={() => enqueueEpisode(currentProject.id, episode.episodeNumber)}
                    className="w-full py-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-900 font-bold text-[11px] rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3 h-3 fill-current text-blue-600" />
                    <span>Generate Episode {episode.episodeNumber} (5 clips safe batch)</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Confirm Single Episode Deletion */}
      {deleteConfirmEpisode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Delete Episode {deleteConfirmEpisode.episodeNumber}?
                </h3>
                <p className="text-xs text-slate-500">
                  {deleteConfirmEpisode.title || `Episode ${deleteConfirmEpisode.episodeNumber}`}
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 leading-relaxed">
              Are you sure you want to delete this unwanted episode? This will remove all 5 clips associated with Episode {deleteConfirmEpisode.episodeNumber} from your series. You can also undo this action afterwards.
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmEpisode(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Episode</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Confirm Batch Episodes Deletion */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Delete {selectedEpNumbers.length} Unwanted Episodes?
                </h3>
                <p className="text-xs text-slate-500">
                  Episodes: {selectedEpNumbers.slice(0, 8).join(', ')}{selectedEpNumbers.length > 8 ? '...' : ''}
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 leading-relaxed">
              This will permanently delete all {selectedEpNumbers.length} selected episodes ({selectedEpNumbers.length * 5} video clips) from your series. You can use Undo if needed.
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBatch}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {selectedEpNumbers.length} Episodes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Create / Edit Folder Modal */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-200 w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-sm text-blue-950">
                  {folderToEdit ? 'Edit Series Folder' : 'New Series Storage Folder'}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateFolderModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFolder} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Season 1, Act 1: The Setup, Climax Arc, Drafts"
                  value={folderNameInput}
                  onChange={(e) => setFolderNameInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Color Tag
                </label>
                <div className="flex items-center gap-2">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFolderColorInput(c.id)}
                      className={`w-7 h-7 rounded-xl border flex items-center justify-center cursor-pointer transition-transform ${c.bg} ${c.border} ${
                        folderColorInput === c.id ? 'ring-2 ring-blue-600 scale-110' : ''
                      }`}
                    >
                      {folderColorInput === c.id && <Check className="w-3.5 h-3.5 text-blue-950" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Description / Story Arc (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Episodes 1 to 10 covering the protagonist's double life"
                  value={folderDescInput}
                  onChange={(e) => setFolderDescInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {folderToEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteFolder(currentProject.id, folderToEdit.id);
                      setIsCreateFolderModalOpen(false);
                      setActiveFolderFilter('all');
                    }}
                    className="text-xs font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Folder</span>
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsCreateFolderModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
                  >
                    {folderToEdit ? 'Save Changes' : 'Create Folder'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Move Episode(s) to Folder */}
      {moveModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-200 w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-sm text-blue-950">
                  Store in Series Folder
                </h3>
              </div>
              <button
                onClick={() => setMoveModalState({ isOpen: false, episodeNumbers: [] })}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select which folder to file{' '}
              {moveModalState.episodeNumbers.length === 1
                ? `Episode ${moveModalState.episodeNumbers[0]}`
                : `${moveModalState.episodeNumbers.length} selected episodes`}{' '}
              into:
            </p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {/* General / Root Folder */}
              <button
                type="button"
                onClick={() => {
                  moveEpisodesToFolder(currentProject.id, moveModalState.episodeNumbers, undefined);
                  setMoveModalState({ isOpen: false, episodeNumbers: [] });
                }}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 flex items-center justify-between text-left cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block">General (Root)</span>
                    <span className="text-[10px] text-slate-500">Default unassigned episodes</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Created Folders */}
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    moveEpisodesToFolder(currentProject.id, moveModalState.episodeNumbers, f.id);
                    setMoveModalState({ isOpen: false, episodeNumbers: [] });
                  }}
                  className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/60 flex items-center justify-between text-left cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="font-extrabold text-xs text-slate-900 block">{f.name}</span>
                      {f.description && (
                        <span className="text-[10px] text-slate-500 block">{f.description}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-blue-500" />
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setMoveModalState({ isOpen: false, episodeNumbers: [] });
                  handleOpenCreateFolder();
                }}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create New Folder</span>
              </button>

              <button
                type="button"
                onClick={() => setMoveModalState({ isOpen: false, episodeNumbers: [] })}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Rename MP4 File Modal */}
      {renamingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-blue-200 w-full max-w-sm p-4 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-blue-950">Rename MP4 File</h3>
              <button
                onClick={() => setRenamingItem(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRename} className="space-y-3">
              <input
                type="text"
                required
                value={newNameInput}
                onChange={(e) => setNewNameInput(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenamingItem(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg shadow-xs cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Clip Preview Modal */}
      {previewClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-800 w-full max-w-xs overflow-hidden animate-in fade-in">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between text-xs">
              <span className="font-bold">
                {formatClipSequenceLabel(previewClip.episodeNumber, previewClip.clipNumber, 5)}
              </span>
              <button
                onClick={() => setPreviewClip(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-[9/16] bg-black max-h-[60vh] flex items-center justify-center overflow-hidden">
              {previewClip.outputVideoUrl &&
              !previewClip.outputVideoUrl.includes('gtv-videos-bucket') &&
              !previewClip.outputVideoUrl.includes('ForBiggerBlazes') ? (
                <video
                  src={previewClip.outputVideoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="p-6 text-center space-y-3 bg-slate-950 text-white w-full h-full flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 animate-pulse">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm block">Video Rendering...</span>
                    <span className="text-[11px] text-slate-400 max-w-xs block mt-1">
                      ModelArk Seedance AI is synthesizing this vertical clip. The video player will become active once rendering completes.
                    </span>
                  </div>
                  <div className="px-3 py-1 bg-amber-400/10 border border-amber-400/30 rounded-full text-[10px] text-amber-300 font-mono font-bold">
                    Status: Rendering
                  </div>
                </div>
              )}
            </div>
            <div className="p-2.5 bg-white flex items-center justify-between">
              <span className="font-mono text-[10px] text-slate-600 truncate max-w-[150px]">
                {previewClip.customFilename}
              </span>
              <button
                onClick={() => downloadClipVideo(previewClip)}
                className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> MP4
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
