import React from 'react';
import { Icon } from '@iconify/react';

export type FlowStatus = 'pending' | 'active' | 'success' | 'error' | 'blocked';
export type FlowOperation = 'hotlines' | 'adminBalance' | 'sdkToken' | 'sdkHotlines' | 'funding' | 'tokenSaved';

export interface FlowStepState {
  status: FlowStatus;
  message?: string;
  operations: Partial<Record<FlowOperation, FlowStatus>>;
}

export type FlowSteps = Record<1 | 2 | 3, FlowStepState>;

const steps: Array<{
  number: 1 | 2 | 3;
  title: string;
  description: string;
  operations: Array<{ id: FlowOperation; label: string; endpoint?: string }>;
}> = [
  {
    number: 1,
    title: 'Chuẩn bị dữ liệu',
    description: 'Backend dùng Partner API Key để tải dữ liệu ban đầu.',
    operations: [
      { id: 'hotlines', label: 'Danh sách hotline', endpoint: 'GET /api/hotline/getAll' },
      { id: 'adminBalance', label: 'Số dư admin', endpoint: 'GET /api/account/balance' },
    ],
  },
  {
    number: 2,
    title: 'Cấu hình tài khoản SDK',
    description: 'Gán hotline, cấp token và chuẩn bị số dư cho tài khoản SDK.',
    operations: [
      { id: 'sdkToken', label: 'Cấp SDK token', endpoint: 'POST /api/sdk/tokenSdk' },
      { id: 'sdkHotlines', label: 'Hotline của tài khoản SDK', endpoint: 'GET /api/sdk/getHotline' },
      { id: 'funding', label: 'Nạp / trừ số dư', endpoint: 'POST /api/member/addMoney' },
    ],
  },
  {
    number: 3,
    title: 'Lưu SDK token',
    description: 'Backend trả token ngắn hạn để website gắn vào VBot Web SDK.',
    operations: [{ id: 'tokenSaved', label: 'SDK token đã sẵn sàng' }],
  },
];

const statusIcon: Record<FlowStatus, string> = {
  pending: 'solar:clock-circle-linear',
  active: 'solar:refresh-circle-bold',
  success: 'solar:check-circle-bold',
  error: 'solar:danger-circle-bold',
  blocked: 'solar:lock-keyhole-bold',
};

const statusText: Record<FlowStatus, string> = {
  pending: 'Chờ thao tác',
  active: 'Đang xử lý',
  success: 'Hoàn thành',
  error: 'Cần kiểm tra',
  blocked: 'Chưa sẵn sàng',
};

const operationStyle: Record<FlowStatus, string> = {
  pending: 'text-slate-400', active: 'text-sky-600', success: 'text-emerald-600', error: 'text-rose-600', blocked: 'text-slate-300',
};

const connectorClass = (current: FlowStepState, next: FlowStepState) => {
  if (current.status === 'success' && ['active', 'success'].includes(next.status)) return 'backend-flow-connector--complete';
  if (current.status === 'active' || next.status === 'active') return 'backend-flow-connector--active';
  return '';
};

export const ApiFlowDiagram: React.FC<{ flowSteps: FlowSteps }> = ({ flowSteps }) => (
  <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
      <div>
        <h2 className="font-bold text-slate-800 flex items-center gap-2"><Icon icon="solar:server-path-bold" className="text-sky-600" /> Sơ đồ xử lý backend đối tác</h2>
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
            <div className="flex items-start gap-3">
              <span className="backend-flow-number shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold">{state.status === 'success' ? <Icon icon="solar:check-circle-bold" className="text-xl" /> : step.number}</span>
              <div className="min-w-0 flex-1">
                <div className="flex gap-2 items-start justify-between">
                  <h3 className="font-bold text-sm text-slate-800">{step.number}. {step.title}</h3>
                  <span className="backend-flow-status shrink-0 text-[10px] font-bold inline-flex items-center gap-1"><Icon icon={statusIcon[state.status]} className={state.status === 'active' ? 'animate-spin' : ''} />{statusText[state.status]}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{state.message || step.description}</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              {step.operations.map(operation => {
                const operationStatus = state.operations[operation.id] || 'blocked';
                return <div key={operation.id} className="flex items-start gap-2 text-xs">
                  <Icon icon={statusIcon[operationStatus]} className={`mt-0.5 shrink-0 ${operationStyle[operationStatus]} ${operationStatus === 'active' ? 'animate-spin' : ''}`} />
                  <span className="min-w-0 text-slate-600"><span className="font-semibold">{operation.label}</span>{operation.endpoint && <code className="block text-[10px] text-slate-400 mt-0.5 break-all">{operation.endpoint}</code>}</span>
                </div>;
              })}
            </div>
          </li>
          {next && <li aria-hidden="true" className={`backend-flow-connector ${connectorClass(state, flowSteps[next.number])}`}><span /></li>}
        </React.Fragment>;
      })}
    </ol>
  </section>
);
