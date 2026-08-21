import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { ApiFlowDiagram, FlowOperation, FlowStatus, FlowSteps } from './ApiFlowDiagram';
import { LiveCodePlayground } from './LiveCodePlayground';
import { IntegrationMode } from '../data/liveDemoTemplate';

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://open-api-staging.vbot.vn/v3.0';
const DEMO_MEMBER_NO = 'agent_001';
const DEMO_HOTLINE_CODES = ['c767da943fff445c9588facbca052de2'];

const initialFlow: FlowSteps = {
  1: { status: 'pending', message: 'Nhập Partner API Key, sau đó tải dữ liệu demo.', operations: { hotlines: 'pending', adminBalance: 'pending' } },
  2: { status: 'blocked', message: 'Hoàn thành bước 1 để đồng bộ tài khoản SDK.', operations: { sdkToken: 'blocked', sdkHotlines: 'blocked', funding: 'blocked' } },
  3: { status: 'blocked', message: 'SDK token sẽ xuất hiện sau khi đồng bộ.', operations: { tokenSaved: 'blocked' } },
};

const safeMessage = (value: unknown, fallback: string) => typeof value === 'string' && value.trim() ? value.slice(0, 160) : fallback;
const waitForAnimation = () => new Promise<void>(resolve => window.setTimeout(resolve, 320));

