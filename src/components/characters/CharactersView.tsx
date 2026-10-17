import React, { useState } from 'react';
import { useDrama } from '../../context/DramaContext';
import { Character, CharacterGender, CharacterStageLook } from '../../types/drama';
import { CHARACTER_TEMPLATES } from '../../data/defaultCharacters';
import { CharacterImageUploader } from './CharacterImageUploader';
import {
  Plus,
  Shield,
  Lock,
  Unlock,
  Trash2,
  Edit3,
  Sparkles,
  UserCheck,
  CheckCircle2,
  Film,
  ArrowRight,
  Info,
  X,
  Layers,
} from 'lucide-react';

export const CharactersView: React.FC = () => {
  const {
    characters,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    toggleLockCharacter,
    goToCreate,
    currentProject,
  } = useDrama();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [gender, setGender] = useState<CharacterGender>('female');
  const [role, setRole] = useState<'protagonist' | 'antagonist' | 'supporting'>('protagonist');
  const [tagline, setTagline] = useState('');
  const [visualTraits, setVisualTraits] = useState('');
  const [clothingDetails, setClothingDetails] = useState('');
  const [description, setDescription] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [stageLooks, setStageLooks] = useState<CharacterStageLook[]>([]);
  const [voiceStyle, setVoiceStyle] = useState('');
  const [isLocked, setIsLocked] = useState(true);

  const resetForm = () => {
    setName('');
    setGender('female');
    setRole('protagonist');
    setTagline('');
    setVisualTraits('');
    setClothingDetails('');
    setDescription('');
    setReferenceImageUrl('');
    setAdditionalImages([]);
    setStageLooks([]);
    setVoiceStyle('');
    setIsLocked(true);
    setEditingId(null);
    setShowForm(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const handleOpenEdit = (char: Character) => {
    setEditingId(char.id);
    setName(char.name);
    setGender(char.gender || 'female');
    setRole(char.role);
    setTagline(char.tagline);
    setVisualTraits(char.visualTraits);
    setClothingDetails(char.clothingDetails);
    setDescription(char.description);
    setReferenceImageUrl(char.referenceImageUrl);
    setAdditionalImages(char.referenceImages ? char.referenceImages.slice(1) : []);
    setStageLooks(
      char.stageLooks && char.stageLooks.length > 0
        ? char.stageLooks
        : [
            {
              id: 'look_1',
              label: 'Poor / Humble Era',
              url: char.referenceImageUrl,
              fromEpisode: 1,
              toEpisode: 20,
              description: char.clothingDetails || 'Worn humble everyday clothing, modest lifestyle',
            },
          ]
    );
    setVoiceStyle(char.voiceStyle);
    setIsLocked(char.isLocked);
    setShowForm(true);
  };

  const handleApplyTemplate = (tmpl: typeof CHARACTER_TEMPLATES[0]) => {
    setName(tmpl.name);
    setGender(tmpl.gender);
    setRole(tmpl.role);
    setTagline(tmpl.tagline);
    setVisualTraits(tmpl.visualTraits);
    setClothingDetails(tmpl.clothingDetails);
    setDescription(tmpl.description);
    setReferenceImageUrl(tmpl.referenceImageUrl);
    setAdditionalImages([]);
    setStageLooks([
      { id: 'look_1', label: 'Look 1 (Humble / Poor Era)', url: tmpl.referenceImageUrl },
    ]);
    setVoiceStyle(tmpl.voiceStyle);
    setIsLocked(true);
  };

  const handleSave = (e: React.FormEvent, lockDirectly: boolean = isLocked) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a character name or role title.');
      return;
    }

    const defaultImage =
      gender === 'female'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80';

    const chosenImage = referenceImageUrl.trim() || defaultImage;
    const allImages = [chosenImage, ...additionalImages].filter(Boolean);
    const finalStageLooks = stageLooks.length > 0 ? stageLooks : [
      { id: 'look_1', label: 'Look 1 (Humble / Poor Era)', url: chosenImage },
    ];

    if (editingId) {
      const existing = characters.find((c) => c.id === editingId);
      if (existing) {
        updateCharacter({
          ...existing,
          name: name.trim(),
          gender,
          role,
          tagline: tagline.trim() || `${role.toUpperCase()} Role`,
          visualTraits: visualTraits.trim(),
          clothingDetails: clothingDetails.trim(),
          description: description.trim(),
          referenceImageUrl: chosenImage,
          referenceImages: allImages,
          stageLooks: finalStageLooks,
          voiceStyle: voiceStyle.trim(),
          isLocked: lockDirectly,
        });
      }
    } else {
      const newChar: Character = {
        id: `char_${Date.now()}`,
        name: name.trim(),
        gender,
        role,
        tagline: tagline.trim() || `${role.toUpperCase()} Role`,
        visualTraits: visualTraits.trim(),
        clothingDetails: clothingDetails.trim(),
        description: description.trim(),
        referenceImageUrl: chosenImage,
        referenceImages: allImages,
        stageLooks: finalStageLooks,
        voiceStyle: voiceStyle.trim(),
        isLocked: lockDirectly,
      };
      addCharacter(newChar);
    }

    resetForm();
  };

  const lockedCount = characters.filter((c) => c.isLocked).length;

  return (
    <div className="px-4 py-4 pb-24 space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-4 text-white shadow-lg space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/60 flex items-center justify-center border border-blue-400/30">
              <Shield className="w-4 h-4 text-blue-200" />
            </div>
            <div>
              <h2 className="text-base font-extrabold font-serif">Character Vault</h2>
              <p className="text-[11px] text-blue-200">Add and lock character continuity</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold bg-white/15 px-2.5 py-1 rounded-full text-blue-100">
              {lockedCount} Locked
            </span>
          </div>
        </div>

        <p className="text-[11px] text-blue-100 leading-relaxed">
          Locked characters maintain their faces, clothing, and visual traits across all 40 episodes and 200 clips.
        </p>
      </div>

      {/* Main Top Action: Add Character */}
      {!showForm && (
        <button
          onClick={handleOpenAdd}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Character</span>
        </button>
      )}

      {/* Add / Edit Character Mobile Form Modal */}
      {showForm && (
        <div className="bg-white border-2 border-blue-600 rounded-3xl p-4 shadow-xl space-y-3.5 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-blue-100 pb-2">
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-extrabold text-blue-950 uppercase tracking-wide">
                {editingId ? 'Edit Character' : 'New Microdrama Character'}
              </h3>
            </div>
            <button
              onClick={resetForm}
              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Preset Templates */}
          {!editingId && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Quick Archetype Templates (Optional)
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {CHARACTER_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.name}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="shrink-0 px-2.5 py-1 text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer"
                  >
                    + {tmpl.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name & Role */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Character Name / Title *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lead Protagonist, Corporate CEO, Secret Agent"
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Narrative Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="protagonist">Protagonist</option>
                  <option value="antagonist">Antagonist</option>
                  <option value="supporting">Supporting / Ally</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tagline / Identity
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Undercover Strategist"
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Visual Traits & Face */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Visual Traits & Appearance (Locked in AI)
            </label>
            <input
              type="text"
              value={visualTraits}
              onChange={(e) => setVisualTraits(e.target.value)}
              placeholder="e.g. Sharp jawline, dark penetrating eyes, neat swept-back hair"
              className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Clothing & Wardrobe */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Costume & Clothing Details (Preserved across clips)
            </label>
            <input
              type="text"
              value={clothingDetails}
              onChange={(e) => setClothingDetails(e.target.value)}
              placeholder="e.g. Tailored midnight-navy suit, crisp white dress shirt, platinum watch"
              className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Character Photo Upload & Gender Setting */}
          <CharacterImageUploader
            imageUrl={referenceImageUrl}
            onChangeImageUrl={setReferenceImageUrl}
            additionalImages={additionalImages}
            onChangeAdditionalImages={setAdditionalImages}
            stageLooks={stageLooks}
            onChangeStageLooks={setStageLooks}
            gender={gender}
            onChangeGender={setGender}
          />

          {/* Lock Checkbox */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-700" />
              <div>
                <span className="text-xs font-extrabold text-blue-950 block">
                  Lock Character
                </span>
                <span className="text-[10px] text-blue-700">
                  Embed identity into all 40 episodes prompts
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isLocked}
              onChange={(e) => setIsLocked(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded-md focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* Form Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => handleSave(e, true)}
              className="py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{editingId ? 'Save & Lock' : 'Add & Lock'}</span>
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Character Cards List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
            Microdrama Characters ({characters.length})
          </span>
          {characters.length > 0 && !showForm && (
            <button
              onClick={handleOpenAdd}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          )}
        </div>

        {characters.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-blue-200 rounded-3xl p-6 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-blue-950">No Characters Added Yet</h3>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
                Add and lock characters of the microdrama you are creating to enforce visual continuity across all 40 episodes.
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-sm cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Character</span>
            </button>
          </div>
        ) : (
          characters.map((char) => (
            <div
              key={char.id}
              className={`bg-white rounded-2xl border transition-all p-3.5 space-y-3 shadow-2xs ${
                char.isLocked ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                {/* Avatar / Photo */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={char.referenceImageUrl}
                      alt={char.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          char.gender === 'female'
                            ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'
                            : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80';
                      }}
                    />
                    {char.isLocked && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xs">
                        <Lock className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-extrabold text-xs text-blue-950">{char.name}</h4>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                          char.gender === 'female'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {char.gender === 'female' ? '♀ Female' : '♂ Male'}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                          char.role === 'protagonist'
                            ? 'bg-blue-100 text-blue-800'
                            : char.role === 'antagonist'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {char.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">{char.tagline}</p>
                  </div>
                </div>

                {/* Edit & Delete actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(char)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                    title="Edit character"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove character "${char.name}"?`)) {
                        deleteCharacter(char.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    title="Delete character"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Character Details */}
              <div className="text-[11px] bg-slate-50 border border-slate-100 rounded-xl p-2.5 space-y-1">
                {char.visualTraits && (
                  <div>
                    <span className="font-bold text-slate-700">Appearance: </span>
                    <span className="text-slate-600">{char.visualTraits}</span>
                  </div>
                )}
                {char.clothingDetails && (
                  <div>
                    <span className="font-bold text-slate-700">Wardrobe: </span>
                    <span className="text-slate-600">{char.clothingDetails}</span>
                  </div>
                )}
              </div>

              {/* Multi-Picture Evolution Strip (e.g. Poor vs Rich Era) */}
              {((char.stageLooks && char.stageLooks.filter((l) => Boolean(l.url)).length > 1) ||
                (char.referenceImages && char.referenceImages.length > 1)) && (
                <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-blue-950 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-blue-600" />
                      Character Evolution Pictures ({char.stageLooks ? char.stageLooks.filter((l) => Boolean(l.url)).length : char.referenceImages?.length} Stages)
                    </span>
                    <span className="text-[9px] font-mono text-blue-700 bg-blue-100/60 px-1.5 py-0.2 rounded-md">
                      ModelArk Grounded
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {(char.stageLooks && char.stageLooks.length > 0
                      ? char.stageLooks.filter((l) => Boolean(l.url))
                      : (char.referenceImages || []).map((url, idx) => ({
                          id: `img_${idx}`,
                          url,
                          label: idx === 0 ? 'Look 1 (Poor)' : idx === 1 ? 'Look 2' : 'Look 3 (Rich)',
                        }))
                    ).map((look: any, i: number) => (
                      <div
                        key={look.id || i}
                        className="bg-white border border-slate-200 rounded-xl p-1.5 text-center space-y-1 shadow-2xs hover:border-blue-300 transition-all"
                      >
                        <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-100">
                          <img
                            src={look.url}
                            alt={look.label}
                            className="w-full h-full object-cover"
                          />
                          <span
                            className={`absolute top-1 left-1 text-white font-mono text-[8px] font-bold px-1 rounded-xs ${
                              i === 0
                                ? 'bg-amber-600/90'
                                : i === 1
                                ? 'bg-blue-600/90'
                                : 'bg-emerald-600/90'
                            }`}
                          >
                            Pic {i + 1}: {i === 0 ? 'Poor' : i === 1 ? 'Rising' : 'Rich'}
                          </span>
                          {look.fromEpisode && (
                            <span className="absolute bottom-1 right-1 bg-slate-950/80 text-white font-mono text-[8px] font-bold px-1 rounded-xs backdrop-blur-2xs">
                              Ep {look.fromEpisode}–{look.toEpisode || 40}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-extrabold text-blue-950 block truncate leading-tight">
                          {look.label}
                        </span>
                        {look.description && (
                          <span
                            className="text-[8px] text-slate-500 block truncate"
                            title={look.description}
                          >
                            {look.description}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Explicit Lock / Unlock Button */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => toggleLockCharacter(char.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold rounded-xl border transition-all cursor-pointer active:scale-95 ${
                    char.isLocked
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {char.isLocked ? (
                    <>
                      <Lock className="w-3 h-3 text-white" />
                      <span>Locked Character</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3 text-slate-500" />
                      <span>Lock Character</span>
                    </>
                  )}
                </button>

                <span className="text-[10px] text-slate-400 font-medium">
                  {char.isLocked ? '🔒 Enforced in 40 Episodes' : 'Not locked in prompts'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom CTA to Create Drama */}
      {characters.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => goToCreate(1)}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Create Microdrama With Locked Characters</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
