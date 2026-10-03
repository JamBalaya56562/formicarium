const fs=require('fs'),path=require('path');
const ts=l=>{const m=l.match(/^[IEW](\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d+)/);return m?Date.parse(m[1]+'Z'):null};
for(const dir of process.argv.slice(2)){for(const d of fs.readdirSync(dir)){const f=path.join(dir,d,'stderr.txt');if(!fs.existsSync(f))continue;
 const L=fs.readFileSync(f,'utf8').split('\n');const out=[];
 for(let i=0;i<L.length;i++){if(/exit_group\(/.test(L[i])){const t0=ts(L[i]);let j=i+1,last=null;for(;j<L.length;j++){if(/LoadProgram/.test(L[j]))break;const t=ts(L[j]);if(t)last={t,l:L[j]};}
   const t1=j<L.length?ts(L[j]):null;out.push(`${t1?((t1-t0)/1000).toFixed(1):'end'}s`+(last&&t1&&t1-t0>3000?` lastBefore=+${((last.t-t0)/1000).toFixed(1)}s ${last.l.replace(/^.*strace.c:\d+:/,'').slice(0,110)}`:''));}}
 console.log(dir.split(/[\/]/).pop(),d.replace(/^.*記録する-?/,'')||'r0',out.join(' | '));}}
