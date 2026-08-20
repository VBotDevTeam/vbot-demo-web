# Kế hoạch triển khai trang “Demo live” VBot Web SDK

## 1. Mục tiêu tài liệu

Tài liệu này là đặc tả triển khai cho phase bổ sung một trang **Demo live** vào VBot Web SDK CRM Demo. Mục tiêu là giúp khách hàng hiểu được toàn bộ đường đi từ cấu hình VBot, lấy SDK token, đặt token vào mã HTML và nhìn thấy giao diện SDK chạy thực tế.

Đây là tài liệu dành cho người thực hiện phase code tiếp theo. Các quyết định dưới đây đã được chốt để tránh phải tự chọn lại trong khi triển khai.

## 2. Bối cảnh hiện tại

Ứng dụng hiện tại là React + TypeScript + Vite. `App.tsx` quản lý view bằng state nội bộ, gồm `crm`, `notebook` và `settings`; không có router. Thanh điều hướng được render bởi `src/components/TopNavbar.tsx`.

Màn cấu hình hiện tại ở `src/components/SettingsPage.tsx` đã thực hiện các hành vi sau:

1. Nhập Partner API Key, Member No và hotline.
2. Tải hotline qua `GET /api/hotline/getAll`.
3. Tải số dư admin qua `GET /api/account/balance`.
4. Tải thông tin/số dư nhân viên qua `GET /api/member/getByMemberNo?member_no=...`.
5. Lấy SDK token qua `POST /api/sdk/tokenSdk` với `member_no` và `hotline_codes`.
6. Render `<vbot-widget>` trong `App.tsx` và chờ event SDK như `vbot:onUserConnected`.

Bundle SDK được `index.html` nạp từ `/vbot-sdk.umd.js`. Base URL API lấy từ `VITE_API_BASE_URL`; code hiện tại fallback về `https://open-api-staging.vbot.vn/v3.0` khi biến môi trường không tồn tại.

## 3. Phạm vi và nguyên tắc

### 3.1. Trong phạm vi

- Thêm một view mới tên **Demo live**, mở bằng nút nằm cạnh nút **Cấu hình SDK** trên header.
- Bổ sung một màn hình mới gồm ba khu vực: cấu hình/token, sơ đồ luồng API theo thời gian thực, và playground HTML/CSS/JS có preview.
- Dùng đúng các Open API đang được demo hiện tại dùng để minh họa luồng trực tiếp bằng Partner API Key.
- Trình bày song song phương án production an toàn hơn: frontend lấy SDK token từ backend nội bộ thay vì cầm Partner API Key.
- Hỗ trợ hai chế độ widget: Built-in Native UI và Headless Custom UI.
- Có trạng thái loading, thành công, thất bại, retry và chỉ dẫn bước tiếp theo rõ ràng cho từng thao tác.

### 3.2. Ngoài phạm vi của phase này

- Không sửa giao diện, API call hoặc hành vi của `SettingsPage.tsx` hiện có.
- Không thay thế cơ chế điều hướng hiện tại bằng React Router và không tạo route URL riêng.
- Không thêm Monaco, CodeMirror, Babel, React runtime trong iframe, hoặc tính năng chạy TSX/React ở editor. Phiên bản đầu chỉ chạy HTML/CSS/JavaScript thuần.
- Không xây backend `/internal/vbot/sdk-token`; phần này chỉ là ví dụ để hướng dẫn production.
- Không lưu Partner API Key hoặc SDK token của Demo live vào `localStorage`.
- Không thay đổi bundle SDK trong `public/vbot-sdk.umd.js`.

### 3.3. Tiêu chí thành công

Người dùng có thể hoàn thành theo thứ tự sau mà không cần đọc mã nguồn ứng dụng:

1. Nhập API Key, Member No và chọn hotline.
2. Bấm **Tải dữ liệu** và quan sát chính xác API nào đang chạy, thành công hay lỗi.
3. Bấm **Đồng bộ SDK** và hiểu đây là lúc hệ thống nhận JWT token.
4. Quan sát code mẫu HTML có placeholder token, bấm **Chạy code**.
5. Thấy `<vbot-widget>` render trong preview và sơ đồ chuyển sang SDK đang kết nối/trực tuyến khi event tương ứng phát ra.
6. Biết rằng khi triển khai production, Partner API Key phải đặt ở backend, không đặt vào code frontend.

