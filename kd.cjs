const { Connection, PublicKey } = require("@solana/web3.js");
const fs = require("fs");
(async () => {
  const PROG = new PublicKey("8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3");
  const TRE = Buffer.from(new PublicKey("8AV3c2YE4XnUDXSBVkGtzgvQXNhbHLQL9FwyKFYviftF").toBytes());
  const conn = new Connection("https://api.devnet.solana.com", "confirmed");
  const accts = await conn.getProgramAccounts(PROG);
  console.log("accounts:", accts.length);
  for (const a of accts) {
    const d = a.account.data;
    if (d.length !== 396) { console.log("skip len", d.length); continue; }
    const H = (x,y)=>Buffer.from(d.slice(x,y)).toString("hex");
    const k = d.slice(291,323);
    const diff=[]; for (let i=0;i<32;i++) if (k[i]!==TRE[i]) diff.push(i);
    console.log("POOL", a.pubkey.toString());
    console.log(" b     ", H(17,33));
    console.log(" q0    ", H(33,49));
    console.log(" theta0", H(161,177));
    console.log(" keeper", H(291,323));
    console.log(" diff  ", diff.join(",")||"NONE");
  }
  const src = fs.readFileSync("programs/nyx-pamm/src/lib.rs","utf8");
  const cut=(s,n)=>{const i=src.indexOf(s);return i<0?("NF:"+s):src.slice(i,i+n);};
  console.log("== EventPool ==");
  console.log(cut("pub struct EventPool",520));
  console.log("== push_oracle ==");
  console.log(cut("pub fn push_oracle",280));
})();