export const LiveDemoPage: React.FC = () => {
  const [mode, setMode] = useState<IntegrationMode>('builtin');
  const [partnerApiKey, setPartnerApiKey] = useState('');
  const [sdkToken, setSdkToken] = useState('');
  const [flowSteps, setFlowSteps] = useState<FlowSteps>(initialFlow);
  const [isLoading, setIsLoading] = useState(false);
  const [copyNotice, setCopyNotice] = useState('');

  const setStep = (step: 1 | 2 | 3, status: FlowStatus, message: string, operations?: Partial<Record<FlowOperation, FlowStatus>>) => setFlowSteps(previous => ({
    ...previous,
    [step]: { ...previous[step], status, message, operations: operations ? { ...previous[step].operations, ...operations } : previous[step].operations },
  }));

  const resetFlow = () => {
    setSdkToken('');
    setCopyNotice('');
    setFlowSteps(initialFlow);
  };

  const parseResponse = async (response: Response) => {
    const text = await response.text();
    let body: Record<string, unknown>;
    try {
      body = text ? JSON.parse(text) as Record<string, unknown> : {};
    } catch {
      throw new Error('Máy chủ trả về dữ liệu không phải JSON.');
    }
    if (!response.ok) throw new Error(safeMessage(body.message, `HTTP ${response.status}`));
    if (body.error !== 0) throw new Error(safeMessage(body.message, 'API trả về lỗi.'));
    return body;
  };

  const api = (endpoint: string, init: RequestInit) => fetch(`${baseUrl}${endpoint}`, {
    ...init,
    headers: { Accept: 'application/json', 'X-API-Key': partnerApiKey.trim(), ...init.headers },
  });

  const loadDemoData = async () => {
    if (!partnerApiKey.trim()) {
      setStep(1, 'blocked', 'Cần nhập Partner API Key trước khi tải dữ liệu.', { hotlines: 'blocked', adminBalance: 'blocked' });
      return;
    }

    let activeStep: 1 | 2 = 1;
    let issuedToken = '';
    setIsLoading(true);
    setSdkToken('');
    setCopyNotice('');
    setStep(1, 'active', 'Đang kiểm tra hotline và số dư tài khoản admin.', { hotlines: 'active', adminBalance: 'active' });
    setStep(2, 'blocked', 'Chờ kiểm tra dữ liệu ban đầu.', { sdkToken: 'blocked', sdkHotlines: 'blocked', funding: 'blocked' });
    setStep(3, 'blocked', 'Chưa có SDK token.', { tokenSaved: 'blocked' });

    try {
      await Promise.all([
        api('/api/hotline/getAll', { method: 'GET' }).then(parseResponse),
        api('/api/account/balance', { method: 'GET' }).then(parseResponse),
      ]);
      setStep(1, 'success', 'Partner API Key hợp lệ; dữ liệu demo đã sẵn sàng.', { hotlines: 'success', adminBalance: 'success' });
      await waitForAnimation();

      activeStep = 2;
      setStep(2, 'active', `Đang đồng bộ hotline và số dư đã cấp cho ${DEMO_MEMBER_NO}.`, { sdkToken: 'active', sdkHotlines: 'blocked', funding: 'active' });
      const tokenResult = await parseResponse(await api('/api/sdk/tokenSdk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_no: DEMO_MEMBER_NO, hotline_codes: DEMO_HOTLINE_CODES }),
      }));
      if (typeof tokenResult.data !== 'string' || !tokenResult.data) throw new Error('API không trả SDK token hợp lệ.');
      issuedToken = tokenResult.data;
      setStep(2, 'active', 'Đã đồng bộ token; đang kiểm tra hotline và số dư của tài khoản SDK.', { sdkToken: 'success', sdkHotlines: 'active', funding: 'active' });

      await Promise.all([
        fetch(`${baseUrl}/api/sdk/getHotline`, { method: 'GET', headers: { Accept: 'application/json', Authorization: issuedToken } }).then(parseResponse),
        api(`/api/member/getByMemberNo?member_no=${encodeURIComponent(DEMO_MEMBER_NO)}`, { method: 'GET' }).then(parseResponse),
      ]);
      setStep(2, 'success', `Hotline và số dư của ${DEMO_MEMBER_NO} đã sẵn sàng cho SDK.`, { sdkToken: 'success', sdkHotlines: 'success', funding: 'success' });
      await waitForAnimation();
      setSdkToken(issuedToken);
      setStep(3, 'success', 'SDK token đã sẵn sàng để sao chép hoặc chạy code demo.', { tokenSaved: 'success' });
    } catch (error) {
      const message = safeMessage(error instanceof Error ? error.message : '', 'Không thể tải dữ liệu demo.');
      if (activeStep === 1) {
        setStep(1, 'error', message, { hotlines: 'error', adminBalance: 'error' });
        setStep(2, 'blocked', 'Cần kiểm tra dữ liệu ban đầu thành công trước.', { sdkToken: 'blocked', sdkHotlines: 'blocked', funding: 'blocked' });
        setStep(3, 'blocked', 'Chưa có SDK token.', { tokenSaved: 'blocked' });
      } else if (issuedToken) {
        setSdkToken(issuedToken);
        setStep(2, 'error', `SDK token đã cấp, nhưng chưa kiểm tra được toàn bộ dữ liệu: ${message}`, { sdkToken: 'success', sdkHotlines: 'error', funding: 'error' });
        setStep(3, 'success', 'SDK token đã sẵn sàng để sao chép hoặc chạy code demo.', { tokenSaved: 'success' });
      } else {
        setStep(2, 'error', message, { sdkToken: 'error', sdkHotlines: 'blocked', funding: 'blocked' });
        setStep(3, 'blocked', 'Không có SDK token để lưu.', { tokenSaved: 'blocked' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copySdkToken = async () => {
    try {
      await navigator.clipboard.writeText(sdkToken);
      setCopyNotice('Đã sao chép SDK token.');
    } catch {
      setCopyNotice('Không thể sao chép token trên trình duyệt này.');
    }
  };

  const handlePreview = (state: 'running' | 'loaded' | 'event-error' | 'connected') => {
    if (state === 'event-error') setStep(3, 'error', 'SDK token đã cấp nhưng preview không thể kết nối.', { tokenSaved: 'success' });
  };

  return <main className="max-w-[1400px] w-full mx-auto px-5 sm:px-8 py-7 flex flex-col gap-5">
    <div className="flex flex-col gap-2"><div className="flex items-center gap-2 text-sky-700"><Icon icon="solar:play-circle-bold" className="text-2xl" /><span className="text-xs uppercase tracking-widest font-extrabold">VBot Web SDK</span></div><h1 className="text-2xl font-extrabold text-slate-800">Demo tích hợp VBot Web SDK</h1></div>
    <ApiFlowDiagram
      flowSteps={flowSteps}
      sdkToken={sdkToken}
      copyNotice={copyNotice}
      onCopyToken={copySdkToken}
      partnerApiKey={partnerApiKey}
      mode={mode}
      isLoading={isLoading}
      onPartnerApiKeyChange={value => { setPartnerApiKey(value); resetFlow(); }}
      onModeChange={value => { setMode(value); resetFlow(); }}
      onLoadData={loadDemoData}
    />
    <LiveCodePlayground key={mode} mode={mode} token={sdkToken} onRunState={handlePreview} />
  </main>;
};
