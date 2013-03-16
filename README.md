# JS 注音輸入法 Firefox 附加元件

*[English](./README.en.md)*

可離線使用的自動選字注音輸入法 Firefox 附加元件，使用 [JS 注音](https://github.com/timdream/jszhuyin) 與 [add-on SDK](https://addons.mozilla.org/en-US/developers/builder) 製作。

## 授權

MIT License

## 編譯

[安裝 add-on SDK](https://addons.mozilla.org/en-US/developers/docs/sdk/latest/dev-guide/tutorials/installation.html)，取得 `cfx` 命令列工具。執行以下指令：

    git submodule init && git submodule update # 下載 JSZhuyin 檔案為 submodule
    make -C data/jszhuyin data # 從 McBopomofo 下載 JS 注音資料檔
    cfx xpi # 包裹 XPI

`jszhuyin-ime.xpi` 附加元件安裝檔會出現在目錄中。

請參考 [add-on SDK 文件](https://addons.mozilla.org/en-US/developers/docs/sdk/latest/dev-guide/tutorials/getting-started-with-cfx.html) 了解更多的 `cfx` 命令用途，例如 `cfx run`。

## 使用方法

按 **Ctrl+Alt+1**（Mac 為 **Command+Option+1**） 啟動輸入法，再按一次關閉。
輸入注音符號開始組字，用方向鍵選擇候選字。
選擇候選字或按 *Enter* 以輸入文字。
