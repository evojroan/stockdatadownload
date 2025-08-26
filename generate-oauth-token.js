const {google} = require("googleapis");
const readline = require("readline");
const http = require("http");
const url = require("url");
const open = require("open");

// OAuth 2.0 認證設定工具
async function generateOAuthToken() {
  console.log("=== Google Drive OAuth 2.0 認證設定工具 ===\n");

  // 步驟 1：創建 OAuth 客戶端
  console.log("步驟 1：前往 Google Cloud Console");
  console.log("1. 前往 https://console.cloud.google.com/");
  console.log("2. 選擇您的專案");
  console.log("3. 前往「API 和服務」→「憑證」");
  console.log("4. 點擊「建立憑證」→「OAuth 2.0 用戶端 ID」");
  console.log("5. 應用程式類型選擇「電腦版應用程式」（或「桌面應用程式」）");
  console.log("6. 為憑證命名並建立");
  console.log("7. 記下 Client ID 和 Client Secret\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // 輸入客戶端資訊
  const clientId = await question(rl, "請輸入 Client ID: ");
  const clientSecret = await question(rl, "請輸入 Client Secret: ");

  // 創建 OAuth2 客戶端
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "http://localhost:3000"
  );

  // 生成授權 URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive"]
  });

  console.log("\n步驟 2：授權應用程式");
  console.log("即將開啟瀏覽器進行授權...");
  
  try {
    // 取得授權碼
    const code = await getAuthorizationCode(authUrl);
    console.log("✓ 已收到授權碼");
    
    // 交換授權碼取得 tokens
    const {tokens} = await oauth2Client.getToken(code);

    console.log("\n✓ 認證成功！");
    console.log("\n請將以下環境變數加入 GitHub Secrets：");
    console.log("================================");
    console.log(`GOOGLE_CLIENT_ID=${clientId}`);
    console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("================================\n");

    console.log("注意：請刪除原有的 GOOGLE_CREDENTIALS 環境變數");
  } catch (error) {
    console.error("認證失敗:", error);
  }

  rl.close();
}

function question(rl, prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

// 啟動本地伺服器接收授權回調
function getAuthorizationCode(authUrl) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const queryObject = url.parse(req.url, true).query;
      
      if (queryObject.code) {
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
        res.end(`
          <html>
            <head><title>授權成功</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>✓ 授權成功！</h1>
              <p>您可以關閉此視窗，返回終端機繼續操作。</p>
            </body>
          </html>
        `);
        
        server.close();
        resolve(queryObject.code);
      } else if (queryObject.error) {
        res.writeHead(400, {'Content-Type': 'text/html; charset=utf-8'});
        res.end(`
          <html>
            <head><title>授權失敗</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>✗ 授權失敗</h1>
              <p>錯誤：${queryObject.error}</p>
            </body>
          </html>
        `);
        
        server.close();
        reject(new Error(`授權失敗: ${queryObject.error}`));
      }
    });

    server.listen(3000, () => {
      console.log("本地伺服器已啟動，正在開啟瀏覽器...");
      
      // 開啟瀏覽器
      open(authUrl).catch(() => {
        console.log("無法自動開啟瀏覽器，請手動開啟以下網址：");
        console.log(authUrl);
      });
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error('端口 3000 已被佔用，請關閉其他使用該端口的程式'));
      } else {
        reject(err);
      }
    });
  });
}

// 執行認證流程
generateOAuthToken().catch(console.error);
