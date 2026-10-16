import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {motionRoute} from '../ui/motion-server.mjs';

async function requestWithOrigin(origin) {
 const server=http.createServer((req,res)=>motionRoute(req,res,new URL(req.url,'http://local')).catch(error=>{res.statusCode=error.status||500;res.end(error.message)}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try {
  const response=await fetch(`${base}/motion/route-qa/ai-plan`,{
   method:'POST',headers:{'X-Panel':'1','Content-Type':'application/json',Origin:origin==='same-origin'?base:origin},body:JSON.stringify({data:{}}),
  });
  return {status:response.status,message:await response.text()};
 } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
for(const origin of ['https://example.com','null','http://localhost:9999']) {
 test(`Motion rejects cross-origin mutations: ${origin}`,async()=>{
  const result=await requestWithOrigin(origin);
  assert.equal(result.status,403);
  assert.match(result.message,/Origin/);
 });
}
test('Motion accepts same-origin requests and reaches brief validation',async()=>{
 const result=await requestWithOrigin('same-origin');
 assert.equal(result.status,400);
 assert.match(result.message,/brief/);
});
