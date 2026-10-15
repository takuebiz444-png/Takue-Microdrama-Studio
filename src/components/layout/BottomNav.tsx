import React from 'react';
import { useDrama } from '../../context/DramaContext';
import {
  Home,
  PlusCircle,
  Film,
  Scissors,
  Users,
  Lock,
} from 'lucide-react';
import { ActiveTabType } from '../../types/drama';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, characters } = useDrama();

  const lockedCharsCount = characters.filter((c) => c.isLocked).length;

  const navItems = [
    { id: 'dashboard' as ActiveTabType, label: 'Home', icon: Home },
    {
      id: 'characters' as ActiveTabType,
      label: 'Characters',
      icon: Users,
      badge: lockedCharsCount > 0 ? `${lockedCharsCount}🔒` : undefined,
    },
    { id: 'create' as ActiveTabType, label: 'Create', icon: PlusCircle },
    { id: 'projects' as ActiveTabType, label: 'Episodes', icon: Film },
    { id: 'editor' as ActiveTabType, label: 'Editor', icon: Scissors },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-blue-100 shadow-xl px-2 py-1 safe-area-bottom">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer relative flex-1 ${
                isActive
                  ? 'text-blue-700 font-extrabold'
                  : 'text-slate-400 hover:text-slate-700 font-medium'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1 w-6 h-1 bg-blue-600 rounded-full" />
              )}
              <div
                className={`p-1 rounded-xl transition-transform relative ${
                  isActive ? 'bg-blue-100/70 scale-105' : 'bg-transparent'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 text-[8px] font-black bg-blue-600 text-white px-1 py-0.2 rounded-full shadow-2xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight leading-tight mt-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
