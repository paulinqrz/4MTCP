module.exports=(bytes,start)=>((bytes*8)/((Date.now()-start)/1000)/1024/1024).toFixed(2);
