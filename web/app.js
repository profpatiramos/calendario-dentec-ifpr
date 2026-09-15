import {categories,eventCategory,categoryLabel} from '/categories.mjs';
import {countCalendar, datesBetween, parseDate} from '/calendar.mjs';
import {monthSaturdays,saturdayEvents} from '/saturdays.mjs';
import {proensLayout} from '/print.mjs';
const $=id=>document.getElementById(id);
let state={schemaVersion:1,campus:'',year:2027,offer:'',regime:'anual',weekdays:[],weekEvidence:'',weekConfirmed:false,periods:[],events:[]};
let dirty=false, result=null;
let record=null,institutional=[];
const calendarId=new URLSearchParams(location.search).get('id');
const allEvents=()=>[...institutional,...state.events];
async function api(path,method='GET',body){const r=await fetch(path,{method,headers:body?{'Content-Type':'application/json','X-Dentec-Request':'1'}:{},body:body?JSON.stringify(body):undefined});const data=await r.json();if(r.status===401){location.href='/';throw Error('Entre com sua conta.');}if(!r.ok)throw Error(data.error);return data;}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const offers={integrado:'Técnico integrado',subsequente:'Técnico subsequente',graduacao:'Graduação'};
const dateLabel=s=>s.split('-').reverse().join('/');
const message=(text,error=false)=>{$('message').textContent=text;$('message').className=error?'error':'';};
function act(fn){try{fn();}catch(e){message(e.message,true);}}
function identified(){if(!state.campus || !state.offer)throw Error('Aplique a identificação do campus e da oferta antes de continuar.');}
function interval(start,end){datesBetween(start,end);if(Number(start.slice(0,4))!==state.year || Number(end.slice(0,4))!==state.year)throw Error('As datas devem pertencer ao ano selecionado.');}
function engineInput(){return {year:state.year,offerId:state.offer,periods:state.periods,weekPattern:{weekdays:state.weekdays,confirmed:state.weekConfirmed,evidenceId:state.weekEvidence},inclusions:allEvents().filter(e=>e.kind==='include').map(e=>({...e,offerIds:[state.offer],confirmed:true,evidenceId:e.evidence})),exclusions:allEvents().filter(e=>e.kind==='exclude').map(e=>({...e,offerIds:[state.offer],confirmed:true,evidenceId:e.evidence})),thresholds:{annual:state.year===2027?200:null,byPeriod:Object.fromEntries(state.periods.map(p=>[p.id,state.year===2027&&state.regime==='semestral'?100:null]))}};}
function render(){
  result=null;const issues=[];
  if(!state.campus||!state.offer)issues.push(['Pendente','Identificação','Informe campus e oferta.']);
  if(!state.weekConfirmed)issues.push(['Pendente','Semana letiva','Registre e confirme os dias regulares e a referência da decisão.']);
  if(!state.periods.length)issues.push(['Pendente','Períodos letivos','Cadastre pelo menos um período com início e término.']);
  if(state.regime==='semestral'&&state.periods.length!==2)issues.push(['Pendente','Organização semestral','Cadastre exatamente dois semestres para a conferência anual.']);
  if(state.campus&&state.offer&&state.weekConfirmed&&state.periods.length){try{result=countCalendar(engineInput());}catch(e){issues.push(['Corrigir','Dados do calendário',e.message]);}}
  if(result){
    for(const c of result.checks){if(c.scope!=='annual'&&state.regime!=='semestral')continue;const name=c.scope==='annual'?'Total anual':state.periods.find(p=>p.id===c.scope).name;issues.push([c.status==='MET'?'Atendido':c.status==='NOT_MET'?'Corrigir':'Pendente',name,c.expected===null?'Não há mínimo normativo configurado para este escopo.':`${c.observed} de ${c.expected} dias mínimos. ${state.year===2027?'Resolução 2027, art. 4º.':''}`]);}
    for(const c of result.conflicts)issues.push(['Conflito',dateLabel(c.date),'Há inclusão e exclusão na mesma data. O dia foi excluído da contagem até a resolução do conflito.']);
  }
  issues.push(['Pendente','Feriados municipais e decisões locais','Confira a legislação municipal. Os itens nacionais e institucionais vêm da base ADMIN; os locais precisam ser registrados com fonte.'],['Pendente','Parecer e demais requisitos','As datas centrais e metas de dias estão incorporadas. O checklist completo, a sequência de atividades e as verificações humanas ainda não estão automatizados.'],['Pendente','Carga horária e apreciação institucional','Horas, atividades pedagógicas, atas e demais requisitos precisam de análise documental. Não há aprovação oficial.']);
  if(record&&record.catalogueRevision!==record.currentCatalogueRevision)issues.unshift(['Atualizado','Base institucional',`Esta tela incorpora a revisão ${record.currentCatalogueRevision}. O último salvamento usava a revisão ${record.catalogueRevision}. Confira o impacto e salve nova versão.`]);
  $('total').textContent=result?result.total:'—';$('goal').textContent=result?(state.year===2027?'Referência: mínimo anual de 200 dias.':'Sem meta normativa cadastrada para este ano.'):'Configure identificação, semana e períodos.';
  $('period-count').textContent=state.periods.length;
  $('period-summary').textContent=result?state.periods.map(p=>`${p.name}: ${result.byPeriod[p.id]} dias`).join(' · '):'Aguardando dados para contagem';
  $('period-list').innerHTML=state.periods.length?state.periods.map(p=>`<li><div><strong>${escape(p.name)}</strong><small>${dateLabel(p.start)} a ${dateLabel(p.end)}</small></div><button data-remove-period="${escape(p.id)}" aria-label="Remover ${escape(p.name)}">Remover</button></li>`).join(''):'<li class="help">Nenhum período cadastrado.</li>';
  $('event-list').innerHTML=allEvents().length?allEvents().sort((a,b)=>a.start.localeCompare(b.start)).map(e=>`<li><div><strong>${escape(e.name)}</strong><small>${dateLabel(e.start)} a ${dateLabel(e.end)} · ${{include:'Inclusão letiva',exclude:'Exclusão',note:'Sem efeito na contagem'}[e.kind]}</small><small>Fonte: ${escape(e.evidence)}</small><small>${escape(categoryLabel(e))}</small></div>${e.institutional?'<span class="institution-label">Base PROENS</span>':`<label>Categoria e cor<select data-category-event="${escape(e.id)}">${categories.map(([key,label])=>`<option value="${key}" ${eventCategory(e)===key?'selected':''}>${label}</option>`).join('')}</select></label><button data-remove-event="${escape(e.id)}" aria-label="Remover ${escape(e.name)}">Remover</button>`}</li>`).join(''):'<li class="help">Nenhum evento registrado. Confira a base para este ano.</li>';
  $('issue-count').textContent=issues.filter(i=>i[0]!=='Atendido').length;
  $('issue-list').innerHTML=issues.map(([mark,title,detail])=>`<li class="issue-item"><span class="issue-mark">${mark}</span><div><strong>${escape(title)}</strong><small>${escape(detail)}</small></div></li>`).join('');
  $('calendar-title').textContent=`${state.year} · ${state.campus || 'Campus não informado'}${state.offer?' · '+offers[state.offer]:''}`;
  $('months').innerHTML=proensLayout(state,allEvents(),result,record);
  renderSaturdays();
}
function sync(){for(const key of ['campus','year','offer','regime'])$(key).value=state[key];document.querySelectorAll('#weekdays input').forEach(el=>el.checked=state.weekdays.includes(Number(el.value)));$('week-evidence').value=state.weekEvidence;$('week-confirmed').checked=state.weekConfirmed;}
$('identity').addEventListener('submit',e=>{e.preventDefault();act(()=>{
  const year=Number($('year').value), campus=$('campus').value.trim(), offer=$('offer').value;
  if(!campus||!offers[offer]||!Number.isInteger(year)||year<1900||year>9999)throw Error('Confira campus, ano e oferta.');
  if((state.periods.length||state.events.length)&&(year!==state.year||offer!==state.offer||campus!==state.campus))throw Error('Para preservar as decisões registradas, remova os períodos e eventos antes de mudar campus, ano ou oferta. Baixe o rascunho atual primeiro.');
  Object.assign(state,{campus,year,offer,regime:$('regime').value});dirty=true;render();message('Identificação aplicada.');
});});
$('week-form').addEventListener('submit',e=>{e.preventDefault();act(()=>{
  identified();const weekdays=[...document.querySelectorAll('#weekdays input:checked')].map(el=>Number(el.value));
  if(!weekdays.length)throw Error('Selecione pelo menos um dia regular.');
  if(!$('week-evidence').value.trim())throw Error('Informe a referência da semana letiva.');
  Object.assign(state,{weekdays,weekEvidence:$('week-evidence').value.trim(),weekConfirmed:$('week-confirmed').checked});dirty=true;render();message('Semana letiva confirmada. Contagem atualizada.');
});});
$('period-form').addEventListener('submit',e=>{e.preventDefault();act(()=>{
  identified();const start=$('period-start').value,end=$('period-end').value,name=$('period-name').value.trim();interval(start,end);
  if(!name)throw Error('Informe o nome do período.');
  if(state.periods.some(p=>p.start<=end&&p.end>=start))throw Error('Este período se sobrepõe a outro. Ajuste as datas.');
  state.periods.push({id:crypto.randomUUID(),name,start,end});dirty=true;e.target.reset();render();message('Período adicionado.');
});});
$('event-form').addEventListener('submit',e=>{e.preventDefault();act(()=>{
  identified();const start=$('event-start').value,end=$('event-end').value,kind=$('event-kind').value,name=$('event-name').value.trim(),evidence=$('event-evidence').value.trim();interval(start,end);
  if(!name||!evidence)throw Error('Informe descrição e fonte.');
  if(kind==='include'&&datesBetween(start,end).some(date=>!state.periods.some(p=>p.start<=date&&p.end>=date)))throw Error('Inclusões letivas devem estar dentro dos períodos cadastrados.');
  state.events.push({id:crypto.randomUUID(),name,start,end,kind,evidence,category:$('event-category').value});dirty=true;e.target.reset();$('event-category').value='recesso';render();message('Evento registrado. Contagem atualizada.');
});});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.view){document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==b.dataset.view);document.querySelectorAll('.tab').forEach(t=>{t.classList.toggle('active',t===b);if(t===b)t.setAttribute('aria-current','page');else t.removeAttribute('aria-current');});}
  if(b.dataset.removePeriod){state.periods=state.periods.filter(p=>p.id!==b.dataset.removePeriod);dirty=true;render();message('Período removido. Confira os eventos que dependiam dele.');}
  if(b.dataset.removeEvent){state.events=state.events.filter(ev=>ev.id!==b.dataset.removeEvent);dirty=true;render();message('Evento removido.');}
});
$('save').onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`rascunho-calendario-${state.year}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Download solicitado. Guarde o arquivo para continuar depois. Somente dados aplicados aos formulários foram incluídos.');
};
$('load').onclick=()=>{if(!dirty||confirm('Abrir outro rascunho substituirá os dados desta sessão. Você já baixou o atual?'))$('file').click();};
function validateImport(s){
  if(!s||s.schemaVersion!==1||!Number.isInteger(s.year)||s.year<1900||s.year>9999||!['','integrado','subsequente','graduacao'].includes(s.offer)||!['anual','semestral'].includes(s.regime))throw Error('Formato de rascunho incompatível.');
  const str=(v,max)=>typeof v==='string'&&v.length<=max;
  if(!str(s.campus,120)||!str(s.weekEvidence,240)||typeof s.weekConfirmed!=='boolean'||!Array.isArray(s.weekdays)||s.weekdays.length>5||new Set(s.weekdays).size!==s.weekdays.length||s.weekdays.some(d=>!Number.isInteger(d)||d<1||d>5))throw Error('Identificação ou semana inválida.');
  if(s.weekConfirmed&&(!s.weekEvidence.trim()||!s.weekdays.length))throw Error('Semana confirmada sem referência ou dias.');
  if(!Array.isArray(s.periods)||s.periods.length>50||!Array.isArray(s.events)||s.events.length>1000)throw Error('Quantidade ou formato de registros inválido.');
  const ids=new Set();
  for(const [arr,event] of [[s.periods,false],[s.events,true]])for(const x of arr){
    if(!x||!str(x.id,100)||!x.id||ids.has(x.id)||!str(x.name,160)||!x.name.trim())throw Error('Registro inválido ou duplicado.');ids.add(x.id);
    datesBetween(x.start,x.end);if(Number(x.start.slice(0,4))!==s.year||Number(x.end.slice(0,4))!==s.year)throw Error('Data fora do ano do rascunho.');
    if(event&&x.category!==undefined&&!categories.some(([key])=>key===x.category))throw Error('Categoria PROENS inválida.');
    if(event&&(!['include','exclude','note'].includes(x.kind)||!str(x.evidence,240)||!x.evidence.trim()))throw Error('Evento sem tipo ou referência válida.');
  }
  for(let i=0;i<s.periods.length;i++)for(let j=i+1;j<s.periods.length;j++)if(s.periods[i].start<=s.periods[j].end&&s.periods[i].end>=s.periods[j].start)throw Error('Rascunho com períodos sobrepostos.');
  return {schemaVersion:1,campus:s.campus,year:s.year,offer:s.offer,regime:s.regime,weekdays:s.weekdays,weekEvidence:s.weekEvidence,weekConfirmed:s.weekConfirmed,periods:s.periods.map(({id,name,start,end})=>({id,name,start,end})),events:s.events.map(e=>({...e,category:eventCategory(e)}))};
}
$('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>2_000_000)throw Error('O rascunho excede o limite de 2 MB.');const next=validateImport(JSON.parse(await f.text()));if(record&&(next.year!==record.state.year||next.offer!==record.state.offer||next.campus!==record.state.campus))throw Error('O rascunho deve corresponder ao campus, ano e oferta deste registro.');state=next;dirty=true;sync();render();message('Rascunho importado. Clique em Salvar no sistema para registrar uma versão.');}catch(err){message('Não foi possível abrir: '+err.message,true);}finally{e.target.value='';}};
$('print').onclick=async()=>{try{if(dirty)throw Error('Salve no sistema antes de imprimir, para identificar corretamente a versão.');const fresh=await api('/api/calendars/'+calendarId);if(fresh.version!==record.version||fresh.currentCatalogueRevision!==record.currentCatalogueRevision)throw Error('O calendário ou a base institucional mudou. Reabra e confira antes de imprimir.');window.print();}catch(e){message(e.message,true);}};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
// Structured read tool only: no mutation or automatic confirmation by agents.
if(navigator.modelContext?.registerTool)navigator.modelContext.registerTool({name:'read_calendar_summary',description:'Read the local calendar totals and pending checks; never certifies institutional approval.',inputSchema:{type:'object',properties:{}},execute:async()=>({content:[{type:'text',text:JSON.stringify({campus:state.campus,year:state.year,offer:state.offer,total:result?.total??null,officialApproval:false,institutionalValidation:'INCOMPLETE'})}]})});
async function openRecord(){if(!calendarId){location.href='/';return;}try{record=await api('/api/calendars/'+calendarId);state=record.state;institutional=record.institutionalEvents;sync();for(const key of ['campus','year','offer'])$(key).disabled=true;$('record-heading').textContent=`${record.name} · ${record.courses}${record.classes?' · '+record.classes:''}${record.shifts?' · '+record.shifts:''}`;showHistory();render();}catch(e){message(e.message,true);}}
function showHistory(){$('history-list').innerHTML=record.histories.length?record.histories.map(h=>`<li><div><strong>${h.year} · ${escape(h.filename)}</strong><small>Oferta: ${escape(h.offer)} · Referência histórica</small><small>${escape(h.notes||'Sem observações registradas.')}</small><a href="/api/history/${escape(h.id)}">Baixar e consultar arquivo do campus</a></div></li>`).join(''):'<li>Nenhum histórico enviado. Você pode continuar sem ele.</li>';}
$('server-save').onclick=async()=>{try{if(!record)throw Error('Abra um calendário registrado.');const saved=await api('/api/calendars/'+calendarId,'PUT',{version:record.version,catalogueRevision:record.currentCatalogueRevision,state});record.version=saved.version;record.catalogueRevision=record.currentCatalogueRevision;dirty=false;render();message(`Versão ${saved.version} salva no sistema.`);}catch(e){message(e.message,true);}};
$('history-form').onsubmit=async e=>{e.preventDefault();try{const file=$('history-file').files[0];if(!file||file.size>8_000_000)throw Error('Envie um PDF de até 8 MB.');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(file);});await api('/api/calendars/'+calendarId+'/history','POST',{filename:file.name,year:state.year-1,data,notes:$('history-notes').value});const fresh=await api('/api/calendars/'+calendarId);record.histories=fresh.histories;showHistory();e.target.reset();message('Histórico guardado neste campus e oferta. As datas não foram copiadas.');}catch(err){message(err.message,true);}};
const extra=document.createElement('link');extra.rel='stylesheet';extra.href='/portal.css';document.head.append(extra);const printStyle=document.createElement('link');printStyle.rel='stylesheet';printStyle.href='/proens.css';document.head.append(printStyle);
const monthNames=Array.from({length:12},(_,m)=>new Date(Date.UTC(2027,m,1)).toLocaleDateString('pt-BR',{month:'long',timeZone:'UTC'}));
$('saturday-month').innerHTML=monthNames.map((name,m)=>`<option value="${m+1}">${name}</option>`).join('');
function renderSaturdays(){
 const dates=monthSaturdays(state.year,Number($('saturday-month').value));
 $('saturday-dates').innerHTML='<legend>Sábados de '+monthNames[Number($('saturday-month').value)-1]+'</legend>'+dates.map(date=>{
  const inside=state.periods.some(p=>p.start<=date&&date<=p.end),included=allEvents().some(e=>e.kind==='include'&&e.start<=date&&date<=e.end),blocked=allEvents().some(e=>e.kind==='exclude'&&e.start<=date&&date<=e.end);
  return `<label class="check"><input type="checkbox" value="${date}" ${!inside||included?'disabled':''} ${included?'checked':''}>${dateLabel(date)}${!inside?' · fora dos períodos':included?' · já registrado':''}${blocked?' · feriado/recesso: conflito se incluído':''}</label>`;
 }).join('');
 const count=dates.filter(date=>allEvents().some(e=>e.kind==='include'&&e.start<=date&&date<=e.end)).length;
 $('saturday-summary').textContent=`${count} sábado(s) registrado(s) neste mês. Para remover, use a lista de eventos abaixo.`;
}
$('saturday-month').onchange=renderSaturdays;
$('saturday-form').onsubmit=e=>{e.preventDefault();act(()=>{
 identified();const dates=[...document.querySelectorAll('#saturday-dates input:checked:not(:disabled)')].map(el=>el.value);
 const additions=saturdayEvents(state,dates,$('saturday-name').value,$('saturday-evidence').value,()=>crypto.randomUUID());state.events.push(...additions);dirty=true;render();message(`${additions.length} sábado(s) adicionado(s). Confira a contagem e salve no sistema.`);
});};
$('download-pdf').onclick=async()=>{const button=$('download-pdf');try{
 if(dirty)throw Error('Salve no sistema antes de baixar o PDF.');
 button.disabled=true;$('download-pdf-top').disabled=true;button.textContent='Gerando PDF…';$('download-pdf-top').textContent='Gerando PDF…';message('Gerando o calendário em PDF. Aguarde o download.');
 const response=await fetch('/api/calendars/'+calendarId+'/pdf',{method:'POST',headers:{'Content-Type':'application/json','X-Dentec-Request':'1'},body:JSON.stringify({version:record.version,catalogueRevision:record.currentCatalogueRevision})});
 if(!response.ok){const data=await response.json();throw Error(data.error);}
 const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;link.download=`calendario-${state.year}-v${record.version}.pdf`;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);message('PDF gerado. Confira o arquivo antes do encaminhamento institucional.');
 }catch(e){message(e.message,true);}finally{button.disabled=false;$('download-pdf-top').disabled=false;button.textContent='Baixar PDF';$('download-pdf-top').textContent='Baixar calendário em PDF';}
};
$('event-category').innerHTML=categories.map(([key,label])=>`<option value="${key}">${label}</option>`).join('');$('event-category').value='recesso';
document.addEventListener('change',e=>{if(!e.target.dataset.categoryEvent)return;const event=state.events.find(x=>x.id===e.target.dataset.categoryEvent);if(!event)return;event.category=e.target.value;dirty=true;render();message('Categoria e cor atualizadas. O efeito na contagem foi preservado. Salve no sistema.');});
$('event-category').onchange=()=>{const category=$('event-category').value;$('event-kind').value=['feriado','recesso','ferias'].includes(category)?'exclude':category==='sabado'?'include':'note';};
$('proens-color-guide').innerHTML=categories.filter(c=>c[2]).map(([key,label])=>`<span class="cat-${key}">${label}</span>`).join('');
$('download-pdf-top').onclick=()=>$('download-pdf').click();
openRecord();
