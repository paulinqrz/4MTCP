const RECORD_SIZE = 20;
function serialize(r){
 const b=Buffer.alloc(RECORD_SIZE);
 b.writeUInt32LE(r.id,0);
 b.writeBigUInt64LE(BigInt(r.timestamp),4);
 b.writeFloatLE(r.temperature,12);
 b.writeFloatLE(r.pressure,16);
 return b;
}
module.exports={serialize,RECORD_SIZE};
