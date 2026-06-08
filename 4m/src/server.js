const net=require('net'); const fs=require('fs');
net.createServer(socket=>{
 const rs=fs.createReadStream('./data/telemetry.bin',{highWaterMark:65536});
 rs.on('data',c=>{ if(!socket.write(c)){ rs.pause(); socket.once('drain',()=>rs.resume()); }});
 rs.on('end',()=>socket.end());
}).listen(5000,()=>console.log('Servidor 5000'));
