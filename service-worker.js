'use strict';
const CACHE='brujula-v3-20261019-2';
const ASSETS=['./','./index.html','./style.css','./settings.css','./core.js','./app.js','./sync.js','./chatgpt.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('brujula-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);
 // Cache only the public application shell. Never cache API responses or tokens.
 if(e.request.method!=='GET'||url.origin!==self.location.origin||!ASSETS.some(a=>new URL(a,self.registration.scope).pathname===url.pathname))return;
 e.respondWith(fetch(e.request).catch(()=>caches.match(e.request).then(hit=>hit||Response.error())));
});
