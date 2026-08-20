import React, { useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { ApiFlowDiagram, FlowSteps } from './ApiFlowDiagram';
import { LiveCodePlayground } from './LiveCodePlayground';
import { IntegrationMode, productionSnippet } from '../data/liveDemoTemplate';

interface Hotline { hotline_name: string; hotline_number: string; hotline_code: string; hotline_type?: string }
interface ApiSummary { label: string; endpoint: string; status?: number; message: string; ok: boolean }

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://open-api-staging.vbot.vn/v3.0';
const initialFlow: FlowSteps = {
  1: { status: 'pending', message: 'Nhập thông tin để bắt đầu.' },
  2: { status: 'pending' }, 3: { status: 'pending' }, 4: { status: 'blocked', message: 'Chờ Member No và bước số dư.' },
  5: { status: 'blocked', message: 'Cần API Key và Member No.' }, 6: { status: 'blocked', message: 'Cần cấp SDK token.' }, 7: { status: 'blocked', message: 'Chưa chạy preview.' },
};
const safeMessage = (value: unknown, fallback: string) => typeof value === 'string' && value.trim() ? value.slice(0, 160) : fallback;
const formatMoney = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export const LiveDemoPage: React.FC = () => {
  const [mode, setMode] = useState<IntegrationMode>('builtin');
  const [partnerApiKey, setPartnerApiKey] = useState('');
  const [memberNo, setMemberNo] = useState('');
  const [hotlines, setHotlines] = useState<Hotline[]>([]);
  const [selectedHotlines, setSelectedHotlines] = useState<string[]>([]);
  const [adminBalance, setAdminBalance] = useState<number | null>(null);
  const [member, setMember] = useState<Record<string, unknown> | null>(null);
  const [sdkToken, setSdkToken] = useState('');
  const [flowSteps, setFlowSteps] = useState<FlowSteps>(initialFlow);
  const [summaries, setSummaries] = useState<ApiSummary[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingToken, setLoadingToken] = useState(false);
  const [copyNotice, setCopyNotice] = useState('');
  const keyRef = useRef<HTMLInputElement>(null);
  const memberRef = useRef<HTMLInputElement>(null);

  const tokenStatus = useMemo(() => loadingToken ? 'Đang cấp token' : sdkToken ? 'Đã sẵn sàng chạy code' : flowSteps[5].status === 'error' ? 'Cấp token thất bại' : 'Chưa có token', [loadingToken, sdkToken, flowSteps]);
  const setStep = (number: number, state: FlowSteps[number]) => setFlowSteps(previous => ({ ...previous, [number]: state }));
  const addSummary = (summary: ApiSummary) => setSummaries(previous => [summary, ...previous].slice(0, 5));
  const invalidateToken = (reason = 'Thông tin đã thay đổi; cần đồng bộ lại.') => {
    if (!sdkToken) return;
    setSdkToken('');
    setStep(5, { status: 'pending', message: reason });
    setStep(6, { status: 'blocked', message: 'Cần cấp SDK token mới.' });
    setStep(7, { status: 'blocked', message: 'Cần chạy preview mới.' });
  };

  const parseResponse = async (response: Response) => {
    const text = await response.text();
    let body: Record<string, unknown>;
    try { body = text ? JSON.parse(text) as Record<string, unknown> : {}; } catch { throw new Error('Máy chủ trả về dữ liệu không phải JSON.'); }
    if (!response.ok) throw new Error(safeMessage(body.message, `HTTP ${response.status}`));
    if (body.error !== 0) throw new Error(safeMessage(body.message, 'API trả về lỗi.'));
    return body;
  };
  const api = async (endpoint: string, init: RequestInit) => fetch(`${baseUrl}${endpoint}`, { ...init, headers: { Accept: 'application/json', ...init.headers, 'X-API-Key': partnerApiKey.trim() } });

  const loadMember = async () => {
    if (!memberNo.trim()) { setStep(4, { status: 'blocked', message: 'Nhập Member No để kiểm tra thành viên.' }); return; }
    setStep(4, { status: 'active', message: 'Đang kiểm tra Member No…' });
    try {
      const response = await api(`/api/member/getByMemberNo?member_no=${encodeURIComponent(memberNo.trim())}`, { method: 'GET' });
      const result = await parseResponse(response);
      const details = result.data as Record<string, unknown> | undefined;
      if (!details) throw new Error('Không tìm thấy thông tin thành viên.');
      setMember(details); setStep(4, { status: 'success', message: 'Đã xác thực thông tin thành viên.' });
      addSummary({ label: 'Thành viên', endpoint: '/api/member/getByMemberNo', status: response.status, ok: true, message: 'Đã tải thông tin thành viên.' });
    } catch (error) {
      const message = safeMessage(error instanceof Error ? error.message : '', 'Không tải được thông tin thành viên.');
      setMember(null); setStep(4, { status: 'error', message }); addSummary({ label: 'Thành viên', endpoint: '/api/member/getByMemberNo', ok: false, message });
    }
  };

  const loadData = async () => {
    if (!partnerApiKey.trim()) { setStep(1, { status: 'blocked', message: 'Cần nhập Partner API Key.' }); setStep(2, { status: 'blocked', message: 'Cần Partner API Key.' }); setStep(3, { status: 'blocked', message: 'Cần Partner API Key.' }); keyRef.current?.focus(); return; }
    setLoadingData(true); setMember(null); setHotlines([]); setAdminBalance(null);
    setStep(1, { status: 'success', message: 'Thông tin đã sẵn sàng, đang tải dữ liệu.' }); setStep(2, { status: 'active', message: 'Đang tải hotline…' }); setStep(3, { status: 'active', message: 'Đang tải số dư…' }); setStep(4, { status: 'blocked', message: 'Chờ API số dư hoàn tất.' });
    const hotlineRequest = (async () => { try { const response = await api('/api/hotline/getAll', { method: 'GET' }); const result = await parseResponse(response); const list = Array.isArray(result.data) ? result.data as Hotline[] : []; setHotlines(list); setSelectedHotlines(previous => previous.filter(code => list.some(item => item.hotline_code === code))); setStep(2, { status: 'success', message: `${list.length} hotline sẵn sàng chọn.` }); addSummary({ label: 'Hotline', endpoint: '/api/hotline/getAll', status: response.status, ok: true, message: `Đã tải ${list.length} hotline.` }); } catch (error) { const message = safeMessage(error instanceof Error ? error.message : '', 'Không tải được hotline.'); setStep(2, { status: 'error', message }); addSummary({ label: 'Hotline', endpoint: '/api/hotline/getAll', ok: false, message }); } })();
    const balanceRequest = (async () => { try { const response = await api('/api/account/balance', { method: 'GET' }); const result = await parseResponse(response); setAdminBalance(typeof result.data === 'number' ? result.data : null); setStep(3, { status: 'success', message: 'Đã tải số dư tài khoản.' }); addSummary({ label: 'Số dư tài khoản', endpoint: '/api/account/balance', status: response.status, ok: true, message: 'Đã tải số dư tài khoản.' }); } catch (error) { const message = safeMessage(error instanceof Error ? error.message : '', 'Không tải được số dư.'); setStep(3, { status: 'error', message }); addSummary({ label: 'Số dư tài khoản', endpoint: '/api/account/balance', ok: false, message }); } finally { await loadMember(); } })();
    await Promise.all([hotlineRequest, balanceRequest]); setLoadingData(false);
    setStep(5, { status: 'pending', message: 'Sẵn sàng cấp token khi có Member No.' }); setStep(6, { status: 'blocked', message: 'Cần cấp SDK token.' }); setStep(7, { status: 'blocked', message: 'Chưa chạy preview.' });
  };

  const requestToken = async () => {
    if (!partnerApiKey.trim()) { setStep(5, { status: 'blocked', message: 'Cần Partner API Key.' }); keyRef.current?.focus(); return; }
    if (!memberNo.trim()) { setStep(5, { status: 'blocked', message: 'Cần Member No.' }); memberRef.current?.focus(); return; }
    setLoadingToken(true); setSdkToken(''); setStep(5, { status: 'active', message: 'Đang cấp SDK token…' }); setStep(6, { status: 'blocked', message: 'Chờ token hợp lệ.' }); setStep(7, { status: 'blocked', message: 'Chưa chạy preview.' });
    try {
      const response = await api('/api/sdk/tokenSdk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_no: memberNo.trim(), hotline_codes: selectedHotlines }) });
      const result = await parseResponse(response); if (typeof result.data !== 'string' || !result.data) throw new Error('API không trả SDK token hợp lệ.');
      setSdkToken(result.data); setStep(5, { status: 'success', message: 'Token đã được giữ trong bộ nhớ phiên demo.' }); setStep(6, { status: 'pending', message: 'Dán/chỉnh sửa code rồi bấm Chạy code.' }); addSummary({ label: 'SDK token', endpoint: '/api/sdk/tokenSdk', status: response.status, ok: true, message: 'Token đã cấp thành công (được ẩn).' });
    } catch (error) { const message = safeMessage(error instanceof Error ? error.message : '', 'Không thể cấp SDK token.'); setStep(5, { status: 'error', message }); addSummary({ label: 'SDK token', endpoint: '/api/sdk/tokenSdk', ok: false, message }); }
    finally { setLoadingToken(false); }
  };

  const handlePreview = (state: 'running' | 'loaded' | 'event-error' | 'connected', message?: string) => {
    if (state === 'running') { setStep(6, { status: 'active', message: 'Đang tạo iframe preview…' }); setStep(7, { status: 'blocked', message: 'Chờ preview nạp.' }); }
    if (state === 'loaded') { setStep(6, { status: 'success', message: 'Code đã nạp trong iframe sandbox.' }); setStep(7, { status: 'active', message: 'Đang chờ vbot:onUserConnected…' }); }
    if (state === 'connected') setStep(7, { status: 'success', message: message || 'SDK trực tuyến, có thể gọi.' });
    if (state === 'event-error') setStep(7, { status: 'error', message: message || 'SDK không thể kết nối.' });
  };
  const toggleHotline = (code: string) => { invalidateToken(); setSelectedHotlines(previous => previous.includes(code) ? previous.filter(value => value !== code) : [...previous, code]); };
  const copyProduction = async () => { try { await navigator.clipboard.writeText(productionSnippet); setCopyNotice('Đã sao chép snippet production.'); } catch { setCopyNotice('Không thể sao chép trên trình duyệt này.'); } };

  return <main className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-5">
    <div className="flex flex-col gap-2"><div className="flex items-center gap-2 text-sky-700"><Icon icon="solar:play-circle-bold" className="text-2xl" /><span className="text-xs uppercase tracking-widest font-extrabold">VBot Web SDK</span></div><h1 className="text-2xl font-extrabold text-slate-800">Demo live: từ API đến code chạy thực tế</h1><p className="text-sm text-slate-500 max-w-3xl">Quan sát request cấp token, đặt token vào HTML mẫu và theo dõi event SDK trong preview cách ly. Key và token chỉ tồn tại trong bộ nhớ của trang này.</p></div>
    <section className="grid xl:grid-cols-[minmax(0,1.05fr)_minmax(440px,.95fr)] gap-5 items-start"><div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"><div className="p-5 border-b border-slate-100 flex justify-between gap-3"><div><h2 className="font-bold text-slate-800 flex gap-2 items-center"><Icon icon="solar:settings-bold" className="text-sky-600" /> Cấu hình và cấp token</h2><p className="text-xs text-slate-500 mt-1">Dùng Partner API Key chỉ cho phiên demo này.</p></div><span className={`h-fit text-[10px] font-bold px-2 py-1 rounded-full ${sdkToken ? 'bg-emerald-50 text-emerald-700' : loadingToken ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>{tokenStatus}</span></div>
      <div className="p-5 space-y-4"><div className="grid sm:grid-cols-2 gap-4"><label className="text-xs font-bold text-slate-600">Cơ chế giao diện<select value={mode} onChange={event => { invalidateToken('Chế độ giao diện đã thay đổi; cần đồng bộ lại.'); setMode(event.target.value as IntegrationMode); }} className="mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium outline-none focus:border-sky-500"><option value="builtin">Built-in Native UI</option><option value="headless">Headless Custom UI</option></select></label><label className="text-xs font-bold text-slate-600">Mã nhân viên (Member No)<input ref={memberRef} value={memberNo} onChange={event => { invalidateToken(); setMemberNo(event.target.value); }} placeholder="Ví dụ: agent_001" className="mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500" /></label></div>
        <label className="block text-xs font-bold text-slate-600">VBot Partner API Key<input ref={keyRef} type="password" value={partnerApiKey} onChange={event => { invalidateToken(); setPartnerApiKey(event.target.value); }} placeholder="Chỉ dùng trong phiên demo" className="mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500" /></label>
        <div className="flex flex-wrap gap-2"><button onClick={loadData} disabled={loadingData} className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 px-4 py-2 rounded-lg text-white text-xs font-bold"><Icon icon="solar:restart-bold" className={`inline mr-1 ${loadingData ? 'animate-spin' : ''}`} />{loadingData ? 'Đang tải…' : 'Tải dữ liệu'}</button><button onClick={requestToken} disabled={loadingToken || !partnerApiKey.trim() || !memberNo.trim()} className="bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 px-4 py-2 rounded-lg text-white text-xs font-bold"><Icon icon="solar:key-bold" className="inline mr-1" />{loadingToken ? 'Đang cấp…' : 'Đồng bộ SDK'}</button>{hotlines.length > 0 && selectedHotlines.length === 0 && <span className="text-xs text-amber-600 self-center">Có thể chọn hotline để luồng rõ ràng hơn.</span>}</div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex items-center gap-2 text-xs font-bold text-slate-700"><Icon icon="solar:phone-bold" className="text-sky-600" /> Hotlines SDK</div>{hotlines.length ? <div className="mt-2 max-h-36 overflow-y-auto grid sm:grid-cols-2 gap-2">{hotlines.map(item => <label key={item.hotline_code} className={`flex gap-2 items-center p-2 bg-white rounded border text-xs cursor-pointer ${selectedHotlines.includes(item.hotline_code) ? 'border-sky-300 bg-sky-50' : 'border-slate-200'}`}><input type="checkbox" checked={selectedHotlines.includes(item.hotline_code)} onChange={() => toggleHotline(item.hotline_code)} className="accent-sky-600" /><span className="min-w-0"><b className="block truncate">{item.hotline_name}</b><span className="text-slate-400 font-mono">{item.hotline_number || item.hotline_code}</span></span></label>)}</div> : <p className="text-xs text-slate-400 mt-2">Bấm “Tải dữ liệu” để lấy danh sách hotline.</p>}</div>
        <div className="grid sm:grid-cols-2 gap-3"><div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><span className="text-[10px] uppercase font-bold text-slate-400">Số dư admin</span><div className="mt-1 font-bold text-slate-700">{formatMoney(adminBalance)}</div></div><div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><span className="text-[10px] uppercase font-bold text-slate-400">Thành viên</span><div className="mt-1 text-xs font-bold text-slate-700">{member ? String(member.member_name || member.member_no || 'Đã xác thực') : 'Chưa tải'}</div></div></div>
        {summaries.length > 0 && <div className="border-t border-slate-100 pt-3"><h3 className="text-xs font-bold text-slate-600 mb-2">Phản hồi API rút gọn</h3><div className="space-y-1.5">{summaries.map((summary, index) => <div key={`${summary.label}-${index}`} className="flex gap-2 text-[11px] rounded bg-slate-50 px-2.5 py-2"><Icon icon={summary.ok ? 'solar:check-circle-bold' : 'solar:danger-circle-bold'} className={summary.ok ? 'text-emerald-600' : 'text-rose-600'} /><span className="font-mono text-slate-600">{summary.endpoint}</span><span className="text-slate-400">{summary.status ? `HTTP ${summary.status}` : ''}</span><span className="ml-auto text-slate-500 truncate">{summary.message}</span></div>)}</div></div>}
      </div></div><ApiFlowDiagram flowSteps={flowSteps} /></section>
    <LiveCodePlayground key={mode} mode={mode} token={sdkToken} onRunState={handlePreview} />
    <section className="bg-amber-50 border border-amber-200 rounded-xl p-5"><div className="flex gap-3"><Icon icon="solar:shield-warning-bold" className="text-amber-600 text-xl shrink-0" /><div className="min-w-0"><h2 className="font-bold text-amber-900">Khi đưa vào website thật</h2><p className="text-sm text-amber-800 mt-1">Demo live cho browser gọi Open API để dễ quan sát. Production nên dùng: Browser → backend của đối tác → VBot Open API → SDK token ngắn hạn → widget. Không đặt Partner API Key trong frontend, source code hay localStorage.</p><pre className="mt-3 p-3 rounded-lg bg-slate-950 text-slate-200 text-xs overflow-x-auto"><code>{productionSnippet}</code></pre><button onClick={copyProduction} className="mt-3 text-xs font-bold px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white">Sao chép snippet production</button>{copyNotice && <span className="ml-2 text-xs text-amber-800">{copyNotice}</span>}</div></div></section>
  </main>;
};
