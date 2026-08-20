import React from 'react';
import { Icon } from '@iconify/react';

export type FlowStatus = 'pending' | 'active' | 'success' | 'error' | 'blocked';
export interface FlowStepState { status: FlowStatus; message?: string }
export type FlowSteps = Record<number, FlowStepState>;

const steps = [
  ['Chuẩn bị thông tin', 'Nhập API Key, Member No, chọn mode và hotline.', 'Không gọi API'],
  ['Tải hotline', 'Lấy danh sách hotline có thể cấp cho SDK.', 'GET /api/hotline/getAll'],
  ['Tải số dư tài khoản', 'Kiểm tra số dư tài khoản quản trị.', 'GET /api/account/balance'],
  ['Kiểm tra thành viên', 'Xác thực nhân viên sau khi tải số dư xong.', 'GET /api/member/getByMemberNo'],
  ['Cấp SDK token', 'Cấp token theo nhân viên và hotline đã chọn.', 'POST /api/sdk/tokenSdk'],
  ['Chạy code tích hợp', 'Thay placeholder token và nạp iframe preview.', 'Không gọi Open API'],
  ['SDK kết nối', 'Chờ sự kiện kết nối từ widget trong preview.', 'vbot:onUserConnected'],
];

const statusStyle: Record<FlowStatus, string> = {
  pending: 'bg-slate-100 text-slate-500 border-slate-200',
  active: 'bg-sky-50 text-sky-700 border-sky-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  error: 'bg-rose-50 text-rose-700 border-rose-200',
  blocked: 'bg-amber-50 text-amber-700 border-amber-200',
};
const statusText: Record<FlowStatus, string> = { pending: 'Chờ', active: 'Đang chạy', success: 'Hoàn tất', error: 'Lỗi', blocked: 'Đang chặn' };
const statusIcon: Record<FlowStatus, string> = { pending: 'solar:clock-circle-linear', active: 'solar:refresh-circle-bold', success: 'solar:check-circle-bold', error: 'solar:danger-circle-bold', blocked: 'solar:lock-keyhole-bold' };

export const ApiFlowDiagram: React.FC<{ flowSteps: FlowSteps }> = ({ flowSteps }) => (
  <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
      <div>
        <h2 className="font-bold text-slate-800 flex items-center gap-2"><Icon icon="solar:diagram-up-bold" className="text-sky-600" /> Luồng API thời gian thực</h2>
        <p className="text-xs text-slate-500 mt-1">Trạng thái cập nhật theo từng request và event SDK.</p>
      </div>
      <span className="text-[10px] font-bold uppercase text-slate-400">7 bước</span>
    </div>
    <ol className="p-4 space-y-2">
      {steps.map(([title, description, endpoint], index) => {
        const number = index + 1;
        const state = flowSteps[number];
        return <li key={title} className="relative flex gap-3">
          {number < steps.length && <span className="absolute left-[15px] top-9 h-5 border-l-2 border-dashed border-slate-200" />}
          <span className={`shrink-0 z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold border ${statusStyle[state.status]}`}>{number}</span>
          <div className={`flex-1 min-w-0 rounded-lg border px-3 py-2 ${state.status === 'active' ? 'border-sky-200 bg-sky-50/40' : 'border-slate-100'}`}>
            <div className="flex gap-2 justify-between items-start"><div className="font-bold text-xs text-slate-700">{title}<div className="font-mono text-[10px] text-slate-400 mt-0.5">{endpoint}</div></div>
              <span className={`shrink-0 inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle[state.status]}`}><Icon icon={statusIcon[state.status]} className={state.status === 'active' ? 'animate-spin' : ''} />{statusText[state.status]}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{state.message || description}</p>
          </div>
        </li>
      })}
    </ol>
  </section>
);
