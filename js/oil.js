/*************************************
 * ⛽ 油价终极版 Pro（Loon 专用）
 * 支持：参数化 + 国际油价 + 汇率 + 趋势 + 倒计时
 *************************************/

// ===== 读取参数 =====
const args = parseArgs();

const CONFIG = {
  city: args.city || "北京",
  intl: args.intl !== "false",
  notify: args.notify !== "false"
};

(async () => {

  let oil = await getDomestic(CONFIG.city);
  let trend = calcTrend(oil.p92);
  let trendList = saveTrend(CONFIG.city, oil.p92);

  let intl = CONFIG.intl ? await getIntl() : null;
  let fx = CONFIG.intl ? await getFX() : null;

  let countdown = getCountdown();

  let msg = buildMsg(oil, trend, trendList, intl, fx, countdown);

  // ===== 通知控制 =====
  if (CONFIG.notify) {
    $notification.post(`⛽ 油价面板 [${CONFIG.city}]`, "", msg);
  } else {
    console.log(msg);
  }

  $done();

})();

// ===== 国内油价 =====
async function getDomestic(city) {
  try {
    let url = `https://api.qqsuu.cn/api/dm-oilprice?prov=${encodeURIComponent(city)}`;
    let res = await httpGet(url);
    let d = JSON.parse(res).data;

    return {
      p92: num(d.oil92),
      p95: num(d.oil95),
      p98: num(d.oil98),
      p0: num(d.oil0)
    };
  } catch (e) {
    return { p92:"-", p95:"-", p98:"-", p0:"-" };
  }
}

// ===== 国际油价 =====
async function getIntl() {
  try {
    let res = await httpGet("https://api.oilpriceapi.com/v1/demo/prices");
    let data = JSON.parse(res).data;

    let brent = data.find(i => i.code.includes("BRENT"));
    let wti = data.find(i => i.code.includes("WTI"));

    return {
      brent: brent ? brent.price : "-",
      wti: wti ? wti.price : "-"
    };
  } catch {
    return { brent:"-", wti:"-" };
  }
}

// ===== 汇率 =====
async function getFX() {
  try {
    let res = await httpGet("https://api.exchangerate-api.com/v4/latest/USD");
    return JSON.parse(res).rates.CNY;
  } catch {
    return 7.2;
  }
}

// ===== 趋势计算 =====
function calcTrend(current) {
  let last = $persistentStore.read("oil_last");

  if (!last || current === "-") {
    $persistentStore.write(current, "oil_last");
    return "⏸0.00";
  }

  let diff = (current - last).toFixed(2);
  $persistentStore.write(current, "oil_last");

  let arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "⏸";
  return `${arrow}${diff}`;
}

// ===== 趋势记录 =====
function saveTrend(city, val) {
  let key = "oil_trend_" + city;
  let lastKey = "oil_last_" + city;

  let arr = JSON.parse($persistentStore.read(key) || "[]");
  let lastVal = $persistentStore.read(lastKey);

  if (lastVal) {
    arr.push(val > lastVal ? "↑" : val < lastVal ? "↓" : "→");
  } else {
    arr.push("→");
  }

  if (arr.length > 5) arr.shift();

  $persistentStore.write(JSON.stringify(arr), key);
  $persistentStore.write(val, lastKey);

  return arr.join("");
}

// ===== 调价倒计时 =====
function getCountdown() {
  let base = new Date("2024-01-03T24:00:00");
  let now = new Date();
  let cycle = 10 * 86400000;

  let next = new Date(base.getTime() + Math.ceil((now - base)/cycle)*cycle);

  let diff = next - now;

  let d = Math.floor(diff / 86400000);
  let h = Math.floor(diff % 86400000 / 3600000);

  return `${d}天${h}小时`;
}

// ===== UI拼接 =====
function buildMsg(oil, trend, trendList, intl, fx, countdown) {

  let text =
    `📅 调价倒计时：${countdown}\n` +
    `📉 92#：${oil.p92} ${trend}\n` +
    `⛽ 95#：${oil.p95} ｜ 98#：${oil.p98}\n` +
    `🚛 0#：${oil.p0}\n` +
    `📊 趋势：${trendList}`;

  if (intl && fx) {
    let brentCNY = intl.brent !== "-" ? (intl.brent * fx).toFixed(0) : "-";
    let wtiCNY = intl.wti !== "-" ? (intl.wti * fx).toFixed(0) : "-";

    text +=
      `\n🛢️ Brent：$${intl.brent} ≈ ¥${brentCNY}` +
      `\n🛢️ WTI：$${intl.wti} ≈ ¥${wtiCNY}` +
      `\n💱 汇率：${fx}`;
  }

  text += `\n🔔 自动更新`;

  return text;
}

// ===== 工具 =====
function parseArgs() {
  if (!$argument) return {};
  return Object.fromEntries(
    $argument.split("&").map(i => i.split("="))
  );
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    $httpClient.get(url, (err, resp, body) => {
      if (err) reject(err);
      else resolve(body);
    });
  });
}

function num(v) {
  return v && !isNaN(v) ? Number(v) : "-";
}