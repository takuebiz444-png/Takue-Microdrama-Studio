import React, { useState } from 'react';
import { useDrama } from '../../context/DramaContext';
import {
  Wand2,
  Sliders,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Home,
  Plus,
  Shield,
  Lock,
  Unlock,
  UserCheck,
  CheckCircle2,
  Trash2,
  X,
  ListOrdered,
  Info,
  Palette,
} from 'lucide-react';
import { formatClipSequenceLabel, getDefaultClipFilename, padNumber } from '../../utils/naming';
import { Character, DramaProject } from '../../types/drama';
import { CHARACTER_TEMPLATES } from '../../data/defaultCharacters';
import { MASTER_PROMPT_PRESETS, DEFAULT_MASTER_PROMPT } from '../../data/masterPrompts';
import { CreationProceduresModal } from '../modals/CreationProceduresModal';

export const CreateDramaView: React.FC = () => {
  const {
    createNewProject,
    setActiveTab,
    startQueue,
    enqueueEntireProject,
    characters,
    addCharacter,
    deleteCharacter,
    toggleLockCharacter,
    goToHome,
    goToCharacters,
    createWizardStep,
    setCreateWizardStep,
  } = useDrama();

  // Wizard Steps (Procedures in Order):
  // 1 = Procedure 1: Master Prompt & Format (title, episodes=40, clips=5, 9:16, master visual prompt)
  // 2 = Procedure 2: Add & Lock Characters (Actor visual continuity anchor)
  // 3 = Procedure 3: Story Input & 40-Episode Breakdown
  // 4 = Procedure 4: Review 40 Episodes & Sequential Prompts
  const currentStep = createWizardStep || 1;
  const setStep = setCreateWizardStep;

  // Form parameters - no hardcoded person names or series names!
  const [title, setTitle] = useState('Takue Microdrama Series');
  const [totalEpisodes, setTotalEpisodes] = useState<number>(40);
  const [clipsPerEpisode, setClipsPerEpisode] = useState<number>(5);
  const [clipDuration, setClipDuration] = useState<number>(12);
  const [orientation, setOrientation] = useState<'9:16' | '16:9'>('9:16');
  const [selectedModel, setSelectedModel] = useState<string>('seedance-1-5-pro-251215');
  const [tone, setTone] = useState<string>('Cinematic Microdrama');

  // Master Prompt State
  const [masterPrompt, setMasterPrompt] = useState<string>(DEFAULT_MASTER_PROMPT);
  const [isMasterPromptLocked, setIsMasterPromptLocked] = useState<boolean>(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('universal_vertical_cinema');
  const [isProceduresModalOpen, setIsProceduresModalOpen] = useState(false);

  // Story text
  const [storyPrompt, setStoryPrompt] = useState(
    'A high-stakes dramatic narrative across 40 episodes. Tension escalates each episode through secret deals, boardroom showdowns, shocking discoveries, and cliffhanger endings designed for 9:16 mobile drama.'
  );

  // In-wizard Add Character form state
  const [showAddCharForm, setShowAddCharForm] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharRole, setNewCharRole] = useState<'protagonist' | 'antagonist' | 'supporting'>('protagonist');
  const [newCharTagline, setNewCharTagline] = useState('');
  const [newCharVisuals, setNewCharVisuals] = useState('');
  const [newCharWardrobe, setNewCharWardrobe] = useState('');
  const [newCharLock, setNewCharLock] = useState(true);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdProject, setCreatedProject] = useState<DramaProject | null>(null);
  const [expandedEp, setExpandedEp] = useState<number>(1);

  // Add character inline inside Step 2
  const handleAddInlineCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharName.trim()) {
      alert('Please enter a character name or role title.');
      return;
    }

    const newChar: Character = {
      id: `char_${Date.now()}`,
      name: newCharName.trim(),
      role: newCharRole,
      tagline: newCharTagline.trim() || `${newCharRole.toUpperCase()} Role`,
      description: newCharVisuals.trim(),
      visualTraits: newCharVisuals.trim(),
      clothingDetails: newCharWardrobe.trim(),
      referenceImageUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      voiceStyle: 'Clear dramatic voice',
      isLocked: newCharLock,
    };

    addCharacter(newChar);
    setNewCharName('');
    setNewCharTagline('');
    setNewCharVisuals('');
    setNewCharWardrobe('');
    setNewCharLock(true);
    setShowAddCharForm(false);
  };

  const handleApplyTemplateInline = (tmpl: typeof CHARACTER_TEMPLATES[0]) => {
    setNewCharName(tmpl.name);
    setNewCharRole(tmpl.role);
    setNewCharTagline(tmpl.tagline);
    setNewCharVisuals(tmpl.visualTraits);
    setNewCharWardrobe(tmpl.clothingDetails);
    setNewCharLock(true);
  };

  // Generate breakdown into 40 episodes
  const handleGenerateBreakdown = async () => {
    if (!storyPrompt.trim()) {
      alert('Please enter a story before generating episodes.');
      return;
    }

    setIsGenerating(true);
    try {
      const proj = await createNewProject({
        title,
        storyPrompt,
        masterPrompt,
        isMasterPromptLocked,
        totalEpisodes,
        clipsPerEpisode,
        selectedModel,
        tone,
        characters,
      });

      setCreatedProject(proj);
      setStep(4);
    } catch (err: any) {
      alert(`Generation breakdown error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartProduction = () => {
    if (!createdProject) return;
    enqueueEntireProject(createdProject.id);
    startQueue();
    setActiveTab('projects');
  };

  const lockedCharactersCount = characters.filter((c) => c.isLocked).length;

  return (
    <div className="px-4 py-4 pb-28 space-y-4">
      {/* Mobile Step Indicator & Breadcrumb Navigation (Ordered Procedures) */}
      <div className="bg-white border border-blue-100 rounded-2xl p-3 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-extrabold text-blue-950">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
              {currentStep}
            </span>
            <span>
              {currentStep === 1 && 'Procedure 1: Master Prompt & Format Rules'}
              {currentStep === 2 && 'Procedure 2: Add & Lock Characters'}
              {currentStep === 3 && 'Procedure 3: Story Input & 40-Episode Breakdown'}
              {currentStep === 4 && 'Procedure 4: Review 40 Episodes & Sequence'}
            </span>
          </div>

          <span className="text-[10px] font-mono text-slate-400 font-bold">
            Procedure {currentStep} of 4
          </span>
        </div>

        {/* 4 Step Bars */}
        <div className="grid grid-cols-4 gap-1.5 pt-0.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              onClick={() => {
                if (s <= 3 || (s === 4 && createdProject)) {
                  setStep(s);
                }
              }}
              className={`h-1.5 rounded-full cursor-pointer transition-all ${
                s === currentStep
                  ? 'bg-blue-600'
                  : s < currentStep
                  ? 'bg-blue-300'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Procedures in order button */}
        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsProceduresModalOpen(true)}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <ListOrdered className="w-3.5 h-3.5 text-blue-600" />
            <span>Procedures to Create Microdrama in Order</span>
          </button>
          <span className="text-[9px] text-slate-400 font-medium">9:16 Vertical • 40 Ep</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* STEP 1: PROCEDURE 1 - MASTER PROMPT & FORMAT RULES */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-blue-950 mb-1">
                Microdrama Title / Series Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="e.g. Takue Microdrama Series"
              />
            </div>

            {/* Total Episodes (default 40) */}
            <div>
              <label className="block text-xs font-bold text-blue-950 mb-1">
                Total Episodes Count (Default 40)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={totalEpisodes}
                  onChange={(e) => setTotalEpisodes(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 text-xs font-bold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <div className="flex items-center gap-1.5 flex-1">
                  {[10, 20, 40].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTotalEpisodes(num)}
                      className={`flex-1 py-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                        totalEpisodes === num
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {num} Ep
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clips per Episode & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">
                  Clips per Episode
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={clipsPerEpisode}
                    onChange={(e) => setClipsPerEpisode(Math.max(1, parseInt(e.target.value) || 5))}
                    className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-bold">Clips</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">
                  Clip Duration
                </label>
                <div className="text-xs font-bold px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700">
                  12 Seconds (Fixed)
                </div>
              </div>
            </div>

            {/* Video Orientation */}
            <div>
              <label className="block text-xs font-bold text-blue-950 mb-1">
                Video Orientation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation('9:16')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
                    orientation === '9:16'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="w-2.5 h-4 border border-current rounded-xs inline-block" />
                  <span>9:16 Vertical (Mobile)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('16:9')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
                    orientation === '16:9'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="w-4 h-2.5 border border-current rounded-xs inline-block" />
                  <span>16:9 Landscape</span>
                </button>
              </div>
            </div>

            {/* ======================================================== */}
            {/* MASTER PROMPT INPUT & PRESETS */}
            {/* ======================================================== */}
            <div className="pt-3 border-t border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Master Prompt (Global Visual Directive)</span>
                </label>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Applied to all 40 episodes
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Dictates lighting, 9:16 camera motion, lenses, and cinematic grade injected into every clip prompt.
              </p>

              {/* Presets */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Palette className="w-3 h-3 text-blue-600" />
                  <span>Master Prompt Presets</span>
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {MASTER_PROMPT_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedPresetId(preset.id);
                          setMasterPrompt(preset.prompt);
                        }}
                        className={`p-2 rounded-xl border text-left text-[11px] transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span className="font-extrabold block truncate">{preset.name}</span>
                        <span className="text-[9px] opacity-80 block truncate">{preset.category}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Master Prompt Textarea */}
              <div className="space-y-1.5">
                <textarea
                  value={masterPrompt}
                  onChange={(e) => setMasterPrompt(e.target.value)}
                  rows={5}
                  className="w-full text-xs font-mono p-3 bg-amber-50/20 hover:bg-amber-50/30 focus:bg-white border-2 border-amber-200 focus:border-amber-500 rounded-xl focus:ring-2 focus:ring-amber-400/40 focus:outline-hidden resize-y leading-relaxed"
                  placeholder="Enter your master visual directives for all 40 episodes (no character or word limits: e.g. 9:16 vertical cinema, 35mm lens, volumetric lighting, high emotional tension, photorealistic textures)..."
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-mono font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>
                      {masterPrompt.length.toLocaleString()} chars •{' '}
                      {masterPrompt.trim().length > 0
                        ? masterPrompt.trim().split(/\s+/).filter(Boolean).length
                        : 0}{' '}
                      words • Unlimited Capacity
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMasterPrompt(DEFAULT_MASTER_PROMPT);
                      setSelectedPresetId('universal_vertical_cinema');
                    }}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Reset Default
                  </button>
                </div>
              </div>

              {/* Lock Master Prompt Switch */}
              <div
                onClick={() => setIsMasterPromptLocked(!isMasterPromptLocked)}
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isMasterPromptLocked
                    ? 'bg-blue-50 border-blue-200 text-blue-950'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isMasterPromptLocked ? (
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <div>
                    <span className="font-bold text-xs block">
                      {isMasterPromptLocked ? '🔒 Lock Master Prompt' : 'Master Prompt Unlocked'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {isMasterPromptLocked
                        ? 'Enforces style continuity across every clip in all 40 episodes'
                        : 'Style will not be strictly locked across clips'}
                    </span>
                  </div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                    isMasterPromptLocked ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      isMasterPromptLocked ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={goToHome}
              className="flex-1 py-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-2xl shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Home className="w-4 h-4 text-slate-500" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Next: Procedure 2 — Add & Lock Characters</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 2: ADD & LOCK CHARACTERS */}
      {/* ======================================================== */}
      {currentStep === 2 && (
        <div className="space-y-4 animate-in fade-in">
          {/* Informational Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold text-xs text-blue-950">
              <Shield className="w-4 h-4 text-blue-700" />
              <span>Character Continuity & Locking</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Add your characters below and lock them. Locked characters will have their appearances, face traits, and clothing automatically embedded into all 40 episodes for ModelArk generation.
            </p>
          </div>

          {/* Big Add Character Button */}
          {!showAddCharForm && (
            <button
              onClick={() => setShowAddCharForm(true)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Character to Microdrama</span>
            </button>
          )}

          {/* Inline Add Character Form */}
          {showAddCharForm && (
            <div className="bg-white border-2 border-blue-600 rounded-3xl p-4 shadow-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                <span className="text-xs font-extrabold text-blue-950 uppercase tracking-wide flex items-center gap-1">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  Add New Character
                </span>
                <button
                  onClick={() => setShowAddCharForm(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Template Buttons */}
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Quick Role Templates
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {CHARACTER_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.name}
                      type="button"
                      onClick={() => handleApplyTemplateInline(tmpl)}
                      className="shrink-0 px-2 py-1 text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer"
                    >
                      + {tmpl.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Character Name / Title *
                </label>
                <input
                  type="text"
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value)}
                  placeholder="e.g. Lead Protagonist, Rival Executive"
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Role
                  </label>
                  <select
                    value={newCharRole}
                    onChange={(e) => setNewCharRole(e.target.value as any)}
                    className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="protagonist">Protagonist</option>
                    <option value="antagonist">Antagonist</option>
                    <option value="supporting">Supporting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={newCharTagline}
                    onChange={(e) => setNewCharTagline(e.target.value)}
                    placeholder="e.g. Mastermind"
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Visual Appearance & Face (Locked)
                </label>
                <input
                  type="text"
                  value={newCharVisuals}
                  onChange={(e) => setNewCharVisuals(e.target.value)}
                  placeholder="e.g. Sharp composed gaze, dark hair, athletic build"
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Wardrobe & Clothing (Preserved)
                </label>
                <input
                  type="text"
                  value={newCharWardrobe}
                  onChange={(e) => setNewCharWardrobe(e.target.value)}
                  placeholder="e.g. Bespoke midnight-navy suit, crisp white dress shirt"
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Lock Character Toggle */}
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-700" />
                  <span className="text-xs font-extrabold text-blue-950">
                    Lock Character Continuity
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={newCharLock}
                  onChange={(e) => setNewCharLock(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </div>

              {/* Save Character Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAddInlineCharacter}
                  className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Save & Lock</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCharForm(false)}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Current Characters in Studio */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
                Added Characters ({characters.length})
              </span>
              <span className="text-[10px] font-bold text-blue-700 font-mono">
                {lockedCharactersCount} Locked
              </span>
            </div>

            {characters.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-5 text-center space-y-2">
                <p className="text-xs font-bold text-slate-600">No Characters Added Yet</p>
                <p className="text-[11px] text-slate-400">
                  Tap "Add Character to Microdrama" above to create and lock your characters, or tap Next to continue with generic roles.
                </p>
              </div>
            ) : (
              characters.map((char) => (
                <div
                  key={char.id}
                  className={`bg-white border rounded-2xl p-3 shadow-2xs space-y-2 ${
                    char.isLocked ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={char.referenceImageUrl}
                        alt={char.name}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-blue-950">
                            {char.name}
                          </span>
                          <span className="text-[9px] font-bold uppercase bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-md">
                            {char.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate max-w-[180px]">
                          {char.visualTraits || char.tagline}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* One tap Lock / Unlock Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleLockCharacter(char.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold rounded-lg border transition-all cursor-pointer ${
                          char.isLocked
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {char.isLocked ? (
                          <>
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3 text-slate-500" />
                            <span>Lock</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteCharacter(char.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Stepper Navigation Buttons (Back & Next) */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-2xl shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Next: Story Input</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 3: STORY INPUT & AI ENGINE */}
      {/* ======================================================== */}
      {currentStep === 3 && (
        <div className="space-y-4 animate-in fade-in">
          {/* Locked Characters summary badge */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-700" />
              <div>
                <span className="text-xs font-extrabold text-blue-950 block">
                  {lockedCharactersCount} Locked Characters Active
                </span>
                <span className="text-[10px] text-blue-700">
                  Will be enforced into all {totalEpisodes * clipsPerEpisode} clip prompts
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-[11px] font-bold text-blue-600 underline cursor-pointer"
            >
              Edit
            </button>
          </div>

          {/* Story Text Box */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Story / Plot Outline</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                {storyPrompt.length} chars
              </span>
            </div>

            <textarea
              rows={6}
              value={storyPrompt}
              onChange={(e) => setStoryPrompt(e.target.value)}
              placeholder="Enter your microdrama storyline here. The AI will split it chronologically into 40 distinct episodes with 5 cinematic scene clips per episode..."
              className="w-full text-xs font-medium p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
            />
          </div>

          {/* ModelArk AI Model Selection */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>ModelArk Video Generation Engine</span>
            </div>

            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="seedance-1-5-pro-251215">
                Pro 1.5: seedance-1-5-pro-251215 (Recommended)
              </option>
              <option value="seedance-1-0-pro-fast">
                Pro 1.0 Fast: seedance-1-0-pro-fast
              </option>
              <option value="dreamina-seedance-2-0-mini-260615">
                Mini: dreamina-seedance-2-0-mini-260615
              </option>
            </select>

            <p className="text-[10px] text-slate-400 leading-tight">
              ModelArk Seedance API delivers cinematic photorealism with 9:16 vertical composition.
            </p>
          </div>

          {/* Generate CTA Button */}
          <button
            onClick={handleGenerateBreakdown}
            disabled={isGenerating}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            <span>
              {isGenerating
                ? `Splitting into ${totalEpisodes} Episodes...`
                : `Next: Generate ${totalEpisodes} Episodes Breakdown`}
            </span>
          </button>

          {/* Stepper Navigation Buttons (Back) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-2xl shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back to Characters</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 4: REVIEW 40 EPISODES BREAKDOWN */}
      {/* ======================================================== */}
      {currentStep === 4 && createdProject && (
        <div className="space-y-3 animate-in fade-in">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="font-extrabold text-xs text-blue-950 block">
                {createdProject.totalEpisodes} Episodes Ready
              </span>
              <span className="text-[10px] text-blue-700">
                {createdProject.totalEpisodes * createdProject.clipsPerEpisode} sequential clips • 9:16 vertical
              </span>
            </div>
            <button
              onClick={handleStartProduction}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Queue</span>
            </button>
          </div>

          {/* Episode List Accordion */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {createdProject.episodes.map((ep) => {
              const isExpanded = expandedEp === ep.episodeNumber;
              return (
                <div
                  key={ep.episodeNumber}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs"
                >
                  <div
                    onClick={() => setExpandedEp(isExpanded ? 0 : ep.episodeNumber)}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                        EP {padNumber(ep.episodeNumber, 3)}
                      </span>
                      <span className="font-bold text-xs text-slate-900">
                        Episode {ep.episodeNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                        5 Clips
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2">
                      {ep.clips.map((clip) => (
                        <div
                          key={clip.id}
                          className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-blue-900">
                              {formatClipSequenceLabel(clip.episodeNumber, clip.clipNumber, 5)}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400">
                              {clip.customFilename}
                            </span>
                          </div>
                          <textarea
                            rows={2}
                            value={clip.prompt}
                            onChange={(e) => {
                              clip.prompt = e.target.value;
                            }}
                            className="w-full text-[11px] p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Action: Back and Start Queue */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-2xl shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back to Story</span>
            </button>

            <button
              onClick={handleStartProduction}
              className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Production Queue</span>
            </button>
          </div>
        </div>
      )}

      {/* Procedures in Order Modal */}
      <CreationProceduresModal
        isOpen={isProceduresModalOpen}
        onClose={() => setIsProceduresModalOpen(false)}
      />
    </div>
  );
};
