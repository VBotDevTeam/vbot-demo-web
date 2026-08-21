import React, { useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { ApiFlowDiagram, FlowOperation, FlowStatus, FlowSteps } from './ApiFlowDiagram';
import { LiveCodePlayground } from './LiveCodePlayground';
import { IntegrationMode } from '../data/liveDemoTemplate';

interface Hotline { hotline_name: string; hotline_number: string; hotline_code: string; hotline_type?: string }
interface SdkHotlinePayload { hotline_name?: string; hotline_number?: string; hotline_code?: string; name?: string; phoneNumber?: string; phone_number?: string; number?: string }
interface SdkMemberInfo { member_name?: string; member_ext_number?: string; member_no?: string; member_money?: number | string; member_status?: number; expiration_date?: string }

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://open-api-staging.vbot.vn/v3.0';
const initialFlow: FlowSteps = {
  1: { status: 'pending', message: 'Nhập Partner API Key, sau đó tải dữ liệu ban đầu.', operations: { hotlines: 'pending', adminBalance: 'pending' } },
  2: { status: 'blocked', message: 'Hoàn thành bước 1 để cấu hình tài khoản SDK.', operations: { sdkToken: 'blocked', sdkHotlines: 'blocked', funding: 'blocked' } },
  3: { status: 'blocked', message: 'SDK token sẽ xuất hiện sau khi đồng bộ.', operations: { tokenSaved: 'blocked' } },
};

const safeMessage = (value: unknown, fallback: string) => typeof value === 'string' && value.trim() ? value.slice(0, 160) : fallback;
const formatMoney = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
const normalizeSdkHotline = (item: SdkHotlinePayload, index: number): Hotline => {
  const number = item.hotline_number || item.phoneNumber || item.phone_number || item.number || '';
  const name = item.hotline_name || item.name || number || `Hotline ${index + 1}`;
  return { hotline_name: name, hotline_number: number, hotline_code: item.hotline_code || number || name };
};

export const LiveDemoPage: React.FC = () => {
  const [mode, setMode] = useState<IntegrationMode>('builtin');
  const [partnerApiKey, setPartnerApiKey] = useState('');
  const [memberNo, setMemberNo] = useState('');
  const [hotlines, setHotlines] = useState<Hotline[]>([]);
  const [selectedHotlines, setSelectedHotlines] = useState<string[]>([]);
  const [sdkHotlines, setSdkHotlines] = useState<Hotline[]>([]);
  const [sdkAccountBalance, setSdkAccountBalance] = useState<number | null>(null);
  const [sdkMemberInfo, setSdkMemberInfo] = useState<SdkMemberInfo | null>(null);
  const [adminBalance, setAdminBalance] = useState<number | null>(null);
  const [sdkToken, setSdkToken] = useState('');
  const [flowSteps, setFlowSteps] = useState<FlowSteps>(initialFlow);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingToken, setLoadingToken] = useState(false);
  const [moneyAmount, setMoneyAmount] = useState('1000');
  const [isAdjustingMoney, setIsAdjustingMoney] = useState(false);
  const [copyNotice, setCopyNotice] = useState('');
  const keyRef = useRef<HTMLInputElement>(null);
  const memberRef = useRef<HTMLInputElement>(null);

  const tokenStatus = useMemo(() => loadingToken ? 'Đang đồng bộ SDK' : sdkToken ? 'SDK token đã sẵn sàng' : flowSteps[2].status === 'error' ? 'Đồng bộ SDK cần kiểm tra' : 'Chưa có token', [loadingToken, sdkToken, flowSteps]);
  const setStep = (step: 1 | 2 | 3, status: FlowStatus, message: string, operations?: Partial<Record<FlowOperation, FlowStatus>>) => setFlowSteps(previous => ({
    ...previous,
    [step]: { ...previous[step], status, message, operations: operations ? { ...previous[step].operations, ...operations } : previous[step].operations },
  }));

  const invalidateToken = (reason = 'Thông tin đã thay đổi; cần đồng bộ lại.') => {
    if (!sdkToken && !sdkHotlines.length) return;
    setSdkToken(''); setSdkHotlines([]); setSdkAccountBalance(null); setSdkMemberInfo(null); setCopyNotice('');
    setStep(2, 'pending', reason, { sdkToken: 'pending', sdkHotlines: 'blocked', funding: 'pending' });
    setStep(3, 'blocked', 'Cần đồng bộ SDK để lấy token mới.', { tokenSaved: 'blocked' });
  };

  const parseResponse = async (response: Response) => {
    const text = await response.text();
    let body: Record<string, unknown>;
    try { body = text ? JSON.parse(text) as Record<string, unknown> : {}; } catch { throw new Error('Máy chủ trả về dữ liệu không phải JSON.'); }
    if (!response.ok) throw new Error(safeMessage(body.message, `HTTP ${response.status}`));
    if (body.error !== 0) throw new Error(safeMessage(body.message, 'API trả về lỗi.'));
    return body;
  };

  const api = async (endpoint: string, init: RequestInit) => fetch(`${baseUrl}${endpoint}`, {
    ...init,
    headers: { Accept: 'application/json', 'X-API-Key': partnerApiKey.trim(), ...init.headers },
  });

  const refreshSdkAccountBalance = async () => {
    if (!partnerApiKey.trim() || !memberNo.trim()) return;
    try {
      const result = await parseResponse(await api(`/api/member/getByMemberNo?member_no=${encodeURIComponent(memberNo.trim())}`, { method: 'GET' }));
      const memberData = result.data as SdkMemberInfo | undefined;
      const balance = Number(memberData?.member_money);
      setSdkAccountBalance(Number.isFinite(balance) ? balance : null);
      setSdkMemberInfo(memberData || null);
    } catch {
      setSdkAccountBalance(null);
      setSdkMemberInfo(null);
    }
  };

  const loadData = async () => {
    if (!partnerApiKey.trim()) {
      setStep(1, 'blocked', 'Cần nhập Partner API Key trước khi tải dữ liệu.', { hotlines: 'blocked', adminBalance: 'blocked' });
      keyRef.current?.focus();
      return;
    }
    invalidateToken('Dữ liệu đầu vào đã được tải lại; cần đồng bộ SDK sau khi chọn hotline.');
    setLoadingData(true); setHotlines([]); setAdminBalance(null);
    setStep(1, 'active', 'Backend đang tải hotline và số dư admin song song.', { hotlines: 'active', adminBalance: 'active' });
    setStep(2, 'blocked', 'Chờ dữ liệu ban đầu từ bước 1.', { sdkToken: 'blocked', sdkHotlines: 'blocked', funding: 'blocked' });
    setStep(3, 'blocked', 'Chưa có SDK token.', { tokenSaved: 'blocked' });

    const hotlineRequest = (async (): Promise<boolean> => {
      try {
        const result = await parseResponse(await api('/api/hotline/getAll', { method: 'GET' }));
        const list = Array.isArray(result.data) ? result.data as Hotline[] : [];
        setHotlines(list);
        setSelectedHotlines(previous => previous.filter(code => list.some(item => item.hotline_code === code)));
        setStep(1, 'active', `${list.length} hotline đã tải; đang chờ số dư admin.`, { hotlines: 'success' });
        return true;
      } catch (error) {
        setStep(1, 'active', safeMessage(error instanceof Error ? error.message : '', 'Không tải được hotline.'), { hotlines: 'error' });
        return false;
      }
    })();
    const balanceRequest = (async (): Promise<boolean> => {
      try {
        const result = await parseResponse(await api('/api/account/balance', { method: 'GET' }));
        setAdminBalance(typeof result.data === 'number' ? result.data : null);
        setStep(1, 'active', 'Đã tải số dư admin; đang chờ danh sách hotline.', { adminBalance: 'success' });
        return true;
      } catch (error) {
        setStep(1, 'active', safeMessage(error instanceof Error ? error.message : '', 'Không tải được số dư admin.'), { adminBalance: 'error' });
        return false;
      }
    })();
    const [hotlinesLoaded, balanceLoaded] = await Promise.all([hotlineRequest, balanceRequest]);
    setLoadingData(false);
    if (hotlinesLoaded && balanceLoaded) {
      setStep(1, 'success', 'Dữ liệu ban đầu đã sẵn sàng để cấu hình SDK.', { hotlines: 'success', adminBalance: 'success' });
      setStep(2, 'pending', 'Nhập Member No, chọn hotline và đồng bộ SDK.', { sdkToken: 'pending', sdkHotlines: 'blocked', funding: 'pending' });
    } else {
      setStep(1, 'error', 'Một hoặc nhiều dữ liệu ban đầu không tải được. Bạn có thể thử lại.', {});
      setStep(2, 'blocked', 'Cần tải dữ liệu ban đầu thành công trước.', { sdkToken: 'blocked', sdkHotlines: 'blocked', funding: 'blocked' });
    }
  };

  const requestToken = async () => {
    if (!partnerApiKey.trim()) { setStep(1, 'blocked', 'Cần nhập Partner API Key.', { hotlines: 'blocked', adminBalance: 'blocked' }); keyRef.current?.focus(); return; }
    if (!memberNo.trim()) { setStep(2, 'blocked', 'Cần nhập Member No để đồng bộ SDK.', { sdkToken: 'blocked' }); memberRef.current?.focus(); return; }
    setLoadingToken(true); setSdkToken(''); setSdkHotlines([]); setSdkAccountBalance(null); setSdkMemberInfo(null); setCopyNotice('');
    setStep(2, 'active', 'Backend đang cấp token cho tài khoản SDK.', { sdkToken: 'active', sdkHotlines: 'blocked', funding: 'pending' });
    setStep(3, 'blocked', 'Chờ backend trả SDK token.', { tokenSaved: 'blocked' });
    try {
      const result = await parseResponse(await api('/api/sdk/tokenSdk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_no: memberNo.trim(), hotline_codes: selectedHotlines }),
      }));
      if (typeof result.data !== 'string' || !result.data) throw new Error('API không trả SDK token hợp lệ.');
      setSdkToken(result.data);
      setStep(2, 'active', 'Đã cấp token; đang lấy danh sách hotline của tài khoản SDK.', { sdkToken: 'success', sdkHotlines: 'active' });
      setStep(3, 'success', 'SDK token đã được backend trả về; bạn có thể sao chép hoặc chạy code.', { tokenSaved: 'success' });
      try {
        // This mirrors the request made internally by <vbot-widget>: the SDK token is
        // passed directly in Authorization (no Bearer prefix, API key, or member_no).
        const hotlinesResult = await parseResponse(await fetch(`${baseUrl}/api/sdk/getHotline`, {
          method: 'GET',
          headers: { Accept: 'application/json', Authorization: result.data },
        }));
        const assignedHotlines = Array.isArray(hotlinesResult.data)
          ? (hotlinesResult.data as SdkHotlinePayload[]).map(normalizeSdkHotline)
          : [];
        setSdkHotlines(assignedHotlines);
        setStep(2, 'success', `${assignedHotlines.length} hotline đã được trả về cho tài khoản SDK.`, { sdkToken: 'success', sdkHotlines: 'success' });
      } catch (error) {
        setStep(2, 'error', safeMessage(error instanceof Error ? error.message : '', 'Token đã cấp nhưng chưa lấy được hotline của tài khoản SDK.'), { sdkToken: 'success', sdkHotlines: 'error' });
      } finally {
        await refreshSdkAccountBalance();
      }
    } catch (error) {
      setSdkToken('');
      setStep(2, 'error', safeMessage(error instanceof Error ? error.message : '', 'Không thể cấp SDK token.'), { sdkToken: 'error', sdkHotlines: 'blocked' });
      setStep(3, 'blocked', 'Không có SDK token để lưu.', { tokenSaved: 'blocked' });
    } finally { setLoadingToken(false); }
  };

  const adjustMemberMoney = async (isSubtraction: boolean) => {
    const amount = Number(moneyAmount);
    if (!partnerApiKey.trim()) { keyRef.current?.focus(); return; }
    if (!memberNo.trim()) { memberRef.current?.focus(); return; }
    if (!Number.isFinite(amount) || amount <= 0) { window.alert('Vui lòng nhập số tiền dương hợp lệ.'); return; }
    setIsAdjustingMoney(true);
    setStep(2, 'active', `${isSubtraction ? 'Đang trừ' : 'Đang nạp'} số dư cho tài khoản SDK.`, { funding: 'active' });
    try {
      await parseResponse(await api('/api/member/addMoney', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_no: memberNo.trim(), money: isSubtraction ? -amount : amount }),
      }));
      await refreshSdkAccountBalance();
      setStep(2, 'success', `Đã ${isSubtraction ? 'trừ' : 'nạp'} số dư cho tài khoản SDK.`, { funding: 'success' });
      window.alert(`${isSubtraction ? 'Trừ' : 'Nạp'} tiền thành công cho ${memberNo.trim()}.`);
    } catch (error) {
      setStep(2, 'error', safeMessage(error instanceof Error ? error.message : '', 'Không thể cập nhật số dư tài khoản SDK.'), { funding: 'error' });
      window.alert(safeMessage(error instanceof Error ? error.message : '', 'Không thể cập nhật số dư tài khoản SDK.'));
    } finally { setIsAdjustingMoney(false); }
  };

  const handlePreview = (state: 'running' | 'loaded' | 'event-error' | 'connected') => {
    if (state === 'event-error') setStep(3, 'error', 'SDK token đã cấp nhưng preview không thể kết nối.', { tokenSaved: 'success' });
  };
  const toggleHotline = (code: string) => { invalidateToken(); setSelectedHotlines(previous => previous.includes(code) ? previous.filter(value => value !== code) : [...previous, code]); };
  const copySdkToken = async () => {
    try { await navigator.clipboard.writeText(sdkToken); setCopyNotice('Đã sao chép SDK token.'); } catch { setCopyNotice('Không thể sao chép token trên trình duyệt này.'); }
  };

  return <main className="max-w-[1400px] w-full mx-auto px-5 sm:px-8 py-7 flex flex-col gap-5">
    <div className="flex flex-col gap-2"><div className="flex items-center gap-2 text-sky-700"><Icon icon="solar:play-circle-bold" className="text-2xl" /><span className="text-xs uppercase tracking-widest font-extrabold">VBot Web SDK</span></div><h1 className="text-2xl font-extrabold text-slate-800">Demo tích hợp VBot Web SDK</h1></div>
    <ApiFlowDiagram flowSteps={flowSteps} sdkToken={sdkToken} copyNotice={copyNotice} onCopyToken={copySdkToken} />
    <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex justify-between gap-3"><div><h2 className="font-bold text-slate-800 flex gap-2 items-center"><Icon icon="solar:settings-bold" className="text-sky-600" /> Cấu hình và cấp token</h2><p className="text-xs text-slate-500 mt-1">Partner API Key và SDK token chỉ tồn tại trong phiên Demo live này.</p></div><span className={`h-fit text-[10px] font-bold px-2 py-1 rounded-full ${sdkToken ? 'bg-emerald-50 text-emerald-700' : loadingToken ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>{tokenStatus}</span></div>
      <div className="p-5 space-y-4">
        <section className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="step-panel-heading"><span>1</span><div><h3>Chuẩn bị dữ liệu</h3><p>Nhập API Key để tải danh sách hotline và số dư admin.</p></div></div>
          <div className="p-4 grid lg:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end"><label className="text-xs font-bold text-slate-600">VBot Partner API Key<input ref={keyRef} type="password" value={partnerApiKey} onChange={event => { invalidateToken(); setPartnerApiKey(event.target.value); }} placeholder="Nhập API Key" className="mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500" /></label><button onClick={loadData} disabled={loadingData} className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 px-4 py-2 rounded-lg text-white text-xs font-bold whitespace-nowrap"><Icon icon="solar:restart-bold" className={`inline mr-1 ${loadingData ? 'animate-spin' : ''}`} />{loadingData ? 'Đang tải…' : 'Tải dữ liệu'}</button></div>
          <div className="px-4 pb-4 grid sm:grid-cols-2 gap-3"><div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><span className="text-[10px] uppercase font-bold text-slate-400">Danh sách hotline</span><div className="mt-1 font-bold text-slate-700">{hotlines.length ? `${hotlines.length} hotline` : 'Chưa tải'}</div></div><div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><span className="text-[10px] uppercase font-bold text-slate-400">Số dư admin</span><div className="mt-1 font-bold text-slate-700">{formatMoney(adminBalance)}</div></div></div>
        </section>
        <section className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="step-panel-heading"><span>2</span><div><h3>Cấu hình tài khoản SDK</h3><p>Chọn hotline cho thành viên, đồng bộ SDK và nạp/trừ số dư khi cần.</p></div></div>
          <div className="p-4 space-y-4"><div className="grid sm:grid-cols-2 gap-4"><label className="text-xs font-bold text-slate-600">Mã nhân viên (Member No)<input ref={memberRef} value={memberNo} onChange={event => { invalidateToken(); setSdkAccountBalance(null); setSdkMemberInfo(null); setMemberNo(event.target.value); }} placeholder="Ví dụ: agent_001" className="mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500" /></label><label className="text-xs font-bold text-slate-600">Cơ chế giao diện<select value={mode} onChange={event => { invalidateToken('Chế độ giao diện đã thay đổi; cần đồng bộ lại.'); setMode(event.target.value as IntegrationMode); }} className="mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium outline-none focus:border-sky-500"><option value="builtin">Built-in Native UI (Sử dụng widget mặc định)</option><option value="headless">Headless Custom UI (Ẩn giao diện mặc định, tự build)</option></select></label></div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700"><span className="flex items-center gap-2"><Icon icon="solar:phone-bold" className="text-sky-600" /> Hotline cấp cho tài khoản SDK</span>{hotlines.length > 0 && selectedHotlines.length === 0 && <span className="text-[11px] text-amber-600 font-medium">Chưa chọn hotline</span>}</div>{hotlines.length ? <div className="mt-3 max-h-40 overflow-y-auto grid sm:grid-cols-2 gap-2">{hotlines.map(item => <label key={item.hotline_code} className={`flex gap-2 items-center p-2 bg-white rounded border text-xs cursor-pointer ${selectedHotlines.includes(item.hotline_code) ? 'border-sky-300 bg-sky-50' : 'border-slate-200'}`}><input type="checkbox" checked={selectedHotlines.includes(item.hotline_code)} onChange={() => toggleHotline(item.hotline_code)} className="accent-sky-600" /><span className="min-w-0"><b className="block truncate">{item.hotline_name}</b><span className="text-slate-400 font-mono">{item.hotline_number || item.hotline_code}</span></span></label>)}</div> : <p className="text-xs text-slate-400 mt-2">Hoàn thành bước 1 để chọn hotline.</p>}</div>
            <div className="flex flex-wrap gap-3 items-center"><button onClick={requestToken} disabled={loadingToken || !partnerApiKey.trim() || !memberNo.trim()} className="bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 px-4 py-2 rounded-lg text-white text-xs font-bold"><Icon icon="solar:key-bold" className="inline mr-1" />{loadingToken ? 'Đang đồng bộ…' : 'Đồng bộ SDK'}</button><span className="text-[11px] text-slate-500">Gọi <code>tokenSdk</code>, sau đó tải <code>getHotline</code> của tài khoản SDK.</span></div>
            <div className="grid lg:grid-cols-2 gap-3">
              <section className="rounded-lg border border-sky-100 bg-sky-50/40 p-3">
                <div className="flex items-center justify-between gap-2 border-b border-sky-100 pb-2"><span className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Icon icon="solar:user-id-bold" className="text-sky-600" /> Thông tin tài khoản SDK</span>{sdkMemberInfo ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sdkMemberInfo.member_status === 1 || sdkMemberInfo.member_status === 6 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{sdkMemberInfo.member_status === 1 ? 'Đang hoạt động' : `Trạng thái: ${sdkMemberInfo.member_status ?? '—'}`}</span> : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Chưa đồng bộ</span>}</div>
                {sdkMemberInfo ? <div className="mt-3 grid sm:grid-cols-2 gap-x-4 gap-y-2 text-xs"><div className="flex justify-between gap-2 border-b border-sky-100 pb-1"><span className="text-slate-500">Tên nhân viên</span><strong className="truncate text-slate-800" title={sdkMemberInfo.member_name}>{sdkMemberInfo.member_name || '—'}</strong></div><div className="flex justify-between gap-2 border-b border-sky-100 pb-1"><span className="text-slate-500">Mã nhân viên</span><strong className="font-mono text-slate-800">{sdkMemberInfo.member_no || memberNo || '—'}</strong></div><div className="flex justify-between gap-2 border-b border-sky-100 pb-1"><span className="text-slate-500">Số máy nhánh (Ext)</span><strong className="font-mono text-slate-800">{sdkMemberInfo.member_ext_number || '—'}</strong></div><div className="flex justify-between gap-2 border-b border-sky-100 pb-1"><span className="text-slate-500">Số dư</span><strong className="text-emerald-700">{formatMoney(sdkAccountBalance)}</strong></div><div className="flex justify-between gap-2 border-b border-sky-100 pb-1 sm:col-span-2"><span className="text-slate-500">Ngày hết hạn</span><strong className="text-slate-800">{sdkMemberInfo.expiration_date ? new Date(sdkMemberInfo.expiration_date).toLocaleDateString('vi-VN') : 'Không giới hạn'}</strong></div><div className="sm:col-span-2"><span className="block text-slate-500 mb-1">Hotline liên kết</span>{sdkHotlines.length ? <div className="flex flex-wrap gap-1.5">{sdkHotlines.map(item => <span key={item.hotline_code} className="text-[11px] bg-white border border-sky-100 text-sky-700 rounded px-2 py-1">{item.hotline_name || item.hotline_number || item.hotline_code}</span>)}</div> : <span className="text-[11px] italic text-slate-400">Chưa có hotline được cấp.</span>}</div></div> : <p className="py-5 text-center text-xs text-slate-400">Đồng bộ SDK để tải thông tin tài khoản nhân viên.</p>}
              </section>
              <div className="rounded-lg border border-slate-200 p-3"><div className="text-xs font-bold text-slate-700">Nạp / trừ số dư SDK</div><div className="mt-2 flex flex-wrap gap-2 items-end"><label className="flex-1 min-w-[150px] text-[11px] font-medium text-slate-500">Số tiền (VND)<input type="number" min="1" value={moneyAmount} onChange={event => setMoneyAmount(event.target.value)} className="mt-1 w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-sm font-semibold outline-none focus:border-sky-500" /></label><button onClick={() => adjustMemberMoney(false)} disabled={isAdjustingMoney || !partnerApiKey.trim() || !memberNo.trim()} className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-xs font-bold text-white">Nạp tiền</button><button onClick={() => adjustMemberMoney(true)} disabled={isAdjustingMoney || !partnerApiKey.trim() || !memberNo.trim()} className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-xs font-bold text-white">Trừ tiền</button></div></div>
            </div>
          </div>
        </section>
      </div>
    </section>
    <LiveCodePlayground key={mode} mode={mode} token={sdkToken} onRunState={handlePreview} />
  </main>;
};
