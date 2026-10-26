const V='sb-v8',F=['./','index.html','manifest.json','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(F)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==V&&n!=='sb-share').map(n=>caches.delete(n)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
 if(u.pathname.endsWith('/share')&&e.request.method==='POST'){e.respondWith((async()=>{const fd=await e.request.formData(),c=await caches.open('sb-share');let n=0;
  for(const f of fd.getAll('images')){if(f&&f.size){await c.put('shared-'+n,new Response(f,{headers:{'content-type':f.type}}));n++}}
  const q=new URLSearchParams({shared:n,url:fd.get('url')||'',text:fd.get('text')||''});return Response.redirect('./?'+q,303)})());return}
 if(e.request.mode==='navigate'||u.pathname.endsWith('/')||u.pathname.endsWith('index.html')){e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const cl=r.clone();caches.open(V).then(c=>c.put('index.html',cl));return r}).catch(()=>caches.match('index.html')));return}
 if(u.origin===location.origin&&e.request.method==='GET')e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)))});
