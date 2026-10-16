import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {motionRoute} from '../ui/motion-server.mjs';
test('AI route rejects an invalid brief before invoking the model',async()=>{
 const server=http.createServer((req,res)=>motionRoute(req,res,new URL(req.url,'http://local')).catch(e=>{res.statusCode=e.status||500;res.end(e.message)}));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try {const res=await fetch(`http://127.0.0.1:${server.address().port}/motion/route-qa/ai-plan`,{method:'POST',headers:{'X-Panel':'1','Content-Type':'application/json'},body:JSON.stringify({data:{}})});assert.equal(res.status,400);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
