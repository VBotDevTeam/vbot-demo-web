import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { IntegrationMode, SDK_TOKEN_PLACEHOLDER, getLiveDemoTemplate } from '../data/liveDemoTemplate';

interface Props {
  mode: IntegrationMode; token: string; onRunState: (state: 'running' | 'loaded' | 'event-error' | 'connected', message?: string) => void;
}

const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const LiveCodePlayground: React.FC<Props> = ({ mode, token, onRunState }) => {
  const [code, setCode] = useState(() => getLiveDemoTemplate(mode));
  const [srcDoc, setSrcDoc] = useState('');
  const [notice, setNotice] = useState('Chưa chạy preview');
  const [runId, setRunId] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || data.type !== 'vbot-live-demo' || data.runId !== runId || typeof data.event !== 'string') return;
      if (data.event === 'widget-ready') { setNotice('Widget đã nạp, đang chờ SDK kết nối…'); onRunState('loaded'); }
      if (data.event === 'connected') { setNotice('SDK trực tuyến'); onRunState('connected', 'SDK trực tuyến, có thể gọi.'); }
      if (data.event === 'connection-failed' || data.event === 'disconnected' || data.event === 'runtime-error' || data.event === 'bootstrap-error') { setNotice('Preview/SDK gặp lỗi'); onRunState('event-error', 'SDK không thể khởi tạo hoặc đã ngắt kết nối.'); }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [runId, onRunState]);

  const run = () => {
    if (!token) { setNotice('Hãy hoàn thành bước Cấp SDK token trước.'); return; }
    if (!code.includes(SDK_TOKEN_PLACEHOLDER)) { setNotice('Code chưa tham chiếu SDK token; hãy thêm placeholder.'); return; }
    const id = runId + 1;
    const instrument = `<script>(function(){var runId=${id};function post(event){window.parent.postMessage({type:'vbot-live-demo',runId:runId,event:event},'*')}window.addEventListener('error',function(){post('runtime-error')});window.addEventListener('unhandledrejection',function(){post('runtime-error')});function bind(){var w=document.querySelector('vbot-widget');if(!w)return false;w.addEventListener('vbot:onUserConnected',function(){post('connected')});w.addEventListener('vbot:onUserConnectionFailed',function(){post('connection-failed')});w.addEventListener('vbot:onDisconnected',function(){post('disconnected')});post('widget-ready');return true}Promise.race([customElements.whenDefined('vbot-widget'),new Promise(function(resolve){setTimeout(resolve,6000)})]).then(function(){if(!bind())post('bootstrap-error')});})();</script>`;
    const rendered = code.replaceAll(SDK_TOKEN_PLACEHOLDER, escapeAttribute(token)).replaceAll('{{VBOT_API_BASE_URL}}', escapeAttribute(import.meta.env.VITE_API_BASE_URL || 'https://open-api-staging.vbot.vn/v3.0')).replaceAll('{{VBOT_HEADLESS_ATTRIBUTE}}', mode === 'headless' ? 'headless="true"' : '');
    setRunId(id); setSrcDoc(`${rendered}${instrument}`); setNotice('Đang nạp preview…'); onRunState('running');
  };
  const copy = async () => { try { await navigator.clipboard.writeText(code); setNotice('Đã sao chép code mẫu (không có token).'); } catch { setNotice('Không thể sao chép trên trình duyệt này.'); } };

  return <section className="grid lg:grid-cols-2 gap-5">
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[480px]">
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2 items-center justify-between"><div><h2 className="font-bold text-slate-800 flex gap-2 items-center"><Icon icon="solar:code-bold" className="text-sky-600" /> Code playground</h2><p className="text-xs text-slate-500 mt-1">Token chỉ được chèn khi chạy; editor luôn giữ placeholder.</p></div><span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">{mode === 'headless' ? 'Headless' : 'Built-in'}</span></div>
      <textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false} className="flex-1 min-h-[320px] resize-y p-4 font-mono text-xs leading-5 bg-slate-950 text-slate-200 outline-none" aria-label="HTML code editor" />
      <div className="p-3 border-t border-slate-100 flex flex-wrap gap-2 justify-between items-center"><span className="text-xs text-slate-500">{notice}</span><div className="flex gap-2"><button onClick={() => { setCode(getLiveDemoTemplate(mode)); setNotice('Đã đặt lại mẫu.'); }} className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Đặt lại mẫu</button><button onClick={copy} className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Sao chép code</button><button onClick={run} disabled={!token} className="px-3 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white"><Icon icon="solar:play-bold" className="inline mr-1" />Chạy code</button></div></div>
    </div>
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[480px] flex flex-col"><div className="p-4 border-b border-slate-100"><h2 className="font-bold text-slate-800 flex gap-2 items-center"><Icon icon="solar:monitor-bold" className="text-emerald-600" /> Preview UI</h2><p className="text-xs text-slate-500 mt-1">SDK cần same-origin và quyền microphone để dùng localStorage/WebRTC. Chỉ chạy code bạn tin cậy.</p></div>{srcDoc ? <iframe ref={frameRef} title="VBot SDK live preview" sandbox="allow-scripts allow-same-origin" allow="microphone" srcDoc={srcDoc} className="w-full flex-1 border-0 bg-slate-50" /> : <div className="flex-1 p-8 flex flex-col justify-center items-center text-center text-slate-400"><Icon icon="solar:code-square-bold" className="text-4xl mb-3 text-slate-300" /><p className="font-semibold">Preview sẽ xuất hiện ở đây</p><p className="text-xs mt-1">Hoàn tất cấp token, sau đó bấm “Chạy code”.</p></div>}</div>
  </section>;
};
