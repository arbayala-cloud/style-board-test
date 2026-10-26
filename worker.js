let T,sam,bg;const embs=new Map();const gpu=!!self.navigator.gpu;
async function loadSam(){if(sam)return sam;T=T||await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2');T.env.allowLocalModels=false;T.env.useBrowserCache=true;
 const id='Xenova/slimsam-77-uniform',dev=gpu?'webgpu':'wasm';let m;try{m=await T.SamModel.from_pretrained(id,{device:dev,dtype:gpu?'fp16':'q8'})}catch(e){m=await T.SamModel.from_pretrained(id,{dtype:'fp32'})}
 return sam=[m,await T.AutoProcessor.from_pretrained(id)]}
async function loadBg(){return bg=bg||await import('https://esm.sh/@imgly/background-removal@1.4.5')}
function img2blob(d){const c=new OffscreenCanvas(d.width,d.height);c.getContext('2d').putImageData(d,0,0);return c.convertToBlob({type:'image/png'})}
const cfg=()=>({model:'small',device:gpu?'gpu':'cpu',output:{format:'image/png'}});
async function cut(d){const b=await(await loadBg()).removeBackground(await img2blob(d),cfg());const bm=await createImageBitmap(b),c=new OffscreenCanvas(d.width,d.height),q=c.getContext('2d');q.drawImage(bm,0,0,d.width,d.height);
 const a=q.getImageData(0,0,d.width,d.height).data,m=new Uint8Array(d.width*d.height);for(let i=0;i<m.length;i++)m[i]=a[i*4+3];return m}
async function embed(key,d){if(embs.has(key))return embs.get(key);const[model,proc]=await loadSam();const raw=new T.RawImage(new Uint8ClampedArray(d.data),d.width,d.height,4).rgb();const inp=await proc(raw);const v=[inp,await model.get_image_embeddings(inp)];embs.set(key,v);if(embs.size>8)embs.delete(embs.keys().next().value);return v}
async function segment(key,d,x,y){const[model,proc]=await loadSam();const[inp,e]=await embed(key,d),rs=inp.reshaped_input_sizes[0];const pts=new T.Tensor('float32',[x*rs[1]/d.width,y*rs[0]/d.height],[1,1,1,2]),lab=new T.Tensor('int64',[1n],[1,1,1]);
 const out=await model({...e,input_points:pts,input_labels:lab});const ms=await proc.post_process_masks(out.pred_masks,inp.original_sizes,inp.reshaped_input_sizes);
 const sc=out.iou_scores.data;let bi=0;for(let i=1;i<sc.length;i++)if(sc[i]>sc[bi])bi=i;const n=d.width*d.height,src=ms[0].data,m=new Uint8Array(n);for(let i=0;i<n;i++)m[i]=src[bi*n+i]?255:0;return m}
const jobs=[];let running=false;
async function run(q){if(q.type=='warm'){const d=new ImageData(64,64);d.data.fill(200);await cut(d);await segment('warm',d,32,32);embs.delete('warm');return 'ok'}
 if(q.type=='cut')return cut(q.d);if(q.type=='embed'){await embed(q.key,q.d);return 'ok'}if(q.type=='sam')return segment(q.key,q.d,q.x,q.y)}
async function pump(){if(running)return;running=true;while(jobs.length){jobs.sort((a,b)=>b.p-a.p);const q=jobs.shift();try{const r=await run(q);postMessage({id:q.id,r},r&&r.buffer?[r.buffer]:[])}catch(e){postMessage({id:q.id,err:String(e)})}}running=false}
onmessage=({data:q})=>{if(q.type=='prio'){for(const j of jobs)if(j.key===q.key)j.p=q.p;return}if(q.type=='embed'&&embs.has(q.key)){postMessage({id:q.id,r:'ok'});return}jobs.push(q);pump()};
