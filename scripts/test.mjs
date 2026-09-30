import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const tests=(await readdir(new URL('../tests/',import.meta.url))).filter(n=>n.endsWith('.test.ts')).sort().map(n=>`tests/${n}`);
const result=spawnSync(process.execPath,['--experimental-strip-types','--test',...tests],{stdio:'inherit'});process.exit(result.status??1);
