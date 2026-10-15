import { CreationProcedure } from '../types/drama';

export const TAKUE_CREATION_PROCEDURES: CreationProcedure[] = [
  {
    stepNumber: 1,
    id: 'proc_master_prompt',
    title: 'Procedure 1: Configure Master Prompt',
    subtitle: 'Global Cinematic Universe & Style Direction',
    description:
      'Define the overarching visual directive (lighting, 9:16 vertical framing, camera rules, color grading) that governs every generated episode and clip. Locking the Master Prompt enforces uniform cinematic quality.',
    actionLabel: 'Set Master Prompt',
    targetTab: 'create',
    wizardStep: 1,
    badge: 'Step 1 of 6',
  },
  {
    stepNumber: 2,
    id: 'proc_lock_characters',
    title: 'Procedure 2: Add & Lock Characters',
    subtitle: 'Strict Visual Continuity & Identity Anchor',
    description:
      'Add character archetypes (Lead Protagonist, Rival Antagonist, Key Ally) with specific physical traits and signature wardrobe. Tap "Lock Character" 🔒 to freeze their identity so the AI keeps them visually identical across all 40 episodes.',
    actionLabel: 'Add & Lock Characters',
    targetTab: 'characters',
    wizardStep: 2,
    badge: 'Step 2 of 6',
  },
  {
    stepNumber: 3,
    id: 'proc_story_script',
    title: 'Procedure 3: Input Story & Cliffhangers',
    subtitle: 'Master Plot & 40-Episode Narrative Pacing',
    description:
      'Provide your high-stakes story premise. The AI splits the narrative into 40 distinct 60-second vertical episodes, generating 5 tailored clip prompts per episode with escalating tension and cliffhanger endings.',
    actionLabel: 'Input Story Prompt',
    targetTab: 'create',
    wizardStep: 3,
    badge: 'Step 3 of 6',
  },
  {
    stepNumber: 4,
    id: 'proc_review_episodes',
    title: 'Procedure 4: Review 40 Episodes & Clips',
    subtitle: '200 Sequential Clips (E01_C01 to E40_C05)',
    description:
      'Inspect each of the 40 episodes and 200 clips. Verify that the Master Prompt and locked character traits are properly injected into every prompt before initiating video generation.',
    actionLabel: 'Review Episode Prompts',
    targetTab: 'create',
    wizardStep: 4,
    badge: 'Step 4 of 6',
  },
  {
    stepNumber: 5,
    id: 'proc_generate_queue',
    title: 'Procedure 5: Batch Video Generation',
    subtitle: 'Sequential ModelArk AI Video Pipeline',
    description:
      'Enqueue clips to the sequential production queue. Clips render in strict chronological order with live progress tracking, error retries, and credit consumption monitoring.',
    actionLabel: 'Launch Batch Queue',
    targetTab: 'dashboard',
    badge: 'Step 5 of 6',
  },
  {
    stepNumber: 6,
    id: 'proc_edit_and_merge',
    title: 'Procedure 6: Video Editing & Episode Stitching',
    subtitle: 'Trim, Subtitle, Audio & Merge into Single MP4',
    description:
      'Fine-tune clips in the mobile Video Editor (trim start/end, adjust volume, customize subtitle banners). Then merge the 5 clips into a final 60-second continuous MP4: Takue_Microdrama_Episode_XXX.mp4.',
    actionLabel: 'Open Video Editor',
    targetTab: 'editor',
    badge: 'Step 6 of 6',
  },
];
