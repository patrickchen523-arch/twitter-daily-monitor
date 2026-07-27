const REPORT_ARCHIVE = window.__DB.REPORT_ARCHIVE || {};
    const META = window.__DB.META || {};
    const INTEL = window.__DB.INTEL || {};
    const REPORTS = window.__DB.REPORTS || [];
    const c=(id,flow,flowDelta,dau,dauDelta,peak,peakDelta,status,note,keywords,summary)=>({id,flow,flowDelta,dau,dauDelta,peak,peakDelta,status,note,keywords,summary});
    const PERIODS = window.__DB.PERIODS || {};

    const BASE_PERIOD_IDS=Object.keys(PERIODS);
    // 将对比记录中的真实周报同步至首页周期；演示周期不进入任何正式入口。
    const REAL_ARCHIVE_REPORTS=(window.__ARCHIVE_REPORTS||[]).filter(report=>!report.isDemo&&report.id!=='demo_20260713');
    window.__ARCHIVE_REPORTS=REAL_ARCHIVE_REPORTS;
    if(window.__ARCHIVE_PERIODS)delete window.__ARCHIVE_PERIODS.demo_20260713;
    if(window.__ARCHIVE_CONTENT)delete window.__ARCHIVE_CONTENT.demo_20260713;
    REAL_ARCHIVE_REPORTS.forEach(report=>{
      if(!REPORTS.some(existing=>existing.id===report.id))REPORTS.push({id:report.id,label:report.label,dataWindow:'报告周期：'+report.label});
      const archivedPeriod=window.__ARCHIVE_PERIODS?.[report.id];
      if(archivedPeriod&&!PERIODS[report.id])PERIODS[report.id]={...archivedPeriod,reportId:report.id,dataWindow:archivedPeriod.dataWindow||('报告周期：'+report.label)};
    });
    REPORTS.sort((a,b)=>b.id.localeCompare(a.id));

    const state={period:'20260622',view:'home',search:'',status:'all',sortKey:null,sortDir:-1,detailId:null,detailObservationKey:null,chartMetric:'flow',overviewMetric:'flow',overviewPoint:null,overviewSelected:null,reportYear:'all',reportSearch:''};
    const CUSTOM_OBSERVATIONS=window.__DB.OBSERVATIONS||{};
    const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
    const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const reportById=id=>REPORTS.find(r=>r.id===id);
    const period=()=>PERIODS[state.period];
    const formatNum=v=>v==null?'—':Number(v).toLocaleString('zh-CN');
    const deltaHtml=(v,reverse=false)=>v==null?'<span class="muted">未披露</span>':`<span class="delta ${reverse?(v>=0?'reverse-up':'reverse-down'):(v>=0?'up':'down')}">${v>=0?'+':''}${v}%</span>`;
    const logo=id=>`<span class="mini-logo" style="background:${META[id].color}"><img src="${META[id].icon}" alt="${esc(META[id].name)} Icon" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="logo-fallback" hidden>${META[id].abbr}</span></span>`;
    const statusLabel=s=>s==='priority'?'异动':s==='warning'?'关注':'平稳';
    const adjacentPreviousPeriodId=periodId=>{
      const ids=(BASE_PERIOD_IDS.includes(periodId)?BASE_PERIOD_IDS:Object.keys(PERIODS)).slice().sort(),index=ids.indexOf(periodId);if(index<=0)return null;
      const previous=ids[index-1],toDate=id=>Date.UTC(+id.slice(0,4),+id.slice(4,6)-1,+id.slice(6,8));
      return (toDate(periodId)-toDate(previous))/86400000<=14?previous:null;
    };
    const priorityImpact=(item,periodId=state.period)=>{
      const previousId=adjacentPreviousPeriodId(periodId),previousItem=previousId?PERIODS[previousId].items.find(x=>x.id===item.id):null;
      const candidates=[
        {value:item.flowDelta,previous:previousItem?.flowDelta,label:'流水周环比'},
        {value:item.dauDelta,previous:previousItem?.dauDelta,label:'DAU 周环比'}
      ].filter(x=>x.value>=20||(x.value<=-20&&x.previous<=-20)).map(x=>({value:Math.abs(x.value),text:`${x.value>=0?'+':''}${x.value}%`,label:x.label}));
      return candidates.sort((a,b)=>b.value-a.value)[0]||null;
    };
    const isPriority=(item,periodId=state.period)=>Boolean(priorityImpact(item,periodId));
    const itemStatusKey=(item,periodId=state.period)=>{
      if(isPriority(item,periodId))return 'priority';
      const maxChange=Math.max(Math.abs(item.flowDelta??0),Math.abs(item.dauDelta??0));
      return maxChange>=10?'warning':'normal';
    };
    const itemStatusLabel=(item,periodId=state.period)=>statusLabel(itemStatusKey(item,periodId));
    const metricImpact=item=>{
      const candidates=[{value:Math.abs(item.flowDelta??0),text:`${item.flowDelta>=0?'+':''}${item.flowDelta}%`,label:'流水周环比'},{value:Math.abs(item.dauDelta??0),text:`${item.dauDelta>=0?'+':''}${item.dauDelta}%`,label:'DAU 周环比'}];
      return candidates.sort((a,b)=>b.value-a.value)[0];
    };
    const signalLabel=impact=>`${impact.label.startsWith('DAU')?'DAU':'流水'}${impact.text.startsWith('-')?'下降':'提升'}`;
    const intelFor=(item,index=0,periodId=state.period)=>{
      const exact=INTEL[periodId]?.[item.id];
      if(exact)return exact;
      const first=item.keywords[0]||'运营动态';
      const impact=priorityImpact(item,periodId)||metricImpact(item),tone=impact.text.startsWith('-')?'critical':'positive';
      return {rank:index+1,event:first,time:reportById(PERIODS[periodId].reportId).label,conclusion:item.summary,verdict:signalLabel(impact),tone,art:null,tags:item.keywords.slice(1,3)};
    };

    function routeFromHash(){
      if(!location.hash.startsWith('#competitor/'))return;
      const parts=location.hash.slice(1).split('/'),id=parts[1];
      openDetail(id,false);
    }
    function init(){
      $('#periodSelect').innerHTML=REPORTS.filter(r=>PERIODS[r.id]).map(r=>`<option value="${r.id}">${r.label}</option>`).join('');
      $('#periodSelect').value=state.period;
      renderReports();bindEvents();renderHome();
      routeFromHash();
    }
    const HERO_EVENT_SUMMARIES = window.__DB.HERO_EVENT_SUMMARIES || {};
    function completeHeroSentence(text){
      const value=String(text||'').replace(/\s+/g,' ').replace(/^[,，。；;：:]+|[,，。；;：:]+$/g,'').trim();
      return value?value+'。':'';
    }
    function heroEventSummary(item,intel,periodId){
      const exact=HERO_EVENT_SUMMARIES[periodId]?.[item.id];if(exact)return exact;
      let source=String(item.summary||item.note||'').replace(/\s+/g,' ').trim();
      source=source.replace(/^数据周期[^。；;]{0,120}(?=(?:本周|上周|端内|游戏|产品|该周|本期))/,'').replace(/^(?:本周|上周|该周)[,，]?/,'');
      source=source.replace(/(?:DAU均值|峰值DAU|周流水|流水周环比|DAU周环比)[^。；;，,]{0,38}/gi,'').replace(/[↑↓][+-]?\d+(?:\.\d+)?%/g,'');
      const segments=source.split(/[。；;]/).flatMap(sentence=>sentence.split(/[：:]/)).map(part=>part.replace(/^\s*(?:端内|端外|同时|此外|另有)[,，]?/,'').trim()).filter(Boolean);
      const action=segments.find(part=>/(上线|推出|更新|新增|开启|开放|预告|爆料|复刻|返场|联动|升级|调整|发布|投放|合作|举办|赠送|兑换|预热|延长|实装)/.test(part)&&!/(流水|DAU|环比|同比)/i.test(part));
      if(action){
        const clauses=action.split(/[，,]/).map(part=>part.trim()).filter(Boolean);
        let sentence='';
        for(const clause of clauses){const next=sentence?sentence+'，'+clause:clause;if([...next].length>25)break;sentence=next}
        if(sentence&&/(上线|推出|更新|新增|开启|开放|预告|爆料|复刻|返场|联动|升级|调整|发布|投放|合作|举办|赠送|兑换|预热|延长|实装)/.test(sentence))return completeHeroSentence(sentence);
      }
      const keyword=(item.keywords||[]).find(value=>value&&[...String(value)].length<=11&&!/[，。！？!?]/.test(value));
      if(keyword)return completeHeroSentence('围绕“'+keyword+'”更新内容并推进配套活动');
      const event=String(intel.event||'').trim();
      if(event&&[...event].length<=11)return completeHeroSentence('围绕“'+event+'”更新内容并推进配套活动');
      return '本期围绕核心版本内容推进运营与活动更新。';
    }
    function renderHome(){
      const p=period(),r=reportById(p.reportId),priority=p.items.filter(x=>isPriority(x,state.period)),hasMetricPriority=priority.length>0;
      const ov=$('#periodOverview');
      if(p.overview){ov.innerHTML='<span class="ov-tag">本期综述</span>'+p.overview;ov.classList.remove('hidden')}else{ov.classList.add('hidden')}
      const top=hasMetricPriority?[...priority].sort((a,b)=>priorityImpact(b,state.period).value-priorityImpact(a,state.period).value):p.items.filter(item=>item.summary||item.note).slice(0,4);
      const cards=top.map((x,i)=>({item:x,intel:intelFor(x,i)}));
      const summaryOrder=['流水提升','流水下降','DAU提升','DAU下降'],summaryCounts=Object.fromEntries(summaryOrder.map(k=>[k,0]));
      if(hasMetricPriority)cards.forEach(({item})=>summaryCounts[signalLabel(priorityImpact(item,state.period))]++);
      $('#heroTitle').textContent=hasMetricPriority?'本周异动产品':'本期重点运营产品';
      $('#heroSub').textContent=hasMetricPriority?`${r.label} · 上涨达 20% 即观测；下降需连续两个相邻周期均达 20%`:`${r.label} · 源周报未提供可用量化指标，以下按报告重点事件展示`;
      $('#heroStats').innerHTML=hasMetricPriority?summaryOrder.filter(k=>summaryCounts[k]>0).map(k=>`<div class="hero-stat ${k.endsWith('提升')?'positive':'critical'}"><strong>${summaryCounts[k]}</strong><span>${k}</span></div>`).join(''):`<div class="hero-stat"><strong>${cards.length}</strong><span>重点运营产品</span></div>`;
      $('#anomalyGrid').innerHTML=cards.slice(0,4).map(({item:x,intel:i})=>{
        const arch0=typeof REPORT_ARCHIVE!=='undefined'?REPORT_ARCHIVE[state.period]?.[x.id]:null,ai0=arch0?analysisItemsFor(arch0,i):[];let etype=ai0[0]?.category||analysisCategory((i.event||'')+' '+(i.conclusion||''))||{key:'gameplay',label:'玩法/内容',icon:'▣'};if(x.id==='rock')etype={key:'activation',label:'活跃任务',icon:'☑'};const impact=priorityImpact(x,state.period),art=i.art?`<img src="${i.art}" alt="${esc(META[x.id].name+' '+i.event+'活动画面')}">`:`<div class="p-fallback" style="background:${META[x.id].color}">${logo(x.id)}</div>`;
        const metric=impact?`<div class="p-metric"><div class="p-m"><small>${impact.label}</small><strong>${impact.text}</strong></div><div class="p-m dim"><small>同节点同比</small><strong>+000%</strong></div></div>`:`<div class="p-metric"><div class="p-m"><small>本期内容类型</small><strong style="font-size:16px">重点运营事件</strong></div></div>`;
        return `<article class="p-card" aria-label="${esc(META[x.id].name+'重点情报')}"><div class="p-media">${art}${metric}</div><div class="p-body"><div class="p-product">${logo(x.id)}<span>${esc(META[x.id].name)}</span></div><div class="p-event-row"><h3 class="p-event">${esc(i.event)}</h3><span class="p-badge analysis-category ${etype.key}"><i>${etype.icon}</i>${etype.label}</span></div><p class="p-concl">${esc(heroEventSummary(x,i,state.period))}</p><button class="p-detail" data-detail="${x.id}">查看竞品详情 →</button></div></article>`;
      }).join('');
      $('#tableCaption').textContent='数据口径：DAU和流水数据基于SensorTower等第三方数据和公司产品实际数据建模估算，模型会持续优化并不定期对历史数据进行调整';
      renderRows();renderOverviewTrend();
    }
    const HIGHLIGHT_SHORT={wz:'S44新赛季，心魔六耳上线，无象神器上线',hp:'6·30夏日冒险版本预热，夏日探险活动上线',df:'S10赛季预热，新干员液氮登场',jc:'莲华温泉主题活动，至臻阿狸上线',cs:'鬼吹灯联动&S4赛季预热，新角色无心上线',rock:'S3新赛季内容预告，赛季任务提前预热',sr:'4.3下半，昔涟、白厄复刻',ys:'“月之八”新版本预热',love:'新男主敖尹“狼人”设定引争议',sz:'新武将关银屏、程昱上线，争洛阳开启',sm:'世界杯联动，葡萄牙主题新服开启'};
    function renderRows(){
      const dh=v=>v==null?'<span class="muted">未披露</span>':`<span class="delta ${v>=0?'up':'down'}">环比${v>=0?'+':''}${v}%</span>`;
      let items=[...period().items];
      if(state.search){const q=state.search.toLowerCase();items=items.filter(x=>META[x.id].name.toLowerCase().includes(q)||x.keywords.join(' ').toLowerCase().includes(q)||x.note.toLowerCase().includes(q))}
      if(state.status!=='all')items=items.filter(x=>itemStatusKey(x,state.period)===state.status);
      if(state.sortKey)items.sort((a,b)=>((a[state.sortKey]??-Infinity)-(b[state.sortKey]??-Infinity))*state.sortDir);
      $('#competitorRows').innerHTML=items.length?items.map(x=>{const statusKey=itemStatusKey(x,state.period);return `<tr><td><button class="product-link" data-detail="${x.id}" aria-label="查看${esc(META[x.id].name)}详情"><span class="product-cell">${logo(x.id)}<span><strong>${META[x.id].name}</strong></span></span></button></td><td class="metric"><strong>${formatNum(x.flow)}</strong>${dh(x.flowDelta)}<span class="yoy-placeholder">同比同节点 <strong class="delta up">+xxx%</strong></span></td><td class="metric"><strong>${formatNum(x.dau)}</strong>${dh(x.dauDelta)}<span class="yoy-placeholder">同比同节点 <strong class="delta up">+xxx%</strong></span></td><td class="metric">${formatNum(x.peak)} ${x.peakDelta!=null?dh(x.peakDelta):''}</td><td><span class="status-${statusKey==='priority'?'critical':statusKey}"><i class="status-dot"></i>${statusLabel(statusKey)}</span></td><td class="judge">${esc(HIGHLIGHT_SHORT[x.id]||x.note)}</td><td><button class="link-btn" data-detail="${x.id}">查看详情 →</button></td></tr>`}).join(''):'<tr><td colspan="7"><div class="empty">没有符合条件的竞品</div></td></tr>';
      $$('[data-detail]').forEach(b=>b.onclick=()=>openDetail(b.dataset.detail));
    }
    function renderOverviewTrend(){
      const metric=state.overviewMetric,timeline=BASE_PERIOD_IDS.slice().sort(),W=980,H=320,P={l:62,r:20,t:22,b:42};
      const allSeries=Object.keys(META).map(id=>({id,points:timeline.map(pid=>({pid,item:PERIODS[pid].items.find(x=>x.id===id)})).filter(x=>x.item?.[metric]!=null)})).filter(x=>x.points.length>=2);
      if(state.overviewSelected===null){const priorityIds=period().items.filter(x=>isPriority(x,state.period)).map(x=>x.id).filter(id=>allSeries.some(s=>s.id===id));state.overviewSelected=priorityIds.length?priorityIds:allSeries.slice(0,3).map(s=>s.id)}
      const selected=new Set(state.overviewSelected),series=allSeries.filter(s=>selected.has(s.id));
      $$('[data-overview-metric]').forEach(b=>b.classList.toggle('active',b.dataset.overviewMetric===metric));
      $('#trendLegend').innerHTML=allSeries.map(s=>`<button class="${selected.has(s.id)?'selected':''}" data-trend-product="${s.id}" aria-pressed="${selected.has(s.id)}"><i style="background:${META[s.id].color}"></i>${esc(META[s.id].name)}</button>`).join('')+`<span class="legend-actions"><button data-trend-all>全选</button><button data-trend-clear>清空</button></span>`;
      bindTrendLegend(allSeries);
      if(!series.length){$('#overviewChart').innerHTML='<div class="trend-empty">请从上方图例中选择需要对比的游戏</div>';$('#eventPanel').innerHTML='<div class="trend-empty">选择游戏后显示关联事件</div>';return}
      const values=series.flatMap(s=>s.points.map(p=>p.item[metric])),max=Math.max(...values)*1.12,min=0;
      const x=pid=>P.l+timeline.indexOf(pid)*((W-P.l-P.r)/(timeline.length-1)),y=v=>H-P.b-(v-min)/(max-min)*(H-P.t-P.b);
      const ticks=[0,.25,.5,.75,1].map(t=>{const value=max*(1-t),yy=P.t+t*(H-P.t-P.b);return `<line x1="${P.l}" x2="${W-P.r}" y1="${yy}" y2="${yy}" stroke="#e3e8ef"/><text x="${P.l-10}" y="${yy+4}" text-anchor="end" font-size="9" fill="#7b8799">${Math.round(value).toLocaleString()}</text>`}).join('');
      const lines=series.map(s=>`<path d="${s.points.map((p,i)=>(i?'L':'M')+x(p.pid).toFixed(1)+','+y(p.item[metric]).toFixed(1)).join(' ')}" fill="none" stroke="${META[s.id].color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>`).join('');
      const points=series.flatMap(s=>s.points.map(p=>{const impact=priorityImpact(p.item,p.pid),marked=impact&&impact.label.startsWith(metric==='flow'?'流水':'DAU'),cx=x(p.pid),cy=y(p.item[metric]);return `<g class="overview-point" data-overview-product="${s.id}" data-overview-period="${p.pid}" tabindex="0" role="button" aria-label="${esc(META[s.id].name+' '+reportById(p.pid).label)}">${marked?`<circle cx="${cx}" cy="${cy}" r="8" fill="none" stroke="#f04438" stroke-width="2"/>`:''}<circle cx="${cx}" cy="${cy}" r="4" fill="${META[s.id].color}" stroke="#fff" stroke-width="2"/></g>`})).join('');
      const labels=timeline.map(pid=>`<text x="${x(pid)}" y="${H-15}" text-anchor="middle" font-size="9" fill="${pid===state.period?'#152033':'#77859b'}" font-weight="${pid===state.period?'700':'400'}">${reportById(pid).label.replace(/^20\d\d\./,'').replace('—','-')}</text>`).join('');
      $('#overviewChart').innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="多竞品${metric==='flow'?'流水':'DAU'}趋势图">${ticks}${lines}${points}${labels}</svg>`;
      const available=(state.overviewPoint&&series.some(s=>s.id===state.overviewPoint.id&&s.points.some(p=>p.pid===state.overviewPoint.pid)))?state.overviewPoint:null;
      if(!available){const currentMarked=series.flatMap(s=>s.points.map(p=>({id:s.id,...p}))).find(p=>p.pid===state.period&&priorityImpact(p.item,p.pid)?.label.startsWith(metric==='flow'?'流水':'DAU'));const fallback=currentMarked||{id:series[0].id,...series[0].points.at(-1)};state.overviewPoint={id:fallback.id,pid:fallback.pid}}
      showTrendEvent(state.overviewPoint.id,state.overviewPoint.pid);
      $$('#overviewChart [data-overview-product]').forEach(node=>{const activate=()=>{state.overviewPoint={id:node.dataset.overviewProduct,pid:node.dataset.overviewPeriod};showTrendEvent(state.overviewPoint.id,state.overviewPoint.pid)};node.onclick=activate;node.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate()}}});
    }
    function bindTrendLegend(allSeries){
      $$('[data-trend-product]').forEach(button=>button.onclick=()=>{const selected=new Set(state.overviewSelected),id=button.dataset.trendProduct;if(selected.has(id))selected.delete(id);else selected.add(id);state.overviewSelected=[...selected];if(state.overviewPoint?.id===id&&!selected.has(id))state.overviewPoint=null;renderOverviewTrend()});
      $('[data-trend-all]').onclick=()=>{state.overviewSelected=allSeries.map(s=>s.id);state.overviewPoint=null;renderOverviewTrend()};
      $('[data-trend-clear]').onclick=()=>{state.overviewSelected=[];state.overviewPoint=null;renderOverviewTrend()};
    }
    function showTrendEvent(id,pid){
      const metric=state.overviewMetric,item=PERIODS[pid].items.find(x=>x.id===id);if(!item){$('#eventPanel').innerHTML='<div class="trend-empty">该节点暂无数据</div>';return}
      const value=item[metric],delta=item[metric+'Delta'],info=intelFor(item,0,pid),status=itemStatusLabel(item,pid),metricName=metric==='flow'?'流水（万元）':'DAU（万）';
      $('#eventPanel').innerHTML=`<div class="event-panel-head">${logo(id)}<div><strong>${esc(META[id].name)}</strong><span>${reportById(pid).label} · ${status}</span></div></div><div class="event-kpi"><div><span>${metricName}</span><strong>${formatNum(value)}</strong></div><div><span>周环比</span><strong style="font-size:14px;color:${delta>=0?'#16875e':'#d92d20'}">${delta==null?'未披露':(delta>=0?'+':'')+delta+'%'}</strong><small>同比同节点 +xxx%</small></div></div><div class="event-status"><span>关联运营事件</span><h3>${esc(info.event)}</h3><p>${esc(info.conclusion)}</p><div class="event-tags">${info.tags.slice(0,3).map(t=>`<i># ${esc(t)}</i>`).join('')}</div></div><button class="link-btn" data-event-detail="${id}">查看该竞品完整档案 →</button>`;
      $('#eventPanel [data-event-detail]').onclick=()=>{state.period=pid;$('#periodSelect').value=pid;openDetail(id)};
    }
    function renderReports(){
      const reports=window.__ARCHIVE_REPORTS||[];
      let cycles=reports;
      if(state.reportYear==='demo')cycles=cycles.filter(r=>r.isDemo);else if(state.reportYear!=='all')cycles=cycles.filter(r=>!r.isDemo&&String(r.start||r.label).startsWith(state.reportYear));
      if(state.reportSearch){const q=state.reportSearch.toLowerCase();cycles=cycles.filter(r=>r.label.toLowerCase().includes(q)||r.title.toLowerCase().includes(q))}
      const actualCount=reports.filter(r=>!r.isDemo).length;
      $('#reportArchiveSummary').textContent=`已录入 ${actualCount} 份真实监测周报，策略复盘暂未纳入；另有 1 期 AI 关联效果演示。`;
      $('#reportArchiveDetail').classList.add('hidden');
      $('#reportGrid').classList.remove('hidden');
      $('#reportGrid').innerHTML=cycles.length?cycles.map(r=>{const p=window.__ARCHIVE_PERIODS?.[r.id],items=p?.items||[],content=window.__ARCHIVE_CONTENT?.[r.id]||{},productCount=new Set([...items.map(x=>x.id),...Object.keys(content)]).size;return `<article class="report-card ${r.isDemo?'demo':''}"><div class="cycle-card-top"><span>${r.isDemo?'AI LINKING DEMO':'WEEKLY REPORT ARCHIVE'}</span><strong>${esc(r.label)}</strong><div class="cycle-kpis"><div><b>${productCount}</b>收录竞品</div><div><b>${r.pages||'—'}</b>${r.isDemo?'效果演示':'报告页数'}</div></div></div><div class="report-body"><span class="report-kind ${r.isDemo?'demo':''}">${esc(r.type)}</span><h3>${esc(r.title)}</h3><div class="report-meta"><span>${r.isDemo?'虚构周期 · 不进入首页':'已录入完整摘要'}</span></div><div class="report-actions"><button class="link-btn" data-archive-report="${r.id}">${r.isDemo?'查看 AI 关联演示':'打开该期摘要'} →</button></div></div></article>`}).join(''):'<div class="archive-empty">没有符合条件的报告</div>';
      $$('[data-archive-report]').forEach(button=>button.onclick=()=>renderArchiveDetail(button.dataset.archiveReport));
    }
    function renderArchiveDetail(reportId){
      const report=(window.__ARCHIVE_REPORTS||[]).find(r=>r.id===reportId);if(!report)return;
      const period=window.__ARCHIVE_PERIODS?.[reportId],content=window.__ARCHIVE_CONTENT?.[reportId]||{},itemMap=new Map((period?.items||[]).map(item=>[item.id,item]));
      const productIds=[...new Set([...itemMap.keys(),...Object.keys(content)])].filter(id=>META[id]);
      const products=productIds.map(id=>{const record=content[id],item=itemMap.get(id),blocks=record?.blocks||[],major=blocks.filter(x=>x.level==='major').slice(0,4),isAi=Boolean(report.isDemo&&record?.sourceType==='ai-demo');return `<article class="archive-product"><div class="archive-product-head"><div class="archive-product-title">${logo(id)}<div><strong>${esc(META[id].name)}</strong><small>${isAi?'数据无异动 · AI 自动关联':'源周报内容录入'}</small></div></div><div class="archive-product-summary">${isAi?'<span>AI</span>':''}${major.length?major.map(x=>`<span>${esc(conciseAnalysisTitle(x.text))}</span>`).join(''):'<span>该期未提取到结构化标题</span>'}${report.isDemo&&record?`<div><button class="link-btn demo-open-detail" data-demo-product="${id}">进入竞品详情查看 AI 展示 →</button></div>`:''}</div></div>${blocks.length?`<details><summary>展开该竞品完整录入内容（${blocks.length} 条）</summary><div class="archive-block-list">${blocks.map(block=>`<section class="archive-entry ${block.level}"><b>${block.level==='major'?'主要观点':block.level==='detail'?'详细内容':'数据与总览'}</b><p>${esc(block.text)}</p></section>`).join('')}</div></details>`:'<div class="archive-empty">该竞品在源报告中未形成可提取的文字段落。</div>'}</article>`}).join('');
      $('#reportGrid').classList.add('hidden');
      const target=$('#reportArchiveDetail');target.classList.remove('hidden');target.innerHTML=`<div class="archive-detail-head"><div><button class="back-btn" id="backArchiveList">← 返回全部周报</button><h2>${esc(report.title)}</h2><p>${esc(report.label)}${report.isDemo?' · 本页全部内容为效果演示，不代表真实活动':''}</p><div class="archive-detail-meta"><span>${report.type}</span><span>${report.pages||'—'} 页</span><span>${productIds.length} 个竞品</span></div></div></div><div class="archive-product-list">${products||'<div class="archive-empty">该报告暂无可展示内容</div>'}</div>`;
      $('#backArchiveList').onclick=renderReports;
      $$('[data-demo-product]').forEach(button=>button.onclick=()=>openDetail(button.dataset.demoProduct,true,'demo_20260713'));
      window.scrollTo({top:0,behavior:'smooth'});
    }
    function switchView(view){
      state.view=view;['home','reports','detail'].forEach(v=>$(`#${v}View`)?.classList.toggle('hidden',v!==view));
      $$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===(view==='detail'?'competitors':view)));
      window.scrollTo({top:0,behavior:'smooth'});
    }
    function productObservations(id){
      const saved=Object.keys(PERIODS).sort().reverse().map(pid=>{const item=PERIODS[pid].items.find(x=>x.id===id);return item?{key:pid,periodId:pid,label:reportById(PERIODS[pid].reportId).label,item}:null}).filter(Boolean);
      const custom=(CUSTOM_OBSERVATIONS[id]||[]).map(x=>({key:x.key,periodId:null,label:x.label,item:x.item,custom:true}));
      const demoItem=window.__ARCHIVE_PERIODS?.demo_20260713?.items?.find(x=>x.id===id),demoArchive=window.__ARCHIVE_CONTENT?.demo_20260713?.[id],demo=demoItem&&demoArchive?[{key:'demo_20260713',periodId:null,label:'2026.07.13—07.19（AI 效果演示）',item:demoItem,demo:true,archive:demoArchive}]:[];
      return [...demo,...custom.reverse(),...saved];
    }
    function observationFor(id,key){const all=productObservations(id);return all.find(x=>x.key===key)||all[0]}
    function cleanAnalysisText(text){return String(text||'').replace(/\s+/g,' ').trim()}
    function metricFreeAnalysisText(text){
      return cleanAnalysisText(text).split(/[。；;]/).filter(part=>part&&!/(数据影响|周流水|流水|日均\s*DAU|峰值\s*DAU|DAU\s*环比|环比.*DAU)/i.test(part)).join('；');
    }
    function analysisCategory(text){
      const value=cleanAnalysisText(text),paidNegative=/(商业化|付费).{0,8}(未更新|无更新|暂无)|暂无.{0,8}(商业化|付费)/.test(value),freeReward=/(免费|赠送|领取|兑换).{0,10}(皮肤|时装)|(皮肤|时装).{0,10}(免费|赠送|领取|兑换)/.test(value);
      const strongPaid=/商业化(更新|侧|[:：])|付费|卡池|棱彩召唤|召唤活动|祈愿|抽卡|售价|定价|保底|砖皮|刀皮|通行证|战令|礼包|直购|先享付|月卡|魔盒/.test(value);
      const minorPaid=/皮肤|时装|商店|上架|外观/.test(value),marketing=/端外|社媒|宣传|传播|营销|预热|联动|直播|赛事|主题曲|线下|舆情|热搜|广告|达人带货/.test(value);
      if(!paidNegative&&(strongPaid||(minorPaid&&!freeReward&&!marketing)))return {key:'paid',label:'付费',icon:'¥'};
      if(marketing)return {key:'marketing',label:'营销热点',icon:'✦'};
      if(/^福利矩阵|福利投放|常规周末促活|活跃奖励|免费赠送|双倍奖励|促活活动/.test(value))return {key:'activation',label:'促活活动',icon:'◆'};
      if(/玩法内容|玩法更新|版本更新|平衡性|新英雄|新角色|新⻆色|新干员|新地图|新武器|新剧本|新玩法|前瞻服|模式|竞技体系|巅峰赛|段位|排位|对局|战役/.test(value))return {key:'gameplay',label:'玩法/内容',icon:'▣'};
      if(/促活|活跃奖励|福利|免费|赠送|领取|兑换|签到|累登|任务|双倍|加倍|回流|召回|养成材料|预约奖励/.test(value))return {key:'activation',label:'促活活动',icon:'◆'};
      return {key:'gameplay',label:'玩法/内容',icon:'▣'};
    }
    function conciseAnalysisTitle(text){
      const value=cleanAnalysisText(text).replace(/[：:]$/,'');
      if(/六耳/.test(value)&&/扁鹊/.test(value)&&/无象神器/.test(value))return '六耳落地、扁鹊重做与无象神器';
      if(/巅峰赛/.test(value)&&/段位继承/.test(value))return '巅峰赛升级与段位继承调整';
      if(/商业化/.test(value)&&/赛季初/.test(value)&&/皮肤/.test(value))return '赛季初皮肤商业化组合';
      if(/福利矩阵|常规福利投放/.test(value))return '赛季初福利与体验优化';
      if(/端外/.test(value)&&/S44/.test(value))return 'S44 新赛季多维营销';
      const parts=value.split(/[：:]/),generic=/^(端内|端外|商业化|商业化更新|商业化侧|玩法内容|竞技体系|版本内容|运营动作)$/;
      let candidate=parts[0].trim();if((candidate.length>22||generic.test(candidate))&&parts[1])candidate=parts[1].split(/[，,。；;]/)[0].trim();else candidate=candidate.split(/[，,。；;]/)[0].trim();
      candidate=candidate.replace(/^(端内|端外)/,'').replace(/新英雄/g,'').replace(/史诗级/g,'').replace(/赛季限定装备/g,'').replace(/系统性/g,'').replace(/\+/g,'、').replace(/^以/,'').replace(/为主$/,'').trim();
      if(candidate.length>22){const pieces=candidate.split(/[、+]/),kept=[];let length=0;for(const piece of pieces){if(length+piece.length+(kept.length?1:0)>22)break;kept.push(piece);length+=piece.length+(kept.length>1?1:0)}candidate=kept.length?kept.join('、'):candidate.slice(0,22)}
      return candidate.replace(/[.…\.]+$/,'');
    }
    function conciseAnalysisSummary(text){
      const value=cleanAnalysisText(text).replace(/[.…]+$/,'');if(!value)return '';
      const sentence=value.split(/[。！？!?；;]/)[0].trim(),colon=sentence.search(/[：:]/);let summary='';
      if(colon>0&&colon<20){const subject=sentence.slice(0,colon).trim(),detail=sentence.slice(colon+1).split(/[，,]/)[0].trim();summary=subject+(detail?'，'+detail:'')}
      else{const clauses=sentence.split(/[，,]/).filter(Boolean);summary=clauses[0]||sentence;if(summary.length<18&&clauses[1]&&summary.length+clauses[1].length<43)summary+='，'+clauses[1]}
      if(summary.length>42){const cut=summary.slice(0,42),last=Math.max(cut.lastIndexOf('，'),cut.lastIndexOf('、'));summary=last>16?cut.slice(0,last):cut}
      return summary.replace(/[，、：:；;.…\.]+$/,'')+'。';
    }
    function analysisDetailSections(full){
      const marker=/(?=(?:[–•]\s*)?(?:玩家反馈|玩家评价|用户反馈|社区反馈|数据表现|英雄热度|市场表现|榜单表现|活动表现|传播表现|付费表现|商业表现)[:：])/;
      const parts=String(full||'').split(/\n\n+/).flatMap(paragraph=>paragraph.split(marker)).map(cleanAnalysisText).filter(Boolean),groups={content:[],data:[],feedback:[]};
      parts.forEach(part=>{
        const feedback=/^(?:[–•]\s*)?(?:玩家反馈|玩家评价|用户反馈|社区反馈)[:：]|玩家.{0,12}(认为|评价|反馈|吐槽|不满|担心|质疑)|好评|差评|舆情|口碑|争议/.test(part);
        const explicitData=/^(?:[–•]\s*)?(?:数据表现|英雄热度|市场表现|榜单表现|活动表现|传播表现|付费表现|商业表现)[:：]/.test(part),hits=part.match(/畅销榜|热度|出场率|登场率|ban率|BP率|播放量|互动量|排名|销量|预约量|参与率|转化率|讨论度|峰值|环比|同比|TOP\s*\d+|增长|下滑|提升|下降/gi)||[];
        if(feedback)groups.feedback.push(part);else if(explicitData||hits.length>=2)groups.data.push(part);else groups.content.push(part);
      });
      return [
        {key:'content',label:'更新内容介绍',icon:'▣',content:groups.content.join('\n\n')},
        {key:'data',label:'相关数据表现',icon:'↗',content:groups.data.join('\n\n')},
        {key:'feedback',label:'玩家反馈',icon:'◉',content:groups.feedback.join('\n\n')}
      ].filter(section=>section.content);
    }
    function analysisItemsFor(archive,info){
      if(!archive?.blocks?.length)return [];
      const modules=[];
      archive.blocks.forEach((block,index)=>{
        if(block.level!=='major')return;
        const viewpoint=String(block.text||'').trim();if(!viewpoint)return;
        const details=[];for(let i=index+1;i<archive.blocks.length&&archive.blocks[i].level==='detail';i++){const text=String(archive.blocks[i].text||'').trim();if(text)details.push(text)}
        modules.push({viewpoint,title:viewpoint,full:[viewpoint,...details].join('\n\n'),details,detailCount:details.length});
      });
      return modules.map((item,index)=>({...item,category:analysisCategory(item.viewpoint),index}));
    }
    function analysisReadableSegments(text){
      const normalized=String(text||'').replace(/\r/g,'').replace(/[•●▪]/g,'\n').replace(/[–—](?=[\u4e00-\u9fa5A-Za-z]{2,18}[：:])/g,'\n').replace(/([。；;])(?=[^”"』」])/g,'$1\n');
      const firstPass=normalized.split(/\n+/).map(x=>x.replace(/^[\s_—–-]+|[\s_—–-]+$/g,'').trim()).filter(x=>x.length>6&&/[\u4e00-\u9fa5A-Za-z0-9]/.test(x));
      const result=[];
      firstPass.forEach(point=>{
        if(point.length<=105){result.push(point);return}
        const clauses=point.split(/(?<=[，,])/).map(x=>x.trim()).filter(Boolean);let chunk='';
        clauses.forEach(clause=>{if(chunk&&chunk.length+clause.length>96){result.push(chunk);chunk=clause}else chunk+=clause});
        if(chunk)result.push(chunk);
      });
      return result.map(x=>x.replace(/^[，,。；;：:]+|[，,]+$/g,'').trim()).filter(x=>x.length>6);
    }
    function analysisPointGroup(point){
      const feedback=/(玩家反馈|玩家评价|用户反馈|社区反馈|认为|吐槽|不满|担心|质疑|口碑|争议|好评|差评|“[^”]{4,}”)/.test(point);
      if(feedback)return 'feedback';
      const metrics=point.match(/(?:\d+(?:\.\d+)?%|TOP\s*\d+|T[0-3](?:\.\d)?|\d[\d,.]*\s*(?:万|亿|元|点券|星币|次|名|秒|小时|天))/gi)||[];
      if(/^(数据表现|英雄热度|市场表现|榜单表现|活动表现|传播表现|付费表现|商业表现|热度|出场率|登场率|ban率|BP率|播放量|互动量|排名|销量|预约量|参与率|转化率|峰值|环比|同比)/i.test(point)||metrics.length>=2)return 'data';
      return 'content';
    }
    function analysisPointTitle(point,index,key){
      const colon=point.search(/[：:]/);if(colon>0&&colon<22)return point.slice(0,colon).replace(/^[–—-]/,'').trim();
      const labels={content:'变化要点',data:'数据证据',feedback:'反馈要点'};return labels[key]+' '+(index+1);
    }
    function analysisPointBody(point,title){const colon=point.search(/[：:]/);return colon>0&&colon<22&&point.slice(0,colon).trim()===title?point.slice(colon+1).trim():point}
    function analysisFeedbackTone(point){const positive=/(认可|好评|趣味|爽|提升|满意|喜欢|强度高|价值高)/.test(point),negative=/(不满|担心|质疑|问题|削弱|难|低|差|反制|容错|争议|腰斩|成本高)/.test(point);return positive&&negative?{key:'mixed',label:'评价分化'}:negative?{key:'negative',label:'负向反馈'}:positive?{key:'positive',label:'认可点'}:{key:'mixed',label:'反馈观点'}}
    function analysisKpis(points){
      const found=[];points.forEach(point=>{const matches=point.match(/(?:\d+(?:\.\d+)?%|TOP\s*\d+|T[0-3](?:\.\d)?|\d[\d,.]*\s*(?:万|亿|元|点券|星币|次|名|秒|小时|天))/gi)||[];matches.forEach(value=>{if(found.some(x=>x.value===value)||found.length>=8)return;const at=point.indexOf(value),prefix=point.slice(Math.max(0,at-15),at).split(/[，,。；;：:]/).pop().trim().slice(-10);found.push({label:prefix||'关键指标',value})})});return found;
    }
    function renderAnalysisPoint(point,index,key){const title=analysisPointTitle(point,index,key),body=analysisPointBody(point,title),tone=key==='feedback'?analysisFeedbackTone(point):null;return `<li class="analysis-point"><span class="analysis-point-index">${String(index+1).padStart(2,'0')}</span><div class="analysis-point-copy"><b>${esc(title)}</b><p>${esc(body)}</p>${tone?`<span class="analysis-point-tone ${tone.key}">${tone.label}</span>`:''}</div></li>`}
    function renderReadableAnalysis(full){
      const mods=analysisOriginalModules(full);
      const body=mods.map((m,i)=>`<div class="om-block"><p class="om-title" style="color:${m.color}">${String(i+1).padStart(2,'0')} <strong>${esc(m.title)}</strong></p><div class="om-body">${m.body}</div></div>`).join('');
      return `<div class="analysis-readable">${body}</div>`;
    }

    function analysisOriginalModules(full){
      const COLORS=['#315fa9','#217258','#a64b12','#94670b','#7f56d9','#b13f3a','#06aed4','#b0448f'];
      const parts=String(full||'').split(/\n\n+/).map(x=>x.trim()).filter(Boolean);
      return parts.map((part,i)=>{
        let title='',body=part;
        const dash=part.search(/[–—-]/);
        const colon=part.search(/[：:]/);
        if(colon>0&&colon<=24){title=part.slice(0,colon).trim();body=part.slice(colon+1).trim()}
        else if(dash>0&&dash<=28){title=part.slice(0,dash).trim();body=part.slice(dash+1).trim()}
        else{const seg=part.split(/[，。；;,]/)[0];title=seg.length>24?seg.slice(0,24)+'…':seg}
        return {title,body:renderModuleBody(body),color:COLORS[i%COLORS.length]};
      });
    }

    function renderModuleBody(text){
      const segs=String(text||'').split(/[–—]/).map(x=>x.trim()).filter(Boolean);
      const out=[];let list=[];
      const flush=()=>{if(list.length){out.push('<ul class="om-list">'+list.map(li=>'<li>'+esc(li)+'</li>').join('')+'</ul>');list=[]}};
      segs.forEach(seg=>{
        if(seg.startsWith('·')||seg.startsWith('•')){list.push(seg.replace(/^[·•]\s*/,''));return}
        flush();
        const colon=seg.search(/[：:]/);
        if(colon>0&&colon<=16){out.push('<p class="om-line"><strong class="om-sub">'+esc(seg.slice(0,colon))+'：</strong>'+esc(seg.slice(colon+1))+'</p>')}
        else if(/[“”"]/.test(seg)&&seg.length>30){out.push('<blockquote class="om-quote">'+esc(seg)+'</blockquote>')}
        else{out.push('<p class="om-line">'+esc(seg)+'</p>')}
      });
      flush();
      return out.join('');
    }

    function renderAudienceProfile(id){
      const profile=window.__AUDIENCE_PROFILES?.[id];
      const src=profile?profile.source:'数据来源于抖音官方账号的粉丝画像，仅供参考（待接入）';
      const gender=profile?profile.gender:{male:'—',female:'—'};
      const age=profile?Object.entries(profile.age):[['18-23','—'],['24-30','—'],['31-40','—'],['41-50','—'],['50+','—']];
      const ageHtml=age.map(([k,v])=>'<span class="ac-age"><i>'+k+'</i><b>'+v+'</b></span>').join('');
      return '<div class="audience-compact"><div class="ac-head"><strong>用户画像</strong><span class="ac-src">'+src+'</span></div><div class="ac-grid"><div class="ac-item"><span>性别分布</span><b>男 '+gender.male+' · 女 '+gender.female+'</b></div><div class="ac-item ac-ages"><span>年龄分布</span>'+ageHtml+'</div></div></div>';
    }



    /* CORE_CONTENT_MODULE_START: local data, hierarchy renderer and image viewer */
    const CORE_REFERENCE_PERIOD='20260622';
    const CORE_REFERENCE_ITEMS=window.__CORE_REFERENCE_ITEMS||{};
    const CORE_REFERENCE_IMAGES=window.__CORE_REFERENCE_IMAGES||{};
    const CORE_TYPE_META={"玩法":{"icon":"🎮","label":"玩法/内容","cls":"gameplay"},"平衡":{"icon":"⚖️","label":"平衡","cls":"balance"},"竞技":{"icon":"🏆","label":"竞技体系","cls":"rank"},"商业化":{"icon":"💰","label":"商业化","cls":"sale"},"营销":{"icon":"📣","label":"营销","cls":"promo"},"预热":{"icon":"⏳","label":"版本预热","cls":"preheat"},"活动":{"icon":"🎁","label":"活动","cls":"event"},"联动":{"icon":"🤝","label":"联动","cls":"collab"},"舆情":{"icon":"⚠️","label":"舆情","cls":"crisis"},"反馈":{"icon":"💬","label":"玩家反馈","cls":"feedback"},"风险":{"icon":"🧭","label":"风险观察","cls":"risk"},"机制":{"icon":"🧩","label":"机制设计","cls":"system"}};
    function coreEscapeHtml(text){return esc(String(text==null?'':text))}
    function coreTypeForCategory(category){const key=category&&category.key;if(key==='paid')return '商业化';if(key==='marketing')return '营销';if(key==='activation')return '活动';return '玩法'}
    function coreFallbackItems(archive){if(!archive||!Array.isArray(archive.blocks))return [];const items=[];archive.blocks.forEach((block,index)=>{if(block.level!=='major')return;const overview=String(block.text||'').trim();if(!overview)return;const details=[];for(let i=index+1;i<archive.blocks.length&&archive.blocks[i].level==='detail';i++){const value=String(archive.blocks[i].text||'').trim();if(value)details.push(value)}const category=analysisCategory(overview+' '+details.join(' '));items.push({title:overview,type:coreTypeForCategory(category),text:overview+(details.length?'\n'+details.map(x=>'○ '+x).join('\n'):'')})});return items}
    function coreItemsFor(id,periodId,archive){if(periodId===CORE_REFERENCE_PERIOD&&CORE_REFERENCE_ITEMS[id])return CORE_REFERENCE_ITEMS[id];return coreFallbackItems(archive)}
    function coreTagHtml(type){const meta=CORE_TYPE_META[type]||{icon:'•',label:type||'内容',cls:'gameplay'};return '<span class="core-tag '+coreEscapeHtml(meta.cls)+'"><span class="core-tag-icon" aria-hidden="true">'+coreEscapeHtml(meta.icon)+'</span>'+coreEscapeHtml(meta.label)+'</span>'}
    function coreSplitTitleAndBody(text){const cleaned=String(text||'').trim(),idx=cleaned.search(/[：:]/);if(idx===-1)return {title:cleaned,body:''};return {title:cleaned.slice(0,idx).trim(),body:cleaned.slice(idx+1).trim()}}
    function coreAppendText(target,key,line){const value=String(line||'').trim();if(!value)return;target[key]=(target[key]?target[key]+' ':'')+value}
    function coreIsFeedbackTitle(title){return /玩家反馈|玩家评价|用户反馈|用户评价|社区反馈/.test(title||'')}
    function coreParseReportHierarchy(text){const lines=String(text||'').replace(/\r/g,'').split('\n').map(line=>line.replace(/\s+/g,' ').trim()).filter(Boolean);const result={viewpoint:'',topics:[],loosePoints:[]};let currentTopic=null,currentPoint=null,currentNested=null;lines.forEach(line=>{if(/^○/.test(line)){const parsed=coreSplitTitleAndBody(line.replace(/^○\s*/,''));currentTopic={title:parsed.title,lead:parsed.body,points:[],quotes:[]};result.topics.push(currentTopic);currentPoint=null;currentNested=null;return}if(/^[–—-]/.test(line)){const parsed=coreSplitTitleAndBody(line.replace(/^[–—-]\s*/,''));if(currentPoint&&coreIsFeedbackTitle(currentPoint.title)&&/^(?:好评点|差评点|认可点|争议点|正向反馈|负向反馈)/.test(parsed.title)){currentNested={title:parsed.title,body:parsed.body,quotes:[]};currentPoint.nested.push(currentNested);return}currentPoint={title:parsed.title,body:parsed.body,nested:[],quotes:[]};if(currentTopic)currentTopic.points.push(currentPoint);else result.loosePoints.push(currentPoint);currentNested=null;return}if(/^·/.test(line)){const parsed=coreSplitTitleAndBody(line.replace(/^·\s*/,''));currentNested={title:parsed.title,body:parsed.body,quotes:[]};if(currentPoint)currentPoint.nested.push(currentNested);else if(currentTopic){currentPoint={title:'补充说明',body:'',nested:[currentNested],quotes:[]};currentTopic.points.push(currentPoint)}return}if(/^[“"]/.test(line)){const inFeedback=coreIsFeedbackTitle(currentPoint&&currentPoint.title)||coreIsFeedbackTitle(currentTopic&&currentTopic.title);if(inFeedback){if(currentNested)currentNested.quotes.push(line.trim());else if(currentPoint)currentPoint.quotes.push(line.trim());else if(currentTopic)currentTopic.quotes.push(line.trim());return}if(currentNested){coreAppendText(currentNested,'body',line);return}if(currentPoint){coreAppendText(currentPoint,'body',line);return}if(currentTopic){coreAppendText(currentTopic,'lead',line);return}coreAppendText(result,'viewpoint',line);return}if(currentNested){coreAppendText(currentNested,'body',line);return}if(currentPoint){coreAppendText(currentPoint,'body',line);return}if(currentTopic){coreAppendText(currentTopic,'lead',line);return}coreAppendText(result,'viewpoint',line)});return result}
    function coreIntro(text){const tree=coreParseReportHierarchy(text),intro=(tree.viewpoint||(tree.topics[0]&&tree.topics[0].lead)||text||'').replace(/\s+/g,' ').trim();return intro.length>96?intro.slice(0,96)+'…':intro}
    function coreQuoteListHtml(quotes){if(!quotes||!quotes.length)return '';return '<div class="core-quote-list">'+quotes.map(q=>'<blockquote class="core-report-quote">'+coreEscapeHtml(q)+'</blockquote>').join('')+'</div>'}
    function coreNestedPointHtml(point){return '<div class="core-nested-point"><span class="core-nested-dot" aria-hidden="true"></span><div class="core-nested-copy">'+(point.title?'<strong>'+coreEscapeHtml(point.title)+'：</strong>':'')+(point.body?'<p>'+coreEscapeHtml(point.body)+'</p>':'')+coreQuoteListHtml(point.quotes)+'</div></div>'}
    function coreDetailPointHtml(point,index){const feedbackClass=coreIsFeedbackTitle(point.title)?' feedback-point':'';return '<section class="core-detail-point'+feedbackClass+'"><div class="core-detail-point-head"><span class="core-detail-point-symbol" aria-hidden="true">'+(index+1)+'</span><h5 class="core-detail-point-title">'+coreEscapeHtml(point.title||'补充说明')+'</h5></div>'+(point.body?'<p class="core-detail-point-text">'+coreEscapeHtml(point.body)+'</p>':'')+(point.nested&&point.nested.length?'<div class="core-nested-points">'+point.nested.map(coreNestedPointHtml).join('')+'</div>':'')+coreQuoteListHtml(point.quotes)+'</section>'}
    function coreNormalizeMediaKey(text){return String(text||'').replace(/[“”"'「」\s]/g,'').toLowerCase()}
    function coreMediaBuckets(item,topics){const buckets=topics.map(()=>[]);(item.media||[]).forEach(media=>{let index=0;if(media.topic){const mediaKey=coreNormalizeMediaKey(media.topic),found=topics.findIndex(topic=>{const topicKey=coreNormalizeMediaKey(topic.title);return topicKey.includes(mediaKey)||mediaKey.includes(topicKey)});if(found>=0)index=found}if(!buckets[index])buckets[index]=[];buckets[index].push(media)});return buckets}
    function coreMediaGalleryHtml(media){if(!media||!media.length)return '';return '<div class="core-report-media-gallery '+(media.length===1?'single':'')+'">'+media.map(item=>{const src=CORE_REFERENCE_IMAGES[item.src]||'',caption=item.caption||'原报告配图',page=item.page==null?'':String(item.page);if(!src)return '';return '<figure class="core-report-media"><button type="button" class="core-media-open" data-core-media="'+coreEscapeHtml(item.src)+'" data-core-caption="'+coreEscapeHtml(caption)+'" data-core-page="'+coreEscapeHtml(page)+'" aria-label="放大查看：'+coreEscapeHtml(caption)+'"><img src="'+src+'" alt="'+coreEscapeHtml(caption)+'" loading="lazy"></button><figcaption><span>'+coreEscapeHtml(caption)+'</span><span class="core-report-media-page">报告 P'+coreEscapeHtml(page)+'</span></figcaption></figure>'}).join('')+'</div>'}
    function coreTopicHtml(topic,index,media){const feedbackClass=coreIsFeedbackTitle(topic.title)?' feedback-topic':'';return '<section class="core-topic-section'+feedbackClass+'"><header class="core-topic-head"><h4 class="core-topic-title">'+coreEscapeHtml(topic.title)+'</h4>'+(topic.lead?'<p class="core-topic-lead">'+coreEscapeHtml(topic.lead)+'</p>':'')+'</header>'+coreMediaGalleryHtml(media)+(topic.points.length||topic.quotes.length?'<div class="core-topic-body">'+topic.points.map(coreDetailPointHtml).join('')+coreQuoteListHtml(topic.quotes)+'</div>':'')+'</section>'}
    function coreHierarchyHtml(item){const text=item.text||'',tree=coreParseReportHierarchy(text);if(tree.topics.length){const media=coreMediaBuckets(item,tree.topics);return '<div class="core-topic-list">'+tree.topics.map((topic,index)=>coreTopicHtml(topic,index,media[index])).join('')+'</div>'}if(tree.loosePoints.length)return '<div class="core-topic-list"><section class="core-topic-section"><header class="core-topic-head"><h4 class="core-topic-title">具体说明</h4></header><div class="core-topic-body">'+tree.loosePoints.map(coreDetailPointHtml).join('')+'</div>'+coreMediaGalleryHtml(item.media||[])+'</section></div>';return '<div class="core-ungrouped-copy">'+coreEscapeHtml(text)+'</div>'+coreMediaGalleryHtml(item.media||[])}
    function coreContentItemHtml(item){const title=coreIntro(item.text)||item.title||'具体内容';return '<details class="core-content-item" open><summary class="core-content-summary"><div class="core-content-summary-row"><h3 class="core-content-title">'+coreEscapeHtml(title)+'</h3><div class="core-content-summary-actions">'+coreTagHtml(item.type)+'<span class="core-content-arrow" aria-hidden="true">⌄</span></div></div></summary><div class="core-content-body">'+coreHierarchyHtml(item)+'</div></details>'}
    function renderCoreContentModule(id,periodId,archive){const items=coreItemsFor(id,periodId,archive);return '<section class="product-module core-content-module" aria-labelledby="coreContentTitle"><div class="core-content-head"><div><h2 id="coreContentTitle">核心运营内容</h2></div><div class="core-result-count">正文模块 '+items.length+' 条</div></div><div class="core-content-subhead"><h3>具体内容</h3><span>默认展开 · 点击收起</span></div><div class="core-content-list">'+(items.length?items.map(coreContentItemHtml).join(''):'<div class="core-content-empty">该观测日期尚未关联运营内容。</div>')+'</div><dialog class="core-media-lightbox" id="coreMediaDialog" aria-labelledby="coreMediaDialogTitle"><div class="core-media-lightbox-shell"><div class="core-media-lightbox-head"><strong id="coreMediaDialogTitle">原报告配图</strong><button type="button" class="core-media-lightbox-close" aria-label="关闭图片预览">×</button></div><div class="core-media-lightbox-stage"><img alt=""></div><div class="core-media-lightbox-caption"><span></span><span></span></div></div></dialog></section>'}
    function bindCoreContentModule(){const root=document.querySelector('.core-content-module');if(!root)return;const dialog=root.querySelector('#coreMediaDialog'),image=dialog&&dialog.querySelector('.core-media-lightbox-stage img'),caption=dialog&&dialog.querySelector('.core-media-lightbox-caption span:first-child'),page=dialog&&dialog.querySelector('.core-media-lightbox-caption span:last-child'),title=dialog&&dialog.querySelector('#coreMediaDialogTitle');root.querySelectorAll('[data-core-media]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.coreMedia,description=button.dataset.coreCaption||'原报告配图',pageNumber=button.dataset.corePage||'';if(!dialog||!CORE_REFERENCE_IMAGES[key])return;image.src=CORE_REFERENCE_IMAGES[key];image.alt=description;caption.textContent=description;page.textContent=pageNumber?'报告 P'+pageNumber:'';title.textContent=description;dialog.showModal()}));if(dialog){dialog.querySelector('.core-media-lightbox-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});dialog.addEventListener('close',()=>{image.removeAttribute('src')})}}
    /* CORE_CONTENT_MODULE_END */
    function openDetail(id,push=true,observationKey=null){
      const observations=productObservations(id);if(!observations.length){showToast('该竞品暂未录入观测数据');return}
      if(state.detailId!==id||(push&&!observationKey))state.detailObservationKey=state.period;
      state.detailId=id;state.chartMetric='flow';state.detailObservationKey=observationKey||state.detailObservationKey||state.period;
      const observation=observationFor(id,state.detailObservationKey);state.detailObservationKey=observation.key;
      const item=observation.item,periodId=observation.periodId,meta=META[id],cycleLabel=observation.label,isDemo=Boolean(observation.demo);
      const impact=isDemo?metricImpact(item):(periodId?metricImpact(item):null),status=isDemo?'平稳 · AI 演示':(periodId?itemStatusLabel(item,periodId):'待补充');
      const detailInfo=isDemo?{event:item.keywords?.[0]||'AI 关联活动',conclusion:item.summary||'AI 已关联本周活动公告',art:null,tags:item.keywords||[]}:periodId?intelFor(item,0,periodId):{event:'待关联运营事件',conclusion:'新增观测日期尚未关联运营报告',art:null,tags:[]};
      const archive=isDemo?observation.archive:(periodId&&typeof REPORT_ARCHIVE!=='undefined'?REPORT_ARCHIVE[periodId]?.[id]:null),analysisItems=analysisItemsFor(archive,detailInfo);
      const isAiAnalysis=isDemo||item.analysisMode==='ai',demoBadge=isDemo?'<span class="demo-badge">演示 · 非真实数据</span>':'',audienceHtml=renderAudienceProfile(id);
      const options=observations.map(x=>`<option value="${x.key}" ${x.key===observation.key?'selected':''}>${esc(x.label)}${x.demo?' · AI':x.custom?' · 自建':''}</option>`).join('');
      const deltaText=v=>v==null?'环比待录入':`环比 ${v>=0?'+':''}${v}%`,dCls=v=>v==null?'':(v>=0?'up':'down');
      const metricCards=`<div class="metric-grid banner-metrics"><div class="metric-card"><span>周流水（万元）</span><div class="val-row"><strong>${formatNum(item.flow)}</strong><em class="val-delta ${dCls(item.flowDelta)}">${deltaText(item.flowDelta)}</em><em class="val-yoy">同比同节点 +xxx%</em></div></div><div class="metric-card"><span>日均 DAU（万）</span><div class="val-row"><strong>${formatNum(item.dau)}</strong><em class="val-delta ${dCls(item.dauDelta)}">${deltaText(item.dauDelta)}</em><em class="val-yoy">同比同节点 +xxx%</em></div></div><div class="metric-card"><span>DAU 峰值（万）</span><div class="val-row"><strong>${formatNum(item.peak)}</strong><em class="val-delta ${dCls(item.peakDelta)}">${deltaText(item.peakDelta)}</em></div></div></div>`;
      const profile=window.__AUDIENCE_PROFILES?.[id],profileGender=profile?profile.gender:{male:'—',female:'—'},profileAges=profile?Object.entries(profile.age):[['18-23','—'],['24-30','—'],['31-40','—'],['41-50','—'],['50+','—']];
      const gv=k=>{const v=parseFloat(profileGender[k]);return Number.isFinite(v)?v:null},gm=gv('male'),gf=gv('female');
      const ageVals=profileAges.map(([k,v])=>({k,v,raw:parseFloat(String(v).replace(/[^\d.]/g,''))})),ageMax=Math.max(...ageVals.map(a=>Number.isFinite(a.raw)?a.raw:0),1);
      const audiencePanel=`<div class="banner-audience"><div class="ba-card"><div class="ba-head"><svg class="svg-icon" viewBox="0 0 24 24"><path d="M9 11a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 9 11zm7 0a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 16 11zM2 20c0-3 3.5-4.5 7-4.5s7 1.5 7 4.5"/><path d="M15.5 15.7c3.4.3 6.5 1.7 6.5 4.3"/></svg>性别分布</div><div class="ba-gender"><div class="g male" style="width:${gm!=null?gm:50}%"><span class="sym">♂</span>男<strong>${esc(profileGender.male)}</strong></div><div class="g female"><span class="sym">♀</span>女<strong>${esc(profileGender.female)}</strong></div></div><div class="ba-bar"><i style="width:${gm!=null?gm:50}%"></i><b style="width:${gf!=null?gf:50}%"></b></div></div><div class="ba-card"><div class="ba-head"><svg class="svg-icon" viewBox="0 0 24 24"><path d="M7 2v3M17 2v3M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>年龄分布</div><div class="ba-bars">${ageVals.map(a=>`<div class="ba-col"><span>${esc(a.v)}</span><i style="height:${Number.isFinite(a.raw)?Math.max(6,Math.round(a.raw/ageMax*100)):4}%;opacity:${Number.isFinite(a.raw)?(.35+.65*a.raw/ageMax).toFixed(2):.15}"></i><em>${esc(a.k)}</em></div>`).join('')}</div></div></div>`;
      const coreModuleHtml=renderCoreContentModule(id,periodId,archive);
      $('#detailContent').innerHTML=`<button class="back-btn" id="backHome"><svg class="svg-icon" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>返回报告首页</button><section class="detail-banner"><div class="banner-top">${logo(id)}<div class="detail-title"><h1>${meta.name}${demoBadge}</h1></div></div>${audiencePanel}<p class="ba-src">数据来源：集瓜，数据为抖音官方账号的粉丝画像，仅供参考</p></section><section class="product-module" aria-labelledby="dataModuleTitle"><div class="module-head"><div><h2 id="dataModuleTitle">数据观测</h2></div><div class="module-tools"><select id="detailPeriodSelect" aria-label="筛选数据观测日期">${options}</select></div></div><div class="data-module-body">${metricCards}<div class="product-chart"><div class="product-chart"><div class="product-chart-head"><strong>历史数据趋势</strong><div class="chart-tabs"><button class="active" data-metric="flow">周流水</button><button data-metric="dau">日均 DAU</button><button data-metric="peak">DAU 峰值</button></div></div><div class="chart-range"><label>开始 <input type="date" id="rangeStart"></label><span class="range-sep">至</span><label>结束 <input type="date" id="rangeEnd"></label><button id="rangeApply" class="range-btn">查询</button><button id="rangeReset" class="range-reset">本期</button></div><div id="trendChart"></div><p class="chart-note">注：DAU和流水数据基于SensorTower等第三方数据和公司产品实际数据建模估算，模型会持续优化并不定期对历史数据进行调整；「DAU 峰值」展示周期观测点，空档周期不补数</p></div></div></section>${coreModuleHtml}`;
      $('#backHome').onclick=()=>{location.hash='';switchView(isDemo?'reports':'home')};
      $('#detailPeriodSelect').onchange=e=>{const selected=e.target.value;if(PERIODS[selected]){state.period=selected;$('#periodSelect').value=selected}openDetail(id,false,selected)};
      $$('[data-metric]').forEach(b=>b.onclick=()=>{state.chartMetric=b.dataset.metric;$$('[data-metric]').forEach(x=>x.classList.toggle('active',x===b));renderChart(id,state.chartMetric)});
      bindCoreContentModule();
      const defs=chartRangeDefaults();$('#rangeStart').value=defs.start;$('#rangeEnd').value=defs.end;
      const setRangeState=queried=>{$('#rangeApply').classList.toggle('on',queried);$('#rangeReset').classList.toggle('on',!queried)};
      setRangeState(false);
      $('#rangeApply').onclick=()=>{const s=$('#rangeStart').value,e=$('#rangeEnd').value;if(!s||!e){showToast('请选择开始与结束日期');return}if(e<s){showToast('结束日期不能早于开始日期');return}setRangeState(true);renderChart(id,state.chartMetric)};
      $('#rangeReset').onclick=()=>{const d=chartRangeDefaults();$('#rangeStart').value=d.start;$('#rangeEnd').value=d.end;setRangeState(false);renderChart(id,state.chartMetric)};
      renderChart(id,'flow');switchView('detail');if(push)location.hash=`competitor/${id}`;
    }
    function openObservationDialog(id){
      const dialog=$('#observationDialog');dialog.dataset.product=id;$('#observationForm').reset();dialog.showModal();
    }
    function saveObservation(event){
      event.preventDefault();const id=$('#observationDialog').dataset.product,start=$('#observationStart').value,end=$('#observationEnd').value;if(!id||!start||!end)return;
      if(end<start){showToast('结束日期不能早于开始日期');return}
      const num=selector=>{const value=$(selector).value;return value===''?null:Number(value)},key=`custom:${start}:${end}`,label=`${start.replace(/-/g,'.')}—${end.replace(/-/g,'.')}`;
      const record={key,start,end,label,item:{id,flow:num('#observationFlow'),flowDelta:null,dau:num('#observationDau'),dauDelta:null,peak:num('#observationPeak'),peakDelta:null,status:'normal',note:'手动新增观测日期',keywords:[],summary:'该观测日期尚未关联运营报告。'}};
      CUSTOM_OBSERVATIONS[id]=CUSTOM_OBSERVATIONS[id]||[];const old=CUSTOM_OBSERVATIONS[id].findIndex(x=>x.key===key);if(old>=0)CUSTOM_OBSERVATIONS[id][old]=record;else CUSTOM_OBSERVATIONS[id].push(record);
      fetch('/api/observations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:id,obs_key:record.key,start:record.start,end:record.end,label:record.label,flow:record.item.flow,dau:record.item.dau,peak:record.item.peak,note:record.item.note})}).then(r=>r.json()).then(d=>{if(d.ok){showToast('观测日期已保存到数据库')}else{showToast('保存失败：'+(d.error||'未知错误'))}}).catch(()=>{showToast('数据库连接失败，已仅保存到本地')});try{localStorage.setItem('competitorCustomObservations',JSON.stringify(CUSTOM_OBSERVATIONS))}catch(e){}
      $('#observationDialog').close();showToast('观测日期已保存');openDetail(id,false,key);
    }
    function chartRangeDefaults(){
      const key=state.detailObservationKey||state.period;
      if(key.startsWith('custom:')){const p=key.split(':');return{start:p[1],end:p[2]}}
      const s=`${key.slice(0,4)}-${key.slice(4,6)}-${key.slice(6,8)}`,d=new Date(s+'T00:00:00');d.setDate(d.getDate()+6);
      const f=v=>String(v).padStart(2,'0'),e=`${d.getFullYear()}-${f(d.getMonth()+1)}-${f(d.getDate())}`;
      return{start:s,end:e};
    }
    function renderChartLegacy(id,metric){
      const timeline=['20251009','20251020','20251103','20251117','20251124','20260622'];
      const saved=timeline.map(pid=>{const x=PERIODS[pid].items.find(v=>v.id===id);return {pid,label:reportById(pid).label.replace('2025.','').replace('2026.','26.'),value:x?.[metric]??null,date:pid}}).filter(x=>x.value!=null);
      const custom=(CUSTOM_OBSERVATIONS[id]||[]).map(x=>({pid:x.key,label:x.label,value:x.item?.[metric]??null,date:x.start.replace(/-/g,'')})).filter(x=>x.value!=null);
      const points=[...saved,...custom].sort((a,b)=>a.date.localeCompare(b.date));
      if(points.length<1){$('#trendChart').innerHTML='<div class="empty">当前披露点不足，暂不能形成趋势</div>';return}
      const W=760,H=250,P={l:58,r:18,t:24,b:46},max=Math.max(...points.map(p=>p.value))*1.14,min=0;
      const x=i=>points.length===1?P.l+(W-P.l-P.r)/2:P.l+i*((W-P.l-P.r)/(points.length-1)), y=v=>H-P.b-(v-min)/(max-min)*(H-P.t-P.b);
      const path=points.map((p,i)=>(i?'L':'M')+x(i).toFixed(1)+','+y(p.value).toFixed(1)).join(' ');
      const ticks=[0,.25,.5,.75,1].map(t=>{const val=max*(1-t),yy=P.t+t*(H-P.t-P.b);return `<line x1="${P.l}" x2="${W-P.r}" y1="${yy}" y2="${yy}" stroke="#e9edf2"/><text x="${P.l-10}" y="${yy+4}" text-anchor="end" font-size="10" fill="#8b95a5">${Math.round(val).toLocaleString()}</text>`}).join('');
      $('#trendChart').innerHTML=`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${META[id].name}趋势图"><text x="${P.l}" y="15" font-size="10" fill="#98a39a">单位：${metric==='flow'?'万元':'万人'}</text>${ticks}<path d="${path}" fill="none" stroke="#e5484d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.value)}" r="5" fill="#fff" stroke="#e5484d" stroke-width="3"/><text x="${x(i)}" y="${y(p.value)-12}" text-anchor="middle" font-size="10" font-weight="700" fill="#384459">${formatNum(p.value)}</text><text x="${x(i)}" y="${H-18}" text-anchor="middle" font-size="9" fill="#788496">${p.label}</text>`).join('')}</svg>`;
    }
    function renderChart(id,metric){
      if(metric==='peak'){renderChartLegacy(id,metric);return}
      const daily=(window.__DAILY_METRICS?.[id])||[];
      const start=$('#rangeStart')?.value,end=$('#rangeEnd')?.value,idx=metric==='dau'?1:2;
      const rows=daily.filter(r=>r[idx]!=null&&(!start||r[0]>=start)&&(!end||r[0]<=end));
      if(!rows.length){$('#trendChart').innerHTML=`<div class="empty">该时间段暂无日级${metric==='dau'?'DAU':'流水'}数据</div>`;return}
      const W=760,H=250,P={l:58,r:18,t:24,b:46},n=rows.length,maxV=Math.max(...rows.map(r=>r[idx])),max=maxV*1.14,min=0,unit=metric==='dau'?'万人':'万元';
      const x=i=>n===1?P.l+(W-P.l-P.r)/2:P.l+i*((W-P.l-P.r)/(n-1)), y=v=>H-P.b-(v-min)/(max-min)*(H-P.t-P.b);
      const path=rows.map((r,i)=>(i?'L':'M')+x(i).toFixed(1)+','+y(r[idx]).toFixed(1)).join(' ');
      const ticks=[0,.25,.5,.75,1].map(t=>{const val=max*(1-t),yy=P.t+t*(H-P.t-P.b);return `<line x1="${P.l}" x2="${W-P.r}" y1="${yy}" y2="${yy}" stroke="#e9edf2"/><text x="${P.l-10}" y="${yy+4}" text-anchor="end" font-size="10" fill="#8b95a5">${Math.round(val).toLocaleString()}</text>`}).join('');
      const labelStep=Math.max(1,Math.ceil(n/9)),color='#e5484d',WD=['周日','周一','周二','周三','周四','周五','周六'],metricName=metric==='dau'?'DAU':'流水';
      const dots=rows.map((r,i)=>{
        const wd=WD[new Date(r[0]+'T00:00:00').getDay()];
        return `${n<=62?`<circle cx="${x(i)}" cy="${y(r[idx])}" r="${n>7?3:4}" fill="#fff" stroke="${color}" stroke-width="2.5"/>`:''}${n<=7?`<text x="${x(i)}" y="${y(r[idx])-10}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#384459">${formatNum(r[idx])}</text>`:''}${(i%labelStep===0||i===n-1)?`<text x="${x(i)}" y="${H-18}" text-anchor="middle" font-size="9" fill="#788496">${r[0].slice(5).replace('-','/')}</text>`:''}<circle class="chart-hit" data-date="${r[0]}（${wd}）" data-val="${formatNum(r[idx])}" cx="${x(i)}" cy="${y(r[idx])}" r="10" fill="transparent"/>`;
      }).join('');
      $('#trendChart').innerHTML=`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${META[id].name}日级趋势图"><text x="${P.l}" y="15" font-size="10" fill="#98a39a">单位：${unit}</text>${ticks}<path d="${path}" fill="none" stroke="${color}" stroke-width="${n>62?2:3}" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg><div class="chart-tip hidden" id="chartTip"></div>`;
      const tip=$('#chartTip'),svgEl=$('#trendChart svg'),box=$('#trendChart');
      svgEl.addEventListener('mousemove',e=>{
        const c=e.target.closest('.chart-hit');
        if(!c){tip.classList.add('hidden');return}
        tip.innerHTML=`<strong>${c.dataset.date}</strong><span class="tip-row"><i style="background:${color}"></i>${metricName}：${c.dataset.val} ${unit}</span>`;
        const rect=box.getBoundingClientRect(),s=rect.width/W;
        let tx=(+c.getAttribute('cx'))*s+14,ty=(+c.getAttribute('cy'))*s-16;
        if(tx>rect.width-190)tx-=205;if(ty<0)ty+=34;
        tip.style.left=tx+'px';tip.style.top=ty+'px';tip.classList.remove('hidden');
      });
      svgEl.addEventListener('mouseleave',()=>tip.classList.add('hidden'));
    }
    function showToast(text){const t=$('#toast');t.textContent=text;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2800)}
    function bindEvents(){
      $$('[data-view]').forEach(b=>b.addEventListener('click',()=>{
        const target=b.dataset.view;location.hash='';
        if(target==='competitors'){
          switchView('home');
          setTimeout(()=>{
            $('#competitorSection').scrollIntoView({behavior:'smooth',block:'start'});
            $$('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.view==='competitors'));
          },80);
          return;
        }
        switchView(target);
      }));
      $('#periodSelect').onchange=e=>{state.period=e.target.value;state.search='';$('#searchInput').value='';renderHome();if(state.view==='detail'&&state.detailId)openDetail(state.detailId,false)};
      $('#searchInput').oninput=e=>{state.search=e.target.value;renderRows()};$('#statusFilter').onchange=e=>{state.status=e.target.value;renderRows()};
      $$('[data-sort]').forEach(b=>b.onclick=()=>{const k=b.dataset.sort;if(state.sortKey===k)state.sortDir*=-1;else{state.sortKey=k;state.sortDir=-1}renderRows()});
      $$('[data-overview-metric]').forEach(b=>b.onclick=()=>{state.overviewMetric=b.dataset.overviewMetric;state.overviewPoint=null;renderOverviewTrend()});
      $('#reportYearFilter').onchange=e=>{state.reportYear=e.target.value;renderReports()};
      $('#reportSearch').oninput=e=>{state.reportSearch=e.target.value;renderReports()};

      $('#observationForm').onsubmit=saveObservation;
      $('#closeObservation').onclick=()=>$('#observationDialog').close();$('#cancelObservation').onclick=()=>$('#observationDialog').close();
      window.addEventListener('hashchange',routeFromHash);
    }

    init();
  