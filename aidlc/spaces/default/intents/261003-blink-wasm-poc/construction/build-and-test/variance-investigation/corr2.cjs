const fs=require('fs'),path=require('path');
const ts=l=>{const m=l.match(/^[IEW](\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d+)/);return m?Date.parse(m[1]+'Z'):null};
const rows=[];
for(const dir of process.argv.slice(2)){for(const d of fs.readdirSync(dir).sort()){const f=path.join(dir,d,'stderr.txt');if(!fs.existsSync(f))continue;
 const L=fs.readFileSync(f,'utf8').split('\n');const steps=[];let cur=null;
 for(const l of L){const t=ts(l);if(/LoadProgram/.test(l)){cur={start:t,end:t,c:{},gap1:0,prev:t};steps.push(cur);continue;}
  if(!cur||t==null)continue;if(t-cur.prev>1000)cur.gap1+=t-cur.prev;cur.prev=t;cur.end=t;
  const m=l.match(/\(sys\) (\w+)\(/);if(m)cur.c[m[1]]=(cur.c[m[1]]||0)+1;}
 const name=dir.split(/[\/]/).pop()+' '+(d.replace(/^.*記録する-?/,'')||'r0');
 steps.slice(0,2).forEach((s,i)=>rows.push({name,step:i+1,dur:(s.end-s.start)/1000,gap:s.gap1/1000,mmap:s.c.mmap||0,munmap:s.c.munmap||0,mprotect:s.c.mprotect||0,madvise:s.c.madvise||0,clone:s.c.clone||0}));}}
for(const r of rows)console.log(`${r.name.padEnd(28)} s${r.step} ${r.dur.toFixed(1).padStart(5)}s gap ${r.gap.toFixed(1).padStart(4)} mmap ${r.mmap} munmap ${r.munmap} mprotect ${r.mprotect} madvise ${r.madvise} clone ${r.clone}`);
// correlation of dur with each count, per step
const corr=(x,y)=>{const n=x.length,mx=x.reduce((a,b)=>a+b)/n,my=y.reduce((a,b)=>a+b)/n;let sxy=0,sx=0,sy=0;for(let i=0;i<n;i++){sxy+=(x[i]-mx)*(y[i]-my);sx+=(x[i]-mx)**2;sy+=(y[i]-my)**2}return sxy/Math.sqrt(sx*sy)};
for(const st of [1,2]){const R=rows.filter(r=>r.step===st);console.log(`step${st} n=${R.length} corr(dur,·):`,['mmap','munmap','mprotect','madvise','gap'].map(k=>`${k}=${corr(R.map(r=>r.dur),R.map(r=>r[k])).toFixed(2)}`).join(' '));}
