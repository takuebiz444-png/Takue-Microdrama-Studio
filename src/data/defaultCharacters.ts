import { Character, CharacterGender } from '../types/drama';

export interface CharacterTemplate {
  name: string;
  gender: CharacterGender;
  role: 'protagonist' | 'antagonist' | 'supporting';
  tagline: string;
  description: string;
  clothingDetails: string;
  visualTraits: string;
  referenceImageUrl: string;
  voiceStyle: string;
}

export const CURATED_FEMALE_PORTRAITS = [
  {
    label: 'Dramatic Female Lead',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    tags: 'Female, expressive dark eyes, long hair',
  },
  {
    label: 'Corporate Heiress / CEO',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80',
    tags: 'Female, commanding poise, tailored blazer',
  },
  {
    label: 'Glamorous Rival',
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80',
    tags: 'Female, high fashion, sharp gaze',
  },
  {
    label: 'Young Heroine',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
    tags: 'Female, determined, cinematic lighting',
  },
  {
    label: 'Revenge Protagonist',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80',
    tags: 'Female, intense gaze, cinematic portrait',
  },
];

export const CURATED_MALE_PORTRAITS = [
  {
    label: 'Executive Protagonist',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
    tags: 'Male, sharp jawline, tailored suit',
  },
  {
    label: 'Cold Antagonist',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
    tags: 'Male, calculating expression, high collar',
  },
  {
    label: 'Strategic Ally',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80',
    tags: 'Male, observant, casual professional',
  },
];

/**
 * Clean character templates with explicit gender to prevent gender mismatches.
 */
export const CHARACTER_TEMPLATES: CharacterTemplate[] = [
  {
    role: 'protagonist',
    gender: 'female',
    name: 'Female Lead Heroine',
    tagline: 'Central Female Protagonist',
    description: 'Determined, sharp-witted young woman navigating corporate rivalry and deep emotional secrets.',
    clothingDetails: 'Tailored emerald silk blouse, structured ivory blazer, minimalist diamond pendant.',
    visualTraits: 'Striking feminine facial features, expressive almond dark eyes, flowing dark hair, elegant posture.',
    referenceImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    voiceStyle: 'Passionate, clear, commanding feminine voice',
  },
  {
    role: 'antagonist',
    gender: 'female',
    name: 'Female Rival Heiress',
    tagline: 'Ruthless Corporate Antagonist',
    description: 'Calculating heiress stopping at nothing to secure power and expose the protagonist.',
    clothingDetails: 'High-fashion black designer trench coat, crimson silk scarf, gold ear cuff.',
    visualTraits: 'Piercing gaze, sleek high ponytail, sculpted cheekbones, cold confident smirk.',
    referenceImageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80',
    voiceStyle: 'Silky, chillingly polite, authoritative tone',
  },
  {
    role: 'supporting',
    gender: 'female',
    name: 'Loyal Female Confidante',
    tagline: 'Trusted Sister & Ally',
    description: 'Clever, empathetic advisor uncovering vital evidence and standing by the heroine.',
    clothingDetails: 'Soft pastel cashmere sweater, denim jacket, smart glasses.',
    visualTraits: 'Warm expressive brown eyes, shoulder-length wavy hair, genuine smile.',
    referenceImageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
    voiceStyle: 'Warm, reassuring, rapid-paced delivery',
  },
  {
    role: 'protagonist',
    gender: 'male',
    name: 'Male Lead Executive',
    tagline: 'Vengeful Heir Protagonist',
    description: 'Resilient man returning under a false identity to reclaim his family enterprise.',
    clothingDetails: 'Tailored midnight-navy suit, crisp white dress shirt, brushed platinum watch.',
    visualTraits: 'Sharp masculine jawline, focused dark eyes, neat swept-back hair, poised posture.',
    referenceImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
    voiceStyle: 'Deep, steady, authoritative masculine tone',
  },
  {
    role: 'antagonist',
    gender: 'male',
    name: 'Male Rival Chairman',
    tagline: 'Primary Antagonist & Tycoon',
    description: 'Ruthless patriarch controlling the conglomerate with an iron grip.',
    clothingDetails: 'Double-breasted charcoal wool suit, burgundy silk tie, signet ring.',
    visualTraits: 'Weathered handsome features, silver-streaked hair, cold analytical stare.',
    referenceImageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
    voiceStyle: 'Low, gravelly, menacing baritone',
  },
];

export const DEFAULT_CHARACTERS: Character[] = [];