## 4. Kiến trúc giao diện và điều hướng

### 4.1. Điều hướng

Mở rộng kiểu `currentView` trong `App.tsx` từ:

```ts
'crm' | 'notebook' | 'settings'
```

thành:

```ts
'crm' | 'notebook' | 'settings' | 'live-demo'
```

Mở rộng kiểu props của `TopNavbar` tương ứng. Thêm nút **Demo live** trong cụm thao tác bên phải, đặt ngay sau nút **Cấu hình SDK**. Nút gọi `onViewChange('live-demo')`.

`App.tsx` render `LiveDemoPage` khi `currentView === 'live-demo'`. Không truyền token, trạng thái kết nối hay callback của `App` vào component mới; trang mới tự quản lý toàn bộ trạng thái phiên minh họa của nó. Điều này bảo đảm Demo live không làm thay đổi widget, auto-connect và `localStorage` của trang demo cũ.

### 4.2. Các tệp dự kiến

| Tệp | Thay đổi |
| --- | --- |
| `src/App.tsx` | Mở rộng union view, import và render `LiveDemoPage`. |
| `src/components/TopNavbar.tsx` | Mở rộng kiểu view, thêm nút **Demo live**. |
| `src/components/LiveDemoPage.tsx` | Component điều phối màn hình, state, gọi API, flow và runner preview. |
| `src/components/ApiFlowDiagram.tsx` | Hiển thị sơ đồ các bước, endpoint và trạng thái real time. |
| `src/components/LiveCodePlayground.tsx` | Editor textarea, template, chạy iframe, nhận event từ preview. |
| `src/data/liveDemoTemplate.ts` | Template HTML/CSS/JS, snippet production, type message iframe nếu cần tách riêng. |
| `src/index.css` | Chỉ bổ sung style global khi Tailwind utility không diễn đạt được rõ ràng. |

Tên file có thể gộp `ApiFlowDiagram` và `LiveCodePlayground` vào `LiveDemoPage` nếu component nhỏ, nhưng tách component được ưu tiên để logic API, sơ đồ và iframe dễ kiểm thử/thay đổi độc lập.

## 5. Thiết kế màn hình Demo live

Màn hình dùng layout responsive:

- Desktop: hàng đầu là **Cấu hình** và **Sơ đồ luồng API** đặt cạnh nhau; hàng dưới là **Code playground** và **Preview UI** đặt cạnh nhau.
- Tablet/mobile: bốn khối xếp dọc theo thứ tự cấu hình → luồng API → code → preview.
- Các card sử dụng hệ màu/slate, sky, emerald hiện có để đồng nhất với UI cũ.

### 5.1. Card cấu hình và cấp token

Card này cần có các phần sau:

- Select **Cơ chế giao diện** với `builtin` mặc định và `headless`.
- Input `type=password` cho **VBot Partner API Key**.
- Input text cho **Mã nhân viên (Member No)**.
- Danh sách checkbox hotline sau khi tải thành công; khi chưa có hotline thì hiện trạng thái hướng dẫn tải dữ liệu, không dùng fallback nhập tay ở phiên bản mới để luồng dễ hiểu.
- Nút **Tải dữ liệu**.
- Nút **Đồng bộ SDK**, chỉ enabled khi API Key và Member No không rỗng. Hotline không bị ép ở client để giữ đúng hành vi API hiện tại, nhưng UI hiển thị cảnh báo mềm nếu chưa chọn hotline.
- Nhãn trạng thái token: `Chưa có token`, `Đang cấp token`, `Đã sẵn sàng chạy code` hoặc `Cấp token thất bại`.
- Khu vực phản hồi API rút gọn: hiển thị endpoint, HTTP status/`error`, `message` đã sanitize. Tuyệt đối không render `result.data` nếu đó là token JWT.

Khi người dùng đổi API Key, Member No, mode hoặc hotline sau khi token đã được cấp, đánh dấu token là **cần đồng bộ lại** và vô hiệu hóa nút chạy code cho đến khi token mới được cấp. Token cũ được xóa khỏi state ngay lúc dữ liệu đầu vào thay đổi để tránh preview chạy sai member/hotline.

### 5.2. Sơ đồ luồng API thời gian thực

