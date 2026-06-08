const fs=require('fs'); const hash=require('../src/protocol/checksum');
console.log(hash(fs.readFileSync('./data/telemetry.bin'))===hash(fs.readFileSync('./data/received.bin'))?'INTEGRIDADE OK':'FALHA');
