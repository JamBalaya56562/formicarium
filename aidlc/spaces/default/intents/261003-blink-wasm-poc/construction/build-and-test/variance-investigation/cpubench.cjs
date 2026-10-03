// 1 スレッドの固定計算。所要時間（ms）を出力する。
const t=process.hrtime.bigint();let x=0n,h=0;for(let i=0;i<4e7;i++){h=(h*31+i)|0;if((i&1023)===0)x+=BigInt(h&255);}
console.log(Number(process.hrtime.bigint()-t)/1e6, x>0n?'':'');
