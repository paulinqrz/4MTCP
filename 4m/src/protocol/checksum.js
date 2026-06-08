const crypto=require('crypto');
module.exports=(buffer)=>crypto.createHash('sha256').update(buffer).digest('hex');
