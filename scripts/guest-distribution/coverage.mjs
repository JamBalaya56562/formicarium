import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, cp, readdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { createInstrumenter } = require('istanbul-lib-instrument');
const { createCoverageMap } = require('istanbul-lib-coverage');
const root = fileURLToPath(new URL('../../', import.meta.url));
const hash = (value) => createHash('sha256').update(value).digest('hex');
export const FILES = ['manifest','fixtures','resolver'].map((name)=>`integration/terrarium/guest-distribution/${name}.mjs`);
const PROJECTS = ['chromium','firefox','webkit'];
const NODE_TESTS = ['manifest','fixtures','resolver','stage','integration'].map((name)=>`tests/guest-distribution/${name}.test.mjs`);
const TITLES = [
  'synthetic two-ref contract returns distinct bytes/provenance with valid fixture/cwd',
  'synthetic default ref with explicitly empty seed keeps /work cwd',
  'unknown selections, 404, digest tamper and redirect never execute guest',
  'actual official aube two-release supply is distinct from synthetic fixtures',
  'actual latest pitchfork patched musl supply keeps selected provenance and fixture',
];
const save = (path,value)=>writeFile(path,`${JSON.stringify(value,null,2)}\n`);

async function candidateIdentity(site) {
  if(!site)throw new Error('coverage requires U2_ACTUAL_SITE for actual supply identity');
  const path=resolve(site),files=[];
  async function walk(directory,prefix='') {
    for(const entry of await readdir(directory,{withFileTypes:true})) {
      const relative=prefix?`${prefix}/${entry.name}`:entry.name;
      if(entry.isDirectory())await walk(join(directory,entry.name),relative);
      else if(entry.isFile()) {
        const bytes=await readFile(join(directory,entry.name));files.push({path:relative,size:bytes.length,sha256:hash(bytes)});
      } else throw new Error('candidate identity refuses symlinks or special files');
    }
  }
  await walk(path);files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  if(!files.some((file)=>file.path==='tools.json')||!files.some((file)=>file.path==='dist/builds.json'))throw new Error('candidate identity missing catalogue');
  return {path,files,sha256:hash(JSON.stringify(files))};
}

/** Fixed inventory, owned zero maps and separate instrumented workspace. */
export async function prepareCoverage(output) {
  const out=resolve(output),workspace=join(out,'workspace');
  const candidate=await candidateIdentity(process.env.U2_ACTUAL_SITE);
  await mkdir(workspace,{recursive:true});
  for(const path of ['tests/guest-distribution','scripts/guest-distribution']) {
    await mkdir(dirname(join(workspace,path)),{recursive:true});
    await cp(join(root,path),join(workspace,path),{recursive:true});
  }
  const metadata=[],digests=[];
  for(const path of FILES) {
    const source=await readFile(join(root,path));
    const instrumenter=createInstrumenter({esModules:true,compact:false,coverageGlobalScope:'globalThis',coverageGlobalScopeFunc:false});
    const text=instrumenter.instrumentSync(source.toString('utf8'),path);
    const file=instrumenter.lastFileCoverage();metadata.push(file);
    digests.push({path,sourceSha256:hash(source),instrumentedSha256:hash(text),statementMapSha256:hash(JSON.stringify(file.statementMap))});
    await mkdir(dirname(join(workspace,path)),{recursive:true});await writeFile(join(workspace,path),text);
  }
  await cp(join(root,'integration/terrarium/guest-distribution/index.d.ts'),join(workspace,'integration/terrarium/guest-distribution/index.d.ts'));
  await cp(join(root,'integration/terrarium/guest-distribution/resolver.d.mts'),join(workspace,'integration/terrarium/guest-distribution/resolver.d.mts'));
  await cp(join(root,'package.json'),join(workspace,'package.json'));
  await mkdir(join(out,'node'),{recursive:true});
  const preload=`import {writeFileSync} from 'node:fs';\nimport {relative,resolve} from 'node:path';\nprocess.on('exit',(code)=>{const coverage=globalThis.__coverage__;if(coverage&&Object.keys(coverage).length)writeFileSync(${JSON.stringify(join(out,'node'))}+'/node-'+process.pid+'.json',JSON.stringify({realm:'node-host',testFile:relative(${JSON.stringify(workspace)},resolve(process.argv[1]??'')).replaceAll('\\\\','/'),actualSite:resolve(process.env.U2_ACTUAL_SITE??''),exitCode:code,coverage}));});\n`;
  await writeFile(join(out,'node-preload.mjs'),preload);
  const specPath=join(workspace,'tests/guest-distribution/consumer.spec.mjs');
  const original=await readFile(specPath,'utf8');
  const hook=`\ntest.afterEach(async({page},info)=>{const coverage=await page.evaluate(()=>globalThis.__coverage__);if(!coverage)throw Error('missing browser host coverage');await coverageWrite(info.outputPath('coverage-realms.json'),JSON.stringify({realm:'browser-host',project:info.project.name,title:info.title,status:info.status,expectedStatus:info.expectedStatus,actualSite:process.env.U2_ACTUAL_SITE,coverage}));});\n`;
  await writeFile(specPath,`import {writeFile as coverageWrite} from 'node:fs/promises';\n${original.replace("test.beforeEach",`${hook}\ntest.beforeEach`)}`);
  const configPath=join(workspace,'tests/guest-distribution/playwright.config.mjs');
  const config=await readFile(configPath,'utf8');
  await writeFile(configPath,config.replace("testDir:'.'",`outputDir:${JSON.stringify(join(out,'browser-results'))},testDir:'.'`));
  const identity=hash(JSON.stringify(digests));
  await save(join(out,'inventory.json'),{version:1,files:FILES,metadata,digests,sourceIdentity:identity,candidate,
    expectedRealms:['node-host',...PROJECTS.map((p)=>`${p}:browser-host`)],expectedBrowserTitles:TITLES,
    expectedNodeTests:NODE_TESTS,
    exclusions:{producer:'development-only staging/coverage scripts',types:'declarations checked separately',tests:'verification-only',elf:'guest asset integrity/execution checked separately'},
    u1Union:'Preserve U1 fixed13 inventory/results unchanged; U4 combines fixed16 first-party JS.'});
  return {output:out,workspace,sourceIdentity:identity};
}

