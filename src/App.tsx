import React, { useState } from 'react';
import { DramaProvider, useDrama } from './context/DramaContext';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { CharactersView } from './components/characters/CharactersView';
import { CreateDramaView } from './components/create/CreateDramaView';
import { ProjectsView } from './components/projects/ProjectsView';
import { VideoEditorView } from './components/editor/VideoEditorView';
import { SettingsView } from './components/settings/SettingsView';
import { QueueDrawerModal } from './components/queue/QueueDrawerModal';
import { CombineEpisodeModal } from './components/combine/CombineEpisodeModal';
import { MasterPromptModal } from './components/modals/MasterPromptModal';
import { CreationProceduresModal } from './components/modals/CreationProceduresModal';
import { Episode } from './types/drama';
import { Wifi, BatteryMedium, Signal } from 'lucide-react';

function StudioAppContent() {
  const { activeTab, currentProject } = useDrama();

  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isProceduresOpen, setIsProceduresOpen] = useState(false);
  const [isMasterPromptOpen, setIsMasterPromptOpen] = useState(false);
  const [combiningEpisode, setCombiningEpisode] = useState<Episode | null>(null);

  const handleOpenCombine = (episodeNumber: number) => {
    if (!currentProject) return;
    const ep = currentProject.episodes.find((e) => e.episodeNumber === episodeNumber);
    if (ep) {
      setCombiningEpisode(ep);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-center p-0 sm:py-6">
      {/* Mobile-Only Portrait App Shell - authentic smartphone framing */}
      <div className="w-full max-w-md min-h-screen sm:min-h-[844px] sm:max-h-[920px] bg-slate-50 flex flex-col relative shadow-2xl sm:rounded-[36px] overflow-hidden border border-slate-700/50">
        {/* Mobile Status Bar */}
        <div className="bg-white/95 px-5 pt-2 pb-1 flex items-center justify-between text-[11px] font-bold text-slate-700 select-none border-b border-slate-100">
          <span>9:41</span>
          <div className="w-20 h-4 bg-slate-900 rounded-full mx-auto hidden sm:block" />
          <div className="flex items-center gap-1.5 text-slate-600">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <BatteryMedium className="w-4 h-4" />
          </div>
        </div>

        {/* Top Mobile Navbar (Home, Back, Next, Queue, ModelArk, Procedures, Master Prompt) */}
        <Navbar
          onOpenQueue={() => setIsQueueOpen(true)}
          onOpenProcedures={() => setIsProceduresOpen(true)}
          onOpenMasterPrompt={() => setIsMasterPromptOpen(true)}
        />

        {/* Mobile View Container */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenQueue={() => setIsQueueOpen(true)}
              onOpenCombine={handleOpenCombine}
              onOpenProcedures={() => setIsProceduresOpen(true)}
              onOpenMasterPrompt={() => setIsMasterPromptOpen(true)}
            />
          )}
          {activeTab === 'characters' && <CharactersView />}
          {activeTab === 'create' && <CreateDramaView />}
          {activeTab === 'projects' && (
            <ProjectsView onOpenCombine={handleOpenCombine} />
          )}
          {activeTab === 'editor' && <VideoEditorView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>

        {/* Mobile Bottom Navigation (Home, Characters, Create, Episodes, Editor) */}
        <BottomNav />

        {/* Generation Queue Modal */}
        <QueueDrawerModal
          isOpen={isQueueOpen}
          onClose={() => setIsQueueOpen(false)}
        />

        {/* Combine Episode Modal */}
        <CombineEpisodeModal
          isOpen={Boolean(combiningEpisode)}
          episode={combiningEpisode}
          onClose={() => setCombiningEpisode(null)}
        />

        {/* Master Prompt Modal */}
        <MasterPromptModal
          isOpen={isMasterPromptOpen}
          onClose={() => setIsMasterPromptOpen(false)}
        />

        {/* Creation Procedures in Order Modal */}
        <CreationProceduresModal
          isOpen={isProceduresOpen}
          onClose={() => setIsProceduresOpen(false)}
          onOpenMasterPrompt={() => {
            setIsProceduresOpen(false);
            setIsMasterPromptOpen(true);
          }}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DramaProvider>
      <StudioAppContent />
    </DramaProvider>
  );
}
