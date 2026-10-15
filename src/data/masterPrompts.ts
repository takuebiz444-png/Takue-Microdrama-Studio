export interface MasterPromptTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  prompt: string;
  recommendedTone: string;
}

export const MASTER_PROMPT_PRESETS: MasterPromptTemplate[] = [
  {
    id: 'universal_vertical_cinema',
    name: 'Universal 9:16 Vertical Cinema',
    category: 'Universal Microdrama',
    description: 'Gold-standard vertical framing for fast-paced 9:16 mobile microdramas.',
    recommendedTone: 'Cinematic Microdrama',
    prompt:
      'Shot in 9:16 vertical 4K resolution, mobile portrait framing. Shallow depth of field with 50mm and 85mm prime lenses, cinematic bokeh. Dynamic camera movements: subtle slow dolly-in, tension-building rack focus, dramatic eye-level close-ups. Volumetric atmospheric lighting, natural skin tones, professional color grading with rich shadows and highlight roll-off. Pacing is punchy, high emotional stakes, crisp audio clarity.',
  },
  {
    id: 'urban_power_revenge',
    name: 'Urban Power, Revenge & Suspense',
    category: 'Thriller / Revenge',
    description: 'Moody, high-contrast aesthetic with sleek glass towers and dramatic shadows.',
    recommendedTone: 'Dark Suspense',
    prompt:
      '9:16 vertical framing, modern metropolis high-stakes thriller. Chiaroscuro lighting with deep cyan shadows and amber practical glows. Reflections in floor-to-ceiling penthouse glass, rain-streaked windows, luxury boardroom interiors. Dutch angles during confrontations, tight choke close-ups capturing intense micro-expressions. High cinematic contrast, filmic grain, relentless psychological tension.',
  },
  {
    id: 'k_drama_romance',
    name: 'Romantic Tension & Emotional Drama',
    category: 'Romantic Drama',
    description: 'Warm golden-hour glows, dreamy lens flares, and intense emotional intimacy.',
    recommendedTone: 'Romantic Melodrama',
    prompt:
      '9:16 vertical portrait cinema, dreamy shallow focus. Soft diffusion filters, golden hour backlighting with warm amber lens flares. Gentle slow-motion close-ups on eyes, subtle breath caught in throat, dramatic tear glistening. Elegant pastel and warm earth-tone palette, blooming highlights, poignant musical pause, poignant cliffhanger camera tilt.',
  },
  {
    id: 'billionaire_boardroom',
    name: 'Billionaire Empire & Secret Identity',
    category: 'High Society / CEO',
    description: 'Ultra-crisp commercial luxury aesthetic, private jets, gala ballrooms.',
    recommendedTone: 'Luxury Prestige',
    prompt:
      '9:16 vertical high-prestige commercial cinematography. Ultra-sharp 8K optics, immaculate tailored wardrobe textures (silk, Italian wool, diamonds). Architectural wide-angle vertical pans transitioning into commanding hero low-angle portrait shots. Crystal chandeliers, champagne reflections, cool cobalt and platinum tones, unforgiving dramatic confrontations.',
  },
  {
    id: 'neo_noir_mystery',
    name: 'Neo-Noir Cyberpunk Mystery',
    category: 'Sci-Fi / Mystery',
    description: 'Neon rim lights, rainy back-alleys, holographic interfaces, high shutter speed.',
    recommendedTone: 'Cyberpunk Noir',
    prompt:
      '9:16 vertical framing, neon-soaked rainy night atmosphere. Vibrant magenta and electric cyan rim lighting against pitch-black alleys. Anamorphic horizontal flares, wet asphalt reflections, futuristic smartphone holographic displays. Fast handheld tracking shots, swift zoom into shock revelations, gritty modern suspense.',
  },
  {
    id: 'dynasty_mythic',
    name: 'Dynasty Palace & Wuxia Intrigue',
    category: 'Historical / Wuxia',
    description: 'Opulent crimson and gold imperial silks, misty courtyards, dynamic martial framing.',
    recommendedTone: 'Historical Epic',
    prompt:
      '9:16 vertical cinematic historical drama. Diffused morning mist, imperial lacquered wood, heavy gold and scarlet silk embroidery. Sweeping vertical crane shots down grand palace stairs, swift martial arts parries, candlelight flickering on jade ornaments. Epic high-stakes feudal rivalries and secret royal bloodlines.',
  },
];

export const DEFAULT_MASTER_PROMPT = MASTER_PROMPT_PRESETS[0].prompt;
