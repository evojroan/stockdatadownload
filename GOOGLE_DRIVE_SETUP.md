# Google Drive 上傳設定指南

## 問題說明

如果您遇到以下錯誤：

```
Service Accounts do not have storage quota. Leverage shared drives or use OAuth delegation instead.
```

這是因為 **Google Service Accounts 沒有儲存配額**，無法直接上傳檔案到個人 Google Drive。

## 解決方案

### 方案一：OAuth 認證（推薦）

使用 OAuth 認證可以直接上傳到您的個人 Google Drive，無需共用雲端硬碟。

#### 步驟 1：取得 OAuth 憑證

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇您的專案（或建立新專案）
3. 啟用 Google Drive API：
   - 前往「API 和服務」→「程式庫」
   - 搜尋「Google Drive API」並啟用
4. 建立 OAuth 憑證：
   - 前往「API 和服務」→「憑證」
   - 點擊「建立憑證」→「OAuth 2.0 用戶端 ID」
   - 應用程式類型選擇「**電腦版應用程式**」（或「桌面應用程式」）
   - 為憑證命名（例如：Stock Data Uploader）
   - 記下 Client ID 和 Client Secret

#### 步驟 2：產生 Refresh Token

在本地執行以下指令：

```bash
node generate-oauth-token.js
```

按照提示操作：

1. 輸入 Client ID 和 Client Secret
2. 在瀏覽器中開啟授權網址並登入您的 Google 帳戶
3. 複製授權碼並貼回終端機
4. 記下產生的 Refresh Token

#### 步驟 3：設定 GitHub Secrets

在您的 GitHub repository 中設定以下 Secrets：

- `GOOGLE_CLIENT_ID`: 您的 OAuth Client ID
- `GOOGLE_CLIENT_SECRET`: 您的 OAuth Client Secret
- `GOOGLE_REFRESH_TOKEN`: 產生的 Refresh Token
- `GOOGLE_DRIVE_FOLDER_ID`: 目標 Google Drive 資料夾的 ID

**重要：請刪除或註解掉原有的 `GOOGLE_CREDENTIALS` Secret**

#### 步驟 4：取得 Google Drive 資料夾 ID

1. 在 Google Drive 中開啟目標資料夾
2. 從網址列複製資料夾 ID（在 `/folders/` 後面的字串）
   ```
   https://drive.google.com/drive/folders/1ABC123def456GHI789jkl
   資料夾 ID 就是：1ABC123def456GHI789jkl
   ```

### 方案二：使用共用雲端硬碟（Service Account）

如果您想繼續使用 Service Account，需要將目標資料夾移動到共用雲端硬碟。

#### 步驟 1：建立共用雲端硬碟

1. 在 Google Drive 中點擊「新增」→「更多」→「共用雲端硬碟」
2. 為共用雲端硬碟命名

#### 步驟 2：移動資料夾

1. 將您的目標資料夾移動到共用雲端硬碟中
2. 記下新的資料夾 ID

#### 步驟 3：加入 Service Account

1. 在共用雲端硬碟中右鍵點擊並選擇「共用」
2. 加入您的 Service Account 電子郵件（通常是 `xxx@yyy.iam.gserviceaccount.com`）
3. 設定權限為「內容管理員」

#### 步驟 4：更新環境變數

確保 GitHub Secrets 中有：

- `GOOGLE_CREDENTIALS`: Service Account 的 JSON 金鑰
- `GOOGLE_DRIVE_FOLDER_ID`: 共用雲端硬碟中資料夾的 ID

## 驗證設定

執行以下指令測試設定：

```bash
# 本地測試
node upload-to-drive.js

# 或在 GitHub Actions 中手動觸發工作流程
```

成功的話會看到：

```
✓ 使用 OAuth 2.0 用戶認證（推薦）
Google Drive API 初始化成功
✓ 父資料夾權限驗證通過
```

## 常見問題

### Q: OAuth 和 Service Account 有什麼差別？

- **OAuth**：使用您的個人 Google 帳戶權限，可以存取個人 Drive，有完整的儲存配額
- **Service Account**：獨立的服務帳戶，沒有儲存配額，只能存取共用雲端硬碟

### Q: 如何選擇適合的方案？

- 如果目標是**個人 Google Drive**：使用 OAuth（方案一）
- 如果目標是**企業/團隊共用空間**：使用 Service Account + 共用雲端硬碟（方案二）

### Q: Refresh Token 會過期嗎？

通常不會，但如果用戶超過 6 個月沒有使用，Google 可能會撤銷 token。定期執行可以避免這個問題。

### Q: 安全性考量？

- OAuth Refresh Token 只能存取您授權的 Google Drive
- 建議定期檢查並輪換憑證
- 在 GitHub Secrets 中妥善保管所有敏感資訊
