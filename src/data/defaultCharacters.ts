import { Character } from '../types/drama';

/**
 * Clean character templates without person names, allowing the user
 * to add, customize, and lock characters for their own microdrama.
 */
export const CHARACTER_TEMPLATES = [
  {
    role: 'protagonist' as const,
    name: 'Lead Protagonist',
    tagline: 'Central Figure of the Microdrama',
    description: 'Composed, determined protagonist driving the core narrative arc across episodes.',
    clothingDetails: 'Tailored dark navy suit, crisp white dress shirt, brushed silver watch.',
    visualTraits: 'Sharp jawline, focused dark eyes, neat dark hair, poised posture.',
    referenceImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    voiceStyle: 'Deep, clear, confident tone',
  },
  {
    role: 'antagonist' as const,
    name: 'Main Antagonist',
    tagline: 'Primary Opposition & Rival',
    description: 'Calculating rival confronting the protagonist in boardroom and personal clashes.',
    clothingDetails: 'High-collar dark grey coat, black silk turtleneck, bespoke ring.',
    visualTraits: 'Piercing light grey eyes, swept back silver hair, commanding expression.',
    referenceImageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    voiceStyle: 'Chillingly polite and authoritative',
  },
  {
    role: 'supporting' as const,
    name: 'Supporting Ally',
    tagline: 'Key Confidant & Strategist',
    description: 'Loyal advisor and ally assisting with key developments and secret operations.',
    clothingDetails: 'Structured blazer, smart optical glasses, dark trousers.',
    visualTraits: 'Attentive eyes, observant demeanour, calm and collected presence.',
    referenceImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    voiceStyle: 'Measured, diplomatic, reliable delivery',
  },
];

// Start with empty characters so the user creates and locks their own!
export const DEFAULT_CHARACTERS: Character[] = [];