Sơ đồ phải là nguồn giải thích chính, không chỉ là danh sách endpoint. Mỗi node gồm số thứ tự, tên thao tác, endpoint/method, mô tả một câu và badge trạng thái.

Chuỗi node chuẩn:

1. **Chuẩn bị thông tin** — nhập Partner API Key, Member No, chọn mode và hotline; không gọi API.
2. **Tải hotline** — `GET /api/hotline/getAll`.
3. **Tải số dư tài khoản** — `GET /api/account/balance`.
4. **Kiểm tra thành viên** — `GET /api/member/getByMemberNo?member_no=...`; chỉ bắt đầu sau khi API số dư admin hoàn tất thành công hoặc thất bại, tương ứng với luồng `fetchBalances` hiện tại.
5. **Cấp SDK token** — `POST /api/sdk/tokenSdk` với `{ member_no, hotline_codes }`.
6. **Chạy code tích hợp** — thay placeholder token trong editor và nạp iframe preview; không gọi Open API.
7. **SDK kết nối** — chờ `vbot:onUserConnected`; đây là event từ widget, không phải HTTP API.

Các trạng thái node gồm `pending`, `active`, `success`, `error`, `blocked`. Cách hiển thị đề xuất:

- `pending`: xám, chưa sẵn sàng.
- `active`: xanh dương và spinner, đang thực hiện.
- `success`: xanh lá và dấu tick.
- `error`: đỏ và biểu tượng lỗi; hiển thị message rút gọn dưới node.
- `blocked`: vàng; chỉ ra dữ liệu/nguyên nhân cần hoàn thành trước, ví dụ chưa có API Key hoặc token cần đồng bộ lại.

Luồng khi bấm **Tải dữ liệu**:

1. Reset trạng thái node 2–4 và dữ liệu kết quả cũ liên quan.
2. Khởi động node 2 và node 3 cùng lúc.
3. `GET /api/hotline/getAll` thành công cập nhật danh sách checkbox; thất bại chỉ đánh dấu node lỗi.
4. `GET /api/account/balance` hoàn thành rồi chuyển node 4 sang `active` nếu Member No hợp lệ.
5. Node 4 cập nhật chi tiết member/số dư hoặc hiện lỗi rõ ràng.
6. Node 5 ở `pending` khi dữ liệu có thể sẵn sàng; node 6–7 ở `blocked` cho đến khi token được cấp.

Luồng khi bấm **Đồng bộ SDK**:

1. Validate API Key và Member No tại client; nếu thiếu, đánh dấu node 5 là `blocked`, focus ô còn thiếu và không gửi request.
2. Đặt node 5 là `active`, gọi API token với `X-API-Key` và `Content-Type: application/json`.
3. Khi `result.error === 0` và `result.data` có giá trị, lưu token trong `useState`, đặt node 5 `success`, node 6 `pending` và hiện chỉ dẫn “Dán/chỉnh sửa code rồi bấm Chạy code”.
4. Khi API/lỗi mạng thất bại, đặt node 5 `error`; không lưu token và không được phép chạy preview.

Luồng khi chạy preview:

1. Đặt node 6 `active`, tạo nội dung iframe từ code editor + instrumentation script.
2. Khi iframe tải xong, node 6 `success`; node 7 `active` trong thời gian chờ event SDK.
3. Khi nhận `vbot:onUserConnected`, node 7 `success`, thông báo “SDK trực tuyến, có thể gọi”.
4. Khi nhận `vbot:onUserConnectionFailed`, `vbot:onDisconnected` hoặc `vbot:onUserDisconnected`, node 7 thành `error` hoặc `pending` với thông điệp phù hợp.

### 5.3. Code playground

Playground gồm header chỉ dẫn, editor và các nút:

- **Chạy code**: yêu cầu token hợp lệ và placeholder token.
- **Đặt lại mẫu**: phục hồi template mặc định; không xác nhận thêm vì editor chưa có cơ chế lưu nháp.
- **Sao chép code**: sao chép bản code vẫn giữ `{{VBOT_SDK_TOKEN}}`, không bao giờ sao chép token thật.
- Badge chế độ Built-in/Headless và trạng thái phiên preview.

Không cài thêm editor dependency. Dùng `textarea` monospace, có resize/scroll hợp lý; có thể tạo gutter số dòng bằng CSS hoặc bỏ qua số dòng nếu làm ảnh hưởng trải nghiệm. Đây là lựa chọn chủ đích nhằm giữ bundle nhỏ và tránh xây compiler.

