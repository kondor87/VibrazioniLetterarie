export function RoomBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>

      {/* ═══════════════════════════════════════════════
          PARETI E STRUTTURA — noce scuro caldo
      ═══════════════════════════════════════════════ */}

      {/* Parete base — legno noce profondo */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(180deg, #1E0B03 0%, #250F04 25%, #1E0B03 60%, #140801 100%)"
      }} />

      {/* Venature legno orizzontali */}
      <div className="absolute inset-0 opacity-25" style={{
        backgroundImage: `
          repeating-linear-gradient(
            180deg,
            transparent 0px, transparent 22px,
            rgba(45,20,5,0.4) 22px, rgba(45,20,5,0.4) 23px,
            transparent 23px, transparent 46px,
            rgba(30,12,3,0.3) 46px, rgba(30,12,3,0.3) 47px
          )
        `
      }} />

      {/* Pannelli verticali parete — wainscoting */}
      <div className="absolute inset-0" style={{
        backgroundImage: `repeating-linear-gradient(
          90deg,
          transparent 0px, transparent 157px,
          rgba(8,4,1,0.5) 157px, rgba(8,4,1,0.5) 159px,
          rgba(55,28,8,0.12) 159px, rgba(55,28,8,0.12) 161px,
          transparent 161px, transparent 320px
        )`
      }} />

      {/* Soffitto — zona più chiara (aria calda) */}
      <div className="absolute top-0 left-0 right-0 h-[20%]" style={{
        background: "linear-gradient(180deg, #2E1508 0%, #220E05 50%, transparent 100%)"
      }} />

      {/* Cornicione superiore — legno ornamentale */}
      <div className="absolute top-0 left-0 right-0 h-[10px]" style={{
        background: "linear-gradient(180deg, #4A2510 0%, #2E1508 100%)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,200,80,0.07)"
      }} />

      {/* Modanatura sotto cornicione */}
      <div className="absolute top-[10px] left-0 right-0 h-[4px]" style={{
        background: "linear-gradient(180deg, rgba(80,40,12,0.4) 0%, transparent 100%)"
      }} />

      {/* Pavimento visibile in basso */}
      <div className="absolute bottom-0 left-0 right-0 h-[16%]" style={{
        background: "linear-gradient(0deg, #0C0601 0%, #140901 50%, transparent 100%)"
      }} />

      {/* Assi pavimento */}
      <div className="absolute bottom-0 left-0 right-0 h-[13%]" style={{
        backgroundImage: "repeating-linear-gradient(90deg, transparent 0px, transparent 95px, rgba(0,0,0,0.35) 95px, rgba(0,0,0,0.35) 96px)",
        opacity: 0.55
      }} />

      {/* Battiscopa */}
      <div className="absolute bottom-0 left-0 right-0 h-[10px]" style={{
        background: "#2A1508",
        boxShadow: "0 -4px 18px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,180,60,0.04)"
      }} />


      {/* ═══════════════════════════════════════════════
          LAMPADA DA LETTURA — alto a destra
      ═══════════════════════════════════════════════ */}

      {/* Stelo lampada */}
      <div className="absolute" style={{
        top: 0,
        right: "8.5%",
        width: "3px",
        height: "29%",
        background: "linear-gradient(180deg, #4A2510 0%, #2A1508 100%)",
        boxShadow: "1px 0 6px rgba(0,0,0,0.9), -1px 0 3px rgba(0,0,0,0.5)"
      }} />

      {/* Paralume — trapezio caldo */}
      <div className="absolute" style={{
        top: "25.5%",
        right: "calc(8.5% - 22px)",
        width: "50px",
        height: "26px",
        background: "linear-gradient(180deg, #7B4520 0%, #9B5A28 45%, #6A3818 100%)",
        clipPath: "polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)",
        boxShadow: "0 0 35px rgba(255,140,30,0.35), 0 0 12px rgba(200,100,20,0.5)"
      }} />

      {/* Interno paralume incandescente */}
      <div className="absolute" style={{
        top: "25.5%",
        right: "calc(8.5% - 22px)",
        width: "50px",
        height: "26px",
        background: "linear-gradient(180deg, rgba(255,200,80,0.35) 0%, rgba(255,160,40,0.15) 100%)",
        clipPath: "polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)",
      }} />

      {/* Cono di luce PRINCIPALE dalla lampada */}
      <div className="absolute" style={{
        top: "27%",
        right: "0%",
        width: "40%",
        height: "72%",
        background: "radial-gradient(ellipse 48% 88% at 80% 1%, rgba(255,165,35,0.32) 0%, rgba(240,135,20,0.15) 28%, rgba(210,105,15,0.06) 52%, transparent 72%)"
      }} />

      {/* Riflesso caldo sul soffitto */}
      <div className="absolute" style={{
        top: 0,
        right: "3%",
        width: "34%",
        height: "30%",
        background: "radial-gradient(ellipse 58% 65% at 70% 0%, rgba(255,210,90,0.16) 0%, rgba(200,140,40,0.07) 50%, transparent 78%)"
      }} />

      {/* Alone intorno al paralume */}
      <div className="absolute" style={{
        top: "22%",
        right: "5%",
        width: "20%",
        height: "14%",
        background: "radial-gradient(ellipse 70% 70% at 65% 50%, rgba(255,185,60,0.18) 0%, transparent 70%)"
      }} />


      {/* ═══════════════════════════════════════════════
          ABAT-JOUR / CALORE basso-sinistra (camino)
      ═══════════════════════════════════════════════ */}
      <div className="absolute" style={{
        bottom: 0,
        left: 0,
        width: "48%",
        height: "65%",
        background: "radial-gradient(ellipse 52% 62% at 0% 100%, rgba(230,95,12,0.17) 0%, rgba(190,65,8,0.08) 42%, transparent 70%)"
      }} />

      {/* Alone secondario calore */}
      <div className="absolute" style={{
        bottom: 0,
        left: 0,
        width: "22%",
        height: "35%",
        background: "radial-gradient(ellipse 65% 65% at 0% 100%, rgba(255,120,20,0.12) 0%, transparent 65%)"
      }} />


      {/* ═══════════════════════════════════════════════
          POLTRONA SILHOUETTE — angolo basso destra
      ═══════════════════════════════════════════════ */}

      {/* Schienale */}
      <div className="absolute" style={{
        bottom: "13%",
        right: "1%",
        width: "11%",
        height: "24%",
        background: "linear-gradient(155deg, #3A2010 0%, #251208 100%)",
        borderRadius: "5px 5px 0 0",
        boxShadow: "-8px 0 24px rgba(0,0,0,0.6), 0 0 40px rgba(0,0,0,0.5), inset 1px 1px 0 rgba(255,200,80,0.06)"
      }} />

      {/* Cuscino schienale */}
      <div className="absolute" style={{
        bottom: "23%",
        right: "1.5%",
        width: "8.5%",
        height: "11%",
        background: "linear-gradient(180deg, #4A2A10 0%, #341808 100%)",
        borderRadius: "4px 4px 0 0",
        boxShadow: "inset 0 2px 6px rgba(0,0,0,0.35), inset 0 -1px 0 rgba(255,180,60,0.04)"
      }} />

      {/* Seduta */}
      <div className="absolute" style={{
        bottom: "13%",
        right: "0.2%",
        width: "13%",
        height: "9%",
        background: "linear-gradient(180deg, #4A2510 0%, #251208 100%)",
        borderRadius: "4px 4px 0 0",
        boxShadow: "0 6px 28px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,200,80,0.06)"
      }} />

      {/* Bracciolo sinistro */}
      <div className="absolute" style={{
        bottom: "21%",
        right: "13%",
        width: "1.8%",
        height: "7%",
        background: "#251208",
        borderRadius: "2px 2px 0 0",
        boxShadow: "-3px 0 10px rgba(0,0,0,0.7)"
      }} />

      {/* Testa bracciolo sinistro */}
      <div className="absolute" style={{
        bottom: "28%",
        right: "12.8%",
        width: "2.5%",
        height: "1.5%",
        background: "#2E1508",
        borderRadius: "2px",
      }} />

      {/* Bracciolo destro */}
      <div className="absolute" style={{
        bottom: "21%",
        right: "0.2%",
        width: "1.8%",
        height: "7%",
        background: "#251208",
        borderRadius: "2px 2px 0 0"
      }} />

      {/* Testa bracciolo destro */}
      <div className="absolute" style={{
        bottom: "28%",
        right: "0%",
        width: "2.5%",
        height: "1.5%",
        background: "#2E1508",
        borderRadius: "2px",
      }} />

      {/* Gambe poltrona */}
      {[0, 3.5, 9.5, 11.5].map((r, i) => (
        <div key={i} className="absolute" style={{
          bottom: "9%",
          right: `${r + 1}%`,
          width: "1.2%",
          height: "4%",
          background: "#1A0C04",
          borderRadius: "0 0 2px 2px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.9)"
        }} />
      ))}

      {/* Ombra poltrona sul pavimento */}
      <div className="absolute" style={{
        bottom: "5%",
        right: "0%",
        width: "16%",
        height: "7%",
        background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,0,0,0.5) 0%, transparent 80%)"
      }} />


      {/* ═══════════════════════════════════════════════
          VIGNETTING CINEMATICO — profondità e focus
      ═══════════════════════════════════════════════ */}

      {/* Vignetting principale — meno aggressivo per non nascondere poltrona */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 80% 76% at 50% 42%, transparent 38%, rgba(0,0,0,0.40) 78%, rgba(0,0,0,0.78) 100%)"
      }} />

      {/* Ombra laterale sinistra */}
      <div className="absolute inset-y-0 left-0 w-[5%]" style={{
        background: "linear-gradient(90deg, rgba(0,0,0,0.65) 0%, transparent 100%)"
      }} />

      {/* Ombra laterale destra — più morbida per mostrare poltrona */}
      <div className="absolute inset-y-0 right-0 w-[5%]" style={{
        background: "linear-gradient(270deg, rgba(0,0,0,0.55) 0%, transparent 100%)"
      }} />

      {/* Ombra superiore */}
      <div className="absolute top-0 left-0 right-0 h-[90px]" style={{
        background: "linear-gradient(180deg, rgba(0,0,0,0.70) 0%, transparent 100%)"
      }} />

      {/* Ombra inferiore */}
      <div className="absolute bottom-0 left-0 right-0 h-[70px]" style={{
        background: "linear-gradient(0deg, rgba(0,0,0,0.65) 0%, transparent 100%)"
      }} />

      {/* Alone ambientale caldo al centro — calore narrativo */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 55% 50% at 50% 48%, rgba(160,70,8,0.05) 0%, transparent 70%)"
      }} />

      {/* ═══════════════════════════════════════════════
          CITAZIONE INCORNICIATA — parete sinistra
      ═══════════════════════════════════════════════ */}
      <div style={{
        position: "absolute",
        top: "5%",
        left: "50%",
        transform: "translateX(-50%)",
        textAlign: "center",
        zIndex: 9,
        pointerEvents: "none",
        minWidth: "320px",
      }}>
        {/* Cornice esterna */}
        <div style={{
          padding: "14px 24px 12px",
          border: "1px solid rgba(180,140,40,0.20)",
          background: "rgba(12,6,2,0.45)",
          backdropFilter: "blur(1px)",
          boxShadow: "0 0 0 3px rgba(60,30,8,0.15), 0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,200,80,0.04)",
          position: "relative",
        }}>
          {/* Angolini decorativi */}
          {[["top:0,left:0","border-top,border-left"],["top:0,right:0","border-top,border-right"],["bottom:0,left:0","border-bottom,border-left"],["bottom:0,right:0","border-bottom,border-right"]].map((_, i) => {
            const positions = [
              { top: -4, left: -4 }, { top: -4, right: -4 },
              { bottom: -4, left: -4 }, { bottom: -4, right: -4 },
            ];
            const pos = positions[i];
            return (
              <div key={i} style={{
                position: "absolute",
                ...pos,
                width: 8, height: 8,
                border: "1px solid rgba(200,160,50,0.35)",
                background: "rgba(30,15,4,0.8)",
              }} />
            );
          })}

          {/* Linee decorative interne */}
          <div style={{
            borderTop: "1px solid rgba(180,140,40,0.14)",
            borderBottom: "1px solid rgba(180,140,40,0.14)",
            padding: "8px 4px",
          }}>
            <p style={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontSize: "11.5px",
              fontStyle: "italic",
              color: "rgba(210,175,80,0.42)",
              lineHeight: 1.55,
              letterSpacing: "0.025em",
              margin: 0,
            }}>
              «Una stanza senza libri è come un corpo senza anima»
            </p>
            <p style={{
              fontFamily: "system-ui, sans-serif",
              fontSize: "8px",
              color: "rgba(180,140,55,0.28)",
              marginTop: "7px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}>
              — Marco Tullio Cicerone
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
