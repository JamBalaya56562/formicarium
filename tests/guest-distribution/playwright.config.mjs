import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir:'.',testMatch:'consumer.spec.mjs',timeout:60_000,workers:1,retries:0,
  use:{baseURL:'http://127.0.0.1:4178/'},
  webServer:{command:`${JSON.stringify(process.execPath)} ${JSON.stringify(fileURLToPath(new URL('./serve.mjs',import.meta.url)))}`,
    cwd:fileURLToPath(new URL('../../',import.meta.url)),url:'http://127.0.0.1:4178/',reuseExistingServer:false,timeout:30_000},
  projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'firefox',use:{browserName:'firefox'}},{name:'webkit',use:{browserName:'webkit'}}],
});
