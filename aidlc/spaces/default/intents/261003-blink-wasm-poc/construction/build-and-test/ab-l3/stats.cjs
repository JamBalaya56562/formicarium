const fs=require('fs'),p='test-results/ab/';const rows=[];
for(const f of fs.readdirSync(p).filter(f=>/^(r2-)?(chromium|firefox)-\d+-[AB]\.log$/.test(f))){const m=fs.readFileSync(p+f,'utf8').match(/\{"version"[^}]*\}/);if(!m)continue;const parts=f.replace('.log','').replace(/^r2-/,'').split('-');rows.push({env:parts[0],mode:parts[2],...JSON.parse(m[0])});}
const med=a=>{a=[...a].sort((x,y)=>x-y);const n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2};
const U=(a,b)=>{let u=0;for(const x of a)for(const y of b)u+=x<y?1:x===y?0.5:0;return u}; // U = count A<B
// two-sided permutation p-value on U
function perm(a,b,iter=200000){const all=[...a,...b],na=a.length,obs=Math.abs(U(a,b)-na*b.length/2);let c=0;let s=12345;const rnd=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff};
 for(let k=0;k<iter;k++){const x=[...all];for(let i=x.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[x[i],x[j]]=[x[j],x[i]]}if(Math.abs(U(x.slice(0,na),x.slice(na))-na*b.length/2)>=obs)c++}return c/iter}
for(const env of ['chromium','firefox']){const A=rows.filter(r=>r.env===env&&r.mode==='A'),B=rows.filter(r=>r.env===env&&r.mode==='B');
 console.log(`== ${env}: A(L-3 あり) n=${A.length}, B(L-3 なし) n=${B.length}`);
 for(const k of ['version','install','frozenInstall','list','total']){const g=r=>k==='total'?r.version+r.install+r.frozenInstall+r.list:r[k];const a=A.map(g),b=B.map(g);
  console.log(`  ${k.padEnd(13)} med A ${(med(a)/1000).toFixed(1)}s  B ${(med(b)/1000).toFixed(1)}s  P(A<B)=${(U(a,b)/(a.length*b.length)).toFixed(2)}  p=${perm(a,b).toFixed(3)}`);}}
