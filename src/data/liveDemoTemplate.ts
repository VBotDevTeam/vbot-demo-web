export type IntegrationMode = 'builtin' | 'headless';

export const SDK_TOKEN_PLACEHOLDER = '{{VBOT_SDK_TOKEN}}';
export const SDK_WIDGET_INSERTION_MARKER = '<!-- DÁN ĐOẠN MÃ <vbot-widget> ĐÃ SAO CHÉP Ở PHẦN TRÊN VÀO ĐÂY -->';

export const getSdkWidgetSnippet = (
  mode: IntegrationMode,
  token = SDK_TOKEN_PLACEHOLDER,
  baseUrl = '{{VBOT_API_BASE_URL}}',
) => `<vbot-widget
  id="vbot-widget"
  token="${token}"
  base-url="${baseUrl}"
  config='{"enableFloatingBubble":true,"overlayPositions":{"dialpad":"bottom-right","calling":"bottom-right","incoming":"bottom-right"},"overlayMargins":{"dialpad":{"top":0,"right":16,"bottom":88,"left":0},"calling":{"top":0,"right":16,"bottom":88,"left":0},"incoming":{"top":0,"right":16,"bottom":88,"left":0}}}'
  ${mode === 'headless' ? 'headless="true"' : ''}
></vbot-widget>`;

export const getLiveDemoTemplate = (mode: IntegrationMode, sdkBundleUrl = '{{VBOT_SDK_BUNDLE_URL}}') => `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="${sdkBundleUrl}" defer></script>
    <style>
      html, body { width: 100%; min-height: 100%; }
      body { box-sizing: border-box; min-height: 100vh; margin: 0; font-family: Inter, system-ui, sans-serif; color: #1e293b; background: white; }
      main { box-sizing: border-box; width: 100%; min-height: 100vh; padding: 24px; background: white; }
      h2 { margin: 0 0 8px; font-size: 18px; } p { color: #64748b; font-size: 14px; line-height: 1.5; }
      button { border: 0; border-radius: 8px; padding: 10px 14px; color: white; background: #0284c7; font-weight: 700; cursor: pointer; }
      #connection-status { padding: 10px; border-radius: 8px; background: #f1f5f9; font-weight: 600; }
      .dialer-bubble { position: fixed; z-index: 10000; right: 24px; bottom: 24px; width: 48px; height: 48px; padding: 0; border-radius: 999px; background: #10b981; box-shadow: 0 10px 20px rgba(5, 150, 105, .28); display: inline-flex; align-items: center; justify-content: center; isolation: isolate; transition: opacity .15s ease, transform .15s ease, background .15s ease; }
      .dialer-bubble::before { content: ''; position: absolute; z-index: -1; inset: 0; border-radius: inherit; background: #34d399; pointer-events: none; animation: dialer-bubble-ping 1.25s cubic-bezier(0, 0, .2, 1) infinite; }
      .dialer-bubble.is-call-active { opacity: 0; pointer-events: none; transform: scale(.85); }
      .dialer-bubble:hover { background: #059669; transform: scale(1.05); }
      .dialer-bubble:focus-visible { outline: 3px solid #7dd3fc; outline-offset: 3px; }
      .dialer-bubble svg { width: 20px; height: 20px; }
      @keyframes dialer-bubble-ping { 0% { transform: scale(1); opacity: .55; } 75%, 100% { transform: scale(1.65); opacity: 0; } }
    </style>
  </head>
  <body>
    <main>
      <h2>VBot Web SDK</h2>
      <p>${mode === 'headless' ? 'Headless mode: website của bạn tự xây dựng giao diện cuộc gọi.' : 'Built-in mode: VBot SDK cung cấp giao diện cuộc gọi mặc định.'}</p>
      <div class="actions">
        <button id="call-customer" type="button">Gọi khách hàng</button>
      </div>
      <p id="connection-status">Đang chờ SDK kết nối…</p>
      <button id="open-dialer" class="dialer-bubble" type="button" title="Mở bàn phím số" aria-label="Mở bàn phím số">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="6" cy="6" r="2" /><circle cx="12" cy="6" r="2" /><circle cx="18" cy="6" r="2" />
          <circle cx="6" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="18" cy="12" r="2" />
          <circle cx="6" cy="18" r="2" /><circle cx="12" cy="18" r="2" /><circle cx="18" cy="18" r="2" />
        </svg>
      </button>
      ${SDK_WIDGET_INSERTION_MARKER}
    </main>
    <script>
      // This script intentionally binds before the deferred SDK script upgrades the element.
      // It prevents short-lived connection events from being missed during startup.
      (function () {
        var widget = document.getElementById('vbot-widget');
        var status = document.getElementById('connection-status');
        var dialerBubble = document.getElementById('open-dialer');
        var online = false;
        function setStatus(message) { status.textContent = message; }
        function syncBubbleVisibility(event) {
          var callState = event && event.detail && event.detail.state;
          dialerBubble.classList.toggle('is-call-active', callState === 'dialing' || callState === 'ringing' || callState === 'in-call');
        }
        widget.addEventListener('vbot:onUserConnected', function () { online = true; setStatus('SDK trực tuyến — sẵn sàng gọi'); });
        widget.addEventListener('vbot:onUserConnectionFailed', function () { online = false; setStatus('SDK không thể kết nối. Kiểm tra token hoặc cấu hình.'); });
        widget.addEventListener('vbot:onCallIncoming', function () { setStatus('Có cuộc gọi đến'); });
        widget.addEventListener('vbot:onCallStateChange', syncBubbleVisibility);
        widget.addEventListener('vbot:onCallEnded', function () { dialerBubble.classList.remove('is-call-active'); setStatus(online ? 'SDK trực tuyến — cuộc gọi đã kết thúc' : 'Cuộc gọi đã kết thúc'); });
        document.getElementById('open-dialer').addEventListener('click', function () {
          if (!online) { setStatus('SDK chưa trực tuyến, chưa thể mở bàn phím số.'); return; }
          if (typeof widget.showCallUI !== 'function') { setStatus('Chế độ Headless không có bàn phím số mặc định.'); return; }
          widget.showCallUI();
        });
        document.getElementById('call-customer').addEventListener('click', function () {
          if (!online) { setStatus('SDK chưa trực tuyến, chưa thể thực hiện cuộc gọi.'); return; }
          widget.makeCall('0900000000');
        });
      })();
    </script>
  </body>
</html>`;

export const productionSnippet = `const response = await fetch('/internal/vbot/sdk-token', {
  credentials: 'include',
});
if (!response.ok) throw new Error('Không lấy được SDK token');

const { token } = await response.json();
document.querySelector('vbot-widget').setAttribute('token', token);`;
