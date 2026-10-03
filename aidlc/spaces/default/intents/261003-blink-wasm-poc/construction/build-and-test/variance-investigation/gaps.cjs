const fs=require('fs'),path=require('path');
const ts=l=>{const m=l.match(/^[IEW](\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d+)/);return m?Date.parse(m[1]+'Z'):null};
const min=+process.argv[2]*1000;
for(const dir of process.argv.slice(3)){for(const d of fs.readdirSync(dir)){const f=path.join(dir,d,'stderr.txt');if(!fs.existsSync(f))continue;
 const L=fs.readFileSync(f,'utf8').split('\n');let prev=null,pl='',step=0;const out=[];
 for(const l of L){if(/LoadProgram/.test(l))step++;const t=ts(l);if(t==null)continue;if(prev!=null&&t-prev>min)out.push(`step${step} ${((t-prev)/1000).toFixed(1)}s\n     before: ${pl.replace(/^.*strace.c:\d+:/,'').slice(0,120)}\n     after : ${l.replace(/^.*(strace|loader|syscall).c:\d+:/,'').slice(0,120)}`);prev=t;pl=l;}
 if(out.length)console.log('== '+dir.split(/[\/]/).pop()+' '+(d.replace(/^.*記録する-?/,'')||'r0')+'\n  '+out.join('\n  '));}}
