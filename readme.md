# 台股資料自動下載器

## 這是什麼？

本程式以 Playwright 製作，可以自動下載每日台股資料，包含：

- 每日上市收盤價
- 每日上櫃收盤價
- 每日上市買賣超
- 每日上櫃買賣超
- 於週六、日可再下載該週大股東持股資料

## 如何使用？

1. 安裝 Node.js 及 Playwright

   - [Node.js 安裝指南](https://nodejs.org/)
   - 安裝 Playwright：
     ```sh
     npm install playwright
     ```

2. 執行程式
   - 直接執行 `app.js`，或是執行已打包好的 `dailydownloader.exe`
   - 程式將會自動建立所需的資料夾並下載資料

## 本程式使用工具

- Node.js
- Playwright

## 尚待優化的地方

連結到每個網頁時，目前使用 page.waitForTimeout() 的方式等待網頁讀取完才繼續下一步動作。考量使用者的網路連線品質不一，超過等待的時間頁面可能尚未讀取完畢，導致程式無法順路執行。

## 本程式作者

Roan，專長是碎碎念。

- [Roan 的網誌](https://medium.com/@roan6903)
- [Roan 的 GitHub](https://github.com/evojroan)

# Taiwan Stock Data Auto Downloader

## What is this?

Built with Playwright, this program automatically downloads daily Taiwan stock data, including:

- Daily closing prices for listed stocks
- Daily closing prices for OTC stocks
- Daily buy/sell surplus for listed stocks
- Daily buy/sell surplus for OTC stocks
- On weekends, it also downloads the major shareholders' holdings for the week

## How to use?

1. Install Node.js and Playwright

   - [Node.js Installation Guide](https://nodejs.org/)
   - Install Playwright:
     ```
     npm install playwright
     ```

2. Run the program
   - Directly run `app.js`, or execute the packaged `dailydownloader.exe`
   - The program will automatically create the necessary folders and download the data

## Tools used in this program

- Node.js
- Playwright

## Areas for improvement

Currently, the program uses `page.waitForTimeout()` to wait for the web page to load before proceeding to the next step. Due to varying internet connection qualities among users, there might be instances where the page has not fully loaded after the wait time, causing the program to not run smoothly. A more robust waiting mechanism in future improvements is considered.

## Author of this program

Roan

- [Roan's Blog](https://medium.com/@roan6903)
- [Roan's GitHub](https://github.com/evojroan)
