// Dynamic OG Image Generation for shared verdict links
// Uses @vercel/og (Edge Runtime) to create 1200x630 social cards
import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get("topic") || "Court is in Session";
    const winner = searchParams.get("winner") || "Tie";
    const scoreA = parseInt(searchParams.get("scoreA") || "50");
    const scoreB = parseInt(searchParams.get("scoreB") || "50");
    const headline = searchParams.get("headline") || "";
    const nameA = searchParams.get("nameA") || "Person A";
    const nameB = searchParams.get("nameB") || "Person B";

    return new ImageResponse(
      (
        <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", background:"#FDF8F5", padding:"50px 60px", fontFamily:"system-ui,-apple-system,sans-serif" }}>
          {/* Top tagline */}
          <div style={{ display:"flex", fontSize:20, color:"#E8445A", fontWeight:600, letterSpacing:"0.5px", marginBottom:20 }}>
            Finally, a judge who doesn't take sides.
          </div>

          {/* Topic */}
          <div style={{ display:"flex", fontSize:52, fontWeight:800, color:"#1A1412", lineHeight:1.2, marginBottom:16, maxHeight:140, overflow:"hidden" }}>
            {topic.length > 60 ? topic.slice(0,57)+"..." : topic}
          </div>

          {/* Headline */}
          {headline && (
            <div style={{ display:"flex", fontSize:28, fontWeight:700, color:"#F4724A", marginBottom:30 }}>
              {headline.length > 80 ? headline.slice(0,77)+"..." : headline}
            </div>
          )}

          {/* Score section */}
          <div style={{ display:"flex", flex:1, alignItems:"flex-end", gap:30, marginBottom:30 }}>
            {/* Person A */}
            <div style={{ display:"flex", flexDirection:"column", flex:1, alignItems:"center", gap:8 }}>
              <div style={{ fontSize:18, fontWeight:700, color:"#E8445A" }}>{nameA}</div>
              <div style={{ display:"flex", width:"100%", height:24, background:"#EDE6DF", borderRadius:12, overflow:"hidden" }}>
                <div style={{ width:`${scoreA}%`, height:"100%", background:"linear-gradient(135deg,#E8445A,#F4724A)", borderRadius:12 }} />
              </div>
              <div style={{ fontSize:36, fontWeight:800, color:"#E8445A" }}>{scoreA}</div>
            </div>
            <div style={{ display:"flex", fontSize:24, fontWeight:800, color:"#B0A49E", alignSelf:"center" }}>vs</div>
            {/* Person B */}
            <div style={{ display:"flex", flexDirection:"column", flex:1, alignItems:"center", gap:8 }}>
              <div style={{ fontSize:18, fontWeight:700, color:"#3A6FD4" }}>{nameB}</div>
              <div style={{ display:"flex", width:"100%", height:24, background:"#EDE6DF", borderRadius:12, overflow:"hidden" }}>
                <div style={{ width:`${scoreB}%`, height:"100%", background:"linear-gradient(135deg,#3A6FD4,#5B8FE4)", borderRadius:12 }} />
              </div>
              <div style={{ fontSize:36, fontWeight:800, color:"#3A6FD4" }}>{scoreB}</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"2px solid #EDE6DF", paddingTop:20 }}>
            <div style={{ display:"flex", fontSize:22, fontWeight:800, color:"#E8445A" }}>youbethejudge.ai</div>
            <div style={{ display:"flex", fontSize:18, color:"#6B5E58", fontWeight:600 }}>Winner: {winner}</div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (e) {
    return new Response("Error generating image", { status: 500 });
  }
}
