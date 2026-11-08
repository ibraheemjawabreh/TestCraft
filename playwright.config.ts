import {defineConfig} from '@playwright/test'
export default defineConfig({
 testDir:'./tests/ui',fullyParallel:false,workers:1,retries:0,timeout:45000,
 reporter:[['list'],['json',{outputFile:'.test-output/playwright-results.json'}]],
 use:{baseURL:'http://127.0.0.1:3207',headless:true,channel:process.platform==='win32'?'msedge':undefined,trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:[
 {command:'node node_modules/tailwindcss/lib/cli.js -i src/app/globals.css -o .test-output/ui.css --minify && node --wasm-num-compilation-tasks=1 --liftoff-only --no-wasm-async-compilation tests/ui-host.cjs',url:'http://127.0.0.1:3207/health',reuseExistingServer:true,timeout:60000},
 {command:'node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3008',url:'http://127.0.0.1:3008/en/login',reuseExistingServer:true,timeout:60000}
 ]
})

