/* Content adapter for the original Gallery components. Layout, card rendering,
   filtering controls and GSAP transitions remain in the original components. */
(() => {
  'use strict';
  let pending;
  const load = () => pending || (pending = fetch('./data/cases.json').then(r => {
    if (!r.ok) throw new Error('案例数据读取失败');
    return r.json();
  }).catch(e => { pending = null; throw e; }));
  let taxonomy;
  const array = value => value == null ? [] : [value].flat();
  const groupValues = (g,d) => g.options.filter(v=>g.keys.some(k=>array(d[k]).includes(v)));
  const fields = ["美术对象","视觉风格","制作技术","形式语言","题材与世界观","视觉情绪","创意方法","适用产品类型"].map(name=>[name,d=>taxonomy.dimensions.find(t=>t.name===name).groups.flatMap(g=>groupValues(g,d).map(v=>g.label+' · '+v))]);
  const visible = c => {
    if(c.display_override?.hidden===true)return false;
    const s=c.semantic_review?.stats;
    if(c.semantic_review?.status==='complete')return c.semantic_review.version==='V2'&&c.semantic_review.scope==='steam_purchase'&&Number.isInteger(s?.related)&&s.related>=500&&Number.isInteger(s?.positive)&&s.positive>=0&&s.positive<=s.related&&s.positive*2>=s.related;
    return c.library_selection?.decision==='provisional'&&c.library_selection?.grandfathered===true;
  };
  const isAnalyzed = c => c.semantic_review?.version==='V2' && c.semantic_review?.status==='complete';
  const compareCases = (a,b) => Number(isAnalyzed(b))-Number(isAnalyzed(a)) || (isAnalyzed(a)&&isAnalyzed(b) ? b.semantic_review.stats.related-a.semantic_review.stats.related : 0);
  const reviewLabel = c => c.youtube_review ? "YouTube 分析未完成" : ({pending:'待语义分析',partial:'语义分析未完成',collection_missing:'采集待核查',not_applicable:'角色案例 · 无评论分析'}[c.semantic_review?.status] || '待语义分析');
  const reviewMetric = c => {const s=c.semantic_review?.stats;return s?'美术相关 '+s.related.toLocaleString('zh-CN')+' 条 · 纯正向 '+(s.positive/s.related*100).toFixed(2)+'%':'';};
  const groups = [{name:'all', title:'全部案例', label:'ART CASES'}];
  const displayName = c => c.game_name_en && c.game_name_zh ? c.game_name_en+' '+c.game_name_zh : c.game_name;
  const asset = c => ({id:c.case_id, token_id:c.id || c.steam_app_id, name:displayName(c),
    image_url:c.cover_asset, permalink:c.source_url || c.steam_url, case:c});
  function dataFor(library, route) {
    taxonomy = library.filter_taxonomy;
    const group = groups[0];
    const entries = library.cases.filter(visible).sort(compareCases);
    const collections = groups.map(g => ({...g, address:g.name,
      image:(entries.find(c => !g.primary || c.classification.app_primary === g.primary) || entries[0]).cover_asset}));
    const traits = taxonomy.dimensions.map(dim => ({name:dim.name, opened:false,
      values:dim.groups.flatMap(g=>g.options.map(v=>({value:g.label+' · '+v, label:v, group:g.label, checked:false,
        count:entries.filter(c=>groupValues(g,c.classification).includes(v)).length})).filter(v=>v.count))}));
    return {contract:collections.find(g=>g.name===group.name), collections, traits,
      entries, length:entries.length, fragments:[entries.slice(0,48).map(asset)],
      offset:Math.min(48,entries.length), pagination:entries.length>48};
  }
  const walk = (node, fn) => {
    if (!node) return;
    fn(node);
    (node.children || []).forEach(child => walk(child,fn));
  };
  // Count image area by hue family, combining neighboring hues at bin edges.
  // Neutral pixels compete as their own family; transparent pixels do not vote.
  const imageColors = new Map();
  function imageBackground(img) {
    const key=img.currentSrc || img.src;
    if(imageColors.has(key))return imageColors.get(key);
    const canvas=document.createElement('canvas');
    canvas.width=128;canvas.height=128;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,0,0,128,128);
    const pixels=ctx.getImageData(0,0,128,128).data;
    const bins=Array.from({length:13},()=>({count:0,r:0,g:0,b:0}));
    for(let i=0;i<pixels.length;i+=4){
      if(pixels[i+3]<128)continue;
      const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
      const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
      let bin=12;
      if(delta>12 && delta/Math.max(max,1)>.12){
        let hue=max===r?(g-b)/delta:max===g?(b-r)/delta+2:(r-g)/delta+4;
        hue=(hue*60+360)%360;bin=Math.floor(hue/30);
      }
      const group=bins[bin];group.count++;group.r+=r;group.g+=g;group.b+=b;
    }
    let selected=[12],largest=bins[12].count;
    for(let i=0;i<12;i++){
      const ids=[(i+11)%12,i,(i+1)%12];
      const count=ids.reduce((n,j)=>n+bins[j].count,0);
      if(count>largest){largest=count;selected=ids;}
    }
    if(!largest)return '#53575b';
    let rgb=['r','g','b'].map(k=>selected.reduce((n,j)=>n+bins[j][k],0)/largest);
    const luminance=values=>values.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    // White body text maintains at least 4.5:1 contrast without changing hue.
    while(luminance(rgb)>.18)rgb=rgb.map(v=>v*.97);
    const color='rgb('+rgb.map(Math.round).join(',')+')';
    imageColors.set(key,color);return color;
  }
  const options = component => component.options || component;
  window.GalleryContent = {
    header(component){
      const o=options(component),render=o.render;
      o.methods.animateIn=function(){this.$store.commit('app/SET_HEADER_STATE',true);this.$root.$emit('page:animateIn');};
      o.render=function(){const node=render.call(this);walk(node,n=>{
        if(n.children)n.children=n.children.filter(c=>!(c.componentOptions?.propsData?.to==='/'&&c.data?.staticClass!=='header__logo'));
        if(n.data?.staticClass==='header__logo'&&n.componentOptions?.propsData)n.componentOptions.propsData.to='/gallery';
      });return node;};
    },
    collection(component) {
      const o = options(component);
      o.asyncData = async context => dataFor(await load(), context.route);
      const originalData=o.data;
      o.data=function(){return {...originalData.call(this),entries:[],collections:[],loadError:'',requestSerial:0,releaseFilter:'all'};};
      o.computed.title=function(){return this.contract.label;};
      o.watch.$route=function(){this.updateDetail();};
      const mounted=o.mounted;
      o.mounted=function(){if(mounted) mounted.call(this);this.animateIn();this.updateDetail();
        /* The compiled virtual scroll only translates .collection__grid; keep the head row
           (title/search/release tabs) in lockstep so cards never slide over them. */
        this._syncScrollHead=()=>{const root=this.$el;if(root){const grid=root.querySelector('.collection__grid');if(grid){const tf=getComputedStyle(grid).transform;for(const sel of ['.collection__head','.release-tabs','.collection__selected']){const el=root.querySelector(sel);if(el)el.style.transform=tf;}}}if(!this._isDestroyed)this._syncScrollHeadRaf=requestAnimationFrame(this._syncScrollHead);};
        this._syncScrollHeadRaf=requestAnimationFrame(this._syncScrollHead);};
      const destroy=o.beforeDestroy;
      o.beforeDestroy=function(){cancelAnimationFrame(this._syncScrollHeadRaf);clearTimeout(this.timeout);this.requestSerial++;this.setDetail(null);if(destroy)destroy.call(this);};
      Object.assign(o.methods, {
        animateIn(){if(this._atlasEntered)return;this._atlasEntered=true;this.$store.commit('app/SET_COLOR','black');this.$store.commit('app/SET_BACKGROUND','white');Object.assign(this.$el.style,{opacity:'1',visibility:'visible',clipPath:'none'});},
        animateOut(){},
        matching() {
          const q=this.search.trim().toLocaleLowerCase().replace(/^#/, '');
          return this.entries.filter(c => (this.releaseFilter==='all'||c.release_stage?.status===this.releaseFilter) && (!q || JSON.stringify([displayName(c),c.game_name,c.steam_app_id,c.case_title,c.classification,c.classification_search_terms,c.editorial_review]).toLocaleLowerCase().includes(q)) &&
            taxonomy.dimensions.every(dim=>dim.groups.every(g=>{
              const selected=this.traits.find(t=>t.name===dim.name).values.filter(v=>v.checked&&v.group===g.label);
              return !selected.length||selected.some(v=>groupValues(g,c.classification).includes(v.label));
            })));
        },
        resetResults() {
          window.scrollTo(0,0);this.target=0;this.current=0;
          const result=this.matching().sort(compareCases);
          this.resultOrder=result;this.length=result.length;this.offset=Math.min(48,result.length);
          this.fragments=[result.slice(0,48).map(asset)];this.pagination=this.offset<result.length;
          this.refreshLayout();
        },
        refreshLayout() {this.$nextTick(()=>{this.$root.$emit('scroll:resize');if(this.$refs.loader)this.$refs.loader.loading=false;});},
        asyncLoading() {
          const result=this.resultOrder || this.matching();
          const next=result.slice(this.offset,this.offset+48);
          if(next.length)this.fragments.push(next.map(asset));
          this.offset+=next.length;this.pagination=this.offset<result.length;this.refreshLayout();
        },
        applySearch(){this.resetResults();},
        applyShuffle(){this.resetResults();},
        applyFilters(params,selected){this.params=params;this.query=params.toString();this.selected=selected;this.resetResults();},
        onClickSelected(event){const value=event.currentTarget.getAttribute('data-entry');this.traits.forEach(t=>t.values.forEach(v=>{if(v.value===value)v.checked=false;}));this.selected=this.traits.flatMap(t=>t.values.filter(v=>v.checked).map(v=>v.value));this.resetResults();},
        async updateDetail() {
          const serial=++this.requestSerial;
          const id=this.$route.query.id;
          if(!id){this.setDetail(null);document.documentElement.classList.remove('--progress');return;}
          try {
            const c=(await load()).cases.find(c=>visible(c)&&(c.id || c.steam_app_id)===String(id));
            if(this._isDestroyed||serial!==this.requestSerial)return;
            this.setDetail(c?asset(c):null);
            if(!c){this.$router.replace({path:this.$route.path});}
          } finally {document.documentElement.classList.remove('--progress');}
        }
      });
      const render=o.render;
      o.render=function(h){const node=render.call(this);walk(node,n=>{if(n.children?.some(c=>c.data?.staticClass==='collection__head collection__padding')){
 const index=n.children.findIndex(c=>c.data?.staticClass==='collection__head collection__padding');
 n.children.splice(index+1,0,h('div',{class:'release-tabs collection__padding',attrs:{role:'group','aria-label':'上线状态筛选'}},[['all','全部案例'],['released','已上线'],['unreleased','未上线']].map(([value,label])=>h('button',{attrs:{type:'button','aria-pressed':this.releaseFilter===value},on:{click:()=>{this.releaseFilter=value;this.resetResults();}}},label+' '+this.entries.filter(c=>value==='all'||c.release_stage?.status===value).length))));
 }if(n.children)n.children=n.children.filter(c=>c.data?.staticClass!=='collection__shuffle');if(n.tag==='input'&&n.data?.attrs?.type==='search'){n.data.attrs.placeholder='搜索游戏、画风、创意…';n.data.attrs['aria-label']='搜索案例';}});return node;};
    },
    filters(component) {
      const o=options(component), render=o.render;
      const beforeDestroy=o.beforeDestroy;
      o.beforeDestroy=function(){beforeDestroy.call(this);this.$root.$emit('header:show');};
      o.render=function(h){const node=render.call(this);walk(node,n=>{
        if(n.children)n.children=n.children.filter(child=>child.data?.staticClass!=='filters__head');
        if(n.text)n.text=n.text.replace('Filters','八维筛选');
        if(n.data?.staticClass==='filters__body')n.children.splice(1,0,h('p',{class:'taxonomy-help'},'同一子类多选为“或”，不同子类为“且”。数字为当前展示案例数。'));
        const head=n.children?.find(c=>c.data?.attrs?.['data-name']);
        if(!head)return;
        const name=head.data.attrs['data-name'],dim=taxonomy.dimensions.find(d=>d.name===name),trait=this.traits.find(t=>t.name===name);
        head.data.attrs.role='button';head.data.attrs.tabindex=0;head.data.attrs['aria-expanded']=String(trait.opened);
        head.data.on.keydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.toggleFilter(e);}};
        const ul=n.children.find(c=>c.tag==='ul');if(!ul)return;
        const children=[h('li',{key:'description',class:'taxonomy-description'},dim.description)];let last;
        for(const li of ul.children||[]){
          const input=li.children?.find(c=>c.tag==='input'),label=li.children?.find(c=>c.tag==='label');if(!input||!label)continue;
          const value=trait.values.find(v=>v.value===input.data.attrs.name);if(!value)continue;
          if(last!==value.group){last=value.group;children.push(h('li',{key:'group-'+last,class:'taxonomy-group'},last));}
          li.key=value.value;label.children=[h('span',value.label),h('span',{class:'taxonomy-count'},String(value.count))];children.push(li);
        }
        ul.children=children;
      });return node;};
    },
    item(component) {
      const o=options(component),render=o.render;
      o.methods.loadImage=function(img){
        if(this._atlasLoading)return;
        this._atlasLoading=true;
        img.onload=()=>{if(this._isDestroyed)return;this.getDominantColor();this.loaded=true;};
        img.onerror=()=>{this._atlasLoading=false;};
        img.src=this.asset.image_url;
      };
      o.render=function(h){
        const node=render.call(this),c=this.asset.case;
        walk(node,n=>{
          if(n.data?.staticClass==='collection__item__meta'){
            n.children[0]=h('span',{class:'collection__item__name'},[
              h('span',{class:'collection__item__name-en'},c.game_name_en || c.game_name),
              h('span',{class:'collection__item__name-zh'},c.game_name_zh || ''),
              h('span',{class:'case-release'},c.release_stage?.label||'上线状态待核查'),
              ...(c.semantic_review?.status!=='complete' && !c.youtube_review?[h('span',{class:['semantic-badge','semantic-pending']},reviewLabel(c))]:[]),
              ...(c.youtube_review?[h('span',{class:'semantic-metric'},'美术相关 '+c.youtube_review.totals.related.toLocaleString('zh-CN')+' 条 · 纯正向 '+(100*c.youtube_review.totals.positive/c.youtube_review.totals.related).toFixed(2)+'%（视频评论抽样）')]:[]),
              ...(c.semantic_review?.stats?[h('span',{class:'semantic-metric'},reviewMetric(c))]:[])
            ]);
          }
        });
        return node;
      };
      o.methods.getDominantColor=function(){
        if(this._isDestroyed)return;
        try{this.color=imageBackground(this.$refs.img);}catch(error){this.color='#53575b';}
        this.thiefed=true;
      };
    },
    loader(component) {
      const o=options(component);
      o.render=function(h){return h('div',{class:'collection__loader'},[h('span',this.$parent.pagination?'加载中…':this.$parent.length?'已显示全部案例':'没有匹配的案例，请调整搜索或筛选')]);};
    },
    detail(component) {
      const o=options(component),originalData=o.data;
      o.data=function(){return {...originalData.call(this),imageIndex:0,caseBackground:'#53575b'};};
      o.computed.mediaItems=function(){return this.asset.case.gallery_media || this.asset.case.visual_evidence.slice(0,3).map(v=>({...v,type:'image'}));};
      o.computed.imageURL=function(){return this.mediaItems[this.imageIndex]?.local_asset;};
      o.methods.fetchImage=function(){this.loaded=true;this.$nextTick(()=>this.animateIn());};
      o.methods.updateImageBackground=function(event){
        const img=event.target;
        if(!img.complete || !img.naturalWidth)return;
        try{this.caseBackground=imageBackground(img);}catch(error){this.caseBackground='#53575b';}
      };
      o.methods.chooseMedia=function(index){this.$refs.video?.pause();this.imageIndex=index;this.$nextTick(()=>{if(this.$refs.video)this.$refs.video.play().catch(()=>{});});};
      o.methods.onKey=function(e){if(e.key==='Escape')this.onClose();};
      const mounted=o.mounted, beforeDestroy=o.beforeDestroy;
      o.mounted=function(){mounted.call(this);this.previousFocus=document.activeElement;window.addEventListener('keydown',this.onKey);this.$nextTick(()=>this.$refs.close.focus({preventScroll:true}));};
      o.beforeDestroy=function(){this.$refs.video?.pause();window.removeEventListener('keydown',this.onKey);this.$root.$emit('scroll:resume');document.documentElement.classList.remove('--progress');this.previousFocus?.focus?.({preventScroll:true});beforeDestroy.call(this);};
      o.render=function(h){
        const c=this.asset.case,d=c.classification,r=c.editorial_review;
        const artReviews=(c.youtube_review?.quotes||(c.semantic_review?.status==='complete'?c.semantic_quotes:[])||[]).filter(e=>e.sentiment==='positive');
        const background=this.caseBackground;
        const textBackground=background;
        const line=(label,value)=>h('li',[h('span',[label+'：'+value])]);
        const section=(label,content,open=false)=>h('details',{class:'detail__case-section',attrs:{open}},[h('summary',label),...content]);
        const paragraph=text=>h('p',text);
        const link=(label,url)=>h('a',{attrs:{href:url,target:'_blank',rel:'noopener'}},label);
        const dims=taxonomy.dimensions.map(dim=>[dim.name,dim.groups.map(g=>{const values=groupValues(g,d);return values.length?g.label+'：'+values.join('、'):'';}).filter(Boolean).join('；') || (dim.name==='制作技术'?'资料不足，待核实':'暂无明确分类')]);
        const content=[h('h1',{class:'detail__data__title',attrs:{id:'case-title'}},[h('span',c.game_name_en || c.game_name),h('span',{class:'detail__title-zh'},c.game_name_zh || '')]),
          h('ul',{class:'detail__data__traits'},[line('视觉鲜明度',c.assessment.visual_distinctiveness == null ? '待评' : c.assessment.visual_distinctiveness+'/5（静态初评）'),line('创意成立',c.assessment.creativity_established==null?'待评':(c.assessment.creativity_established?'是（初评）':'否（初评）'))]),
          ...(c.youtube_review?[section('美术反馈（视频评论抽样）',[
 paragraph('美术相关 '+c.youtube_review.totals.related.toLocaleString('zh-CN')+' 条 · 纯正向 '+(100*c.youtube_review.totals.positive/c.youtube_review.totals.related).toFixed(2)+'%'),
 paragraph('正向 '+c.youtube_review.totals.positive+'；负向 '+c.youtube_review.totals.negative+'；混合 '+c.youtube_review.totals.mixed+'；中性 '+c.youtube_review.totals.neutral+'。'),
 paragraph('口径：'+c.youtube_review.reports.length+' 个高播放视频评论的抽样判读（含回复，未按作者去重），不代表全网口碑，不作为入库门槛依据。统计快照：'+c.youtube_review.snapshot)
 ],true)]:[section('玩家美术反馈',[
            ...(c.semantic_review?.status!=='complete'?[paragraph(reviewLabel(c))]:[]),
            ...(c.semantic_review?.stats ? [paragraph(reviewMetric(c)),paragraph('正向 '+c.semantic_review.stats.positive+'；负向 '+c.semantic_review.stats.negative+'；混合 '+c.semantic_review.stats.mixed+'；中性 '+c.semantic_review.stats.neutral+'；态度无法判断 '+c.semantic_review.stats.unclear+'。')] : [paragraph(c.semantic_review?.status==='partial'?'全部来源已判读 '+c.semantic_review.completed+' 条，剩余 '+c.semantic_review.pending+' 条；完成前暂留，尚未应用评论门槛。':c.semantic_review?.status==='collection_missing'?'采集文件为空，需核查；不视为没有玩家评论，也不视为分析完成。':c.semantic_review?.status==='not_applicable'?'独立角色案例，不属于本轮Steam游戏评论分析任务。':'交接包中未发现已提交的新一轮分析结果，暂时保留。')]),
          ],true)]),
          section('看到了什么',[paragraph(r.observation)],true),
          section('入库评语',[paragraph(r.comment)],true),
          section('可以怎样借鉴',[paragraph(r.transfer),paragraph('适用边界：'+r.limitations)],true),
          section('八维分类',[h('ul',{class:'detail__data__traits'},dims.map(([a,b])=>h('li',{class:'case-dim'},[h('strong',a),h('br'),h('span',b)]))),paragraph('动态未观察不作为分类。适用产品类型仅为借鉴方向假设。')],true),
          ...(artReviews.length?[section('玩家评论原话',[
            paragraph(c.youtube_review?'以下为本次YouTube视频评论分析的5条正向美术精选，不代表全部评论；视频观众并非已验证购买者。译文为AI辅助翻译，来源链接指向对应视频评论区。':'以下仅精选本轮语义分析确认的正向美术评语，不代表全部评论或整体好评率。外文配中文译文（AI辅助翻译）；原始完整评论可通过来源链接查看。'),
            ...artReviews.map(e=>h('blockquote',{class:'case-review'},[
              ...(e.date?[h('p',{class:'case-review__heading'},e.date)]:[]),
              ...(e.translation_zh?[h('p',{class:'case-review__label'},'中文译文'),h('p',{class:'case-review__translation'},e.translation_zh),h('details',{class:'case-review__source'},[h('summary','查看外文原话'),h('p',{class:'case-review__original'},e.excerpt)])]:[h('p',{class:'case-review__original'},e.excerpt)]),
              link(c.youtube_review?'查看 YouTube 来源视频':'查看 Steam 原评论',e.url)
            ]))
          ])]:[]),
          section('来源与评审范围',[paragraph('开发：'+c.official_metadata.developers.join('、')+'；发行：'+c.official_metadata.publishers.join('、')),paragraph(c.assessment_scope),paragraph(c.admission.reason),paragraph('素材档案日期：'+(c.source_notes?.archive_date || '2026-11-01')+'；静态素材观察，未验证动态表现、实际游玩效果或商业适用性。'), ...(c.source_notes?.design_interview ? [link('任天堂官方设计访谈',c.source_notes.design_interview)] : []),link('结构化数据与完整溯源','./data/cases.json')]),
          h('a',{class:'button --stroke-white',attrs:{href:c.source_url || c.steam_url,target:'_blank',rel:'noopener'}},[h('span',c.source_label || '查看官方 Steam 来源')])];
        return h('div',{class:'detail u-abs detail--case',attrs:{role:'dialog','aria-modal':'true','aria-labelledby':'case-title'}},[
          h('div',{ref:'background',class:'detail__background'}),
          h('div',{ref:'image',class:'detail__image',style:{backgroundColor:background}},[
            h('div',{ref:'t1',class:'detail__transform'},[
              this.mediaItems[this.imageIndex]?.type==='video' ? h('video',{key:this.imageURL,ref:'video',class:'case-motion',attrs:{src:this.imageURL,poster:this.mediaItems[this.imageIndex].poster,autoplay:true,muted:true,loop:true,playsinline:true,controls:true,preload:'metadata','aria-label':c.game_name+' 官方动态片段 '+(this.imageIndex+1)},domProps:{muted:true}}) : h('img',{ref:'img',on:{load:this.updateImageBackground},style:{opacity:this.loaded?1:0},attrs:{src:this.imageURL,alt:c.game_name+' 官方静态图'}})
            ]),
            h('div',{class:'detail__image-controls'},this.mediaItems.map((v,i)=>h('button',{class:['button','--stroke-white'],attrs:{type:'button','aria-label':(v.type==='video'?'动态':'静态')+' '+this.mediaItems.slice(0,i+1).filter(x=>x.type===v.type).length,'aria-pressed':i===this.imageIndex},on:{click:()=>this.chooseMedia(i)}},[h('span',(v.type==='video'?'动态 ':'静态 ')+this.mediaItems.slice(0,i+1).filter(x=>x.type===v.type).length)]))),
            h('div',{class:'media-links'},[h('a',{class:'detail__image-source',attrs:{href:this.imageURL,target:'_blank',rel:'noopener'}},this.mediaItems[this.imageIndex]?.type==='video'?'打开完整动态片段':'查看完整静态图'),
            h('a',{class:'detail__image-original',attrs:{href:this.mediaItems[this.imageIndex]?.url,target:'_blank',rel:'noopener'}},'官方素材来源')])]),
          h('div',{ref:'data',class:'detail__data',style:{backgroundColor:textBackground}},[h('div',{ref:'t2',class:'detail__transform'},[h('div',{class:'detail__data__content'},content)])]),
          h('button',{ref:'close',class:'detail__close',attrs:{type:'button','aria-label':'关闭案例详情'},on:{click:this.onClose,mouseenter:this.onMouseEnter,mouseleave:this.onMouseLeave}},[
            h('svg',{attrs:{viewBox:'0 0 40 40'}},[h('circle',{ref:'circle',attrs:{cx:20,cy:20,r:16}})]),
            h('div',[h('svg',{attrs:{width:9,height:9,viewBox:'0 0 9 9'}},[h('path',{attrs:{d:'M9 .7875L8.2125 0 4.5 3.7125 .7875 0 0 .7875 3.7125 4.5 0 8.2125 .7875 9 4.5 5.2875 8.2125 9 9 8.2125 5.2875 4.5Z',fill:'white'}})])])])]);
      };
    }
  };
})();
