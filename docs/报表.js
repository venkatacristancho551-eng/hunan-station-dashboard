const mode=document.body.dataset.mode, $=id=>document.getElementById(id);
const fields=[['events','驻店场次'],['sales','驻店销售（瓶）'],['opening','开瓶（瓶）'],['orders','动销（瓶）'],['amount','动销金额（元）'],['tier','开瓶≥3瓶网点'],['receipt','回款（元）']];
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n==null?'待提供':Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2});
const source=DATA[mode]??[];
const subjectKey=r=>JSON.stringify([r.line,r.key??r.name]);
const subjects=mode==='summary'?[]:[...new Map(source.map(r=>[subjectKey(r),r])).entries()]
 .sort((a,b)=>a[1].name.localeCompare(b[1].name,'zh-CN'));
const subjectLabel={people:'人员',merchants:'商家',stores:'门店',premium:'至尊门店'}[mode];
const select=$('subject');
const search=$('subjectSearch');

function filterSubjects(preferred=select.value){
 const matches=subjects.filter(([,r])=>matchesSearch(search?.value,r.name,r.line,r.city,r.dealer,r.owner,r.key));
 select.replaceChildren(new Option(matches.length?(mode==='premium'?'查看累计总览':'请选择'+subjectLabel):'暂无匹配',''));
 for(const [key,r] of matches){
  select.add(new Option([r.name,r.line,r.city,r.dealer,r.owner].filter(Boolean).join(' · '),key));
 }
 if(matches.some(([key])=>key===preferred))select.value=preferred;
 else if(search?.value.trim()&&matches.length===1)select.value=matches[0][0];
 if(search)$('searchStatus').textContent='匹配 '+matches.length+' 项';
 render();
}

function renderStoreSummary(rows){
 const panel=$('storeSummary');
 panel.hidden=!rows.length;
 if(!rows.length)return;
 const totals=[['events','驻店场次'],['sales','现场售卖（瓶）'],['opening','门店开瓶（瓶）'],['orders','订单（瓶）']];
 const active=rows.filter(r=>r.events>0);
 const opening=active.reduce((sum,r)=>sum+r.opening,0);
 const orders=active.reduce((sum,r)=>sum+r.orders,0);
 panel.innerHTML='<h2>门店累计表现</h2><div class="store-cards">'+totals.map(([key,label])=>
  '<div>'+label+'<strong>'+fmt(rows.reduce((sum,r)=>sum+r[key],0))+'</strong></div>').join('')+
  '</div><p>'+rows.length+' 个月中有 '+active.length+' 个月执行驻店。驻店月份合计开瓶 '+fmt(opening)+' 瓶、订单 '+fmt(orders)+' 瓶。</p>';
}

