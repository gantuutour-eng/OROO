const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const checks=fs.readdirSync(__dirname)
 .filter(name=>/^verify(?:-[a-z0-9-]+)?\.cjs$/.test(name)&&name!=='verify-all.cjs')
 .sort();
if(!checks.length){console.error('No verification scripts found.');process.exit(1)}
for(const name of checks){
 console.log('\nRunning '+name);
 const result=spawnSync(process.execPath,[path.join(__dirname,name)],{cwd:__dirname,stdio:'inherit'});
 if(result.error){console.error(result.error.message);process.exit(1)}
 if(result.status!==0)process.exit(result.status||1);
}
console.log('\nPASS: '+checks.length+' verification suites.');