Template mặc định cần chứa:

```html
<script src="/vbot-sdk.umd.js" defer></script>

<button id="call-customer" type="button">Gọi khách hàng</button>
<p id="connection-status">Đang chờ SDK kết nối…</p>
<vbot-widget
  id="vbot-widget"
  token="{{VBOT_SDK_TOKEN}}"
  base-url="{{VBOT_API_BASE_URL}}"
></vbot-widget>
```

Phần JavaScript mẫu cần:

- Chờ custom element/script sẵn sàng theo cách phù hợp với bundle SDK hiện có.
- Lắng nghe `vbot:onUserConnected`, `vbot:onUserConnectionFailed`, `vbot:onCallIncoming`, `vbot:onCallEnded`.
- Cập nhật text trạng thái trong preview.
- Gọi `widget.makeCall('0900000000')` từ nút ví dụ, chỉ sau khi SDK online; nếu chưa online thì báo trong preview thay vì throw lỗi.
- Khi chọn Headless, template thêm `headless="true"` vào widget và ghi chú rằng website đối tác tự chịu trách nhiệm xây call UI. Built-in không có thuộc tính `headless`.

Nội dung editor là do người dùng kiểm soát. Nút **Chạy code** thực hiện thay thế placeholder:

- `{{VBOT_SDK_TOKEN}}`: token đã cấp trong memory, được encode/escape an toàn khi đưa vào HTML attribute.
- `{{VBOT_API_BASE_URL}}`: base URL cấu hình hiện hành, được escape tương tự.
- `{{VBOT_HEADLESS_ATTRIBUTE}}`: chuỗi `headless="true"` hoặc chuỗi rỗng, nếu dùng để làm template rõ ràng hơn.

Nếu token chưa tồn tại, hiển thị “Hãy hoàn thành bước Cấp SDK token trước”. Nếu editor không có `{{VBOT_SDK_TOKEN}}`, hiển thị “Code chưa tham chiếu SDK token; hãy thêm placeholder để widget có thể kết nối”. Không tự ghi token vào editor.

### 5.4. Preview và isolation

Preview dùng `iframe` với `srcDoc` và thuộc tính `sandbox="allow-scripts"`; không bật `allow-same-origin`. Code do người dùng chỉnh sửa vì vậy không truy cập được DOM/state/localStorage của trang React cha.

Trước khi đặt `srcDoc`, component nối thêm một instrumentation script do hệ thống kiểm soát. Script này:

1. Tìm `vbot-widget` sau khi document tải hoặc bằng `MutationObserver` ngắn hạn nếu widget được tạo muộn.
2. Gắn listener cho các event SDK cần hiển thị.
3. Gửi message có schema cố định về parent bằng `window.parent.postMessage`.
4. Không gửi token, Partner API Key hoặc raw event payload; chỉ gửi `runId`, tên event và dữ liệu an toàn như số điện thoại đã mask.

Parent chỉ xử lý message khi `event.source === iframeRef.current?.contentWindow`, `runId` trùng phiên chạy hiện tại và message đúng schema. Điều này ngăn iframe cũ hoặc window khác làm sai trạng thái flow.

Mỗi lần bấm **Chạy code**, tăng `runId` và thay toàn bộ `srcDoc`. Việc này hủy widget/handler của lần chạy trước, tránh kết nối SDK cũ còn tồn tại. Preview hiển thị empty state trước khi người dùng chạy và error state nếu iframe không báo tải hoặc SDK phát event lỗi.

## 6. Hợp đồng state, API và dữ liệu

### 6.1. State tối thiểu của `LiveDemoPage`

```ts
type IntegrationMode = 'builtin' | 'headless';
type FlowStatus = 'pending' | 'active' | 'success' | 'error' | 'blocked';

interface FlowStepState {
  status: FlowStatus;
  message?: string;
  updatedAt?: number;
}
```

State cần quản lý tối thiểu:

- `partnerApiKey`, `memberNo`, `mode`.
- `availableHotlines`, `selectedHotlineCodes`.
- `adminBalance`, `memberInfo`, `memberBalance` nếu card có hiển thị thông tin phụ.
- `sdkToken` chỉ trong memory.
- `flowSteps` keyed theo bảy node nêu ở phần 5.2.
- `apiSummaries` để hiện request/result đã sanitize.
- `editorCode`, `previewSrcDoc`, `previewRunId`, `previewStatus`.

