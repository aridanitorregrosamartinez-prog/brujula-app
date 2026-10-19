/* Shared data validation, conflict detection and calendar serialization. No network. */
(function(root){
'use strict';
const lists=['tasks','inbox','events','sales','money','projects'];
const fields={tasks:['id','name','area','priority','due','time','done','note'],events:['id','name','due','time','note'],inbox:['id','text','created'],projects:['id','name','note'],sales:['id','name','status','amount','note'],money:['id','name','type','amount','due','note']};
const clone=x=>JSON.parse(JSON.stringify(x));
function stable(x){if(x===undefined)return 'undefined';if(x===null||typeof x!=='object')return JSON.stringify(x);if(Array.isArray(x))return '['+x.map(stable).join(',')+']';return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}'}
const equal=(a,b)=>stable(a)===stable(b);
function validDate(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===v;}
function validateData(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('La copia no contiene datos válidos.');
 const out={};
 for(const list of lists){
  if(!Array.isArray(input[list])||input[list].length>10000)throw Error('Lista no válida: '+list);
  const ids=new Set();out[list]=input[list].map(row=>{
   if(!row||typeof row!=='object'||Array.isArray(row)||typeof row.id!=='string'||! /^[\w.-]{1,100}$/.test(row.id)||ids.has(row.id))throw Error('Identificador no válido o repetido en '+list);
   ids.add(row.id);const x={};
   for(const k of fields[list])if(row[k]!==undefined){
    if(k==='amount'){if(typeof row[k]!=='number'||!Number.isFinite(row[k]))throw Error('Importe no válido.');}
    else if(k==='done'){if(typeof row[k]!=='boolean')throw Error('Estado de tarea no válido.');}
    else if(typeof row[k]!=='string'||row[k].length>20000)throw Error('Texto no válido en '+k);
    x[k]=row[k];
   }
   const label=list==='inbox'?'text':'name';if(!x[label]?.trim())throw Error('Falta el nombre de un elemento.');
   if(x.due&&!validDate(x.due))throw Error('Fecha no válida.');
   if(x.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(x.time))throw Error('Hora no válida.');
   if(list==='tasks'){x.done=x.done??false;x.area=x.area??'Personal';x.priority=x.priority??'Media';}
   return x;
  });
 }
 if(JSON.stringify(out).length>1500000)throw Error('La copia es demasiado grande (máximo 1,5 MB de texto).');
 return out;
}
// Three-way merge by record. Concurrent edits to the same record stop the sync.
function merge(base,local,remote){
 const result={},conflicts=[];
 for(const list of lists){result[list]=[];const maps=[base,local,remote].map(d=>new Map(d[list].map(x=>[x.id,x])));
  const ids=new Set([...maps[1].keys(),...maps[2].keys(),...maps[0].keys()]);
  for(const id of ids){const [b,l,r]=maps.map(m=>m.get(id));let chosen;
   if(equal(l,r)||equal(r,b))chosen=l;else if(equal(l,b))chosen=r;
   else {conflicts.push({list,id,name:l?.name||r?.name||l?.text||r?.text||id});continue;}
   if(chosen!==undefined)result[list].push(clone(chosen));
  }
 }
 return {data:result,conflicts};
}
function applyCommands(data,packet){
 if(packet?.format!=='brujula-task-changes-v1'||!Array.isArray(packet.actions)||!packet.actions.length||packet.actions.length>100)throw Error('Se espera un paquete brujula-task-changes-v1 de 1 a 100 acciones.');
 const next=clone(data),summary=[],touched=new Set();
 for(const action of packet.actions){
  if(!action||!['create','update','complete'].includes(action.op)||typeof action.id!=='string'||! /^[\w.-]{1,100}$/.test(action.id)||touched.has(action.id))throw Error('Acción o identificador no válido o repetido.');
  touched.add(action.id);const at=next.tasks.findIndex(t=>t.id===action.id),prior=next.tasks[at];
  if(action.op==='create'){
   if(prior)throw Error('La tarea ya existe: '+action.id);
   next.tasks.push({...action.task,id:action.id,done:false});summary.push('Crear: '+(action.task?.name||''));
  }else{
   if(!prior)throw Error('No existe la tarea: '+action.id);
   if(!action.before||!equal(prior,action.before))throw Error('La tarea ha cambiado. Exporta de nuevo antes de aplicar: '+prior.name);
   next.tasks[at]=action.op==='complete'?{...prior,done:true}:{...prior,...action.task,id:action.id};summary.push((action.op==='complete'?'Completar: ':'Editar: ')+next.tasks[at].name);
  }
 }
 return {data:validateData(next),summary};
}
const escapeICS=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/[\r\u0000]/g,'');
function fold(line){let parts=[],part='',bytes=0;for(const c of line){const n=new TextEncoder().encode(c).length;if(bytes+n>75){parts.push(part);part=' ';bytes=1;}part+=c;bytes+=n;}parts.push(part);return parts.join('\r\n');}
function calendar(rows,minutes=15,stamp=new Date()){
 if(![0,5,15,30,60,1440].includes(minutes))throw Error('Antelación no válida.');
 const utc=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Brujula//Agenda//ES','CALSCALE:GREGORIAN'];
 for(const row of rows){if(!validDate(row.due)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.time||''))continue;
  const start=new Date(row.due+'T'+row.time+':00'),end=new Date(start.getTime()+30*60000);
  if(isNaN(start))continue;
  lines.push('BEGIN:VEVENT','UID:'+escapeICS(row.kind+'-'+row.id)+'@brujula.local','DTSTAMP:'+utc(stamp),'DTSTART:'+utc(start),'DTEND:'+utc(end),'SUMMARY:'+escapeICS(row.name),'DESCRIPTION:'+escapeICS(row.note),'BEGIN:VALARM','TRIGGER:-PT'+minutes+'M','ACTION:DISPLAY','DESCRIPTION:Recordatorio de Brújula','END:VALARM','END:VEVENT');
 }
 lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
}
const api={lists,clone,equal,validateData,merge,applyCommands,calendar,validDate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BrujulaCore=api;
})(typeof window!=='undefined'?window:globalThis);
