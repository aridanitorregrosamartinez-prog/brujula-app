/* Optional Supabase connection. Public project configuration only; sessions stay in this tab. */
'use strict';
window.BrujulaSync=(()=>{
 const CONFIG='brujula_cloud_config',SESSION='brujula_cloud_session',META='brujula_cloud_baseline';
 let config={},session=null,meta=null,busy=false,timer=null,conflicted=false;
 const read=(store,key)=>{try{return JSON.parse(store.getItem(key));}catch{return null;}};
 config=read(localStorage,CONFIG)||{};session=read(sessionStorage,SESSION);meta=read(localStorage,META);
 function status(message){$('syncStatus').textContent=message;}
 function validConfig(url,key){
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||! /^[a-z0-9]{20}\.supabase\.co$/.test(parsed.hostname)||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=='/')throw Error('Introduce la URL HTTPS de tu proyecto Supabase, sin rutas.');
  if(key.startsWith('sb_secret_'))throw Error('Esta clave es secreta. Usa exclusivamente la clave publicable.');
  if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)){
   try{const payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(payload.role!=='anon'||payload.ref!==parsed.hostname.split('.')[0])throw Error();}catch{throw Error('Usa una clave publicable o anon del mismo proyecto. Nunca service_role.');}
  }
  return {url:parsed.origin,key};
 }
 function keepSession(value){session=value;if(value){value.expires_at=value.expires_at||Math.floor(Date.now()/1000)+(value.expires_in||3600);sessionStorage.setItem(SESSION,JSON.stringify(value));}else sessionStorage.removeItem(SESSION);}
 function owner(){return config.url+'|'+session?.user?.id;}
 function linked(){return !!session?.user?.id&&meta?.owner===owner();}
 function persistMeta(base,version){meta={owner:owner(),base,version};localStorage.setItem(META,JSON.stringify(meta));}
 async function request(path,options={},auth=true){
  if(!config.url||!config.key)throw Error('Configura primero el proyecto gratuito.');
  if(auth){if(!session)throw Error('Inicia sesión.');if(session.expires_at*1000<Date.now()+60000){const fresh=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})},false);keepSession(fresh);}}
  const headers={'Content-Type':'application/json',apikey:config.key,...(auth?{Authorization:'Bearer '+session.access_token}:{}),...options.headers};
  const response=await fetch(config.url+path,{...options,headers,cache:'no-store',signal:AbortSignal.timeout(15000)});
  const value=await response.json().catch(()=>null);
  if(!response.ok){if(response.status===401){keepSession(null);draw();throw Error('La sesión ha caducado. Inicia sesión otra vez.');}if(response.status===409||value?.message==='BRUJULA_CONFLICT')throw Error('Otra sesión ha guardado cambios. Vuelve a sincronizar.');throw Error('No se ha completado la conexión ('+response.status+'). Revisa la cuenta, la clave pública y la instalación del backend.');}
  return value;
 }
 async function remote(){const rows=await request('/rest/v1/brujula_documents?select=payload,version&user_id=eq.'+encodeURIComponent(session.user.id));if(!Array.isArray(rows))throw Error('Respuesta no válida del servidor.');return rows.length?{payload:BrujulaCore.validateData(rows[0].payload),version:rows[0].version}:null;}
 async function write(payload,version){return request('/rest/v1/rpc/brujula_save',{method:'POST',body:JSON.stringify({p_payload:BrujulaCore.validateData(payload),p_expected_version:version})});}
 function draw(){
  $('cloudUrl').value=config.url||'';$('cloudKey').value=config.key||'';
  $('cloudAccount').textContent=session?.user?.email?'Sesión: '+session.user.email:'Sin sesión. Tus datos siguen en este navegador.';
  $('cloudMigrate').hidden=!session;$('syncNow').disabled=!linked();$('cloudLogout').hidden=!session;
  if(!config.url)status('Modo local · backend pendiente de conectar.');
  else if(!session)status('Proyecto configurado. Inicia sesión para conectar este dispositivo.');
  else if(!linked())status('Sesión iniciada. Elige cómo conectar tus datos; aún no se han enviado.');
 }
 async function guarded(fn){if(busy)return;busy=true;try{await fn();}catch(e){status(e.message+' Tus datos locales se conservan.');}finally{busy=false;drawControls();}}
 function drawControls(){document.querySelectorAll('[data-cloud-action]').forEach(x=>x.disabled=busy);$('syncNow').disabled=busy||!linked();}
 async function login(signup=false){await guarded(async()=>{
  if(linked())throw Error('Cierra la sesión antes de cambiar de cuenta o proyecto.');
  const next=validConfig($('cloudUrl').value.trim(),$('cloudKey').value.trim());
  config=next;localStorage.setItem(CONFIG,JSON.stringify(config));
  const email=$('cloudEmail').value.trim(),password=$('cloudPassword').value;
  if(!email||password.length<8)throw Error('Introduce tu correo y una contraseña de al menos 8 caracteres.');
  status('Conectando…');
  const value=await request(signup?'/auth/v1/signup':'/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})},false);
  $('cloudPassword').value='';
  if(value?.access_token){keepSession(value);conflicted=false;draw();if(linked()){status('Sesión restaurada. Sincronización preparada.');setTimeout(sync,0);}}
  else status('Revisa tu correo para confirmar la cuenta y después inicia sesión. El envío depende de la configuración de correo de Supabase.');
 });}
 async function attach(mode){await guarded(async()=>{
  if(!session)throw Error('Inicia sesión.');
  if(!$('migrationConsent').checked)throw Error('Marca el consentimiento para crear una copia y conectar tus datos.');
  const cloud=await remote();
  if(mode==='upload'&&cloud)throw Error('La cuenta ya tiene datos. Descarga los datos de la cuenta; no se sobrescribirán automáticamente.');
  if(mode==='download'&&!cloud)throw Error('La cuenta está vacía. Usa Subir este dispositivo.');
  if(!await askConfirm(mode==='upload'?'Se guardará una copia previa y se enviarán tus tareas, agenda, ideas, proyectos, ventas y movimientos a tu cuenta Supabase. ¿Continuar?':'Se descargará una copia previa y se sustituirán los datos de este navegador por los de tu cuenta. ¿Continuar?'))return;
  backupLocal('conexión '+mode);
  const snapshot=BrujulaCore.clone(db);
  if(mode==='upload'){const version=await write(snapshot,0);persistMeta(snapshot,version);}
  else {persistLocal(cloud.payload);persistMeta(cloud.payload,cloud.version);render();}
  conflicted=false;$('migrationConsent').checked=false;draw();status('Dispositivo conectado. Sincronización activa mientras Brújula está abierta.');
 });}
 async function sync(){if(!linked()||busy||conflicted)return;await guarded(async()=>{
  if(!navigator.onLine){status('Sin conexión. Cambios guardados aquí; se enviarán al volver a estar en línea.');return;}
  if(localStorage.getItem(KEY)!==storedSnapshot)throw Error('Otra pestaña ha cambiado los datos. Recarga antes de sincronizar.');
  status('Sincronizando…');const cloud=await remote();if(!cloud)throw Error('No se encuentran los datos de tu cuenta.');
  const merged=BrujulaCore.merge(meta.base,db,cloud.payload);
  if(merged.conflicts.length){conflicted=true;status('Sincronización pausada: cambios distintos en '+merged.conflicts.map(c=>c.name).join(', ')+'. Descarga la versión local y revisa la de la cuenta antes de elegir.');$('conflictHelp').hidden=false;return;}
  if(BrujulaCore.equal(merged.data,cloud.payload)){persistLocal(merged.data);persistMeta(cloud.payload,cloud.version);}
  else{
   const before=BrujulaCore.clone(db),sent=BrujulaCore.validateData(merged.data),version=await write(sent,cloud.version);
   // Edits made while the request was in flight remain local and are sent next time.
   const tail=BrujulaCore.merge(before,db,sent);
   if(tail.conflicts.length){conflicted=true;status('Hay cambios locales realizados durante el envío. Descarga ambas versiones antes de resolver.');$('conflictHelp').hidden=false;return;}
   persistLocal(tail.data);persistMeta(sent,version);
  }
  render();status('Última sincronización: '+new Date().toLocaleTimeString('es-ES')+'.');
 });}
 function changed(){clearTimeout(timer);timer=setTimeout(sync,800);}
 async function logout(){if(busy)return;await guarded(async()=>{if(session){try{await request('/auth/v1/logout?scope=local',{method:'POST'});}catch{}}keepSession(null);meta=null;localStorage.removeItem(META);conflicted=false;$('conflictHelp').hidden=true;draw();status('Sesión cerrada. La copia local sigue en este dispositivo.');});}
 async function downloadRemote(){await guarded(async()=>{const value=await remote();if(!value)throw Error('La cuenta está vacía.');downloadFile('brujula-cuenta-'+today()+'.json',JSON.stringify(value.payload,null,2),'application/json');status('Copia de la cuenta descargada. Puedes compararla con la copia local.');});}
 function init(){draw();drawControls();if(linked())setTimeout(sync,0);setInterval(()=>{if(!document.hidden)sync();},60000);window.addEventListener('online',sync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});}
 return {init,login,attach,sync,logout,changed,downloadRemote,validConfig};
})();