Không dùng các key `vbot_partner_key`, `vbot_access_token`, `vbot_auto_connect`, `vbot_available_hotlines` hoặc `vbot_selected_hotlines` của trang cũ. Partner API Key và token Demo live chỉ tồn tại cho đến khi người dùng rời trang hoặc refresh browser.

### 6.2. Request Open API

Base URL:

```ts
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://open-api-staging.vbot.vn/v3.0';
```

Các request giữ nguyên convention demo hiện hành:

| Mục đích | Method và endpoint | Header | Body |
| --- | --- | --- | --- |
| Tải hotline | `GET /api/hotline/getAll` | `X-API-Key`, `Accept: application/json` | Không có |
| Lấy số dư admin | `GET /api/account/balance` | `X-API-Key`, `Accept: application/json` | Không có |
| Lấy member | `GET /api/member/getByMemberNo?member_no=...` | `X-API-Key`, `Accept: application/json` | Không có |
| Lấy token | `POST /api/sdk/tokenSdk` | `X-API-Key`, `Content-Type: application/json` | `{ member_no, hotline_codes }` |

Tách các hàm `fetchHotlines`, `fetchBalances`, `fetchMember`, `requestSdkToken` trong component hoặc hook nội bộ. Mỗi hàm phải kiểm tra `response.ok` trước khi parse JSON an toàn, sau đó kiểm tra `payload.error === 0`. Khi server trả body không phải JSON, chuyển thành lỗi có thông báo dễ hiểu; không expose raw Partner API Key hoặc token vào lỗi/UI/log.

## 7. Phần hướng dẫn production

Phía dưới/sát playground thêm một card mở rộng mặc định, tiêu đề **Khi đưa vào website thật**. Card giải thích rõ hai luồng:

### Luồng thử nghiệm trên Demo live

Browser → VBot Open API với Partner API Key → SDK token → iframe/widget.

Luồng này được phép trong trang demo để người tích hợp quan sát API nhưng không là cấu trúc an toàn cho production.

### Luồng production được khuyến nghị

Browser/website đối tác → `GET /internal/vbot/sdk-token` → backend đối tác → `POST /api/sdk/tokenSdk` với Partner API Key trên server → backend trả SDK token ngắn hạn → frontend gắn token vào `<vbot-widget>`.

Kèm snippet copyable minh họa:

```js
const response = await fetch('/internal/vbot/sdk-token', {
  credentials: 'include',
});
if (!response.ok) throw new Error('Không lấy được SDK token');

const { token } = await response.json();
document.querySelector('vbot-widget').setAttribute('token', token);
```

Snippet production không chạy trong iframe demo vì repository không có backend endpoint đó. Copy button của snippet không chứa Partner API Key.

## 8. Quy tắc bảo mật và riêng tư

- Không persist Partner API Key, JWT SDK token, raw API response chứa token hoặc dữ liệu nhạy cảm của Demo live.
- Input API Key luôn là `type=password`; không có nút “hiện key” ở phase này.
- Không in `result.data` của `tokenSdk`, request headers hoặc token vào console, cURL, flow diagram, preview, clipboard hay error message.
- `postMessage` từ iframe chỉ đưa dữ liệu event đã tối giản; số điện thoại nếu hiển thị cần mask, ví dụ `090****000`.
- Preview sandbox không có same-origin để code nhập vào không đọc được state React của parent.
- Production card phải nói rõ API Key chỉ được giữ trong environment/secret manager của backend đối tác; token SDK có thời hạn ngắn và phải làm mới qua backend khi hết hạn.

## 9. Xử lý lỗi và các trường hợp biên

