import {fileURLToPath} from 'node:url';
import http from 'node:http';
import {createApp} from './src/application.mjs';
import {googleConfiguration,createGoogleAuth} from './src/google-auth.mjs';
try{process.loadEnvFile(fileURLToPath(new URL('./.env',import.meta.url)));}catch(e){if(e.code!=='ENOENT')throw e;}
const hosted=process.env.VERCEL==='1';
const port=Number(process.env.PORT||4173);
async function prepare(){
 const defaultUrl=hosted?'https://'+(process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL):'http://127.0.0.1:'+port;
 const publicUrl=new URL(process.env.DENTEC_PUBLIC_URL||defaultUrl);
 if(publicUrl.username||publicUrl.password||publicUrl.pathname!=='/'||publicUrl.search||publicUrl.hash||(publicUrl.protocol!=='https:'&&!(publicUrl.protocol==='http:'&&['127.0.0.1','localhost'].includes(publicUrl.hostname))))throw Error('Endereço público inválido.');
 let options={publicOrigin:publicUrl.origin,googleAuth:createGoogleAuth(hosted?null:googleConfiguration()),directory:fileURLToPath(new URL('./data',import.meta.url))};
 if(hosted){
  const database=process.env.POSTGRES_URL,storageUrl=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,setupCode=process.env.DENTEC_SETUP_CODE,setupEmail=process.env.DENTEC_SETUP_EMAIL?.trim().toLowerCase();
  if(!database||!storageUrl||!key||!setupCode||setupCode.length<32||!setupEmail||!/^[^\s@]+@ifpr\.edu\.br$/.test(setupEmail))throw Error('Configuração de hospedagem incompleta.');
  const {openPostgresStore}=await import('./src/postgres-store.mjs'),{cloudFiles}=await import('./src/cloud-files.mjs'),{cloudPdf}=await import('./src/cloud-pdf.mjs');
  options={...options,store:await openPostgresStore(database),files:await cloudFiles(storageUrl,key),pdfRenderer:cloudPdf,setupCode,setupEmail};
 }
 return createApp(options);
}
const preparing=prepare();preparing.catch(()=>{});
const server=http.createServer(async(req,res)=>{try{const app=await preparing;await app.handle(req,res);}catch{res.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:'Sistema em configuração. Contate a administração.'}));}});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'A porta está ocupada. Encerre a versão anterior com Ctrl+C.':'Não foi possível iniciar o servidor.');process.exitCode=1;});
server.listen(port,hosted?'0.0.0.0':'127.0.0.1',async()=>{if(!hosted){const app=await preparing;app.localPort=port;console.log('DENTEC/PROENS — abra http://127.0.0.1:'+port);if(!(await app.store.read()).users.length)console.log('Código para criar a primeira conta ADMIN (uso local): '+app.setupCode);}});