async function findReceipts(path) {
  const result=[];
  for(const entry of await readdir(path,{withFileTypes:true})) {
    const name=join(path,entry.name);
    if(entry.isDirectory())result.push(...await findReceipts(name));
    else if(entry.name==='coverage-realms.json'||/^node-\d+\.json$/.test(entry.name))result.push(JSON.parse(await readFile(name,'utf8')));
  }
  return result;
}

function validateInventory(inventory) {
  if(JSON.stringify(inventory.files)!==JSON.stringify(FILES))throw new Error('coverage inventory differs');
  for(const field of ['metadata','digests']) {
    if(!Array.isArray(inventory[field])||inventory[field].length!==FILES.length||
      new Set(inventory[field].map((row)=>row.path)).size!==FILES.length||
      !inventory[field].every((row)=>FILES.includes(row.path)))throw new Error(`coverage ${field} fixed path set differs`);
  }
  for(const file of inventory.metadata) {
    if(!file.s||!file.f||!file.b||Object.values(file.s).some((value)=>value!==0)||
      Object.values(file.f).some((value)=>value!==0)||
      Object.values(file.b).some((values)=>!Array.isArray(values)||values.some((value)=>value!==0))) {
      throw new Error('coverage inventory seed must contain only zero counters');
    }
    const digest=inventory.digests.find((row)=>row.path===file.path);
    if(!['sourceSha256','instrumentedSha256','statementMapSha256'].every((field)=>
      typeof digest[field]==='string'&&/^[a-f0-9]{64}$/.test(digest[field]))||
      digest.statementMapSha256!==hash(JSON.stringify(file.statementMap)))throw new Error('coverage inventory digest differs');
  }
}

export function mergeMeasurements(inventory,rows) {
  validateInventory(inventory);
  for(const testFile of NODE_TESTS) {
    const matches=rows.filter((row)=>row.realm==='node-host'&&row.testFile===testFile);
    if(matches.length!==1||matches[0].exitCode!==0)throw new Error(`missing or unsuccessful Node file realm: ${testFile}`);
  }
  if(rows.some((row)=>row.realm==='node-host'&&!NODE_TESTS.includes(row.testFile)))throw new Error('unexpected Node file realm');
  for(const project of PROJECTS)for(const title of TITLES) {
    const matches=rows.filter((row)=>row.project===project&&row.title===title);
    if(matches.length!==1||matches[0].realm!=='browser-host'||matches[0].status!=='passed'||matches[0].expectedStatus!=='passed') {
      throw new Error(`missing or unsuccessful browser realm/case: ${project}/${title}`);
    }
  }
  const map=createCoverageMap({});
  for(const file of inventory.metadata)map.addFileCoverage(structuredClone(file));
  for(const row of rows) {
    if(row.realm==='node-host'&&row.exitCode!==0)throw new Error('unsuccessful Node coverage process');
    for(const [path,coverage] of Object.entries(row.coverage??{})) {
      const expected=inventory.metadata.find((item)=>item.path===path);
      if(!expected||JSON.stringify(expected.statementMap)!==JSON.stringify(coverage.statementMap))throw new Error('coverage source/statement map differs');
      map.merge({[path]:coverage});
    }
  }
  // Never-imported files retain their seeded zero maps in the denominator.
  const files=FILES.map((path)=>({path,lines:map.fileCoverageFor(path).toSummary().lines}));
  const lines=map.getCoverageSummary().lines;
  return {map,files,lines,passed:lines.pct>=80};
}

