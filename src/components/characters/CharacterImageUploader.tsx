import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Check,
  X,
  Sparkles,
  Link as LinkIcon,
  AlertCircle,
} from 'lucide-react';
import {
  CURATED_FEMALE_PORTRAITS,
  CURATED_MALE_PORTRAITS,
} from '../../data/defaultCharacters';
import { CharacterGender } from '../../types/drama';

interface CharacterImageUploaderProps {
  imageUrl: string;
  onChangeImageUrl: (url: string) => void;
  gender: CharacterGender;
  onChangeGender: (gender: CharacterGender) => void;
}

export const CharacterImageUploader: React.FC<CharacterImageUploaderProps> = ({
  imageUrl,
  onChangeImageUrl,
  gender,
  onChangeGender,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    setUploadError(null);
    setIsUploading(true);

    try {
      // 1. Convert to Base64 Data URL for instant rendering & offline continuity
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        onChangeImageUrl(base64Data);

        // 2. Also try uploading to server for static URL
        try {
          const res = await fetch('/api/upload/character-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64Data, filename: file.name }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.url) {
              onChangeImageUrl(data.url);
            }
          }
        } catch (serverErr) {
          // If server write fails, base64 data URL remains active
          console.warn('Server upload fallback to base64:', serverErr);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
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
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleApplyUrl = () => {
    if (customUrl.trim()) {
      onChangeImageUrl(customUrl.trim());
      setShowUrlInput(false);
      setCustomUrl('');
    }
  };

  const curatedList = gender === 'female' ? CURATED_FEMALE_PORTRAITS : CURATED_MALE_PORTRAITS;

  return (
    <div className="space-y-3">
      {/* 1. Explicit Gender Selection */}
      <div>
        <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
          <span>Character Gender *</span>
          <span className="text-[10px] font-normal text-slate-500">
            Enforces female/male consistency in all clips
          </span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              onChangeGender('female');
              // If currently showing default male image, switch to female
              if (
                !imageUrl ||
                imageUrl.includes('photo-1507003211169') ||
                imageUrl.includes('photo-1500648767791')
              ) {
                onChangeImageUrl(CURATED_FEMALE_PORTRAITS[0].url);
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
                !imageUrl ||
                imageUrl.includes('photo-1534528741775') ||
                imageUrl.includes('photo-1573496359142')
              ) {
                onChangeImageUrl(CURATED_MALE_PORTRAITS[0].url);
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

      {/* 2. Photo Upload Area */}
      <div>
        <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
          <span>Character Picture / Photo Reference *</span>
          <span className="text-[10px] text-slate-500 font-normal">
            Upload from your device
          </span>
        </label>

        {imageUrl ? (
          /* Preview Mode with Replace / Remove */
          <div className="p-3 bg-slate-50 border-2 border-blue-300 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={imageUrl}
                  alt="Character Reference"
                  className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-md"
                />
                <span
                  className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                    gender === 'female' ? 'bg-rose-500' : 'bg-blue-600'
                  }`}
                >
                  {gender === 'female' ? '♀' : '♂'}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-xs font-extrabold text-blue-950 block truncate">
                  Character Photo Attached
                </span>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Ready for ModelArk Continuity
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
              >
                Change Photo
              </button>
              <button
                type="button"
                onClick={() => onChangeImageUrl('')}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Upload Dropzone */
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-600 bg-blue-50/70 scale-99'
                : 'border-blue-300 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/50'
            }`}
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2 shadow-2xs">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-extrabold text-blue-950">
              {isUploading ? 'Uploading photo...' : 'Click or Drag & Drop to Upload Picture'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Supports PNG, JPG, WEBP from your phone or computer
            </p>
          </div>
        )}

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
      </div>

      {/* 3. Quick Curated Portrait Gallery */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Or Choose A Curated {gender === 'female' ? 'Female' : 'Male'} Portrait</span>
          </span>
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <LinkIcon className="w-2.5 h-2.5" />
            <span>{showUrlInput ? 'Hide URL' : 'Paste URL'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5">
          {curatedList.map((portrait, idx) => {
            const isSelected = imageUrl === portrait.url;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onChangeImageUrl(portrait.url)}
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

        {/* Optional URL input toggle */}
        {showUrlInput && (
          <div className="flex items-center gap-1.5 pt-1 animate-in fade-in">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/character-photo.jpg"
              className="flex-1 text-xs font-mono px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
