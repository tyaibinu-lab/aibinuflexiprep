/* AIBINU FlexiPrep service worker: makes the app load instantly and fully offline.
   Bump VERSION whenever you publish a new index.html to be safe. */
const VERSION='flexiprep-v1';
const SHELL=['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function notifyIfChanged(oldRes,newRes){try{if(!oldRes)return;const a=await oldRes.clone().text(),b=await newRes.clone().text();if(a!==b){const cl=await self.clients.matchAll();cl.forEach(c=>c.postMessage({type:'updated'}))}}catch(e){}}
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==location.origin)return; /* API POSTs and third-party calls bypass the cache */
 const isApp=r.mode==='navigate'&&(u.pathname.endsWith('/')||u.pathname.endsWith('/index.html'));
 const key=isApp?'index.html':r;
 const refresh=caches.open(VERSION).then(c=>fetch(r).then(async res=>{
  if(res&&res.ok){if(isApp||u.pathname.endsWith('/index.html'))await notifyIfChanged(await c.match(key,{ignoreSearch:true}),res);await c.put(key,res.clone())}
  return res;
 }));
 // Extend the fetch event lifetime synchronously; do not call waitUntil after an await.
 e.waitUntil(refresh.then(()=>undefined).catch(()=>undefined));
 e.respondWith((async()=>{
  const c=await caches.open(VERSION),hit=await c.match(key,{ignoreSearch:true});
  if(hit)return hit; // stale-while-revalidate: serve cached shell immediately
  try{const res=await refresh;if(res&&res.ok)return res}catch(err){}
  return isApp?(await c.match('index.html'))||Response.error():Response.error();
 })());
});
