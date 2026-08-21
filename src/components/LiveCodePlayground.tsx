import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { IntegrationMode, SDK_TOKEN_PLACEHOLDER, SDK_WIDGET_INSERTION_MARKER, getLiveDemoTemplate, getSdkWidgetSnippet } from '../data/liveDemoTemplate';

interface Props {
  mode: IntegrationMode; token: string; onRunState: (state: 'running' | 'loaded' | 'event-error' | 'connected', message?: string) => void;
}

const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const LiveCodePlayground: React.FC<Props> = ({ mode, token, onRunState }) => {
  const sdkBundleUrl = 'https://cdn.vbot.vn/vbot-sdk/vbot-sdk.umd.js';
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://open-api-staging.vbot.vn/v3.0';
  const [code, setCode] = useState(() => getLiveDemoTemplate(mode, sdkBundleUrl));
  const [srcDoc, setSrcDoc] = useState('');
  const [notice, setNotice] = useState('Chưa chạy preview');
  const frameRef = useRef<HTMLIFrameElement>(null);
  const activeRunIdRef = useRef(0);
  const sdkSnippet = getSdkWidgetSnippet(mode, token || SDK_TOKEN_PLACEHOLDER, apiBaseUrl);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || data.type !== 'vbot-live-demo' || data.runId !== activeRunIdRef.current || typeof data.event !== 'string') return;
      if (data.event === 'widget-ready') { setNotice('Widget đã nạp, đang chờ SDK kết nối…'); onRunState('loaded'); }
      if (data.event === 'connected') { setNotice('SDK trực tuyến'); onRunState('connected', 'SDK trực tuyến, có thể gọi.'); }
      if (data.event === 'connection-failed' || data.event === 'disconnected' || data.event === 'runtime-error' || data.event === 'bootstrap-error') { setNotice('Preview/SDK gặp lỗi'); onRunState('event-error', 'SDK không thể khởi tạo hoặc đã ngắt kết nối.'); }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onRunState]);

  const run = () => {
    if (!token) { setNotice('Hãy hoàn thành bước Cấp SDK token trước.'); return; }
    if (!code.includes(SDK_WIDGET_INSERTION_MARKER) && !code.includes('<vbot-widget')) { setNotice('Hãy dán đoạn mã ghép SDK vào vị trí chú thích trong HTML mô phỏng.'); return; }
    const id = activeRunIdRef.current + 1;
    activeRunIdRef.current = id;
    const instrument = `<script>(function(){var runId=${id};function post(event){window.parent.postMessage({type:'vbot-live-demo',runId:runId,event:event},'*')}window.addEventListener('error',function(){post('runtime-error')});window.addEventListener('unhandledrejection',function(){post('runtime-error')});var widget=document.querySelector('vbot-widget');if(!widget){post('bootstrap-error');return}widget.addEventListener('vbot:onUserConnected',function(){post('connected')});widget.addEventListener('vbot:onUserConnectionFailed',function(){post('connection-failed')});widget.addEventListener('vbot:onDisconnected',function(){post('disconnected')});Promise.race([customElements.whenDefined('vbot-widget'),new Promise(function(resolve){setTimeout(resolve,6000)})]).then(function(){if(customElements.get('vbot-widget'))post('widget-ready');else post('bootstrap-error')});})();</script>`;
    const rendered = code
      // Accept templates created before the CDN experiment as well.
      .replaceAll('src="/vbot-sdk.umd.js"', `src="${sdkBundleUrl}"`)
      .replaceAll("src='/vbot-sdk.umd.js'", `src="${sdkBundleUrl}"`)
      .replaceAll(SDK_WIDGET_INSERTION_MARKER, getSdkWidgetSnippet(mode, escapeAttribute(token), escapeAttribute(apiBaseUrl)))
      .replaceAll(SDK_TOKEN_PLACEHOLDER, escapeAttribute(token))
      .replaceAll('{{VBOT_API_BASE_URL}}', escapeAttribute(apiBaseUrl))
      .replaceAll('{{VBOT_HEADLESS_ATTRIBUTE}}', mode === 'headless' ? 'headless="true"' : '');
    setSrcDoc(`${rendered}${instrument}`); setNotice('Đang nạp preview…'); onRunState('running');
  };
  const copySdkSnippet = async () => {
    if (!token) { setNotice('Hãy hoàn thành bước Cấp SDK token trước để sao chép mã ghép SDK.'); return; }
    try { await navigator.clipboard.writeText(sdkSnippet); setNotice('Đã sao chép mã ghép SDK kèm token.'); } catch { setNotice('Không thể sao chép trên trình duyệt này.'); }
  };

  return <section className="grid xl:grid-cols-[minmax(430px,.72fr)_minmax(0,1.28fr)] gap-5 items-stretch">
    <section className="order-2 bg-white border border-slate-200 rounded shadow-xs overflow-hidden min-h-[680px] flex flex-col">
      <div className="p-4 border-b border-slate-200"><h2 className="font-bold text-slate-800 flex gap-2 items-center"><Icon icon="solar:monitor-bold" className="text-emerald-600" /> Xem trước giao diện</h2><p className="text-xs text-slate-500 mt-1">Bấm chạy code ở Code demo để xem giao diện tích hợp.</p></div>{srcDoc ? <iframe ref={frameRef} title="VBot SDK live preview" sandbox="allow-scripts allow-same-origin" allow="microphone" srcDoc={srcDoc} className="w-full flex-1 min-h-[740px] border-0 bg-slate-50" /> : <div className="flex-1 p-8 flex flex-col justify-center items-center text-center text-slate-400"><Icon icon="solar:code-square-bold" className="text-4xl mb-3 text-slate-300" /><p className="font-semibold">Preview sẽ xuất hiện ở đây</p><p className="text-xs mt-1">Hoàn tất cấp token, sau đó bấm “Chạy code”.</p></div>}</section>
    <section className="order-1 bg-white border border-slate-200 rounded shadow-xs overflow-hidden flex flex-col min-h-[900px]">
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2 items-center justify-between"><div><h2 className="font-bold text-slate-800 flex gap-2 items-center"><Icon icon="solar:code-bold" className="text-sky-600" /> Code demo</h2><p className="text-xs text-slate-500 mt-1">Sao chép mã SDK sau khi Step 3 cấp token, rồi dán vào vị trí chú thích trong HTML mô phỏng.</p></div><span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">{mode === 'headless' ? 'Headless' : 'Built-in'}</span></div>
      <div className="p-4 border-b border-slate-100 bg-sky-50/40"><div className="flex flex-wrap gap-2 items-start justify-between mb-2"><div><h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">1. Mã ghép SDK</h3><p className="text-[11px] text-slate-500 mt-1">Token hiển thị trực tiếp sau khi Step 3 thành công.</p></div><button onClick={copySdkSnippet} disabled={!token} className="px-3 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white"><Icon icon="solar:copy-bold" className="inline mr-1" />Sao chép mã SDK</button></div><textarea readOnly value={sdkSnippet} spellCheck={false} className="w-full h-52 resize-y p-3 rounded-lg border border-sky-100 font-mono text-xs leading-5 bg-slate-950 text-slate-100 outline-none" aria-label="SDK integration code" /></div>
      <div className="flex-1 min-h-0 flex flex-col"><div className="px-4 pt-4 pb-2"><h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">2. HTML web mô phỏng của khách hàng</h3><p className="text-[11px] text-slate-500 mt-1">Dán mã ở phần 1 vào dòng chú thích <code>&lt;!-- DÁN ĐOẠN MÃ… --&gt;</code>.</p></div><textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false} className="flex-1 min-h-[380px] resize-y mx-4 mb-4 p-4 rounded-lg border border-slate-800 font-mono text-xs leading-5 bg-slate-950 text-slate-200 outline-none" aria-label="Customer HTML code editor" /></div>
      <div className="p-3 border-t border-slate-100 flex flex-wrap gap-2 justify-between items-center"><span className="text-xs text-slate-500">{notice}</span><div className="flex gap-2"><button onClick={() => { setCode(getLiveDemoTemplate(mode, sdkBundleUrl)); setNotice('Đã đặt lại HTML mô phỏng.'); }} className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Đặt lại mẫu</button><button onClick={run} disabled={!token} className="px-3 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white"><Icon icon="solar:play-bold" className="inline mr-1" />Chạy code</button></div></div>
    </section>
  </section>;
};
