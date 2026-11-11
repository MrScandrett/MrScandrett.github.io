export const COMPILER_ORIGIN='http://127.0.0.1:8791';
export async function probeCompiler(fetcher=fetch){
 try{
  const response=await fetcher(COMPILER_ORIGIN+'/health',{cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!response.ok)return {state:'unavailable',message:'The local service responded, but its compiler check failed. Read the companion window and try again.'};
  const data=await response.json();
  if(data.service!=='NXT local compiler'||data.protocol!==1)return {state:'outdated',message:'A different or older service is using port 8791. Close it and start the newly downloaded NXT companion.'};
  if(data.busy)return {state:'busy',message:'The compiler is busy. Wait for it to finish, then check again.'};
  if(!data.compilerReady)return {state:'compiler-missing',message:data.message||'The companion is running, but NBC/NXC could not compile the test program. Read its diagnostics.'};
  return {state:'ready',message:'Compiler ready: a generated tone program compiled successfully. USB connection is checked separately.'};
 }catch{return {state:'unreachable',message:'This browser cannot reach the compiler companion on this computer. Start the downloaded companion, leave its window open, and allow Chrome/Edge to access the local computer if asked. The NXT USB cable does not start the compiler.'};}
}
