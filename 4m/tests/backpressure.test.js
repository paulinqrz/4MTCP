const net=require('net');
const s=net.connect(5000);
s.on('data',()=>{s.pause(); setTimeout(()=>s.resume(),50);});