function chart(rows,key,label){
 const values=rows.map(r=>r[key]), max=Math.max(1,...values.map(v=>v??0));
 return '<article><h3>'+label+'</h3>'+rows.map((r,i)=>'<div class="bar"><span>'+escapeHTML(r.period.slice(5))+'月</span><i style="--width:'+Math.max(0,(values[i]??0)/max*100)+'%"></i><b>'+fmt(values[i])+'</b></div>').join('')+'</article>';
}
let csv=[];
const premiumMode=mode==='premium';
const storeMode=mode==='stores'||premiumMode;
const storeFields=[['events','驻店场次'],['sales','现场售卖（瓶）'],['opening','门店开瓶（瓶）'],['orders','订单（瓶）'],['amount','订单金额（元）']];
const premiumHeaders=['网点','产品线','城市','商家','服务人员','网点状态'];
const premiumCells=r=>[r.name,r.line,r.city,r.dealer,r.owner||'待核',r.status];
function renderTable(headers,rows,clickable=false){
 return '<table><thead><tr>'+headers.map(x=>'<th>'+escapeHTML(x)+'</th>').join('')+'</tr></thead><tbody>'+
  rows.map((r,i)=>'<tr>'+r.map((x,j)=>'<td>'+(clickable&&j===0?
   '<button class="shop-link" type="button" data-shop="'+i+'">'+escapeHTML(x)+'</button>':
   escapeHTML(typeof x==='number'?fmt(x):x))+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
}
function renderPremiumOverview(){
 renderStoreSummary([]);
 $('charts').innerHTML='';
 const groups=new Map();
 for(const r of source){
  if(!matchesSearch(search.value,r.name,r.line,r.city,r.dealer,r.owner,r.key))continue;
  const key=subjectKey(r);
  if(!groups.has(key))groups.set(key,{meta:r,totals:storeFields.map(()=>0)});
  const totals=groups.get(key).totals;
  storeFields.forEach(([field],i)=>totals[i]+=r[field]??0);
 }
 const ranking=[...groups.values()].sort((a,b)=>b.totals[0]-a.totals[0]||b.totals[1]-a.totals[1]);
 const headers=[...premiumHeaders,...storeFields.map(([,label])=>label)];
 csv=[headers,...ranking.map(({meta,totals})=>[...premiumCells(meta),...totals])];
 $('export').disabled=!ranking.length;
 $('result').innerHTML=ranking.length?renderTable(headers,csv.slice(1),true):'没有匹配的至尊网点。';
 $('result').onclick=e=>{
  const button=e.target.closest('button[data-shop]');
  if(!button)return;
  select.value=subjectKey(ranking[Number(button.dataset.shop)].meta);
  render();
 };
}
function render(){
 const rows=source.filter(r=>mode==='summary'?r.line===$('line').value:subjectKey(r)===select.value);
 $('result').onclick=null;
 if(premiumMode&&!select.value&&source.length){renderPremiumOverview();return;}
 if(storeMode)renderStoreSummary(rows);
 if(!rows.length){$('result').textContent=mode==='premium'?'至尊门店名单待录入。填写平台目录中的「至尊门店名单.csv」，再运行更新即可查看逐月指标。':'搜索或选择'+subjectLabel+'后查看报表。';$('charts').innerHTML='';$('export').disabled=true;return;}
 $('export').disabled=false;
 const reportFields=storeMode?storeFields:fields;
 const headers=['月份',...reportFields.map(f=>f[1])];
 if(storeMode)headers.push('执行日期');
 if(premiumMode)headers.push('驻店执行人','开瓶较上月','订单瓶数较上月',...premiumHeaders);
 if(mode==='people'||mode==='merchants')headers.push('执行日期','驻店门店开瓶','开瓶占比','驻店门店动销瓶数','动销占比','驻店门店金额','金额占比');

 const products=['银潭','金酱','红潭','其他品项','未识别'];
 if(mode==='merchants')headers.push(...products.map(p=>p+'订单瓶数'));
 const ratio=(a,b)=>b?(100*a/b).toFixed(1)+'%':'—';
 const change=(a,b)=>a==null||b==null?'—':(a>b?'+':'')+fmt(a-b);
 csv=[headers,...rows.map((r,i)=>{
  const cells=[r.period,...reportFields.map(([k])=>r[k]??'待提供')];
  if(storeMode)cells.push(r.dates.join('、')||'—');
  if(mode==='people'||mode==='merchants')cells.push(r.dates.join('、'),...['opening','orders','amount'].flatMap(k=>[r.station[k],ratio(r.station[k],r[k])]));
  if(premiumMode)cells.push(r.executors||(r.events?'待核':'—'),...['opening','orders'].map(k=>change(r[k],rows[i-1]?.[k])),...premiumCells(r));
  if(mode==='merchants')cells.push(...products.map(p=>r.products[p]??0));
  return cells;
 })];
 $('result').innerHTML=renderTable(headers,csv.slice(1));
 if(premiumMode){
  const r=rows[0];
  const label=[r.name,r.line,r.city,r.dealer,r.owner?'服务人员 '+r.owner+(r.ownerSource?'（'+r.ownerSource+'）':''):'服务人员待核',r.status].filter(Boolean).join(' · ');
  $('storeSummary').insertAdjacentHTML('afterbegin','<p><strong>'+escapeHTML(label)+'</strong></p>');
 }
 const trends=storeMode?[['opening','门店开瓶'],['orders','订单瓶数']]:[['opening','开瓶'],['receipt','回款'],['tier','月开瓶≥3瓶网点']];
 $('charts').innerHTML=trends.map(([k,l])=>chart(rows,k,l)).join('');
}
$('export').onclick=()=>{
 const content=String.fromCharCode(65279)+csv.map(row=>row.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join(String.fromCharCode(13,10));
 const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
 a.href=url;a.download=document.title+'_'+(mode==='summary'?$('line').value:($('subject').value?$('subject').selectedOptions[0].text:'累计总览'))+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('line').onchange=select.onchange=render;
if(mode==='summary')render();
else{
 if(search)search.oninput=()=>filterSubjects();
 const store=mode==='stores'?new URLSearchParams(location.search).get('store'):null;
 filterSubjects(store??'');
}
