# -*- coding: utf-8 -*-
"""构建 2026-09-06 日报 JSON"""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def vid(author, tid, thumb):
    return {"type": "video", "url": thumb, "video_url": f"https://x.com/{author}/status/{tid}/video/1"}
def img(url):
    return {"type": "image", "url": url}

data = {
  "date": "2026-09-06",
  "meta": {"raw_count": 175, "filtered_count": 168, "selected_count": 12, "crawl_time": "2026-09-06 10:30"},
  "lede": "100 人 FPS WARDOGS playtest 同接突破 21 万：开测一天全网狂欢，9/10 正式发售\n插画师 Joanna Kobierska 抗议 OpenAI 未经许可把她的作品用进官方广告：75 万浏览声援",
  "editors_pick": [
    {"section_id": "indie", "item_index": 0, "hook": "100 人 FPS WARDOGS playtest 同接突破 21 万：开测一天全网狂欢，9/10 正式发售"},
    {"section_id": "ai", "item_index": 1, "hook": "插画师 Joanna Kobierska 抗议 OpenAI 未经许可把她的作品用进官方广告：75 万浏览声援"}
  ],
  "digest": [
    {"id": "ai", "text": "陈成横评 Astra vs Fable 5.1：同 prompt 各写 8 款游戏——Astra 快 3 倍更好看，Fable 更好玩\n插画师抗议 OpenAI 未经许可用其作品做官方广告：75 万浏览声援\nDLSS 5 阵营分化：KCD2 导演力挺 vs Into The Unwell 反营销传播破 31 万"},
    {"id": "industry", "text": "GTA6 确认首发无微交易、无生成式 AI：Rockstar 的反行业承诺\nDouble Fine 离开 Xbox 后首秀：Schafer「只有我能关掉这家工作室」，Brutal Legend 2 需 1 亿美元众筹\nPanic 把关税退税退给用户：给 Sony 和微软打了个样\nXbox 下代主机 Helix 光驱悬而未决；Sony 澄清光盘产量是下降 10% 而非降到 10%"},
    {"id": "indie", "text": "WARDOGS：100 人 FPS playtest 同接 21 万，开测一天变狂欢\nmors 的 1KB 游戏：只能射正中心、别被自己的子弹打到（pico1k jam）\nDREADMOOR 渊舟蚀影愿望单破 40 万，9/10-14 公开测试\n静谧田园：日本 2026 最火农场 sim 将登陆西方"},
    {"id": "tools", "text": "OpenMouse 1.0 BETA：浏览器里统一配置多品牌鼠标，告别厂商驱动"}
  ],
  "sections": [
    {
      "id": "ai", "title": "AI科技热点", "title_en": "AI & TECH", "color": "#a78bfa",
      "items": [
        {
          "idx": "AI科技热点 01",
          "source": "X · 横评实测",
          "tags": ["Astra", "Fable 5.1"],
          "title": "陈成横评 Astra vs Fable 5.1：同 prompt 各写 8 款游戏——Astra 快 3 倍更好看，Fable 更好玩",
          "en_title": "Compared GPT-6 Astra and Claude Fable 5.1 on the same 8 browser games: Astra is 3x faster and prettier, Fable is more fun",
          "full_text": "同一份 prompt，GPT-6 Astra 和 Claude Fable 5.1 各写了 8 款浏览器游戏：躲避球 3v3、雪地卡丁车、GTA、马里奥 1-1、暗黑风 ARPG、机器人网球、Flappy Bird、地铁跑酷。Astra 是真快。平均 15 分钟交一款，Fable 5.1 平均 47 分钟。但 Astra 的游戏不好玩，明显 Fable 5.1 的游戏性好很多。",
          "author": "chenchengpro",
          "date": "2026-09-05",
          "likes": 35,
          "views": 16776,
          "link": "https://x.com/chenchengpro/status/2096066915504652776",
          "media": vid("chenchengpro", "2096066915504652776", "https://pbs.twimg.com/amplify_video_thumb/2096066749045383168/img/9LUkFKCZHoA6LTZx.jpg"),
          "summary": "陈成做了目前最系统的 Astra vs Fable 5.1 对照实验：同一份 prompt 让两个模型各写 8 款浏览器游戏（GTA、卡丁车、Flappy Bird 等）。结论：Astra 平均 15 分钟交卷、比 Fable 快 3 倍、HUD 细节精致（卡丁车连杯赛名都印上），但「都不好玩」——明显 Fable 5.1 游戏性更好。同期 Astra 生态持续爆发：one-shot Blender 游戏资产（38.9 万浏览）、可玩 4D 国际象棋（24.7 万）、30 分钟把手游广告复刻成可玩网页游戏（13.6 万）；Tony出海给出 Astra 生成 3D 游戏的诀窍（Codex 生成概念图+迭代逼近）。",
          "analysis": "这是第一份有方法论价值的双模型游戏生成横评：把「生成速度/视觉完成度/游戏手感」拆开评价。Astra 赢在管线效率（资产→渲染→交付），Fable 赢在玩法调优——暗示两条技术路线的优化目标不同：Astra 像在造「游戏工厂」，Fable 像在养「游戏设计师」。对从业者：快而糙的产能工具与慢而好的设计工具会长期并存，选型取决于你缺产能还是缺手感。",
          "recommendation": "Astra vs Fable 横评：快 3 倍 vs 更好玩，两种路线的分野",
          "featured": True
        },
        {
          "idx": "AI科技热点 02",
          "source": "X · AI 版权",
          "tags": ["OpenAI", "版权"],
          "title": "插画师抗议 OpenAI 未经许可把她的作品用进官方广告：75 万浏览声援",
          "en_title": "It disgusts me that my artwork appeared in OpenAI ad",
          "full_text": "It disgusts me that my artwork appeared in OpenAI ad",
          "author": "JoannaKobierska",
          "date": "2026-09-04",
          "likes": 21852,
          "views": 753995,
          "link": "https://x.com/JoannaKobierska/status/2095891572223000950",
          "media": img("https://pbs.twimg.com/media/HRYZhCbWoAAi9Sc.jpg"),
          "summary": "插画师 Joanna Kobierska 发现自己的作品出现在 OpenAI 官方广告中且未经授权，公开发声「这让我恶心」——75.4 万浏览、2.2 万赞声援。这是 OpenAI 首次被曝在自家营销物料中直接使用未授权作品。",
          "analysis": "讽刺密度极高：训练数据争议还停留在「要不要授权」的抽象层，OpenAI 已经在自家广告里用上了未授权作品——这等于把「合理使用」的辩护词撕掉贴上了反例。对创意行业，这条推文的价值在于提供了一个完美的具象靶子：谈判桌上的「训练数据匿名性」话术，撞上「广告里那张图就是我的」的具体事实时会瞬间失效。游戏美术社区的共情传播（2.2 万赞）预示此类事件将成为 AI 立场的分水岭样本。",
          "recommendation": "OpenAI 广告盗用插画师作品：AI 版权争议的具象化分水岭",
          "featured": True
        },
        {
          "idx": "AI科技热点 03",
          "source": "PC Gamer / X · 阵营分化",
          "tags": ["DLSS 5", "争议"],
          "title": "DLSS 5 阵营分化：KCD2 导演力挺「people are crazy」，Into The Unwell 反营销传播破 31 万",
          "en_title": "Kingdom Come: Deliverance director says DLSS 5 does right by KCD 2: 'People are crazy'",
          "full_text": "Kingdom Come: Deliverance director says DLSS 5 does right by KCD 2: 'People are crazy'",
          "author": "pcgamer",
          "date": "2026-09-05",
          "likes": 15,
          "views": 8988,
          "link": "https://x.com/pcgamer/status/2096270159313023224",
          "media": None,
          "summary": "DLSS 5 争议进入站队阶段：Kingdom Come: Deliverance 总监公开力挺，称 DLSS 5 对 KCD2 效果很好、「人们疯了（才会反对）」；对立面 Into The Unwell 的「No DLSS 5. Just good art direction.」传播已破 31 万浏览、7,909 赞，成为开发者社区的逆势爆款。同时 Mario Kart World 直播画面套 DLSS5 出现大量拖影伪影的实测（18.6 万浏览）继续给反对派供弹。",
          "analysis": "技术争议进入「立场即身份」阶段：支持者的论据是特定内容的实际效果（写实类吃光影收益），反对者的论据是风格完整性（美术即身份）。双方都部分正确，这正是它无法收敛的原因——DLSS 5 不是性能开关而是审美决策。对独游工作室，Into The Unwell 的传播数据证明「反 AI 滤镜」已是有效的品牌资产；对 3A，阵营站队将出现在 GDC 演讲和免责声明里。",
          "recommendation": "DLSS 5 阵营分化：KCD2 导演 vs 独游反营销，审美决策无法收敛",
          "featured": False
        }
      ]
    },
    {
      "id": "industry", "title": "游戏行业动态", "title_en": "INDUSTRY", "color": "#D7263D",
      "items": [
        {
          "idx": "游戏行业 01",
          "source": "Eurogamer · 商业承诺",
          "tags": ["GTA 6", "无微交易"],
          "title": "GTA6 确认首发无微交易、无生成式 AI：Rockstar 的反行业承诺",
          "en_title": "Rockstar confirms GTA 6 won't have microtransactions or generative AI at launch",
          "full_text": "Rockstar confirms GTA 6 won't have microtransactions or generative AI at launch.",
          "author": "eurogamer",
          "date": "2026-09-05",
          "likes": 56,
          "views": 14402,
          "link": "https://x.com/eurogamer/status/2096123938854031727",
          "media": img("https://pbs.twimg.com/media/HRbtmQlWUAARaaV.jpg"),
          "summary": "Eurogamer 确认 Rockstar 官方表态：GTA6 首发版本不含微交易，也不使用生成式 AI。在 2026 年的行业语境下，这是一份罕见的双反承诺——单机买断制+人工内容，与 11 月 19 日发售的 70 美元定价一起构成完整的「传统范式宣言」。",
          "analysis": "这两条承诺的分量被行业现状放大：前者顶住了 Take-Two 的 recurrent spending KPI（GTA Online 是史上最强内购机器），后者站在了 DLSS5/生成内容争议的对立面。Rockstar 用品牌信用做了一次「逆行业」表态——它买得起，也因为买得起而更有杀伤力：当行业标杆证明无 MTX/无 GenAI 也能做出史上最大发行，「大家都这样」的辩护将全面失效。",
          "recommendation": "GTA6 首发无 MTX 无 GenAI：行业标杆的反范式宣言",
          "featured": True
        },
        {
          "idx": "游戏行业 02",
          "source": "Polygon / Eurogamer · Double Fine",
          "tags": ["Double Fine", "独立"],
          "title": "Double Fine 离开 Xbox 后首秀：Schafer「只有我能关掉这家工作室」",
          "en_title": "Double Fine reveals its first post-Xbox game as Tim Schafer declares no one will shut the studio down but him",
          "full_text": "Double Fine reveals its first post-Xbox game as Tim Schafer declares no one will shut the studio down but him",
          "author": "Polygon",
          "date": "2026-09-05",
          "likes": 0,
          "views": 1640,
          "link": "https://x.com/Polygon/status/2096282289407656024",
          "media": img("https://pbs.twimg.com/media/HRd9ohkWYAA16o9.jpg"),
          "summary": "Double Fine 公布脱离 Xbox 后的首款新作，Tim Schafer 放话「没人能关掉这家工作室，除了我自己」；同场信息还包括：Schafer 承认「Phil Spencer 离开 Xbox 时就知道有麻烦」、以及 Brutal Legend 2 的玩笑式众筹条件——「只要你在 game jam Kickstarter 里凑够 1 亿美元我们就做」。多家报道：Polygon、Eurogamer、RPS、Niche Gamer。",
          "analysis": "微软裁撤潮中 Double Fine 的「体面独立」成为难得的正面样本：保住团队、保住 IP 谈判权、还保留了 Brutal Legend 2 这个永久话题制造机。Schafer 的公关话术（自嘲式承诺+天价众筹玩笑）把「被收购又独立」的尴尬转写成品牌资产——对其他待售工作室，「Double Fine 路径」提供了除裁员清算外的第二种剧本。",
          "recommendation": "Double Fine 独立首秀：被收购工作室的体面退出样本",
          "featured": True
        },
        {
          "idx": "游戏行业 03",
          "source": "Eurogamer · 关税",
          "tags": ["Panic", "关税"],
          "title": "Panic 把关税退税退给用户：给 Sony 和微软打了个样",
          "en_title": "Playdate maker Panic is passing tariff refunds on to customers",
          "full_text": "Playdate maker Panic is passing tariff refunds on to customers.",
          "author": "eurogamer",
          "date": "2026-09-05",
          "likes": 13,
          "views": 9156,
          "link": "https://x.com/eurogamer/status/2096108839481331739",
          "media": img("https://pbs.twimg.com/media/HRbf3X7WYAAr56_.jpg"),
          "summary": "Playdate 制造商 Panic 宣布把获得的关税退税退还给客户——与本周 Sony/微软「无义务退还、申请驳回诉讼」的立场形成直接对照。Eurogamer 报道 9,156 浏览。",
          "analysis": "同一条关税新闻，两种企业人格：Panic 的退款在财务上无足轻重（Playdate 体量小），但在叙事上价值千金——它把「大厂拒退」的道德成本显性化了。游戏硬件消费者第一次有了具体参照物：不是「行业惯例如此」，而是 Panic 证明过可以不如此。品牌税的反向应用案例，值得写进任何一家的定价策略课。",
          "recommendation": "Panic 退还关税退税：与 Sony/微软拒退的直接对照",
          "featured": True
        },
        {
          "idx": "游戏行业 04",
          "source": "Eurogamer / GameSpot · 实体余晖",
          "tags": ["Xbox", "光盘"],
          "title": "Xbox 下代 Helix 光驱悬而未决；Sony 澄清光盘产量「下降 10%」而非「降到 10%」",
          "en_title": "Xbox CEO refuses to confirm whether next console Helix will have a disc drive; Sony clarifies disc production dropping by 10 percent in 2028, not to 10 percent",
          "full_text": "Xbox CEO refuses to confirm whether next console Helix will have a disc drive.",
          "author": "eurogamer",
          "date": "2026-09-05",
          "likes": 92,
          "views": 14783,
          "link": "https://x.com/eurogamer/status/2096229636627681375",
          "media": img("https://pbs.twimg.com/media/HRdNur-WcAIy0NY.jpg"),
          "summary": "实体光盘的两条关键澄清同日出现：①Eurogamer 采访 Xbox CEO，其对下代主机 Helix 是否配备光驱拒绝确认（1.5 万浏览）；②Sony 紧急澄清此前的光盘停产传闻——2028 年光盘产量是「下降 10%」，不是「降到 10%」（9,334 浏览）。前 PlayStation 高管随后表态「Sony 仍能拯救实体游戏」。",
          "analysis": "Sony 的澄清暴露了上周「停产光盘」报道的传播失真：媒体把「降一成」渲染成了「判死刑」。但 Helix 光驱的悬而不决才是真正的信号——当厂商连「能不能放光盘」都要留给市场猜，说明物理介质的存废已经进入「不需要承诺」的决策末段。结合本周 FF7R 实体需联网，「实体=周边」的产业共识正在从 Sony 单方表态变成两家平台的默契。",
          "recommendation": "Helix 光驱悬案+Sony 更正传闻：实体介质的存废进入默契阶段",
          "featured": False
        }
      ]
    },
    {
      "id": "indie", "title": "新游推文", "title_en": "INDIE GAMES", "color": "#E8B04B",
      "items": [
        {
          "idx": "新游推文 01",
          "source": "電ファミニコゲーマー · Playtest 爆发",
          "tags": ["WARDOGS", "100人FPS"],
          "title": "WARDOGS playtest 同接突破 21 万：100 人 FPS 开测一天变狂欢，9/10 正式发售",
          "en_title": "WARDOGS - 100-player FPS playtest surpassed 210,000 concurrent players in one day",
          "full_text": "最大“100人”対戦FPS『WARDOGS』プレイテスト版の同接数が「21万人」を突破し大盛況。開始からわずか1日でお祭り騒ぎ。「稼いだ資金で戦い方を買う」戦場に、硝煙に惹かれた危険な奴らが集う。",
          "author": "denfaminicogame",
          "date": "2026-09-05",
          "likes": 2907,
          "views": 1146508,
          "link": "https://x.com/denfaminicogame/status/2096054205433978886",
          "media": vid("denfaminicogame", "2096054205433978886", "https://pbs.twimg.com/ext_tw_video_thumb/2096054177541873664/pu/img/4EZwjGMrwtOYX8_0.jpg"),
          "game_ref": "WARDOGS",
          "summary": "BULKHEAD 开发、Team17 发行的 100 人 FPS WARDOGS 的 playtest 创造了年度奇观：开测仅 1 天同接突破 21 万（電ファミ 114.7 万浏览）。玩法主打「用赚来的钱买打仗方式」——开坦克强袭、编队协作皆自由，甚至出现了专门给队友做心肺复苏的玩家。9/10 正式发售（¥149，appid 1867240）。",
          "analysis": "21 万 playtest 同接是什么概念：超过绝大多数 3A 正式版的首日峰值，直逼 FPS 品类的历史级数据。免费 playtest+百人混战+「全民玩梗」（ CPR 英雄）的直播传播结构，复刻了 Delta Force/STALCRAFT 式的免费大军 fest 爆发曲线。9/10 正式版 ¥149 的付费转化是下一个观察点——免费狂欢人群里有多少愿意为完整版掏钱，将检验「fest 型 playtest」的商业成色。",
          "recommendation": "WARDOGS playtest 21 万同接：免费 fest 爆发曲线的年度样本",
          "featured": True,
          "enrichment": {
            "game_name": "WARDOGS",
            "genre": "100 人大型 FPS",
            "developer": "BULKHEAD / Team17 发行",
            "platforms": ["PC（Steam）"],
            "price": "¥149",
            "release_date": "2026年9月10日",
            "steam_rating": "未正式发售（playtest 进行中）",
            "steam_url": "https://store.steampowered.com/app/1867240/WARDOGS/",
            "header_image": None,
            "youtube_video": None,
            "description": "【玩法】最大 100 人同场 FPS：用战场赚的资金购买装备与作战方式；坦克、小队协同自由发挥；社区涌现 CPR 辅助兵等自组织玩法。【数据】playtest 开测 1 天同接破 21 万。【节点】9/10 正式发售。",
            "why_notable": "playtest 同接 21 万=年度 FPS 品类最强预热数据。",
            "positioning": "百人战场狂欢——fest 型 playtest 爆发样本"
          }
        },
        {
          "idx": "新游推文 02",
          "source": "X · Jam 极限开发",
          "tags": ["pico1k", "1KB游戏"],
          "title": "mors 的 1KB 游戏：只能射正中心、别被自己的子弹打到（pico1k jam）",
          "en_title": "you can only shoot to the dead center. don't get hit by your own bullet - made in under 1024 bytes",
          "full_text": "made a new game: you can only shoot to the dead center. don't get hit by your own bullet. made for the #pico1k jam in under 1024 bytes",
          "author": "MorsGames",
          "date": "2026-09-04",
          "likes": 5093,
          "views": 425372,
          "link": "https://x.com/MorsGames/status/2095907754657432020",
          "media": vid("MorsGames", "2095907754657432020", "https://pbs.twimg.com/amplify_video_thumb/2095907383394385921/img/4yLD8kcaL4V5Sd-R.jpg"),
          "summary": "mors 为 pico1k jam 制作的极限小品：全部代码 1024 字节以内。规则一句话讲清——你只能朝正中心射击，子弹绕一圈回来，别被自己打死。42.5 万浏览、5,093 赞。",
          "analysis": "1024 字节约束下做出的「自指式弹幕」是规则密度最高的玩法设计样本：用一条自杀机制同时生成了走位、时机、风险曲线三个系统。1KB jam 谱系（Twitter 上互动最高的极限开发场景）证明「约束产生创意」不只是口号——对玩法设计师，这是比任何 GDD 都好的一课。",
          "recommendation": "1KB 里装下完整玩法循环：pico1k jam 的规则密度样本",
          "featured": True
        },
        {
          "idx": "新游推文 03",
          "source": "X · 里程碑",
          "tags": ["DREADMOOR", "愿望单"],
          "title": "DREADMOOR 渊舟蚀影愿望单破 40 万：9/10-14 开放测试",
          "en_title": "DREADMOOR hit 400K wishlists, Open Playtest September 10-14",
          "full_text": "400K wishlists! Thank you for joining us on this wild journey into DREADMOOR! To celebrate, we're opening the gates for an Open Playtest for everyone, September 10–14.",
          "author": "DreadmoorGame",
          "date": "2026-09-04",
          "likes": 582,
          "views": 40437,
          "link": "https://x.com/DreadmoorGame/status/2095955017412878812",
          "media": vid("DreadmoorGame", "2095955017412878812", "https://pbs.twimg.com/amplify_video_thumb/2095951702004490240/img/7wJOrRfkjqdRoR-Q.jpg"),
          "game_ref": "DREADMOOR",
          "summary": "钓鱼恐怖游戏 DREADMOOR（渊舟蚀影，appid 3629430，2026 Q4）愿望单突破 40 万，官方宣布 9/10-14 开放公开测试回馈社区。4 万浏览。",
          "analysis": "「深海钓鱼×克苏鲁恐怖」的混搭题材+持续的内容营销节奏（本周已两次进入候选），40 万愿望单在发售前即锁定商业基本盘——Q4 独游档期的头部种子。",
          "recommendation": "DREADMOOR 40 万愿望单：钓鱼恐怖的 Q4 头部种子",
          "featured": False,
          "enrichment": {
            "game_name": "DREADMOOR（渊舟蚀影）",
            "genre": "钓鱼恐怖",
            "developer": "Dream Dock / Digital Vortex Entertainment 发行",
            "platforms": ["PC（Steam）"],
            "price": "未公布",
            "release_date": "2026 年第四季度",
            "steam_rating": "未发售",
            "steam_url": "https://store.steampowered.com/app/3629430/",
            "header_image": None,
            "youtube_video": None,
            "description": "【玩法】出港空舱、满载而归， catch 的东西值多少钱取决于你敢不敢看；深海恐怖×钓鱼循环。【数据】愿望单破 40 万。【节点】9/10-14 公开测试。",
            "why_notable": "钓鱼+恐怖混配的 Q4 头部独游。",
            "positioning": "满载而归的东西可能不是鱼——钓鱼恐怖"
          }
        },
        {
          "idx": "新游推文 04",
          "source": "Polygon · 出海",
          "tags": ["静谧田园", "农场模拟"],
          "title": "静谧田园：日本 2026 最火农场 sim 将登陆西方（Polygon 报道）",
          "en_title": "Japan's Biggest Farming-Sim of 2026 Is Finally Coming to the US - Village in the Shade",
          "full_text": "Japan's Biggest Farming-Sim of 2026 Is Finally Coming to the US",
          "author": "Polygon",
          "date": "2026-09-04",
          "likes": 9,
          "views": 13640,
          "link": "https://x.com/Polygon/status/2095909798982103059",
          "media": img("https://pbs.twimg.com/media/HRYq2vtXEAQWp4k.jpg"),
          "game_ref": "静谧田园",
          "summary": "Polygon 报道：日本 2026 年最火的农场模拟游戏 Village in the Shade（静谧田园，Nippon Ichi 开发/NIS America 发行，日服 7/29 已发售，¥238）即将登陆欧美市场。Steam 页已上线（appid 3934250）。1.4 万浏览。",
          "analysis": "「日本国内爆款出海」是今年反复出现的路径（参照渔力全开反向案例）：Nippon Ichi 的美术品牌+本土验证过的农场循环，出海成功的关键在于西方媒体对「日式慢生活」叙事的接受度——Polygon 愿意写 preview 本身就是好信号。",
          "recommendation": "静谧田园出海：日本年度农场 sim 西征",
          "featured": False,
          "enrichment": {
            "game_name": "静谧田园（Village in the Shade）",
            "genre": "农场模拟",
            "developer": "Nippon Ichi Software / NIS America 发行",
            "platforms": ["PC（Steam）"],
            "price": "¥238（日服已发售）",
            "release_date": "西方版待定（日服 2026/7/29 已发售）",
            "steam_rating": "日服运营中",
            "steam_url": "https://store.steampowered.com/app/3934250/",
            "header_image": "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3934250/d7c9d58e22ebd7ed3f9e70d1e25f730f3959a324/header_schinese.jpg?t=1785440016",
            "youtube_video": None,
            "description": "【定位】日本 2026 年最火农场 sim，Polygon 称「终于要来美国」。【发行】Nippon Ichi 开发、NIS America 发行。【节点】西方版待定，Steam 页已上线。",
            "why_notable": "日式慢生活农场 sim 的出海样本。",
            "positioning": "日本年度农场 sim 西征"
          }
        },
        {
          "idx": "新游参考 01",
          "source": "ゲムのすけ · 更新",
          "tags": ["攀爬", "对战"],
          "title": "Chained Together 追加对战模式：2 组 30 分钟竞速爬高，现价 ¥7.4",
          "en_title": "Chained Together adds PvP mode - two teams race to climb higher in 30 minutes",
          "full_text": "『Chained Together』に対戦モード搭載！2人1組の2チームに分かれ、30分でどちらが高く登れるかを競え。アップデート記念セールで464円",
          "author": "dotpixel3d",
          "date": "2026-09-05",
          "likes": 699,
          "views": 288563,
          "link": "https://x.com/dotpixel3d/status/2096063729494548964",
          "media": vid("dotpixel3d", "2096063729494548964", "https://pbs.twimg.com/amplify_video_thumb/2096063688021286912/img/_AMxbPRN_4bCGSWg.jpg"),
          "summary": "锁链攀爬名作 Chained Together 追加 PvP：两组各 2 人、30 分钟比谁爬得高，更新纪念促销 ¥7.4（原价更低）。28.9 万浏览。",
          "analysis": "「连锁受难」品类加 PvP 是延长生命周期的标准操作：合作 frustration 转化为对抗 frustration，社交传播结构不变。",
          "recommendation": "Chained Together 追加对战模式：连锁受难转竞技",
          "unselected": True
        },
        {
          "idx": "新游参考 02",
          "source": "모카 · 发售预告",
          "tags": ["拉面", "经营"],
          "title": "Japanese Ramen Simulator 9 月发售：最多 6 人经营拉面店，开发者真的去学了做拉面",
          "en_title": "Japanese Ramen Simulator - up to 6 player ramen shop sim, devs learned to make ramen for real",
          "full_text": "최대 6인 멀티가 가능한 《재패니즈 라멘 시뮬레이터》가 9월중에 발매. 개발자들이 라멘 만들기를 여러번 직접 해봤대",
          "author": "matchoking1",
          "date": "2026-09-05",
          "likes": 2261,
          "views": 222391,
          "link": "https://x.com/matchoking1/status/2096107557668450433",
          "media": vid("matchoking1", "2096107557668450433", "https://pbs.twimg.com/amplify_video_thumb/2095564026717896704/img/W453NBCS5EwJVb-C.jpg"),
          "summary": "韩国博主安利的 Japanese Ramen Simulator 9 月发售：最多 6 人 multiplayer，从备料到经营全流程，还有突袭到店的「拉面评论家」——开发者为了让汤头建模靠谱真的去反复学了做拉面。22.2 万浏览。",
          "analysis": "「开发者实地学艺」是最有效的真实性营销：经营 sim 品类的信任货币就是细节密度。",
          "recommendation": "拉面 Simulator：6 人开店，开发者真去学了拉面",
          "unselected": True
        },
        {
          "idx": "新游参考 03",
          "source": "Alpha Beta Gamer · Playtest",
          "tags": ["反射击", "双摇杆"],
          "title": "Laser Guy 公开 Playtest：「反射击」双摇杆——别把同事激光成灰",
          "en_title": "Laser Guy - an indie twin-stick anti-shooter where you avoid accidentally lasering your coworkers",
          "full_text": "What is an \"anti-shooter?\" Laser Guy is an indie twin-stick pixel art anti-shooter where try to avoid accidentally lasering your coworkers into oblivion!",
          "author": "gameralphabeta",
          "date": "2026-09-04",
          "likes": 1012,
          "views": 49131,
          "link": "https://x.com/gameralphabeta/status/2096002711074316691",
          "media": vid("gameralphabeta", "2096002711074316691", "https://pbs.twimg.com/amplify_video_thumb/2096000833703870470/img/J3q3U7vdBjI7zWH4.jpg"),
          "summary": "pointnsheep 的像素双摇杆「反射击」Laser Guy 开放 Steam Playtest：目标不是杀敌而是避免误伤同事。4.9 万浏览。",
          "analysis": "「反目标」设计（目标=不做什么）是双摇杆品类少见的约束反转，办公室题材自带传播梗。",
          "recommendation": "Laser Guy：避免误伤同事的反射击 Playtest",
          "unselected": True
        },
        {
          "idx": "新游参考 04",
          "source": "X · 机制展示",
          "tags": ["分部破坏", "动作"],
          "title": "LOP: Whitefall 展示分部位破坏敌人：打断腿会瘸、打塌地面会瘫",
          "en_title": "LOP: Whitefall - break its legs and it limps, break the ground under it and it's paralyzed",
          "full_text": "You've never fought an enemy like this. Break its legs and it limps. Break the ground under it and it's paralyzed.",
          "author": "lopwhitefall",
          "date": "2026-09-04",
          "likes": 654,
          "views": 53831,
          "link": "https://x.com/lopwhitefall/status/2095933186903834692",
          "media": vid("lopwhitefall", "2095933186903834692", "https://pbs.twimg.com/amplify_video_thumb/2095931962850742272/img/5ren1sVKWKMNl8Fk.jpg"),
          "summary": "LOP: Whitefall 展示其招牌敌人的分部位破坏系统：打断腿会瘸、打塌脚下地面会瘫痪——「我们做过最有挑战性的敌人」。5.4 万浏览。",
          "analysis": "分部状态机是动作游戏堆料的传统艺能，但「环境也在破坏判定内」（打塌地面）把地形变成了武器层。",
          "recommendation": "LOP: Whitefall：打断腿会瘸、打塌地会瘫的分部破坏",
          "unselected": True
        },
        {
          "idx": "新游参考 05",
          "source": "PC Gamer · 新游",
          "tags": ["跑酷", "独立"],
          "title": "法国 FPS 兄弟档一半的人做出「史上最爽跑酷游戏」（PC Gamer）",
          "en_title": "Half of France's premier FPS sibling duo just put out the most exhilarating parkour game ever",
          "full_text": "Half of France's premier FPS sibling duo just put out the most exhilarating parkour game ever",
          "author": "pcgamer",
          "date": "2026-09-05",
          "likes": 3,
          "views": 12739,
          "link": "https://x.com/pcgamer/status/2096237625640439845",
          "media": None,
          "summary": "PC Gamer 评测：法国知名 FPS 兄弟工作室的一半成员做出的跑酷新作，「有史以来最令人兴奋的跑酷游戏」。1.3 万浏览。",
          "analysis": "跑酷品类在 Mirror's Edge 之后长期缺正统续作，小型团队正试图填这个真空。",
          "recommendation": "法国 FPS 兄弟档的跑酷新作获 PCG 盛赞",
          "unselected": True
        }
      ]
    },
    {
      "id": "tools", "title": "开发工具", "title_en": "DEV TOOLS", "color": "#60a5fa",
      "items": [
        {
          "idx": "开发工具 01",
          "source": "X · 工具发布",
          "tags": ["OpenMouse", "外设"],
          "title": "OpenMouse 1.0 BETA：浏览器里统一配置多品牌鼠标，告别厂商驱动",
          "en_title": "OpenMouse 1.0 BETA - browser-based tool for configuring gaming mice across brands, no vendor software",
          "full_text": "OpenMouse 1.0 BETA is out. It's a browser-based tool for configuring gaming mice (DPI, buttons, RGB, etc.) across a bunch of different brands, without installing any vendor software or switching between different drivers.",
          "author": "openmouseapp",
          "date": "2026-09-04",
          "likes": 5615,
          "views": 309316,
          "link": "https://x.com/openmouseapp/status/2095919822261334523",
          "media": img("https://pbs.twimg.com/media/HRW7DVXWkAEtJqI.jpg"),
          "summary": "OpenMouse 1.0 BETA 发布：基于浏览器的游戏鼠标统一配置工具——DPI、侧键、RGB 跨品牌设置，无需安装任何厂商驱动或在不同驱动间切换。30.9 万浏览、5,615 赞，开发者社区反响强烈。",
          "analysis": "「用 Web 技术吃掉驱动层」是外设软件的解药：WebHID API 让浏览器直接访问 HID 设备，OpenMouse 把 Logitech/Razer/SteelSeries 各自臃肿的驱动统一成一个标签页。5.6 千赞的社区热度说明痛点真实存在——这对游戏玩家的日常体验是实打实的改善，也示范了 Web 平台 API 在游戏工具链的渗透路径。",
          "recommendation": "OpenMouse：浏览器统一配置多品牌鼠标，WebHID 的killer app",
          "featured": True
        }
      ]
    }
  ],
  "daily_summary": "**WARDOGS 狂欢日 + OpenAI 广告风波**\n100 人 FPS WARDOGS 的 playtest 开测一天同接破 21 万（電ファ米 114 万浏览），9/10 正式发售；插画师 Joanna Kobierska 抗议 OpenAI 未经许可把她的作品用进官方广告，75 万浏览声援——AI 版权争议迎来具象化分水岭。逃离台风已冲到 1,587 万浏览、22 万赞，仍在发酵。\n\n**行业动态**\nGTA6 确认首发无微交易、无生成式 AI——Rockstar 的反行业承诺；Double Fine 离开 Xbox 后首秀+Schafer「只有我能关掉工作室」；Panic 把关税退税退给用户，给 Sony/微软打了个样；Xbox Helix 光驱悬而未决、Sony 澄清光盘是「下降 10%」而非「降到 10%」。\n\n**AI 板块**\n陈成横评 Astra vs Fable 5.1（各写 8 款游戏）：Astra 快 3 倍更好看、Fable 更好玩；DLSS 5 阵营分化——KCD2 导演力挺 vs 独游反营销。\n\n**新游看点**\nmors 的 1KB 游戏「只能射正中心」（42 万浏览）；DREADMOOR 渊舟蚀影 40 万愿望单 9/10 开测；日本年度农场 sim 静谧田园将出海。\n\nPCU 速览：零号连队 36,653、渔力全开 104,878、红色沙漠 44,164（持续爬坡）。\n\n详情请点击下方【当日速览】的条目跳转到对应推文。"
}

hdr = {
  "WARDOGS": None,
  "DREADMOOR（渊舟蚀影）": None,
}

out = r"D:\CMproject\X爬虫\site\data\2026-09-06.json"
json.dump(data, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

mpath = r"D:\CMproject\X爬虫\site\data\manifest.json"
m = json.load(open(mpath, encoding="utf-8"))
if "2026-09-06" not in m["dates"]:
    m["dates"].append("2026-09-06")
if "2026-09-06" not in m["reports"]["daily"]["dates"]:
    m["reports"]["daily"]["dates"].append("2026-09-06")
json.dump(m, open(mpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("written:", out, "| dates:", len(m["dates"]))
