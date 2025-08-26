const {google} = require("googleapis");
const fs = require("fs").promises;
const path = require("path");

// Google Drive 上傳功能
class GoogleDriveUploader {
  constructor() {
    this.drive = null;
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || "";
    this.isSharedDrive = false;
    this.driveId = null;
  }

  // 初始化 Google Drive API
  async initialize() {
    try {
      // 除錯：顯示環境變數狀態
      console.log("環境變數檢查:");
      console.log(
        "- GOOGLE_CLIENT_ID:",
        process.env.GOOGLE_CLIENT_ID ? "已設定" : "未設定"
      );
      console.log(
        "- GOOGLE_CLIENT_SECRET:",
        process.env.GOOGLE_CLIENT_SECRET ? "已設定" : "未設定"
      );
      console.log(
        "- GOOGLE_REFRESH_TOKEN:",
        process.env.GOOGLE_REFRESH_TOKEN ? "已設定" : "未設定"
      );
      console.log(
        "- GOOGLE_DRIVE_FOLDER_ID:",
        process.env.GOOGLE_DRIVE_FOLDER_ID ? "已設定" : "未設定"
      );

      // 檢查 OAuth 認證必要環境變數
      if (
        !process.env.GOOGLE_CLIENT_ID ||
        !process.env.GOOGLE_CLIENT_SECRET ||
        !process.env.GOOGLE_REFRESH_TOKEN
      ) {
        throw new Error(
          "缺少必要的 OAuth 環境變數。請確認已設定 GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET 和 GOOGLE_REFRESH_TOKEN"
        );
      }

      console.log("✓ 使用 OAuth 2.0 用戶認證");

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        "urn:ietf:wg:oauth:2.0:oob"
      );

      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });

      this.drive = google.drive({version: "v3", auth: oauth2Client});

      console.log("Google Drive API 初始化成功");

      // 驗證父資料夾權限
      await this.verifyParentFolder();
    } catch (error) {
      console.error("Google Drive API 初始化失敗:", error);
      throw error;
    }
  }

  // 驗證父資料夾權限
  async verifyParentFolder() {
    try {
      console.log(`檢查父資料夾權限 (ID: ${this.folderId})`);

      const response = await this.drive.files.get({
        fileId: this.folderId,
        fields: "id, name, permissions, capabilities, driveId",
        supportsAllDrives: true
      });

      console.log(`父資料夾名稱: ${response.data.name}`);
      console.log(`父資料夾權限:`, response.data.capabilities);

      // 檢查是否為共用雲端硬碟
      if (response.data.driveId) {
        console.log(`✓ 檢測到共用雲端硬碟 (ID: ${response.data.driveId})`);
        this.isSharedDrive = true;
        this.driveId = response.data.driveId;
      } else {
        console.log("⚠️  這是個人雲端硬碟資料夾");
        this.isSharedDrive = false;
      }

      if (!response.data.capabilities?.canAddChildren) {
        throw new Error("OAuth 認證的帳號沒有在此資料夾創建子資料夾的權限");
      }

      console.log("✓ 父資料夾權限驗證通過");
    } catch (error) {
      console.error("父資料夾權限驗證失敗:", error);
      console.log("請確認:");
      console.log("1. GOOGLE_DRIVE_FOLDER_ID 設定正確");
      console.log("2. OAuth 認證的 Google 帳號有存取此資料夾的權限");
      console.log("3. 資料夾 ID 對應的是你有權限存取的 Google Drive 資料夾");
      throw error;
    }
  }

  // 掃描並取得所有下載的檔案
  async getDownloadedFiles() {
    try {
      const files = [];
      const currentDir = process.cwd();

      // 讀取目錄內容
      const items = await fs.readdir(currentDir, {withFileTypes: true});

      for (const item of items) {
        if (
          item.isDirectory() &&
          item.name.includes("年") &&
          item.name.includes("月")
        ) {
          const dirPath = path.join(currentDir, item.name);
          const dirFiles = await fs.readdir(dirPath);

          for (const file of dirFiles) {
            if (file.endsWith(".csv")) {
              files.push({
                name: file,
                path: path.join(dirPath, file),
                folder: item.name
              });
            }
          }
        }
      }

      console.log(`找到 ${files.length} 個檔案需要上傳`);
      return files;
    } catch (error) {
      console.error("掃描檔案時發生錯誤:", error);
      return [];
    }
  }

  // 建立或取得日期資料夾
  async getOrCreateDateFolder(folderName) {
    try {
      // 搜尋是否已存在該日期資料夾
      const listOptions = {
        q: `name='${folderName}' and parents in '${this.folderId}' and mimeType='application/vnd.google-apps.folder'`,
        fields: "files(id, name)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      };

      const response = await this.drive.files.list(listOptions);

      if (response.data.files.length > 0) {
        console.log(`找到現有資料夾: ${folderName}`);
        return response.data.files[0].id;
      }

      // 建立新資料夾
      const folderMetadata = {
        name: folderName,
        parents: [this.folderId],
        mimeType: "application/vnd.google-apps.folder"
      };

      const createOptions = {
        resource: folderMetadata,
        fields: "id",
        supportsAllDrives: true
      };

      const folder = await this.drive.files.create(createOptions);

      console.log(`建立新資料夾: ${folderName} (ID: ${folder.data.id})`);
      return folder.data.id;
    } catch (error) {
      console.error(`建立資料夾 ${folderName} 時發生錯誤:`, error);
      throw error;
    }
  }

  // 上傳單一檔案
  async uploadFile(file, parentFolderId) {
    try {
      console.log(`開始上傳: ${file.name}`);

      // 檢查檔案是否已存在
      const existingFiles = await this.drive.files.list({
        q: `name='${file.name}' and parents in '${parentFolderId}'`,
        fields: "files(id, name)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      // 如果檔案已存在，先刪除舊檔案
      if (existingFiles.data.files.length > 0) {
        console.log(`檔案 ${file.name} 已存在，將覆蓋舊檔案`);
        await this.drive.files.delete({
          fileId: existingFiles.data.files[0].id,
          supportsAllDrives: true
        });
      }

      // 使用 fs.createReadStream 創建檔案流
      const fs_sync = require("fs");
      const fileStream = fs_sync.createReadStream(file.path);

      // 上傳檔案
      const fileMetadata = {
        name: file.name,
        parents: [parentFolderId]
      };

      const media = {
        mimeType: "text/csv",
        body: fileStream
      };

      const uploadOptions = {
        resource: fileMetadata,
        media: media,
        fields: "id, name",
        supportsAllDrives: true
      };

      const response = await this.drive.files.create(uploadOptions);

      console.log(`✓ 上傳成功: ${file.name} (ID: ${response.data.id})`);
      return response.data;
    } catch (error) {
      console.error(`上傳檔案 ${file.name} 時發生錯誤:`, error);
      throw error;
    }
  }

  // 主要上傳流程
  async uploadAll() {
    try {
      console.log("=== 開始 Google Drive 上傳流程 ===");

      // 初始化 API
      await this.initialize();

      // 取得所有下載的檔案
      const files = await this.getDownloadedFiles();

      if (files.length === 0) {
        console.log("沒有找到需要上傳的檔案");
        return;
      }

      // 按日期分組檔案
      const filesByDate = {};
      files.forEach(file => {
        if (!filesByDate[file.folder]) {
          filesByDate[file.folder] = [];
        }
        filesByDate[file.folder].push(file);
      });

      // 上傳每個日期的檔案
      for (const [dateFolder, dateFiles] of Object.entries(filesByDate)) {
        console.log(`\n處理日期資料夾: ${dateFolder}`);

        // 建立或取得日期資料夾
        const folderId = await this.getOrCreateDateFolder(dateFolder);

        // 上傳該日期的所有檔案
        for (const file of dateFiles) {
          await this.uploadFile(file, folderId);

          // 避免 API 限制，稍作延遲
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log("\n=== Google Drive 上傳完成 ===");
    } catch (error) {
      console.error("上傳流程發生錯誤:", error);
      process.exit(1);
    }
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  const uploader = new GoogleDriveUploader();
  uploader.uploadAll();
}

module.exports = GoogleDriveUploader;
