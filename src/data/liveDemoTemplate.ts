export type IntegrationMode = 'builtin' | 'headless';

export const SDK_TOKEN_PLACEHOLDER = '{{VBOT_SDK_TOKEN}}';

export const getLiveDemoTemplate = (mode: IntegrationMode, sdkBundleUrl = '{{VBOT_SDK_BUNDLE_URL}}') => `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="${sdkBundleUrl}" defer></script>
    <style>
      body { margin: 0; padding: 24px; font-family: Inter, system-ui, sans-serif; color: #1e293b; background: #f8fafc; }
      main { max-width: 540px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 14px; background: white; }
      h2 { margin: 0 0 8px; font-size: 18px; } p { color: #64748b; font-size: 14px; line-height: 1.5; }
      button { border: 0; border-radius: 8px; padding: 10px 14px; color: white; background: #0284c7; font-weight: 700; cursor: pointer; }
      #connection-status { padding: 10px; border-radius: 8px; background: #f1f5f9; font-weight: 600; }
    </style>
  </head>
  <body>
    <main>
      <h2>VBot Web SDK</h2>
      <p>${mode === 'headless' ? 'Headless mode: website của bạn tự xây dựng giao diện cuộc gọi.' : 'Built-in mode: VBot SDK cung cấp giao diện cuộc gọi mặc định.'}</p>
      <div class="actions">
        <button id="open-dialer" type="button">Mở bàn phím số</button>
        <button id="call-customer" type="button">Gọi khách hàng</button>
      </div>
      <p id="connection-status">Đang chờ SDK kết nối…</p>
      <vbot-widget
        id="vbot-widget"
        token="{{VBOT_SDK_TOKEN}}"
        base-url="{{VBOT_API_BASE_URL}}"
        config='{"enableFloatingBubble":true,"overlayPositions":{"dialpad":"bottom-right","calling":"bottom-right","incoming":"bottom-right"},"overlayMargins":{"dialpad":{"top":0,"right":16,"bottom":72,"left":0},"calling":{"top":0,"right":16,"bottom":72,"left":0},"incoming":{"top":0,"right":16,"bottom":72,"left":0}}}'
        {{VBOT_HEADLESS_ATTRIBUTE}}
      ></vbot-widget>
    </main>
    <script>
      // This script intentionally binds before the deferred SDK script upgrades the element.
      // It prevents short-lived connection events from being missed during startup.
      (function () {
        var widget = document.getElementById('vbot-widget');
        var status = document.getElementById('connection-status');
        var online = false;
        function setStatus(message) { status.textContent = message; }
        widget.addEventListener('vbot:onUserConnected', function () { online = true; setStatus('SDK trực tuyến — sẵn sàng gọi'); });
        widget.addEventListener('vbot:onUserConnectionFailed', function () { online = false; setStatus('SDK không thể kết nối. Kiểm tra token hoặc cấu hình.'); });
        widget.addEventListener('vbot:onCallIncoming', function () { setStatus('Có cuộc gọi đến'); });
        widget.addEventListener('vbot:onCallEnded', function () { setStatus(online ? 'SDK trực tuyến — cuộc gọi đã kết thúc' : 'Cuộc gọi đã kết thúc'); });
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
