const mode=document.body.dataset.mode, $=id=>document.getElementById(id);
const fields=[['events','驻店场次'],['sales','驻店销售（瓶）'],['opening','开瓶（瓶）'],['orders','动销（瓶）'],['amount','动销金额（元）'],['tier','开瓶≥3瓶网点'],['receipt','回款（元）']];
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n==null?'待提供':Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2});
const source=DATA[mode];
const subjects=new Map(source.map(r=>[JSON.stringify([r.line,r.key??r.name]),r]));
if(mode!=='summary')for(const [key,r] of [...subjects].sort((a,b)=>a[1].name.localeCompare(b[1].name,'zh-CN'))) $('subject').add(new Option(r.name+' · '+r.line,key));
function chart(rows,key,label){
 const values=rows.map(r=>r[key]), max=Math.max(1,...values.map(v=>v??0));
 return '<article><h3>'+label+'</h3>'+rows.map((r,i)=>'<div class="bar"><span>'+escapeHTML(r.period.slice(5))+'月</span><i style="--width:'+Math.max(0,(values[i]??0)/max*100)+'%"></i><b>'+fmt(values[i])+'</b></div>').join('')+'</article>';
}
let csv=[];
function render(){
 const rows=source.filter(r=>mode==='summary'?r.line===$('line').value:JSON.stringify([r.line,r.key??r.name])===$('subject').value);
 if(!rows.length){$('result').textContent=mode==='premium'?'至尊门店名单待录入。填写平台目录中的「至尊门店名单.csv」，再运行更新即可查看逐月指标。':mode==='merchants'?'请选择商家。':'请选择人员。';$('charts').innerHTML='';$('export').disabled=true;return;}
 $('export').disabled=false;
 const headers=['月份',...fields.map(f=>f[1])];
 if(mode==='people'||mode==='merchants')headers.push('执行日期','驻店门店开瓶','开瓶占比','驻店门店动销瓶数','动销占比','驻店门店金额','金额占比');
 if(mode==='premium')headers.push('开瓶较上月','动销瓶数较上月','动销金额较上月','回款较上月');
 const products=['银潭','金酱','红潭','其他品项','未识别'];
 if(mode==='merchants')headers.push(...products.map(p=>p+'订单瓶数'));
 const ratio=(a,b)=>b?(100*a/b).toFixed(1)+'%':'—';
 const change=(a,b)=>a==null||b==null?'—':(a>b?'+':'')+fmt(a-b);
 csv=[headers,...rows.map((r,i)=>{
  const cells=[r.period,...fields.map(([k])=>r[k]??'待提供')];
  if(mode==='people'||mode==='merchants')cells.push(r.dates.join('、'),...['opening','orders','amount'].flatMap(k=>[r.station[k],ratio(r.station[k],r[k])]));
  if(mode==='premium')cells.push(...['opening','orders','amount','receipt'].map(k=>change(r[k],rows[i-1]?.[k])));
  if(mode==='merchants')cells.push(...products.map(p=>r.products[p]??0));
  return cells;
 })];
 $('result').innerHTML='<table><thead><tr>'+headers.map(x=>'<th>'+escapeHTML(x)+'</th>').join('')+'</tr></thead><tbody>'+csv.slice(1).map(r=>'<tr>'+r.map(x=>'<td>'+escapeHTML(typeof x==='number'?fmt(x):x)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 $('charts').innerHTML=[['opening','开瓶'],['receipt','回款'],['tier','月开瓶≥3瓶网点']].map(([k,l])=>chart(rows,k,l)).join('');
}
$('export').onclick=()=>{
 const content=String.fromCharCode(65279)+csv.map(row=>row.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join(String.fromCharCode(13,10));
 const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
 a.href=url;a.download=document.title+'_'+(mode==='summary'?$('line').value:$('subject').selectedOptions[0].text)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('line').onchange=$('subject').onchange=render;
render();
