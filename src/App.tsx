import React, { useState, useEffect, useRef } from 'react';
import { TopNavbar } from './components/TopNavbar';
import { CRMTable } from './components/CRMTable';
import { SettingsPage } from './components/SettingsPage';
import { DialerDropdown } from './components/DialerDropdown';
import { ActiveCallWidget } from './components/ActiveCallWidget';
import { IncomingCallModal } from './components/IncomingCallModal';
import { AddPersonModal } from './components/AddPersonModal';
import { OnboardingTour } from './components/OnboardingTour';
import { NotebookGuide } from './components/NotebookGuide';
import { LiveDemoPage } from './components/LiveDemoPage';
import { CRM_CONTACTS, Contact } from './data/crmData';
import { Icon } from '@iconify/react';

const App: React.FC = () => {
  // Config States
  const [activeToken, setActiveToken] = useState('');
  const [savedToken, setSavedToken] = useState('');
  const [mode, setMode] = useState<'headless' | 'builtin'>('builtin');
  const [contacts, setContacts] = useState<Contact[]>(CRM_CONTACTS);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'crm' | 'notebook' | 'settings' | 'live-demo'>('crm');
  
  // Widget Config State
  const [widgetConfig, setWidgetConfig] = useState<Record<string, unknown>>({
    enableFloatingBubble: true,
    overlayPositions: {
      dialpad: 'top-right',
      calling: 'top-right',
      incoming: 'top-right'
    },
    overlayMargins: {
      dialpad: { top: 62, right: 280, bottom: 0, left: 0 },
      calling: { top: 62, right: 280, bottom: 0, left: 0 },
      incoming: { top: 62, right: 280, bottom: 0, left: 0 }
    }
  });
  
  // VBot Connection States
  const [connectionStatus, setConnectionStatus] = useState<'offline' | 'connecting' | 'online'>('offline');
  const [connectionText, setConnectionText] = useState('Ngoại tuyến');
  
  // Call States
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'talking' | 'failed'>('idle');
  const [callSession, setCallSession] = useState<any>(null);
  const [phoneToCall, setPhoneToCall] = useState('');
  const [callSeconds, setCallSeconds] = useState(0);
  const [mute, setMute] = useState(false);
  const [hold, setHold] = useState(false);

  // UI Control States
  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [isIncomingOpen, setIsIncomingOpen] = useState(false);
  const [dialerPlacement, setDialerPlacement] = useState<'top' | 'bottom'>('top');

  // Tour state
  const [isTourActive, setIsTourActive] = useState(false);

  // Config Reminder States
  const [showConfigReminder, setShowConfigReminder] = useState(false);
  const [reminderCoords, setReminderCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (showConfigReminder && !activeToken) {
      const updateReminderPos = () => {
        const el = document.getElementById('guide-settings-btn');
        if (el) {
          const rect = el.getBoundingClientRect();
          setReminderCoords({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          });
        }
      };
      updateReminderPos();
      window.addEventListener('resize', updateReminderPos);
      window.addEventListener('scroll', updateReminderPos, true);
      return () => {
        window.removeEventListener('resize', updateReminderPos);
        window.removeEventListener('scroll', updateReminderPos, true);
      };
    } else {
      setReminderCoords(null);
    }
  }, [showConfigReminder, activeToken]);

  useEffect(() => {
    const tourSkipped = localStorage.getItem('vbot_tour_skipped') === 'true';
    if (!tourSkipped) {
      const timer = setTimeout(() => {
        setIsTourActive(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseTour = () => {
    setIsTourActive(false);
    localStorage.setItem('vbot_tour_skipped', 'true');
  };

  // Refs
  const widgetRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Load saved credentials on Mount
  useEffect(() => {
    const localToken = localStorage.getItem('vbot_access_token');
    const savedMode = (localStorage.getItem('vbot_integration_mode') as 'headless' | 'builtin') || 'builtin';
    const autoConnect = localStorage.getItem('vbot_auto_connect') !== 'false';
    
    const defaultToken = import.meta.env.VITE_VBOT_ACCESS_TOKEN || '';
    const tokenToUse = localToken || defaultToken;
    
    setSavedToken(tokenToUse);
    setMode(savedMode);
    
    if (tokenToUse && (localToken ? autoConnect : !!defaultToken)) {
      setActiveToken(tokenToUse);
      setConnectionStatus('connecting');
      setConnectionText('Đang tự kết nối...');
      console.log(`[VBot-CRM] Tự động kết nối (${savedMode})`);
    } else {
      setConnectionStatus('offline');
      setConnectionText('Ngoại tuyến');
      console.log('[VBot-CRM] Chưa có token hoặc đã ngắt kết nối');
    }
  }, []);

  // SDK Events Binding
  useEffect(() => {
    const el = widgetRef.current;
    if (!el) return;

    const activeInstance = el;

    const handleUserConnected = () => {
      if (widgetRef.current !== activeInstance) return;
      console.log('[VBot-CRM] SDK: onUserConnected');
      setConnectionStatus('online');
      setConnectionText('Trực tuyến');
    };

    const handleDisconnected = () => {
      if (widgetRef.current !== activeInstance) return;
      console.log('[VBot-CRM] SDK: onDisconnected');
      setConnectionStatus('offline');
      setConnectionText('Mất kết nối');
    };

    const handleUserDisconnected = () => {
      if (widgetRef.current !== activeInstance) return;
      console.log('[VBot-CRM] SDK: onUserDisconnected');
      setConnectionStatus('offline');
      setConnectionText('Ngoại tuyến');
    };

    const handleUserConnectionFailed = (e: any) => {
      if (widgetRef.current !== activeInstance) return;
      const errorMsg = e.detail?.error || 'Kết nối thất bại';
      console.error('[VBot-CRM] SDK: onUserConnectionFailed:', errorMsg);
      setConnectionStatus('offline');
      setConnectionText(`Lỗi: ${errorMsg}`);
      alert(`Lỗi kết nối SDK: ${errorMsg}`);
      handleDisconnect();
    };

    const handleCallIncoming = (e: any) => {
      if (widgetRef.current !== activeInstance) return;
      const callData = e.detail?.callData;
      if (callData) {
        console.log(`[VBot-CRM] SDK: Cuộc gọi đến từ ${callData.phoneNumber}`);
        setCallSession(callData);
        setPhoneToCall(callData.phoneNumber);
        setCallStatus('ringing');
        setMute(false);
        setHold(false);
        
        if (mode === 'headless') {
          setIsIncomingOpen(true);
        }
      }
    };

    const handleCallProgress = (e: any) => {
      if (widgetRef.current !== activeInstance) return;
      const callData = e.detail?.callData;
      if (callData) {
        console.log(`[VBot-CRM] SDK: Đang đổ chuông tới ${callData.phoneNumber}`);
        setCallSession(callData);
        setPhoneToCall(callData.phoneNumber);
        setCallStatus('ringing');
      }
    };

    const handleCallAccepted = (e: any) => {
      if (widgetRef.current !== activeInstance) return;
      const callData = e.detail?.callData;
      if (callData) {
        console.log(`[VBot-CRM] SDK: Cuộc gọi kết nối với ${callData.phoneNumber}`);
        setCallSession(callData);
        setPhoneToCall(callData.phoneNumber);
        setCallStatus('talking');
        startCallTimer();
      }
    };

    const handleCallEnded = () => {
      if (widgetRef.current !== activeInstance) return;
      console.log('[VBot-CRM] SDK: Cuộc gọi kết thúc');
      setCallStatus('idle');
      setCallSession(null);
      stopCallTimer();
      setIsIncomingOpen(false);
    };

    const handleCallFailed = (e: any) => {
      if (widgetRef.current !== activeInstance) return;
      const errorMsg = e.detail?.error || 'Thất bại';
      console.error(`[VBot-CRM] SDK: Cuộc gọi lỗi: ${errorMsg}`);
      setCallStatus('failed');
      setTimeout(() => {
        setCallStatus('idle');
        setCallSession(null);
      }, 2000);
      stopCallTimer();
    };

    el.addEventListener('vbot:onUserConnected', handleUserConnected);
    el.addEventListener('vbot:onDisconnected', handleDisconnected);
    el.addEventListener('vbot:onUserDisconnected', handleUserDisconnected);
    el.addEventListener('vbot:onUserConnectionFailed', handleUserConnectionFailed);
    el.addEventListener('vbot:onCallIncoming', handleCallIncoming);
    el.addEventListener('vbot:onCallProgress', handleCallProgress);
    el.addEventListener('vbot:onCallAccepted', handleCallAccepted);
    el.addEventListener('vbot:onCallEnded', handleCallEnded);
    el.addEventListener('vbot:onCallFailed', handleCallFailed);

    return () => {
      el.removeEventListener('vbot:onUserConnected', handleUserConnected);
      el.removeEventListener('vbot:onDisconnected', handleDisconnected);
      el.removeEventListener('vbot:onUserDisconnected', handleUserDisconnected);
      el.removeEventListener('vbot:onUserConnectionFailed', handleUserConnectionFailed);
      el.removeEventListener('vbot:onCallIncoming', handleCallIncoming);
      el.removeEventListener('vbot:onCallProgress', handleCallProgress);
      el.removeEventListener('vbot:onCallAccepted', handleCallAccepted);
      el.removeEventListener('vbot:onCallEnded', handleCallEnded);
      el.removeEventListener('vbot:onCallFailed', handleCallFailed);
    };
  }, [activeToken, mode]);



  // Timer controls
  const startCallTimer = () => {
    stopCallTimer();
    setCallSeconds(0);
    timerRef.current = setInterval(() => {
      setCallSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Call Handlers
  const handleConnect = (newToken: string, newMode: 'headless' | 'builtin') => {
    setSavedToken(newToken);
    setActiveToken(newToken);
    setMode(newMode);
    localStorage.setItem('vbot_access_token', newToken);
    localStorage.setItem('vbot_integration_mode', newMode);
    localStorage.setItem('vbot_auto_connect', 'true');
    setConnectionStatus('connecting');
    setConnectionText('Đang kết nối...');
    console.log(`[VBot-CRM] Kết nối VBot SDK (${newMode})`);
  };

  const handleDisconnect = () => {
    console.log('[VBot-CRM] Ngắt kết nối VBot SDK hiện tại');
    setActiveToken('');
    localStorage.setItem('vbot_auto_connect', 'false');
    setConnectionStatus('offline');
    setConnectionText('Ngoại tuyến');
    setCallStatus('idle');
    setCallSession(null);
    stopCallTimer();
    setIsIncomingOpen(false);
  };

  const initiateCall = (phone: string) => {
    console.log(`[VBot-CRM] Gọi tới: ${phone}`);
    if (!activeToken) {
      alert('Vui lòng cấu hình kết nối VBot SDK trước!');
      setCurrentView('settings');
      return;
    }

    if (mode === 'headless') {
      console.log('[VBot-CRM] Gọi ở chế độ Headless (Custom UI)');
      setPhoneToCall(phone);
      setCallStatus('ringing');
    } else {
      console.log('[VBot-CRM] Gọi ở chế độ Built-in (Native UI)');
      // Ensure Click-to-call renders built-in UI at clean top-right location
      setWidgetConfig(prev => ({
        ...prev,
        overlayPositions: {
          dialpad: 'top-right',
          calling: 'top-right',
          incoming: 'top-right'
        },
        overlayMargins: {
          dialpad: { top: 62, right: 280, bottom: 0, left: 0 },
          calling: { top: 62, right: 280, bottom: 0, left: 0 },
          incoming: { top: 62, right: 280, bottom: 0, left: 0 }
        }
      }));
    }

    try {
      if (widgetRef.current) {
        widgetRef.current.makeCall(phone);
      }
    } catch (err) {
      console.error('[VBot-CRM] Lỗi cuộc gọi SDK:', err);
    }
  };

  const handleHangup = () => {
    try {
      if (widgetRef.current) {
        widgetRef.current.hangupCall();
      }
    } catch (err) {
      console.error('[VBot-CRM] Lỗi gác máy:', err);
    }
    setCallStatus('idle');
    setCallSession(null);
    stopCallTimer();
  };

  const handleMuteToggle = () => {
    if (!callSession?.session) return;
    const newMute = !mute;
    setMute(newMute);
    if (newMute) {
      callSession.session.mute({ audio: true });
    } else {
      callSession.session.unmute({ audio: true });
    }
  };

  const handleHoldToggle = () => {
    if (!callSession?.session) return;
    const newHold = !hold;
    setHold(newHold);
    if (newHold) {
      callSession.session.hold();
    } else {
      callSession.session.unhold();
    }
  };

  const handleSendDTMF = (key: string) => {
    if (widgetRef.current) {
      widgetRef.current.sendDTMF(key);
    }
  };

  const handleIncomingAccept = () => {
    setIsIncomingOpen(false);
    if (widgetRef.current) {
      widgetRef.current.answerCall();
    }
  };

  const handleIncomingReject = () => {
    setIsIncomingOpen(false);
    if (widgetRef.current) {
      widgetRef.current.hangupCall();
    }
  };

  const handleDialerToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeToken) {
      setShowConfigReminder(true);
    }
    
    if (mode === 'headless') {
      setDialerPlacement('top');
      setIsDialerOpen(!isDialerOpen);
    } else {
      if (widgetRef.current && typeof widgetRef.current.showCallUI === 'function') {
        // Set position to top-right (right below the header button)
        setWidgetConfig(prev => ({
          ...prev,
          overlayPositions: {
            dialpad: 'top-right',
            calling: 'top-right',
            incoming: 'top-right'
          },
          overlayMargins: {
            dialpad: { top: 62, right: 280, bottom: 0, left: 0 },
            calling: { top: 62, right: 280, bottom: 0, left: 0 },
            incoming: { top: 62, right: 280, bottom: 0, left: 0 }
          }
        }));
        setTimeout(() => {
          widgetRef.current.showCallUI();
        }, 50);
      } else {
        alert('SDK chưa kết nối hoặc không hỗ trợ UI mặc định!');
      }
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* Top Header Bar */}
      <TopNavbar 
        onDialerToggle={handleDialerToggle} 
        onOpenSettings={() => setCurrentView('settings')}
        onStartTour={() => setIsTourActive(true)}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      {/* Dialer Dropdown */}
      <DialerDropdown 
        isOpen={isDialerOpen} 
        onClose={() => setIsDialerOpen(false)} 
        onCall={initiateCall} 
        placement={dialerPlacement}
      />

      {/* Main CRM Table / Notebook / Settings content */}
      <div className="flex-grow overflow-y-auto">
        {currentView === 'crm' ? (
          <CRMTable 
            contacts={contacts}
            onCallContact={initiateCall} 
            onAddPerson={() => setIsAddPersonOpen(true)}
          />
        ) : currentView === 'notebook' ? (
          <NotebookGuide />
        ) : currentView === 'live-demo' ? (
          <LiveDemoPage />
        ) : (
          <SettingsPage 
            token={savedToken}
            integrationMode={mode}
            connectionStatus={connectionStatus}
            connectionText={connectionText}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        )}
      </div>

      {/* Custom Floating Active Call Control Panel (Headless Only) */}
      <ActiveCallWidget 
        isActive={mode === 'headless' && callStatus !== 'idle'}
        phoneNumber={phoneToCall}
        status={
          callStatus === 'ringing' ? 'Đang đổ chuông...' :
          callStatus === 'talking' ? 'Đang đàm thoại' :
          callStatus === 'failed' ? 'Thất bại' : 'Đang kết nối...'
        }
        duration={callSeconds}
        mute={mute}
        hold={hold}
        onMuteToggle={handleMuteToggle}
        onHoldToggle={handleHoldToggle}
        onHangup={handleHangup}
        onSendDTMF={handleSendDTMF}
      />

      {/* Custom Incoming Call Modal (Headless Only) */}
      <IncomingCallModal 
        isOpen={mode === 'headless' && isIncomingOpen}
        phoneNumber={phoneToCall}
        onAccept={handleIncomingAccept}
        onReject={handleIncomingReject}
      />



      {/* VBot Web SDK Custon Element - Dynamic connection key */}
      <vbot-widget 
        key={`${activeToken || 'empty'}-${mode}`}
        ref={widgetRef}
        token={activeToken || ''}
        headless={mode === 'headless' ? 'true' : undefined}
        config={JSON.stringify(widgetConfig)}
        base-url={import.meta.env.VITE_API_BASE_URL}
      />

      {/* Add Person Modal */}
      <AddPersonModal 
        isOpen={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        onAdd={(newContact) => setContacts(prev => [newContact, ...prev])}
      />

      {/* Guided Tour Overlay */}
      <OnboardingTour 
        isActive={isTourActive} 
        onClose={handleCloseTour} 
      />

      {/* Bottom-Right Floating Action Button (FAB) for Dialer */}
      {callStatus === 'idle' && (
        <div className="fixed bottom-6 right-6 z-[150]">
          {/* Ping animation behind */}
          {(!isDialerOpen || mode === 'builtin') && (
            <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-60 animate-ping pointer-events-none"></span>
          )}
          <button
            id="guide-fab-dialer"
            onClick={(e) => {
              e.stopPropagation();
              if (!activeToken) {
                setShowConfigReminder(true);
              }
              
              if (mode === 'headless') {
                setDialerPlacement('bottom');
                setIsDialerOpen(!isDialerOpen);
              } else {
                if (widgetRef.current && typeof widgetRef.current.showCallUI === 'function') {
                  // Set position to bottom-right (right above/next to the FAB)
                  setWidgetConfig(prev => ({
                    ...prev,
                    overlayPositions: {
                      dialpad: 'bottom-right',
                      calling: 'bottom-right',
                      incoming: 'bottom-right'
                    },
                    overlayMargins: {
                      dialpad: { top: 0, right: 24, bottom: 88, left: 0 },
                      calling: { top: 0, right: 24, bottom: 88, left: 0 },
                      incoming: { top: 0, right: 24, bottom: 88, left: 0 }
                    }
                  }));
                  setTimeout(() => {
                    widgetRef.current.showCallUI();
                  }, 50);
                } else {
                  alert('SDK chưa kết nối hoặc không hỗ trợ UI mặc định!');
                }
              }
            }}
            className="relative bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer z-10"
            title="Mở bàn phím số"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <circle cx="6" cy="6" r="2" />
              <circle cx="12" cy="6" r="2" />
              <circle cx="18" cy="6" r="2" />
              <circle cx="6" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="18" cy="12" r="2" />
              <circle cx="6" cy="18" r="2" />
              <circle cx="12" cy="18" r="2" />
              <circle cx="18" cy="18" r="2" />
            </svg>
          </button>
        </div>
      )}

      {/* Configuration Reminder Tooltip */}
      {showConfigReminder && !activeToken && reminderCoords && (
        <div className="fixed inset-0 z-[1900] pointer-events-none animate-in fade-in duration-200">
          {/* Transparent click backdrop to dismiss */}
          <div 
            className="absolute inset-0 pointer-events-auto cursor-default" 
            onClick={() => setShowConfigReminder(false)} 
          />
          
          {/* Tooltip Card */}
          <div 
            className="absolute bg-white rounded-xl border border-amber-400 shadow-2xl p-4 w-[280px] pointer-events-auto z-[1901]"
            style={{
              top: reminderCoords.top + reminderCoords.height + 12,
              left: Math.max(16, reminderCoords.left + reminderCoords.width / 2 - 140),
            }}
          >
            {/* Arrow */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white border-t border-l border-amber-400" />
            
            <div className="relative">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon 
                  icon="solar:info-square-bold-duotone" 
                  className="text-amber-500 text-lg shrink-0 mt-0.5" 
                />
                <h4 className="font-bold text-slate-800 text-xs">
                  Chưa cấu hình VBot SDK
                </h4>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed mb-3">
                Bạn chưa nhập Access Token. Vui lòng bấm Cài đặt để kết nối và thực hiện cuộc gọi.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowConfigReminder(false)}
                  className="px-2 py-1 text-slate-500 hover:text-slate-700 font-semibold text-[10px] rounded cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    setShowConfigReminder(false);
                    setCurrentView('settings');
                  }}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded cursor-pointer transition shadow-xs"
                >
                  Cấu hình ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
