const fs=require('fs'); let bytes=0; const s=Date.now();
fs.createReadStream('./data/received.bin').on('data',c=>bytes+=c.length).on('end',()=>{
 console.log('Mbps',((bytes*8)/((Date.now()-s)/1000)/1024/1024).toFixed(2));
});
