const fs=require('fs');
const {serialize}=require('../protocol/serializer');
const out=fs.createWriteStream('./data/telemetry.bin');
for(let i=0;i<4000000;i++){
 out.write(serialize({id:i,timestamp:Date.now(),temperature:Math.random()*100,pressure:Math.random()*10}));
}
out.end(); console.log('Dataset gerado');
