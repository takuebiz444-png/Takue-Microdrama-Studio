import React, { useState } from 'react';
import { useDrama } from '../../context/DramaContext';
import { Character } from '../../types/drama';
import { CHARACTER_TEMPLATES } from '../../data/defaultCharacters';
import {
  X,
  Plus,
  Sparkles,
  UserCheck,
  Shield,
  Wand2,
  Info,
  Lock,
  Unlock,
  Trash2,
  Edit3,
  Copy,
} from 'lucide-react';

interface CharacterVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CharacterVaultModal: React.FC<CharacterVaultModalProps> = ({ isOpen, onClose }) => {
  const { characters, addCharacter, updateCharacter, deleteCharacter, toggleLockCharacter } = useDrama();
  const [selectedCharacter, setSelectedCharacter] = useState<Character>(characters[0] || null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Character>>({
    name: '',
    role: 'protagonist',
    tagline: '',
    description: '',
    clothingDetails: '',
    visualTraits: '',
    referenceImageUrl: '',
    voiceStyle: '',
    isLocked: true,
  });

  if (!isOpen) return null;

  const handleSelect = (char: Character) => {
    setSelectedCharacter(char);
    setIsEditing(false);
    setShowAddForm(false);
  };

  const startEdit = () => {
    if (selectedCharacter.isLocked) {
      alert('This character is currently locked to preserve continuity. Please unlock it first if you wish to edit.');
      return;
    }
    setFormData(selectedCharacter);
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const updated = { ...selectedCharacter, ...formData } as Character;
    updateCharacter(updated);
    setSelectedCharacter(updated);
    setIsEditing(false);
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const newChar: Character = {
      id: `char_${Date.now()}`,
      name: formData.name,
      role: formData.role || 'protagonist',
      tagline: formData.tagline || 'Key Dramatic Role',
      description: formData.description || '',
      clothingDetails: formData.clothingDetails || '',
      visualTraits: formData.visualTraits || '',
      referenceImageUrl:
        formData.referenceImageUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      voiceStyle: formData.voiceStyle || 'Neutral Dramatic Tone',
      isLocked: formData.isLocked ?? true,
    };
    addCharacter(newChar);
    setSelectedCharacter(newChar);
    setShowAddForm(false);
  };

  const handleApplyArchetype = (archetype: (typeof CHARACTER_TEMPLATES)[0]) => {
    setFormData({
      name: archetype.name,
      role: archetype.role,
      tagline: archetype.tagline,
      description: archetype.description,
      clothingDetails: archetype.clothingDetails,
      visualTraits: archetype.visualTraits,
      referenceImageUrl: archetype.referenceImageUrl,
      voiceStyle: archetype.voiceStyle,
      isLocked: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-blue-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/60 flex items-center justify-center border border-blue-400/30">
              <Shield className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">Microdrama Character Continuity Vault</h2>
              <p className="text-xs text-blue-200">
                Add, configure, and lock character identities across all 40 episodes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Character List Sidebar */}
          <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 p-4 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Cast Profiles ({characters.length})
              </span>
              <button
                onClick={() => {
                  setFormData({
                    name: '',
                    role: 'protagonist',
                    tagline: '',
                    description: '',
                    clothingDetails: '',
                    visualTraits: '',
                    referenceImageUrl: '',
                    voiceStyle: '',
                    isLocked: true,
                  });
                  setShowAddForm(true);
                  setIsEditing(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Character
              </button>
            </div>

            {/* List */}
            <div className="space-y-2">
              {characters.map((char) => {
                const isSelected = selectedCharacter?.id === char.id && !showAddForm;
                return (
                  <div
                    key={char.id}
                    onClick={() => handleSelect(char)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer relative ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/20'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <img
                      src={char.referenceImageUrl}
                      alt={char.name}
                      className="w-12 h-12 rounded-xl object-cover border border-white/30 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate">{char.name}</span>
                        <div className="flex items-center gap-1">
                          {char.isLocked && (
                            <span
                              className={`p-0.5 rounded-md ${
                                isSelected ? 'bg-blue-800 text-blue-200' : 'bg-blue-100 text-blue-700'
                              }`}
                              title="Locked Continuity"
                            >
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
                          <span
                            className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${
                              isSelected
                                ? 'bg-blue-900 text-blue-100'
                                : char.role === 'protagonist'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {char.role}
                          </span>
                        </div>
                      </div>
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isSelected ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {char.tagline}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explainer on Locking */}
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl text-[11px] text-blue-950 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                Character Locking Feature
              </div>
              <p className="text-blue-900/80">
                Locking a character freezes their visual prompt anchor, clothing, and traits so ModelArk generates them consistently across every scene without model drifting.
              </p>
            </div>
          </div>

          {/* Right Character Details or Edit/Add Form */}
          <div className="flex-1 p-6 overflow-y-auto bg-white">
            {showAddForm || isEditing ? (
              <form onSubmit={showAddForm ? handleAddNew : handleSaveEdit} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h3 className="font-bold text-base text-blue-950">
                    {showAddForm ? 'Add & Configure New Character' : `Edit ${selectedCharacter?.name}`}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setIsEditing(false);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {/* Quick Archetype Preset Templates */}
                {showAddForm && (
                  <div>
                    <span className="block text-xs font-bold text-slate-700 mb-1.5">
                      Or Choose a Microdrama Archetype Template:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {CHARACTER_TEMPLATES.map((arch, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplyArchetype(arch)}
                          className="p-2.5 rounded-xl border border-slate-200 text-left bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-blue-950">{arch.name}</span>
                            <span className="text-[9px] uppercase font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded-xs">
                              {arch.role}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                            {arch.tagline}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Character Role Title
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. The Undercover Billionaire, The Syndicate CEO"
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Role Type</label>
                    <select
                      value={formData.role || 'protagonist'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="protagonist">Protagonist</option>
                      <option value="antagonist">Antagonist</option>
                      <option value="supporting">Supporting</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={formData.tagline || ''}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="e.g. Heir in Disguise & Silent Strategist"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reference Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.referenceImageUrl || ''}
                    onChange={(e) => setFormData({ ...formData, referenceImageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Wardrobe & Signature Attire (Injected into ModelArk Prompts)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.clothingDetails || ''}
                    onChange={(e) => setFormData({ ...formData, clothingDetails: e.target.value })}
                    placeholder="Tailored midnight-navy Italian double-breasted suit, crisp spread-collar white dress shirt, brushed platinum cufflinks..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Visual Facial Features & Demeanor
                  </label>
                  <textarea
                    rows={2}
                    value={formData.visualTraits || ''}
                    onChange={(e) => setFormData({ ...formData, visualTraits: e.target.value })}
                    placeholder="Chiseled jawline, penetrating obsidian-dark eyes, calm piercing gaze, poised posture..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Lock Setting Checkbox */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-xs font-bold text-blue-950 block">
                        Lock Character Anchor
                      </span>
                      <span className="text-[10px] text-blue-800">
                        Ensures wardrobe and visual tags are strictly preserved across generations
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isLocked ?? true}
                    onChange={(e) => setFormData({ ...formData, isLocked: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
                  >
                    {showAddForm ? 'Add & Lock Character' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : selectedCharacter ? (
              <div className="space-y-6">
                {/* Character Hero Card */}
                <div className="flex flex-col sm:flex-row items-start gap-5 p-5 bg-blue-50/70 border border-blue-200 rounded-3xl">
                  <img
                    src={selectedCharacter.referenceImageUrl}
                    alt={selectedCharacter.name}
                    className="w-28 h-36 rounded-2xl object-cover shadow-md border-2 border-white shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-extrabold text-blue-950 font-serif">
                          {selectedCharacter.name}
                        </h3>
                        <span
                          className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${
                            selectedCharacter.role === 'protagonist'
                              ? 'bg-blue-600 text-white'
                              : 'bg-indigo-600 text-white'
                          }`}
                        >
                          {selectedCharacter.role}
                        </span>
                      </div>

                      {/* Lock / Unlock Toggle Button */}
                      <button
                        onClick={() => toggleLockCharacter(selectedCharacter.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                          selectedCharacter.isLocked
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                        title={
                          selectedCharacter.isLocked
                            ? 'Character is locked. Click to unlock.'
                            : 'Character is unlocked. Click to lock.'
                        }
                      >
                        {selectedCharacter.isLocked ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Locked Continuity</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Unlocked</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs font-semibold text-blue-800 mb-2">
                      {selectedCharacter.tagline}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {selectedCharacter.description}
                    </p>
                  </div>
                </div>

                {/* Continuity Properties */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                      <Shield className="w-4 h-4 text-blue-600" />
                      Locked Signature Wardrobe
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {selectedCharacter.clothingDetails}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      Facial Traits & Stature
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {selectedCharacter.visualTraits}
                    </p>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={startEdit}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Profile
                    </button>
                    {characters.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${selectedCharacter.name}?`)) {
                            deleteCharacter(selectedCharacter.id);
                            setSelectedCharacter(characters[0]);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {selectedCharacter.id}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