| Tình huống | Hành vi bắt buộc |
| --- | --- |
| Bấm tải khi không có API Key | Không gọi API, focus input key, node liên quan là `blocked`. |
| Member No trống | Vẫn có thể tải hotline/số dư admin; node kiểm tra member là `blocked`, đồng bộ token bị chặn. |
| Không tải được hotline | Giữ lỗi node hotline nhưng vẫn cho phép thử lại tải dữ liệu; không dùng hotline cũ của page khác. |
| Member không tồn tại | Hiển thị lỗi/message ở node member; không suy diễn member hợp lệ. |
| Token API lỗi | Không tạo iframe mới, xóa token state, node cấp token là `error`. |
| Người dùng thay Member No/hotline/mode sau token | Xóa token, đánh dấu node token và preview `blocked`, yêu cầu đồng bộ lại. |
| Code editor bị xóa hoặc không có placeholder | Không chạy preview SDK, thông báo cách thêm `{{VBOT_SDK_TOKEN}}`. |
| Code runtime lỗi | Preview báo lỗi chung và flow node chạy code là `error`; không render nội dung lỗi có thể chứa token. |
| SDK không kết nối | Node SDK kết nối hiển thị event lỗi/disconnect; không tự retry token để tránh request ngoài ý muốn. |
| Chạy code liên tiếp | Reset iframe và trạng thái event theo `runId`; chỉ phiên mới nhất được cập nhật UI. |

## 10. Trình tự triển khai đề xuất

1. Tạo type view mới trong `App.tsx`/`TopNavbar.tsx`, thêm nút Demo live và render empty component để xác minh navigation không làm hỏng ba view cũ.
2. Tạo `LiveDemoPage` với layout/card tĩnh và state đầu vào; kiểm tra responsive ở desktop/mobile.
3. Viết service/hàm request API, xử lý `loading`/`error`, tạo card cấu hình và kết quả hotline/member/balance.
4. Xây `ApiFlowDiagram`, nối các lifecycle API vào bảy node và kiểm tra mọi nhánh reset/retry.
5. Tạo template và `LiveCodePlayground`, triển khai validation placeholder, copy/reset và tạo `srcDoc` an toàn.
6. Thêm iframe instrumentation + `postMessage`, gắn event SDK vào flow diagram và thử Built-in/Headless.
7. Thêm card production/security, rà soát để bảo đảm không có key/token bị render/log/copy.
8. Lint, build và chạy checklist nghiệm thu.

## 11. Kế hoạch kiểm thử và nghiệm thu

### 11.1. Kiểm thử điều hướng và hồi quy

- Nút **Demo live** xuất hiện cạnh **Cấu hình SDK**, active state rõ ràng.
- Chuyển qua lại Demo live, Example, Hướng dẫn tích hợp và Cấu hình SDK không gây crash.
- `SettingsPage` cũ vẫn dùng state/localStorage và luồng widget cũ như trước.

### 11.2. Kiểm thử flow API

- API Key hợp lệ: node hotline và balance active đồng thời; member chỉ chạy sau balance.
- API Key sai/CORS/network: node tương ứng lỗi, message dễ hiểu, có thể retry.
- Member No trống, member không tồn tại, hotline không được chọn, token API trả `error !== 0`.
- Thành công token: code editor không đổi token placeholder, chỉ button Run được enabled.
- Đổi mode/member/hotline sau khi token thành công: token bị invalidated và preview không còn được chạy.

### 11.3. Kiểm thử playground

- Template Built-in không có `headless`; template Headless có `headless="true"`.
- Chạy code khi chưa có token và khi thiếu placeholder đều cho feedback đúng.
- Chạy với token hợp lệ render widget trong iframe; event connected cập nhật node cuối.
- Bấm reset, copy code, chạy nhiều lần liên tiếp.
- JavaScript người dùng lỗi không ảnh hưởng React parent; iframe không truy cập được `localStorage` hoặc DOM parent.
- Copy/paste/editor/preview không làm lộ API Key hay JWT token.

### 11.4. Kiểm tra kỹ thuật cuối cùng

Chạy:

```bash
pnpm lint
pnpm build
```

Thực hiện smoke test trên trình duyệt với tài khoản thử nghiệm hợp lệ, sau đó kiểm tra DevTools Console/Network để xác nhận không có token hoặc Partner API Key bị log bởi code mới.

## 12. Tiêu chí bàn giao

Phase được coi là hoàn thành khi:

- Màn Demo live hoạt động độc lập, trang cũ không bị thay đổi về chức năng.
- Sơ đồ trình bày đúng thứ tự gọi API và event SDK theo thời gian thực.
- Preview chạy được HTML/CSS/JS mẫu với token tự chèn nhưng token không bị lộ trong code/UI.
- Người dùng phân biệt rõ demo trực tiếp với luồng production qua backend.
- Lint và build thành công; checklist smoke test đã được thực hiện với cả Built-in và Headless.
