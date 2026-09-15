import {fileURLToPath} from 'node:url';
import {createApp} from './src/application.mjs';
import {googleConfiguration,createGoogleAuth} from './src/google-auth.mjs';
try{process.loadEnvFile(fileURLToPath(new URL('./.env',import.meta.url)));}catch(e){if(e.code!=='ENOENT')throw e;}
const googleAuth=createGoogleAuth(googleConfiguration());
const publicUrl=new URL(process.env.DENTEC_PUBLIC_URL||'http://127.0.0.1:4173');
if(publicUrl.username||publicUrl.password||publicUrl.pathname!=='/'||publicUrl.search||publicUrl.hash||(publicUrl.protocol!=='https:'&&!(publicUrl.protocol==='http:'&&['127.0.0.1','localhost'].includes(publicUrl.hostname))))throw Error('Endereço público inválido.');
const app=await createApp({publicOrigin:publicUrl.origin,googleAuth,directory:fileURLToPath(new URL('./data',import.meta.url))});
app.server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'A porta 4173 está ocupada. Encerre a versão anterior com Ctrl+C.':e.message);process.exitCode=1;});
app.server.listen(4173,'127.0.0.1',()=>{console.log('DENTEC/PROENS — abra http://127.0.0.1:4173');if(!app.store.read().users.length)console.log('Código para criar a primeira conta ADMIN (uso local): '+app.setupCode);});
