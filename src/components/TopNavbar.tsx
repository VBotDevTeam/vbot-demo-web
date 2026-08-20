import React from 'react';
import { Icon } from '@iconify/react';

interface TopNavbarProps {
  onDialerToggle: (e: React.MouseEvent) => void;
  onOpenSettings: () => void;
  onStartTour: () => void;
  currentView: 'crm' | 'notebook' | 'settings' | 'live-demo';
  onViewChange: (view: 'crm' | 'notebook' | 'settings' | 'live-demo') => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onDialerToggle,
  onOpenSettings,
  onStartTour,
  currentView,
  onViewChange
}) => {
  return (
    <header className="h-14 bg-dark-header text-slate-100 flex items-center justify-between px-6 shrink-0 shadow-md z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          {/* Logo and Brand */}
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-md">
            <Icon icon="solar:phone-calling-bold" className="text-lg" />
          </div>
          <span className="font-bold text-base text-white tracking-wide">VBot CRM</span>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 pl-5 border-l border-slate-800">
          <button
            onClick={() => onViewChange('crm')}
            className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all duration-150 ${
              currentView === 'crm' 
                ? 'bg-slate-800 text-white border border-slate-700/60 shadow-inner' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Example
          </button>
          <button
            onClick={() => onViewChange('notebook')}
            className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all duration-150 ${
              currentView === 'notebook' 
                ? 'bg-slate-800 text-white border border-slate-700/60 shadow-inner' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hướng dẫn tích hợp
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-5">
        {/* Tour Guide Button */}
        <button 
          onClick={onStartTour}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 py-1.5 px-3 rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all duration-150"
          title="Xem hướng dẫn sử dụng VBot SDK"
        >
          <Icon icon="solar:question-square-bold" className="text-sm text-emerald-400" /> 
          <span>Hướng dẫn</span>
        </button>

        {/* Connection Settings Trigger */}
        <button 
          id="guide-settings-btn"
          onClick={onOpenSettings}
          className="bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white border border-slate-600 py-1.5 px-3 rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all duration-150"
          title="Cấu hình VBot SDK"
        >
          <Icon icon="solar:settings-bold" className="text-sm" /> 
          <span>Cấu hình SDK</span>
        </button>

        <button
          onClick={() => onViewChange('live-demo')}
          className={`py-1.5 px-3 rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all duration-150 border ${
            currentView === 'live-demo'
              ? 'bg-sky-600 border-sky-500 text-white'
              : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200 hover:text-white'
          }`}
          title="Mở Demo live VBot Web SDK"
        >
          <Icon icon="solar:play-circle-bold" className="text-sm" />
          <span>Demo live</span>
        </button>

        {/* Dialer Toggle Button - Green with a radial pulse ring */}
        <div className="relative flex items-center">
          <span className="absolute inset-0 rounded bg-emerald-400 opacity-60 animate-ping pointer-events-none"></span>
          <button 
            id="guide-dialer-btn"
            onClick={onDialerToggle}
            className="relative bg-emerald-500 hover:bg-emerald-600 text-white border-none py-1.5 px-4 rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all duration-150 shadow-[0_0_12px_rgba(16,185,129,0.3)] z-10"
          >
            <Icon icon="solar:phone-calling-bold" className="text-sm" /> Quay số
          </button>
        </div>

        {/* User Profile Area */}
        <div className="flex items-center gap-3 border-l border-slate-700 pl-5 cursor-pointer">
          {/* Initials Avatar */}
          <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm border border-slate-600">
            VD
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-semibold text-white">VBot Demo</span>
            <span className="text-[10px] text-slate-400">Tài khoản dùng thử</span>
          </div>
          <Icon icon="solar:alt-arrow-down-bold" className="text-slate-400 text-xs" />
        </div>
      </div>
    </header>
  );
};
