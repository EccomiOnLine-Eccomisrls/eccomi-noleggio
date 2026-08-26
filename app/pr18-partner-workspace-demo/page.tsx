export default function Pr18PartnerWorkspaceDemo() {
  const nav = ["Panoramica", "Offerte", "Pratiche", "Commissioni", "Collaboratori"];
  return (
    <main style={{minHeight:"100vh",background:"#f4f7fb",color:"#102033",fontFamily:"Arial, sans-serif"}}>
      <header style={{minHeight:78,display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,padding:"14px clamp(20px,5vw,72px)",background:"#fff",borderBottom:"1px solid #e4eaf0"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,color:"#073f73"}}>
          <span style={{width:48,height:48,borderRadius:14,display:"grid",placeItems:"center",color:"#fff",background:"#0c74bb",fontSize:24}}>🚙</span>
          <span><strong>ECCOMI NOLEGGIO</strong><small style={{display:"block",marginTop:3,color:"#6b7c90"}}>AREA PARTNER · by Eccomi OnLine</small></span>
        </div>
        <span style={{color:"#267352",fontWeight:800}}>🛡️ Perimetro protetto</span>
      </header>

      <div style={{maxWidth:1320,margin:"0 auto",padding:"34px 24px 80px"}}>
        <section style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:18,flexWrap:"wrap",padding:26,background:"#fff",border:"1px solid #dce6f1",borderRadius:20}}>
          <div><span style={{color:"#0c5597",fontSize:12,fontWeight:900,letterSpacing:".1em"}}>PARTNER ADMIN · PREVIEW SICURA PR18</span><h1 style={{margin:"7px 0",fontSize:38}}>Eccomi OnLine Test</h1><p style={{margin:0,color:"#66768a"}}>Eccomi OnLine Test S.r.l. · Sasa</p></div>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:14,background:"#ecfdf3",color:"#166534"}}><span>🏢</span><span><strong style={{display:"block"}}>Area protetta</strong><small>Accesso riservato alla tua organizzazione</small></span></div>
        </section>

        <section style={{marginTop:16,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
          {[['Offerte online','0','0 in verifica'],['Pratiche aperte','0','0 totali'],['Commissioni','0,00 €','maturato registrato'],['Collaboratori','1','gestibili dal Partner Admin']].map(([a,b,c]) => <article key={a} style={{display:"grid",gap:5,padding:18,borderRadius:17,border:"1px solid #dce6f1",background:"#fff"}}><span>{a}</span><strong style={{fontSize:26}}>{b}</strong><small>{c}</small></article>)}
        </section>

        <div style={{margin:"22px 0 8px",color:"#0c5597",fontSize:12,fontWeight:900,letterSpacing:".1em"}}>IL TUO SPAZIO DI LAVORO</div>
        <nav style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>{nav.map((item,index)=><span key={item} style={{padding:"9px 13px",borderRadius:999,border:"1px solid #cbd8e6",background:index===0?"#0c5597":"#fff",color:index===0?"#fff":"#0c5597",fontWeight:850}}>{item}</span>)}</nav>

        <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:14}}>
          <article style={{padding:22,borderRadius:19,background:"#fff",border:"1px solid #dce6f1"}}><span style={{color:"#0c5597",fontSize:12,fontWeight:900,letterSpacing:".1em"}}>OPERATIVITÀ</span><h2>Cosa richiede attenzione</h2><div style={{padding:14,borderRadius:13,background:"#ecfdf3",color:"#166534",fontWeight:850}}>✓ Nessuna pratica aperta.</div></article>
          <article style={{padding:22,borderRadius:19,background:"#fff",border:"1px solid #dce6f1"}}><span style={{color:"#0c5597",fontSize:12,fontWeight:900,letterSpacing:".1em"}}>SICUREZZA</span><h2>Perimetro della società</h2><p style={{margin:0,color:"#66768a",lineHeight:1.55}}>Offerte, clienti, documenti e commissioni restano filtrati server-side sulla società del Partner.</p></article>
        </section>

        <footer style={{marginTop:34,paddingTop:22,borderTop:"1px solid #dce6f1",textAlign:"center",color:"#6b7c90",fontSize:13}}><strong style={{color:"#073f73"}}>ECCOMI NOLEGGIO</strong> · Ideato e progettato by Eccomi OnLine</footer>
      </div>

      <div style={{position:"fixed",left:16,bottom:16,padding:"9px 12px",borderRadius:10,background:"#ecfdf3",color:"#166534",fontSize:12,fontWeight:800}}>PREVIEW SICURA · nessun login reale · nessun dato di produzione modificato</div>
    </main>
  );
}