export async function reportCoverage(output) {
  const out=resolve(output),inventory=JSON.parse(await readFile(join(out,'inventory.json'),'utf8'));
  validateInventory(inventory);
  const currentCandidate=await candidateIdentity(process.env.U2_ACTUAL_SITE);
  if(currentCandidate.path!==inventory.candidate?.path||currentCandidate.sha256!==inventory.candidate.sha256||
    inventory.candidate.sha256!==hash(JSON.stringify(inventory.candidate.files)))throw new Error('coverage actual candidate identity changed');
  if(inventory.sourceIdentity!==hash(JSON.stringify(inventory.digests)))throw new Error('coverage source identity digest differs');
  for(const row of inventory.digests) {
    const metadata=inventory.metadata.find((item)=>item.path===row.path);
    if(!metadata||row.statementMapSha256!==hash(JSON.stringify(metadata.statementMap)))throw new Error('coverage statement map digest differs');
    if(hash(await readFile(join(root,row.path)))!==row.sourceSha256||
      hash(await readFile(join(out,'workspace',row.path)))!==row.instrumentedSha256)throw new Error('coverage source identity changed');
  }
  const rows=[...await findReceipts(join(out,'node')),...await findReceipts(join(out,'browser-results'))];
  if(rows.some((row)=>row.actualSite!==currentCandidate.path))throw new Error('coverage measurement actual site differs');
  const result=mergeMeasurements(inventory,rows);
  await save(join(out,'coverage-final.json'),result.map.toJSON());
  await save(join(out,'report.json'),{sourceIdentity:inventory.sourceIdentity,digests:inventory.digests,candidate:inventory.candidate,
    files:result.files,lines:result.lines,passed:result.passed,
    realms:rows.map(({coverage:_coverage,...identity})=>identity),fixedInventory:FILES,
    ci:'Unverified; U4 must run combined fixed16 inventory before integration.',worker:'U2 resolver executes in host only; U1 Worker evidence remains separately required.'});
  if(!result.passed)throw new Error(`coverage below unchanged 80% floor: ${result.lines.pct}%`);
  return {lines:result.lines,files:result.files,sourceIdentity:inventory.sourceIdentity,passed:result.passed};
}

function selfTest() {
  const instrumenter=createInstrumenter({esModules:true});
  const metadata=FILES.map((path)=>{instrumenter.instrumentSync('export function unused(){return 1;}\n',path);return instrumenter.lastFileCoverage();});
  const inventory={files:FILES,metadata,digests:metadata.map((file)=>({path:file.path,
    sourceSha256:'0'.repeat(64),instrumentedSha256:'1'.repeat(64),statementMapSha256:hash(JSON.stringify(file.statementMap))}))};
  const rows=NODE_TESTS.map((testFile)=>({realm:'node-host',testFile,exitCode:0,coverage:{}}));
  for(const project of PROJECTS)for(const title of TITLES)rows.push({realm:'browser-host',project,title,status:'passed',expectedStatus:'passed',coverage:{}});
  const zero=mergeMeasurements(inventory,rows);assert.equal(zero.lines.pct,0);assert.equal(zero.files.length,3);assert.equal(zero.passed,false);
  assert.throws(()=>mergeMeasurements(inventory,rows.slice(0,-1)),/missing.*browser/);
  assert.throws(()=>mergeMeasurements(inventory,rows.slice(1)),/Node file realm/);
  assert.throws(()=>mergeMeasurements(inventory,[...rows,rows[0]]),/Node file realm/);
  const changed=structuredClone(rows);changed[NODE_TESTS.length].status='skipped';assert.throws(()=>mergeMeasurements(inventory,changed),/unsuccessful/);
  for(const field of ['metadata','digests']) {
    const missing=structuredClone(inventory);missing[field].pop();assert.throws(()=>mergeMeasurements(missing,rows),/fixed path set/);
    const duplicate=structuredClone(inventory);duplicate[field][1]=structuredClone(duplicate[field][0]);assert.throws(()=>mergeMeasurements(duplicate,rows),/fixed path set/);
  }
  const nonzero=structuredClone(inventory);nonzero.metadata[0].s[Object.keys(nonzero.metadata[0].s)[0]]=1;
  assert.throws(()=>mergeMeasurements(nonzero,rows),/only zero counters/);
  console.log('coverage self-test: 3 never-imported files retained at 0%; missing Node/browser case and skipped case refused');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const [command,output,...extra]=process.argv.slice(2);
  if(extra.length)throw new Error('usage: coverage.mjs prepare|report <output> | self-test');
  if(command==='self-test')selfTest();
  else if(command==='prepare'&&output)console.log(JSON.stringify(await prepareCoverage(output)));
  else if(command==='report'&&output)console.log(JSON.stringify(await reportCoverage(output)));
  else throw new Error('usage: coverage.mjs prepare|report <output> | self-test');
}
