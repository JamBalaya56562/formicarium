const fs=require('fs');const which=process.argv[2]||'webkit';
const S=fs.readFileSync(`test-results/wkcpu/${which}-cpu.txt`,'utf8').trim().split('\n').map(l=>l.trim().split(/\s+/));
const M=fs.readFileSync(`test-results/wkcpu/${which}-marks.txt`,'utf8').trim().split('\n').map(l=>{const [t,...r]=l.split(' ');return {t:+t,s:r.join(' ')}});
const start=M.find(m=>m.s==='start').t,done=M.find(m=>m.s.startsWith('done')),closing=M.find(m=>m.s==='closing').t;const steps=done.s.match(/steps=(.*)/)[1].split(',').map(Number);
let ends=[];let t=done.t;for(let i=steps.length-1;i>=0;i--){ends.unshift(t);t-=steps[i]*1000}
const label=x=>{if(x<start)return 'idle';if(x>closing)return 'closed';if(x>done.t)return 'after';for(let i=0;i<ends.length;i++)if(x<=ends[i])return ['install','rm','frozen','list'][i];return '?'};
console.log('   t(s) phase    dt(s) wk-cores wk-WS(MB) wk-commit(MB) free-RAM(MB) free-commit(MB) top-other(cpu-s)');
for(let i=1;i<S.length;i++){const a=S[i-1],b=S[i];const dt=(+b[0]-+a[0])/1000;const cores=(+b[1]-+a[1])/dt;
 console.log(`${((+b[0]-start)/1000).toFixed(1).padStart(6)} ${label(+b[0]).padEnd(8)} ${dt.toFixed(1).padStart(4)} ${cores.toFixed(2).padStart(6)} ${b[3].padStart(8)} ${b[4].padStart(10)} ${b[5].padStart(9)} ${b[6].padStart(10)}  ${b[7]||''} ${b[8]||''}`)}
