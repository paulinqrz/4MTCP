const net=require('net'); const fs=require('fs');
const out=fs.createWriteStream('./data/received.bin');
net.connect(5000).on('data',c=>{
 if(!out.write(c)){ this.pause(); out.once('drain',()=>this.resume()); }
}).on('end',()=>{out.end(); console.log('Concluído');});
