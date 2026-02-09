/**
 * Loon 脚本: 万年历及详细黄历 (增强版)
 * 来源: https://www.rili.com.cn/wannianli/
 */

const now = new Date();
const year = now.getFullYear();
const month = (now.getMonth() + 1).toString().padStart(2, '0');
const day = now.getDate();

const url = `https://www.rili.com.cn/rili/json/pc_wnl/${year}/${month}.js`;

$httpClient.get(url, function(error, response, data) {
    if (error) {
        $notification.post("万年历脚本", "网络请求失败", error);
        $done();
        return;
    }

    try {
        let startIdx = data.indexOf('{');
        let endIdx = data.lastIndexOf('}');
        if (startIdx === -1 || endIdx === -1) throw new Error("数据格式错误");
        
        let jsonData = JSON.parse(data.substring(startIdx, endIdx + 1));
        let info = jsonData.data.find(item => item.nian === year && item.yue === (now.getMonth() + 1) && item.ri === day);
        
        if (info) {
            // 1. 标题：公历日期 + 星期
            let title = `${year}年${month}月${day}日 ${info.dddd}`;
            
            // 2. 农历与生肖
            let subTitle = `【${info.shengxiao}】农历${info.n_yueri}`;
            
            // 3. 详细内容构建
            let content = "";
            
            // 天干地支
            content += `干支: ${info.gz_nian} ${info.gz_yue} ${info.gz_ri}\n`;
            
            // 节气信息
            let jqName = info.jieqi_link ? info.jieqi_link.replace(/<[^>]+>/g, '') : "无";
            let jqNextName = info.jieqi_next_link ? info.jieqi_next_link.replace(/<[^>]+>/g, '') : "无";
            content += `节气: ${jqName}第${info.jieqi_pass}天，距${jqNextName}还有${info.jieqi_next}天\n`;
            
            // 星座、月相、星宿
            let xzName = info.xingzuo_link ? info.xingzuo_link.replace(/<[^>]+>/g, '') : "";
            content += `星座: ${xzName}  月相: ${info.yuexiang}\n`;
            content += `星宿: ${info.xingxiu}\n`;
            
            // 五行
            content += `五行: ${info.wx_nian}(年) ${info.wx_yue}(月) ${info.wx_ri}(日)\n`;
            
            // 节日 (如果有)
            let festival = info.jie ? info.jie.replace(/<[^>]+>/g, '').trim() : "";
            if (festival) content += `节日: ${festival}\n`;
            
            // 宜忌
            content += `━━━━━━━━━━━━━━━\n`;
            content += `✅ 宜: ${info.yi.join(' ')}\n`;
            content += `❌ 忌: ${info.ji.join(' ')}`;
            
            $notification.post(title, subTitle, content);
        } else {
            $notification.post("万年历", "未找到今日数据", "");
        }
    } catch (e) {
        $notification.post("万年历脚本", "解析失败", e.message);
    }
    
    $done();
});
