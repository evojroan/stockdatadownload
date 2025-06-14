const {chromium} = require("@playwright/test");
const fs = require("fs/promises"); // 使用 promises 版本
const cron = require("node-cron");

// 自定義日期格式化函數
function formatDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 月份從0開始
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

// 設定日期
let todayDate;

const today = new Date();
const dayOfWeek = today.getDay();

if (dayOfWeek === 6) {
  today.setDate(today.getDate() - 1);
} else if (dayOfWeek == 0) {
  today.setDate(today.getDate() - 2);
}

todayDate = formatDate(today);

//每週一到五自動下載檔案
cron.schedule("30 18 * * 1-5", async () => {
  const browser = await chromium.launch({headless: false});
  const page = await browser.newPage();
  console.log("Cron 開始執行股票資料下載...");

  // 每日上市收盤價
  await page.goto(
    "https://www.twse.com.tw/zh/trading/historical/mi-index.html"
  );
  await page.selectOption("#label1", "ALLBUT0999");
  await page.click("button.search");
  await page.waitForTimeout(2000);

  let downloadPromise = page.waitForEvent("download");
  await page.click("button.csv");

  let download = await downloadPromise;
  await fs.mkdir(todayDate, {recursive: true});
  await download.saveAs(`${todayDate}/${todayDate}上市收盤價.csv`);

  //每日上櫃收盤價
  await page.goto(
    "https://www.tpex.org.tw/web/stock/aftertrading/daily_close_quotes/stk_quote.php?l=zh-tw"
  );
  await page.waitForTimeout(2500);

  downloadPromise = page.waitForEvent("download");
  await page.click('button.response[data-format="csv"]');

  try {
    download = await downloadPromise;
    await download.saveAs(`${todayDate}/${todayDate}上櫃收盤價.csv`);
  } catch (error) {
    console.error("下載上櫃收盤價時出錯:", error);
  }

  //每日上市買賣超
  await page.goto("https://www.twse.com.tw/zh/trading/foreign/t86.html");
  await page.selectOption("#label1", "ALLBUT0999");
  await page.click("button.search");
  await page.waitForTimeout(2000);

  downloadPromise = page.waitForEvent("download");
  await page.click("button.csv");
  download = await downloadPromise;
  await fs.mkdir(todayDate, {recursive: true});
  await download.saveAs(`${todayDate}/${todayDate}上市買賣超.csv`);

  //每日上櫃買賣超
  await page.goto(
    "https://www.tpex.org.tw/web/stock/3insti/daily_trade/3itrade_hedge.php?l=zh-tw"
  );
  await page.waitForTimeout(2500);
  await page.selectOption("#___auto1", "EW");
  await page.waitForTimeout(2000);
  downloadPromise = page.waitForEvent("download");
  await page.click('button.response[data-format="csv"]');

  try {
    download = await downloadPromise;
    await download.saveAs(`${todayDate}/${todayDate}上櫃買賣超.csv`);
  } catch (error) {
    console.error("下載上櫃買賣超時出錯:", error);
  }

  await browser.close();
  console.log("股票資料下載完成！");
});

//每週六自動下載大戶資料
cron.schedule("15 10 * * 6", async () => {
  const browser = await chromium.launch({headless: false});
  const page = await browser.newPage();
  console.log("Cron 開始執行股票資料下載...");

  //週六日下載集保戶股權分散表
  if (dayOfWeek === 6 || dayOfWeek === 0) {
    await page.goto("https://data.gov.tw/dataset/11452");
    await page.waitForTimeout(2000);
    downloadPromise = page.waitForEvent("download");
    await page.click(
      'button.el-button.el-button--primary.is-plain span:has-text("CSV")'
    );
    download = await downloadPromise;
    await download.saveAs(`${todayDate}/${todayDate}當週大股東持股.csv`);
  }

  await browser.close();
  console.log("集保戶股權分散表下載完成！");
});
