import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Check,
  X,
  Sparkles,
  Link as LinkIcon,
  AlertCircle,
  Plus,
  Layers,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  Sparkle,
  Shirt,
  Eye,
  Tag,
  Briefcase,
  Moon,
  Sun,
  Shield,
  HelpCircle,
} from 'lucide-react';
import {
  CURATED_FEMALE_PORTRAITS,
  CURATED_MALE_PORTRAITS,
} from '../../data/defaultCharacters';
import { CharacterGender, CharacterStageLook } from '../../types/drama';

interface CharacterImageUploaderProps {
  imageUrl: string;
  onChangeImageUrl: (url: string) => void;
  additionalImages?: string[];
  onChangeAdditionalImages?: (images: string[]) => void;
  stageLooks?: CharacterStageLook[];
  onChangeStageLooks?: (looks: CharacterStageLook[]) => void;
  gender: CharacterGender;
  onChangeGender: (gender: CharacterGender) => void;
}

// Client-side image compression to prevent exceeding browser localStorage quota
const compressImageFile = (file: File, maxDim = 800, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(e.target?.result as string);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const LIFESTYLE_TAG_OPTIONS = [
  'Everyday',
  'Work / Job',
  'Night Life',
  'Undercover',
  'Action / Tactical',
  'Formal / Gala',
  'Home / Relaxed',
  'Disguise',
];

export const CharacterImageUploader: React.FC<CharacterImageUploaderProps> = ({
  imageUrl,
  onChangeImageUrl,
  additionalImages = [],
  onChangeAdditionalImages,
  stageLooks = [],
  onChangeStageLooks,
  gender,
  onChangeGender,
}) => {
  // Active slot index for uploading: 0 = Look 1, 1 = Look 2, 2 = Look 3
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flexible default lifestyle scene looks (not locked to poor or rich!)
  const DEFAULT_LOOKS: CharacterStageLook[] = [
    {
      id: 'look_1',
      label: 'Look 1: Everyday / Signature Lifestyle',
      lifestyleTag: 'Everyday',
      url: imageUrl || '',
      description: 'Standard daily wardrobe, signature appearance, and primary demeanor',
    },
    {
      id: 'look_2',
      label: 'Look 2: Secondary / Alternate Lifestyle',
      lifestyleTag: 'Night Life',
      url: additionalImages[0] || '',
      description: 'Alternate lifestyle outfit (e.g. night persona, work attire, or undercover disguise)',
    },
    {
      id: 'look_3',
      label: 'Look 3: Special Scene / Event Look',
      lifestyleTag: 'Formal / Gala',
      url: additionalImages[1] || '',
      description: 'Special scene look (e.g. high-stakes event, action encounter, or transformation climax)',
    },
  ];

  // Build current 3 slots representation
  const slot0: CharacterStageLook = stageLooks[0] || {
    ...DEFAULT_LOOKS[0],
    url: imageUrl,
  };
  const slot1: CharacterStageLook = stageLooks[1] || {
    ...DEFAULT_LOOKS[1],
    url: additionalImages[0] || '',
  };
  const slot2: CharacterStageLook = stageLooks[2] || {
    ...DEFAULT_LOOKS[2],
    url: additionalImages[1] || '',
  };

  const currentSlots = [slot0, slot1, slot2];

  const updateSlots = (newSlots: CharacterStageLook[]) => {
    // 1. Primary image is slot 0 url
    onChangeImageUrl(newSlots[0]?.url || '');

    // 2. Additional images are slot 1 and slot 2 urls
    const additional = [newSlots[1]?.url, newSlots[2]?.url].filter(Boolean) as string[];
    onChangeAdditionalImages?.(additional);

    // 3. Stage looks objects
    onChangeStageLooks?.(newSlots);
  };

  const handleSetSlotImage = (slotIndex: number, newUrl: string) => {
    const updated = [...currentSlots];
    updated[slotIndex] = {
      ...updated[slotIndex],
      url: newUrl,
      label: updated[slotIndex]?.label || DEFAULT_LOOKS[slotIndex].label,
      lifestyleTag: updated[slotIndex]?.lifestyleTag || DEFAULT_LOOKS[slotIndex].lifestyleTag,
      description: updated[slotIndex]?.description || DEFAULT_LOOKS[slotIndex].description,
    };
    updateSlots(updated);
  };

  const handleSetSlotField = (slotIndex: number, field: keyof CharacterStageLook, value: any) => {
    const updated = [...currentSlots];
    updated[slotIndex] = {
      ...updated[slotIndex],
      [field]: value,
    };
    updateSlots(updated);
  };

  const handleClearSlot = (slotIndex: number) => {
    const updated = [...currentSlots];
    updated[slotIndex] = {
      ...updated[slotIndex],
      url: '',
    };
    updateSlots(updated);
  };

  // Lifestyle Preset Presets
  const applyPreset = (presetType: 'dual_lifestyle' | 'action_espionage' | 'corporate_casual' | 'evolution') => {
    let presets: { label: string; lifestyleTag: string; description: string }[] = [];

    if (presetType === 'dual_lifestyle') {
      presets = [
        { label: 'Look 1: Day Job / Public Life', lifestyleTag: 'Work / Job', description: 'Clean modest professional attire, polite demeanor, everyday work life' },
        { label: 'Look 2: Night Life / Secret Persona', lifestyleTag: 'Night Life', description: 'Sleek dark nighttime outfit, sharp confident demeanor, secret lifestyle' },
        { label: 'Look 3: Undercover / Disguise', lifestyleTag: 'Undercover', description: 'Casual street disguise, cap or dark jacket, stealth inconspicuous look' },
      ];
    } else if (presetType === 'action_espionage') {
      presets = [
        { label: 'Look 1: Civilian Casual', lifestyleTag: 'Everyday', description: 'Relaxed casual streetwear, natural everyday appearance' },
        { label: 'Look 2: Tactical / Action', lifestyleTag: 'Action / Tactical', description: 'Dark tactical utility outfit, combat boots, intense alert posture' },
        { label: 'Look 3: High-Society Gala', lifestyleTag: 'Formal / Gala', description: 'Bespoke evening formalwear, elegant styling, luxury presence' },
      ];
    } else if (presetType === 'corporate_casual') {
      presets = [
        { label: 'Look 1: Executive Office', lifestyleTag: 'Work / Job', description: 'Tailored business suit/blazer, professional corporate presence' },
        { label: 'Look 2: Off-Duty Casual', lifestyleTag: 'Everyday', description: 'Comfortable relaxed casual clothing, informal friendly posture' },
        { label: 'Look 3: Boardroom Climax', lifestyleTag: 'Formal / Gala', description: 'Impeccable power suit, luxury watch, commanding authoritative demeanor' },
      ];
    } else {
      presets = [
        { label: 'Look 1: Early Journey', lifestyleTag: 'Everyday', description: 'Simple humble attire, starting life phase' },
        { label: 'Look 2: Transformation', lifestyleTag: 'Work / Job', description: 'Transitional modern wardrobe, rising determination' },
        { label: 'Look 3: Peak Status', lifestyleTag: 'Formal / Gala', description: 'Distinguished styling, high-status commanding presence' },
      ];
    }

    const updated = currentSlots.map((slot, idx) => ({
      ...slot,
      label: presets[idx].label,
      lifestyleTag: presets[idx].lifestyleTag,
      description: presets[idx].description,
    }));
    updateSlots(updated);
  };

  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    setUploadError(null);
    setIsUploading(true);

    try {
      // 1. Compress image client-side to prevent localStorage quota issues
      const compressedBase64 = await compressImageFile(file, 800, 0.85);

      // Temporarily set compressed image so user gets instant visual feedback
      handleSetSlotImage(activeSlot, compressedBase64);

      // 2. Upload to server static folder for permanent, clean /uploads/... URL
      try {
        const res = await fetch('/api/upload/character-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: compressedBase64, filename: file.name }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            handleSetSlotImage(activeSlot, data.url);
          }
        }
      } catch (serverErr) {
        console.warn('Server upload fallback to compressed base64:', serverErr);
      } finally {
        setIsUploading(false);
      }
    } catch (err: any) {
      setUploadError('Failed to process image: ' + err.message);
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleApplyUrl = () => {
    if (customUrl.trim()) {
      handleSetSlotImage(activeSlot, customUrl.trim());
      setShowUrlInput(false);
      setCustomUrl('');
    }
  };

  const triggerUploadForSlot = (index: number) => {
    setActiveSlot(index);
    fileInputRef.current?.click();
  };

  const curatedList = gender === 'female' ? CURATED_FEMALE_PORTRAITS : CURATED_MALE_PORTRAITS;
  const filledImagesCount = currentSlots.filter((s) => Boolean(s.url)).length;
  const activeSlotData = currentSlots[activeSlot] || currentSlots[0];

  return (
    <div className="space-y-3.5">
      {/* 1. Explicit Gender Selection */}
      <div>
        <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
          <span>Character Gender *</span>
          <span className="text-[10px] font-normal text-slate-500">
            Enforces strict female/male consistency across all scenes
          </span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              onChangeGender('female');
              if (
                !slot0.url ||
                slot0.url.includes('photo-1507003211169') ||
                slot0.url.includes('photo-1500648767791')
              ) {
                handleSetSlotImage(0, CURATED_FEMALE_PORTRAITS[0].url);
              }
            }}
            className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              gender === 'female'
                ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-400/30 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-sm">♀</span>
            <span>Female (Girl)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onChangeGender('male');
              if (
                !slot0.url ||
                slot0.url.includes('photo-1534528741775') ||
                slot0.url.includes('photo-1573496359142')
              ) {
                handleSetSlotImage(0, CURATED_MALE_PORTRAITS[0].url);
              }
            }}
            className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              gender === 'male'
                ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-400/30 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-sm">♂</span>
            <span>Male (Man)</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeGender('other')}
            className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              gender === 'other'
                ? 'bg-purple-50 text-purple-700 border-purple-300 ring-2 ring-purple-400/30 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Custom</span>
          </button>
        </div>
      </div>

      {/* 2. Scene Looks & Lifestyles (Up to 3 Photos: e.g. Day Job vs Night Secret, Casual vs Formal) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-extrabold text-blue-950">
              Character Scene Looks & Lifestyles (Up to 3 Photos)
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
            {filledImagesCount} of 3 Attached
          </span>
        </div>

        <p className="text-[11px] text-slate-600 leading-tight">
          Add up to 3 photos of this character for different lifestyles, outfits, or settings (e.g. <strong>Day Job vs Night Secret</strong>, <strong>Casual vs Formal</strong>, or <strong>Undercover</strong>). In any episode or clip, you can select which look this character wears!
        </p>

        {/* Quick Lifestyle Preset Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
          <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">
            Quick Lifestyles:
          </span>
          <button
            type="button"
            onClick={() => applyPreset('dual_lifestyle')}
            className="shrink-0 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <Moon className="w-2.5 h-2.5 text-blue-600" />
            <span>Dual Lifestyle (Day Job & Night Secret)</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('action_espionage')}
            className="shrink-0 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <Shield className="w-2.5 h-2.5 text-indigo-600" />
            <span>Action & Espionage</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('corporate_casual')}
            className="shrink-0 text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <Briefcase className="w-2.5 h-2.5 text-teal-600" />
            <span>Executive & Casual</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('evolution')}
            className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <Sparkle className="w-2.5 h-2.5 text-amber-600" />
            <span>Life Journey / Transformation</span>
          </button>
        </div>

        {/* 3 Interactive Cards for the 3 Pictures */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {currentSlots.map((slot, index) => {
            const hasImage = Boolean(slot.url);
            const isSelected = activeSlot === index;
            const defaultLabel = DEFAULT_LOOKS[index].label;

            return (
              <div
                key={index}
                onClick={() => setActiveSlot(index)}
                className={`p-2.5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                }`}
              >
                {/* Look Header & Tag */}
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-md border ${
                    index === 0 ? 'bg-blue-50 text-blue-800 border-blue-200' :
                    index === 1 ? 'bg-purple-50 text-purple-800 border-purple-200' :
                    'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    Photo {index + 1}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md truncate max-w-[110px]">
                    {slot.lifestyleTag || (index === 0 ? 'Everyday' : index === 1 ? 'Alternate' : 'Special')}
                  </span>
                </div>

                <input
                  type="text"
                  value={slot.label}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleSetSlotField(index, 'label', e.target.value)}
                  placeholder={defaultLabel}
                  className="text-[11px] font-bold text-slate-900 bg-white border border-slate-200 rounded-md px-1.5 py-1 focus:border-blue-500 focus:outline-hidden w-full truncate"
                />

                {/* Picture Preview or Upload Trigger */}
                {hasImage ? (
                  <div className="relative group rounded-xl overflow-hidden aspect-square border border-slate-200 bg-white shadow-2xs">
                    <img
                      src={slot.url}
                      alt={slot.label}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerUploadForSlot(index);
                        }}
                        className="p-1.5 bg-white text-blue-700 rounded-lg text-[10px] font-bold shadow-xs hover:bg-blue-50 cursor-pointer"
                        title="Replace photo"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearSlot(index);
                        }}
                        className="p-1.5 bg-white text-rose-600 rounded-lg text-[10px] font-bold shadow-xs hover:bg-rose-50 cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="absolute bottom-1 left-1 right-1 bg-slate-950/75 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md truncate backdrop-blur-xs text-center">
                      {slot.label || `Photo ${index + 1}`}
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerUploadForSlot(index);
                    }}
                    className="border-2 border-dashed border-blue-300/80 hover:border-blue-500 bg-white rounded-xl aspect-square flex flex-col items-center justify-center p-2 text-center transition-all hover:bg-blue-50/40 cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                      <Upload className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-extrabold text-blue-950 block leading-tight">
                      + Add Photo {index + 1}
                    </span>
                    <span className="text-[8px] text-slate-500 block mt-0.5">
                      {index === 0
                        ? 'Everyday Outfit'
                        : index === 1
                        ? 'Alternate Lifestyle'
                        : 'Special Scene Look'}
                    </span>
                  </div>
                )}

                {/* Quick Action below slot */}
                <div className="flex items-center justify-between text-[10px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerUploadForSlot(index);
                    }}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    {hasImage ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {hasImage && (
                    <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> Attached
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Look Details (Wardrobe, Demeanor & Lifestyle Category) */}
        <div className="p-3 bg-white border border-blue-200 rounded-2xl shadow-2xs space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-blue-950 flex items-center gap-1.5">
              <Shirt className="w-3.5 h-3.5 text-blue-600" />
              <span>Details for Photo {activeSlot + 1} ({activeSlotData.label})</span>
            </span>
            <span className="text-[10px] text-blue-700 font-bold">
              Applied whenever this look is selected
            </span>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">
              Lifestyle Category
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {LIFESTYLE_TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleSetSlotField(activeSlot, 'lifestyleTag', tag)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    activeSlotData.lifestyleTag === tag
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
              Outfit, Demeanor & Scene Atmosphere for Photo {activeSlot + 1}
            </label>
            <input
              type="text"
              value={activeSlotData.description || ''}
              onChange={(e) => handleSetSlotField(activeSlot, 'description', e.target.value)}
              placeholder="e.g. Tailored midnight-navy suit, sharp composed gaze, formal upscale setting"
              className="w-full text-xs font-medium px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
            />
            <p className="text-[9px] text-slate-400 mt-1">
              💡 Works for any scene or episode. You can freely assign this photo to any clip in the Video Editor & Episode Library.
            </p>
          </div>
        </div>

        {/* Global Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {uploadError && (
          <div className="flex items-center gap-1 text-[10px] text-rose-600 font-medium mt-1">
            <AlertCircle className="w-3 h-3" />
            <span>{uploadError}</span>
          </div>
        )}

        {isUploading && (
          <div className="flex items-center gap-1.5 text-[10px] text-blue-700 font-bold mt-1 bg-blue-50 p-2 rounded-lg animate-pulse">
            <Upload className="w-3.5 h-3.5 animate-spin" />
            <span>Compressing & uploading photo to server...</span>
          </div>
        )}
      </div>

      {/* 3. Preset Portraits For Active Slot */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Curated Portraits For Photo {activeSlot + 1} ({activeSlotData.label})</span>
          </span>
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <LinkIcon className="w-2.5 h-2.5" />
            <span>{showUrlInput ? 'Hide URL' : 'Paste Photo URL'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5">
          {curatedList.map((portrait, idx) => {
            const isSelected = activeSlotData.url === portrait.url;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSetSlotImage(activeSlot, portrait.url)}
                className={`relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-400 scale-105 shadow-md'
                    : 'border-slate-200 hover:border-blue-300 opacity-80 hover:opacity-100'
                }`}
                title={portrait.label}
              >
                <img
                  src={portrait.url}
                  alt={portrait.label}
                  className="w-full h-full object-cover"
                />
                {isSelected && (
                  <span className="absolute inset-0 bg-blue-600/30 flex items-center justify-center text-white">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom URL Input dropdown */}
        {showUrlInput && (
          <div className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl mt-1">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/character-photo.jpg"
              className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
