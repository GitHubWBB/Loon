/*
 * Loon 插件脚本：车辆限行查询 (修复版)
 * 原作者: Sliverkiss
 * 适配: Manus
 */

const NAMESPACE = '限行查询'
let $ = new Env(NAMESPACE);

// 定义一个 main 方法，用于处理所有的脚本逻辑
async function main() {
    try {
        // 获取数据
        let data = getData();
        // 加载模块
        $.Cheerio = await loadCheerio();
        // 获取网页
        let html = await getHtml(data.url);
        // 将 HTML 内容加载到 Cheerio
        const query = $.Cheerio.load(html);
        // 提取标题内容
        const title = query('.title-name.font').text().trim() || "限行查询";
        
        const limitList = query('.limit-list').first();
        const today = limitList.find('.today');
        const tomorrow = limitList.find('.tomorrow');

        const todayDate = today.find('.date').text().trim();
        const todayRule = today.find('.rule').text().trim();
        const tomorrowDate = tomorrow.find('.date').text().trim();
        const tomorrowRule = tomorrow.find('.rule').text().trim();

        // 获取限行详细信息
        const limitDetail = query('.limit-detail.xianxin').first();
        const limitTime = limitDetail.find('.limit-time .cicle-text').text().trim();
        const limitLocal = limitDetail.find('.limit-local .cicle-text').text().trim();

        let content = "";
        if (todayDate || todayRule) content += `今日限行: ${todayDate} ${todayRule}\n`;
        if (tomorrowDate || tomorrowRule) content += `明日限行: ${tomorrowDate} ${tomorrowRule}\n\n`;
        if (limitTime) content += `限行时间: ${limitTime}\n\n`;
        if (limitLocal) content += `限行区域: ${limitLocal.length >= 100 ? "详细限行规则请前往本地宝查看" : limitLocal}`;

        const cartype = decodeURIComponent(data.cartype || "燃油车");
        const loo = decodeURIComponent(data.loo || "本地车");

        return { title: `${title}信息 ${cartype} ${loo}`, content: content, icon: `car` };
    } catch (e) {
        throw e;
    }
}

// 主程序执行入口
!(async () => {
    $.info(`🔔 ${new Date().toLocaleString()}`);
    const { title, content, icon } = await main();
    $.msg(title, "", content, { "open-url": "http://m.bendibao.com/news/xianxingchaxun/" });
    $.done();
})()
    .catch(async e => {
        $.error(`❌ ${e.message || e}`);
        $.msg($.name, `❌ 运行出错`, `${e.message || e}`);
        $.done();
    });

// 获取网页数据
async function getHtml(url) {
    return new Promise((resolve, reject) => {
        $.http.get({ url: url }).then(response => {
            if (response && response.body) {
                resolve(response.body);
            } else {
                reject("未能获取到网页内容");
            }
        }).catch(err => reject(err));
    });
}

function getData() {
    let quires = getArgs();
    quires.city = quires.city || "cd";
    quires.cartype = quires.cartype || "燃油车";
    quires.loo = quires.loo || "本地车";
    
    const encodedCartype = encodeURIComponent(quires.cartype);
    const encodedLoo = encodeURIComponent(quires.loo);
    
    quires.url = quires.city === 'sz'
        ? 'http://m.bendibao.com/news/xianxingchaxun/'
        : `http://m.${quires.city}.bendibao.com/news/xianxingchaxun/index.php?category=${encodedCartype}&loo=${encodedLoo}`;
    return quires;
}

// 加载 cheerio
async function loadCheerio() { 
    let code = $.getdata("Cheerio_code") || ""; 
    if (code && code.length > 500) {
        $.info("缓存中存在Cheerio代码, 跳过下载");
        eval(code);
        return createCheerio();
    } else {
        $.info("开始下载Cheerio代码...");
        return new Promise((resolve, reject) => { 
            $httpClient.get("https://cdn.jsdelivr.net/gh/Yuheng0101/X@main/Utils/cheerio.js", (error, response, data) => {
                if (error) {
                    reject("下载Cheerio失败: " + error);
                } else {
                    $.setdata(data, "Cheerio_code");
                    eval(data); 
                    const cheerio = createCheerio(); 
                    $.info("Cheerio加载成功");
                    resolve(cheerio);
                }
            });
        });
    }
}

// 获取参数
function getArgs() { 
    let e = {}; 
    if (typeof $argument !== "undefined" && $argument) {
        try {
            $argument.split("&").forEach(item => {
                const [key, val] = item.split("=");
                if (key && val) e[key] = val;
            });
        } catch (err) {
            $.error("解析参数出错: " + err);
        }
    }
    $.info(`解析后的参数: ${JSON.stringify(e)}`);
    return e; 
}

// Env 类适配 Loon
function Env(name) {
    this.name = name;
    this.logs = [];
    this.info = (msg) => console.log(`[INFO] ${msg}`);
    this.error = (msg) => console.log(`[ERROR] ${msg}`);
    
    this.getdata = (key) => $persistentStore.read(key);
    this.setdata = (val, key) => $persistentStore.write(val, key);
    
    this.msg = (title = this.name, subtitle = "", body = "", opts = {}) => {
        const openUrl = opts["open-url"] || opts["url"] || opts["openUrl"];
        $notification.post(title, subtitle, body, openUrl ? { openUrl } : undefined);
    };
    
    this.http = {
        get: (opts) => {
            return new Promise((resolve, reject) => {
                $httpClient.get(opts, (error, response, data) => {
                    if (error) reject(error);
                    else resolve({ body: data, ...response });
                });
            });
        }
    };
    
    this.done = (obj = {}) => $done(obj);
}
