const fs = require("fs");
function show(f, marks){
  if(!fs.existsSync(f)){ console.log("### MISSING "+f); return; }
  const s = fs.readFileSync(f,"utf8");
  console.log("###### "+f+" ("+s.split("\n").length+" lines) ######");
  for (const [m,n] of marks){ const i=s.indexOf(m); console.log("---- "+m+" ----"); console.log(i<0?"NF":s.slice(i,i+n)); }
}
show("programs/nyx-pamm/src/lib.rs", [["pub fn init_pool",760],["pub struct InitPool",640]]);
show("pamm-client.cjs", [["ixInitPool",1100]]);
show("pamm-demo.cjs", [["init",700]]);
