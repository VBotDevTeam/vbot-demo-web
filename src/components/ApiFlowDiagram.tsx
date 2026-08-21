import React from 'react';
import { Icon } from '@iconify/react';
import { IntegrationMode } from '../data/liveDemoTemplate';

export type FlowStatus = 'pending' | 'active' | 'success' | 'error' | 'blocked';
export type FlowOperation = 'hotlines' | 'adminBalance' | 'sdkToken' | 'sdkHotlines' | 'funding' | 'tokenSaved';

export interface FlowStepState {
  status: FlowStatus;
  message?: string;
  operations: Partial<Record<FlowOperation, FlowStatus>>;
}

export type FlowSteps = Record<1 | 2 | 3, FlowStepState>;

interface Props {
  flowSteps: FlowSteps;
  sdkToken: string;
  copyNotice: string;
  onCopyToken: () => void;
  partnerApiKey: string;
  mode: IntegrationMode;
  isLoading: boolean;
  onPartnerApiKeyChange: (value: string) => void;
  onModeChange: (mode: IntegrationMode) => void;
  onLoadData: () => void;
}

const steps: Array<{
  number: 1 | 2 | 3;
  title: string;
  tasks: Array<{ label: string; operations: FlowOperation[] }>;
  apiCalls: string[];
}> = [
  {
    number: 1,
    title: 'Tạo tài khoản SDK',
    tasks: [{ label: 'Kiểm tra API Key và dữ liệu demo', operations: ['hotlines', 'adminBalance'] }],
    apiCalls: ['GET /api/hotline/getAll', 'GET /api/account/balance'],
  },
  {
    number: 2,
    title: 'Gán thông tin',
    tasks: [{ label: 'Gán hotline cho thành viên', operations: ['sdkToken', 'sdkHotlines'] }, { label: 'Gán số dư cho thành viên', operations: ['funding'] }],
    apiCalls: ['POST /api/sdk/tokenSdk', 'GET /api/sdk/getHotline', 'GET /api/member/getByMemberNo'],
  },
  { number: 3, title: 'Lưu SDK token', tasks: [{ label: 'SDK token', operations: ['tokenSaved'] }], apiCalls: [] },
];

const taskStatus = (states: FlowStatus[]): FlowStatus => {
  if (states.includes('error')) return 'error';
  if (states.includes('active')) return 'active';
  if (states.every(state => state === 'success')) return 'success';
  if (states.includes('pending')) return 'pending';
  return 'blocked';
};

const checkboxClass: Record<FlowStatus, string> = {
  pending: 'border-slate-400 bg-white text-transparent',
  active: 'border-sky-500 bg-sky-50 text-sky-600',
  success: 'border-emerald-500 bg-emerald-500 text-white',
  error: 'border-rose-500 bg-rose-50 text-rose-600',
  blocked: 'border-slate-300 bg-white text-transparent',
};

const connectorClass = (current: FlowStepState, next: FlowStepState) => {
  if (current.status === 'success' && ['pending', 'active', 'success'].includes(next.status)) return 'backend-flow-connector--complete';
  if (current.status === 'active' || next.status === 'active') return 'backend-flow-connector--active';
  return '';
};

export const ApiFlowDiagram: React.FC<Props> = ({
  flowSteps, sdkToken, copyNotice, onCopyToken, partnerApiKey, mode, isLoading, onPartnerApiKeyChange, onModeChange, onLoadData,
}) => (
  <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
      <div>
        <h2 className="font-bold text-slate-800 flex items-center gap-2"><Icon icon="solar:server-path-bold" className="text-sky-600" /> Quy trình tích hợp</h2>
        <p className="text-xs text-slate-500 mt-1">Mỗi bước cập nhật theo đúng thao tác trong phần cấu hình bên dưới.</p>
      </div>
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-sky-700 bg-sky-50 px-2 py-1 rounded-full">3 bước</span>
    </div>
    <ol className="p-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)_56px_minmax(0,1fr)] lg:items-center">
      {steps.map((step, index) => {
        const state = flowSteps[step.number];
        const next = steps[index + 1];
        return <React.Fragment key={step.number}>
          <li className={`backend-flow-card backend-flow-card--${state.status} rounded-xl border p-4`}>
            <div className="flex items-center gap-3">
              <span className="backend-flow-number shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold">{state.status === 'success' ? '✓' : step.number}</span>
              <h3 className="font-bold text-sm text-slate-800">{step.title}</h3>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
              {step.tasks.map(task => {
                const status = taskStatus(task.operations.map(operation => state.operations[operation] || 'blocked'));
                return <div key={task.label} className="flex items-center gap-2 text-sm text-slate-700">
                  <span className={`w-5 h-5 rounded-[4px] border flex shrink-0 items-center justify-center ${checkboxClass[status]}`}>
                    {status === 'success' && '✓'}
                    {status === 'active' && <Icon icon="solar:refresh-bold" className="text-sm animate-spin" />}
                    {status === 'error' && <Icon icon="solar:close-circle-bold" className="text-sm" />}
                  </span>
                  <span>{task.label}</span>
                </div>;
              })}
            </div>
            {step.apiCalls.length > 0 && <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">API sử dụng</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {step.apiCalls.map(apiCall => <code key={apiCall} className="rounded bg-slate-100 px-1.5 py-1 text-[10px] font-medium text-slate-600">{apiCall}</code>)}
              </div>
            </div>}
            {step.number === 1 && <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
              <label className="block text-xs font-bold text-slate-600">VBot Partner API Key
                <input type="password" value={partnerApiKey} onChange={event => onPartnerApiKeyChange(event.target.value)} placeholder="Nhập API Key" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-sky-500" />
              </label>
              <label className="block text-xs font-bold text-slate-600">Cơ chế giao diện
                <select value={mode} onChange={event => onModeChange(event.target.value as IntegrationMode)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-sky-500">
                  <option value="builtin">Built-in Native UI</option>
                  <option value="headless">Headless Custom UI</option>
                </select>
              </label>
              <button onClick={onLoadData} disabled={isLoading} className="w-full rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:bg-slate-300">
                <Icon icon="solar:restart-bold" className={`mr-1 inline ${isLoading ? 'animate-spin' : ''}`} />{isLoading ? 'Đang tải dữ liệu…' : 'Tải dữ liệu'}
              </button>
            </div>}
            {step.number === 3 && sdkToken && <div className="mt-3 flex overflow-hidden rounded-lg border border-slate-200"><input readOnly value={sdkToken} aria-label="SDK token" className="min-w-0 flex-1 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-700 outline-none" /><button onClick={onCopyToken} title="Sao chép SDK token" aria-label="Sao chép SDK token" className="w-10 border-l border-slate-200 text-slate-600 hover:bg-slate-50"><Icon icon="solar:copy-bold" className="mx-auto" /></button></div>}
            {step.number === 3 && copyNotice && <p className="mt-2 text-xs text-emerald-700">{copyNotice}</p>}
          </li>
          {next && <li aria-hidden="true" className={`backend-flow-connector ${connectorClass(state, flowSteps[next.number])}`}><span /></li>}
        </React.Fragment>;
      })}
    </ol>
  </section>
);
