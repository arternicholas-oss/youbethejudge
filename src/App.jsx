import { useState, useRef, useEffect } from "react";

// ── DESIGN TOKENS ──────────────────────────────────────────────
const C = {
  bg:"#FDF8F5", surface:"#FFFFFF", surfaceWarm:"#FFF4EE", surfacePink:"#FFF0F3",
  border:"#EDE6DF", borderMid:"#D9CFCA",
  text:"#1A1412", textMid:"#6B5E58", textLight:"#B0A49E",
  rose:"#E8445A", roseLight:"#FFE8EC", peach:"#F4724A",
  lavender:"#8B6FD4", lavLight:"#F0ECFF",
  teal:"#2BA880", tealLight:"#E8FAF5",
  gold:"#D4860A", goldLight:"#FFF8E8",
  blue:"#3A6FD4", blueLight:"#EEF3FF",
};

const SCREENS = {
  HOME:"home", SETUP:"setup",
  RECORD_A:"record_a", CLARIFY_A:"clarify_a",
  RECORD_B:"record_b", CLARIFY_B:"clarify_b",
  PERSONALITY:"personality", VERDICT:"verdict",
  HANDOFF:"handoff",
  HISTORY:"history", COURT:"court", CASE_DETAIL:"case_detail",
  PRIVACY:"privacy", TERMS:"terms",
  // Remote flow
  MODE_SELECT:"mode_select",
  REMOTE_SETUP:"remote_setup",
  REMOTE_SEND:"remote_send",
  REMOTE_WAITING:"remote_waiting",
  REMOTE_B_LANDING:"remote_b_landing",
  REMOTE_B_RECORD:"remote_b_record",
  REMOTE_B_CLARIFY:"remote_b_clarify",
  REMOTE_REVEAL:"remote_reveal",
};

const CATEGORIES = ["All","Relationship","Family","Work","Money","Roommates","Friends","General","Household","Let's Debate"];
const ZODIAC = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const MBTI = ["INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP","ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"];
const LOVE_LANGS = ["Words of Affirmation","Acts of Service","Receiving Gifts","Quality Time","Physical Touch"];
const ATTACHMENT = ["Secure","Anxious","Avoidant","Fearful-Avoidant"];
const ARGUMENT_TOPICS = ["Chores & Household","Money & Finances","Parenting","Food & Lifestyle"];

// Fun anonymous name generator
const ADJECTIVES = ["Curious","Honest","Spicy","Chaotic","Logical","Dramatic","Calm","Bold","Witty","Sassy","Petty","Reasonable","Savage","Sweet"];
const NOUNS = ["Otter","Lemon","Pickle","Falcon","Mango","Panda","Cactus","Walnut","Pigeon","Waffle","Koala","Noodle","Llama","Biscuit"];
const genUsername = () => ADJECTIVES[Math.floor(Math.random()*ADJECTIVES.length)] + NOUNS[Math.floor(Math.random()*NOUNS.length)];
const MY_USERNAME = genUsername(); // stable per session

// Comment types
const COMMENT_TAGS = [
  { id:"AGREE",    emoji:"🔥", label:"Agree with verdict",  color:C.teal,     bg:C.tealLight  },
  { id:"DISAGREE", emoji:"❌", label:"Disagree",            color:C.rose,     bg:C.roseLight  },
  { id:"BETTER",   emoji:"🧠", label:"Better argument",     color:C.lavender, bg:C.lavLight   },
  { id:"FUNNY",    emoji:"😂", label:"Roast / Funny",       color:C.gold,     bg:C.goldLight  },
];

// Seed comments for cold start
const seedComments = (caseId) => [
  { id:`${caseId}-s1`, caseId, username:"SpicyPickle", text:"Person B had every opportunity to present actual evidence and chose vibes instead. The AI was right.", tag:"AGREE", likes:24, likedByMe:false, ts: Date.now() - 3600000*5 },
  { id:`${caseId}-s2`, caseId, username:"CuriousOtter", text:"I actually think Person A overstated their case. The pattern argument only works if they can prove it was intentional.", tag:"DISAGREE", likes:18, likedByMe:false, ts: Date.now() - 3600000*3 },
  { id:`${caseId}-s3`, caseId, username:"LogicalNoodle", text:"Person B should have led with the context around the specific incident instead of going broad. A stronger opener wins every time.", tag:"BETTER", likes:31, likedByMe:false, ts: Date.now() - 3600000*1 },
  { id:`${caseId}-s4`, caseId, username:"DramaticWaffle", text:"Person B really said 'I had reasons' and expected that to hold up in court 😂", tag:"FUNNY", likes:47, likedByMe:false, ts: Date.now() - 3600000*0.5 },
];

// Recency decay scoring: likes + recency boost (newer = higher bonus)
const commentScore = (c) => {
  const ageHours = (Date.now() - c.ts) / 3600000;
  const recencyBoost = Math.max(0, 10 - ageHours * 0.5);
  return c.likes + recencyBoost;
};

const getTimeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff/60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins/60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs/24);
  return `${days}d ago`;
};

const DAILY_DEBATES = [
  { id:1, topic:"Who should apologize first after a fight?", votes:[62,38], labels:["The one who started it","The one who escalated it"] },
  { id:2, topic:"Is leaving dishes 'soaking' actually cleaning them?", votes:[29,71], labels:["Yes, it counts!","No, that's not cleaning 😂"] },
];

const MOCK_COURT = [
  { id:1, category:"Relationship", topic:"Who should apologize first", displayA:"Jordan", displayB:"Alex", sideA:"I already said sorry twice. At some point you have to move on.", sideB:"Saying sorry doesn't mean anything if you keep doing the same thing. I need actions, not words.", aiWinner:"B", aiHeadline:"Patterns matter more than apologies.", aiRuling:"Alex correctly identifies that repetitive behavior undermines any apology. Jordan's frustration is understandable but misses the core issue.", votes:{a:31,b:69}, totalVotes:1847, isOwn:false, timeAgo:"2h ago", comments:[] },
  { id:2, category:"Work", topic:"Taking credit for team work", displayA:"Morgan", displayB:"Riley", sideA:"I was the one who stayed late and finished the presentation. The team didn't show up.", sideB:"It was a team project. One person finishing a slide deck doesn't make it yours.", aiWinner:"B", aiHeadline:"Effort ≠ ownership of a team product.", aiRuling:"Collaborative work requires shared credit by default. Morgan acted unilaterally without team consent.", votes:{a:44,b:56}, totalVotes:923, isOwn:false, timeAgo:"5h ago", comments:[] },
  { id:3, category:"Money", topic:"Splitting the bill on a first date", displayA:"Sam", displayB:"Taylor", sideA:"I asked them out. I planned it. I should pay.", sideB:"It's 2026. We both ate. Offering to split is respectful.", aiWinner:"Tie", aiHeadline:"Both positions are valid here.", aiRuling:"This is genuinely a matter of cultural expectation. Neither side is objectively wrong.", votes:{a:52,b:48}, totalVotes:3204, isOwn:false, timeAgo:"1d ago", comments:[] },
  { id:4, category:"Roommates", topic:"Thermostat wars", displayA:"Person A", displayB:"Person B", sideA:"I pay equal rent. I should have equal say over temperature. 74° is not unreasonable.", sideB:"74° in February is insane. I'm sweating in my own home.", aiWinner:"A", aiHeadline:"Equal rent = equal climate rights.", aiRuling:"Person A makes a fair equity argument. Person B can layer up more easily.", votes:{a:61,b:39}, totalVotes:672, isOwn:true, myVote:"a", timeAgo:"3d ago", comments:[] },
  { id:5, category:"Family", topic:"Holiday plans with in-laws", displayA:"CuriousOtter", displayB:"SpicyPickle", sideA:"We've gone to your family for Christmas three years in a row. It's our turn.", sideB:"My mom is sick. This isn't about tradition, it's about being there for family.", aiWinner:"B", aiHeadline:"Medical circumstances override rotation logic.", aiRuling:"SpicyPickle's reason is circumstantial, not preferential. Compassion takes precedence.", votes:{a:18,b:82}, totalVotes:1103, isOwn:false, timeAgo:"4d ago", comments:[] },
  { id:6, category:"Relationship", topic:"Reading partner's texts", displayA:"Mia", displayB:"Jake", sideA:"I had a gut feeling something was off. I checked and I was right — there were flirty messages.", sideB:"Privacy is non-negotiable. You could have just asked me. Going through my phone is a dealbreaker.", aiWinner:"B", aiHeadline:"Being right doesn't make the method okay.", aiRuling:"Jake's boundary around privacy is valid regardless of what was found. Trust violations can't be fixed by more trust violations.", votes:{a:41,b:59}, totalVotes:4521, isOwn:false, timeAgo:"6h ago", comments:[] },
  { id:7, category:"Money", topic:"Lending money to a best friend", displayA:"Dex", displayB:"Priya", sideA:"I lent her $800 six months ago and she hasn't even mentioned paying it back. I shouldn't have to ask.", sideB:"I fully plan to pay it back. Things have been tight. Real friends don't put a timeline on generosity.", aiWinner:"A", aiHeadline:"Six months of silence is not generosity — it's avoidance.", aiRuling:"Dex extended trust and Priya has not communicated proactively about repayment. At minimum, acknowledgment is owed.", votes:{a:73,b:27}, totalVotes:2891, isOwn:false, timeAgo:"12h ago", comments:[] },
  { id:8, category:"Work", topic:"Quiet quitting vs. loyalty", displayA:"Chris", displayB:"Dana", sideA:"I do exactly what I'm paid for — nothing more, nothing less. That's not quitting, that's having boundaries.", sideB:"Going above and beyond is how you grow. If everyone did the bare minimum, the company would collapse.", aiWinner:"A", aiHeadline:"Employment is a contract, not a loyalty oath.", aiRuling:"Chris is fulfilling the agreed terms of employment. The expectation of unpaid extra effort benefits employers disproportionately.", votes:{a:68,b:32}, totalVotes:5102, isOwn:false, timeAgo:"1d ago", comments:[] },
  { id:9, category:"Friends", topic:"Showing up late to everything", displayA:"Kai", displayB:"Lena", sideA:"I'm always 10-15 minutes late. It's just how I am. People who know me expect it.", sideB:"Being late every time tells me my time doesn't matter to you. It's disrespectful.", aiWinner:"B", aiHeadline:"Chronic lateness is a choice, not a personality trait.", aiRuling:"Lena correctly identifies that habitual tardiness communicates a lack of respect for others' time, regardless of intent.", votes:{a:12,b:88}, totalVotes:3847, isOwn:false, timeAgo:"2d ago", comments:[] },
  { id:10, category:"Roommates", topic:"Overnight guests without asking", displayA:"Niko", displayB:"Ava", sideA:"It's my apartment too. I don't need permission to have someone stay over.", sideB:"We share the space. Having a stranger in the living room at 7am without warning crosses a line.", aiWinner:"B", aiHeadline:"Shared space requires shared consent.", aiRuling:"Ava's expectation of advance notice is reasonable. Niko's autonomy doesn't override the shared nature of the living space.", votes:{a:22,b:78}, totalVotes:1956, isOwn:false, timeAgo:"3d ago", comments:[] },
].map(c => ({ ...c, comments: seedComments(c.id) }));

const mockHistory = [
  { date:"Apr 3", topic:"Dishes in the sink", winner:"Alex", verdict:"Jordan didn't have a leg to stand on", category:"Chores & Household", scoreA:78, scoreB:34, caseName:"Dishgate" },
  { date:"Mar 28", topic:"Being late to dinner", winner:"Jordan", verdict:"Alex was being unreasonable", category:"Friends", scoreA:41, scoreB:72, caseName:"The Dinner Incident" },
  { date:"Mar 15", topic:"Thermostat temperature", winner:"Tie", verdict:"Both need to meet in the middle", category:"Chores & Household", scoreA:55, scoreB:55, caseName:"Thermostatgate" },
  { date:"Mar 8", topic:"Money for concert tickets", winner:"Jordan", verdict:"Jordan made the stronger financial case", category:"Money & Finances", scoreA:38, scoreB:69, caseName:"TicketGate 2026" },
  { date:"Feb 22", topic:"Whose turn to cook", winner:"Alex", verdict:"Alex's evidence was undeniable", category:"Chores & Household", scoreA:81, scoreB:29, caseName:"The Kitchen Wars" },
];

// ── STYLES ─────────────────────────────────────────────────────
const S = {
  root:{ fontFamily:"'Plus Jakarta Sans','Nunito',sans-serif", background:C.bg, minHeight:"100vh", color:C.text },
  screen:{ maxWidth:480, margin:"0 auto", padding:"20px 16px 80px", display:"flex", flexDirection:"column", gap:14 },
  card:{ background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:20, padding:18 },
  label:{ fontSize:11, letterSpacing:1.5, color:C.textLight, textTransform:"uppercase", display:"block", marginBottom:8, fontWeight:700 },
  title:{ fontSize:22, fontWeight:800, letterSpacing:-0.5, margin:"0 0 4px", color:C.text },
  sub:{ fontSize:13, color:C.textMid, margin:0, lineHeight:1.5 },
  input:{ width:"100%", background:"#FBF8F6", border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, padding:"12px 14px", fontSize:14, fontFamily:"inherit", boxSizing:"border-box", outline:"none", marginBottom:8 },
  textarea:{ width:"100%", background:"#FBF8F6", border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, padding:"12px 14px", fontSize:14, fontFamily:"inherit", boxSizing:"border-box", outline:"none", resize:"vertical" },
  btnPrimary:{ background:`linear-gradient(135deg, ${C.rose}, ${C.peach})`, color:"#fff", border:"none", borderRadius:14, padding:"15px 20px", fontSize:14, fontWeight:700, cursor:"pointer", width:"100%", letterSpacing:0.3 },
  btnSoft:{ background:C.roseLight, color:C.rose, border:`1.5px solid #F5C0C8`, borderRadius:14, padding:"13px 16px", fontSize:13, fontWeight:700, cursor:"pointer" },
  btnGhost:{ background:"transparent", color:C.textMid, border:`1.5px solid ${C.borderMid}`, borderRadius:14, padding:"13px 16px", fontSize:13, fontWeight:600, cursor:"pointer" },
  btnRow:{ display:"flex", gap:8 },
  twoCol:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  chip:{ background:C.surfaceWarm, border:`1.5px solid ${C.border}`, borderRadius:20, padding:"5px 12px", fontSize:11, color:C.textMid, whiteSpace:"nowrap", cursor:"pointer", fontWeight:500 },
  chipsRow:{ display:"flex", flexWrap:"wrap", gap:5, marginTop:8 },
  barTrack:{ height:6, background:C.border, borderRadius:3, overflow:"hidden" },
  barFill:{ height:"100%", borderRadius:3, transition:"width 1s ease" },
};

const css = `
  * { box-sizing: border-box; }
  body { margin:0; }
  .fade-in { animation: fadeIn 0.3s ease; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .pop { transition: transform 0.12s, box-shadow 0.12s; }
  .pop:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(232,68,90,0.12); }
  .pop:active { transform:scale(0.97); }
  .pulse { animation: pulse 0.8s ease infinite alternate; }
  @keyframes pulse { from{opacity:1;transform:scale(1)} to{opacity:0.3;transform:scale(1.5)} }
  .spin-fun { animation: spinFun 1.2s ease-in-out infinite; }
  @keyframes spinFun { 0%,100%{transform:rotate(-10deg) scale(1)} 50%{transform:rotate(10deg) scale(1.1)} }
  .verdict-pop { animation: verdictPop 0.5s cubic-bezier(0.34,1.56,0.64,1); }
  @keyframes verdictPop { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
  .bar-fill { animation: barGrow 1s ease; }
  @keyframes barGrow { from{width:0!important} }
  .comment-in { animation: commentIn 0.25s ease; }
  @keyframes commentIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  .tally-reveal { animation: tallyIn 0.6s cubic-bezier(0.34,1.56,0.64,1); }
  @keyframes tallyIn { from{opacity:0;transform:scale(0.9) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
  .tally-dots::after { content:''; animation: tallyDots 1.2s steps(4,end) infinite; }
  @keyframes tallyDots { 0%{content:''} 25%{content:'.'} 50%{content:'..'} 75%{content:'...'} }
  .like-pop { animation: likePop 0.2s cubic-bezier(0.34,1.56,0.64,1); }
  @keyframes likePop { from{transform:scale(1)} 50%{transform:scale(1.4)} to{transform:scale(1)} }
  input::placeholder, textarea::placeholder { color:#C0B8B2; }
  input:focus, textarea:focus, select:focus { border-color:${C.rose}!important; background:#fff!important; }
  select { appearance:none; -webkit-appearance:none; }
  select option { background:#fff; color:#1A1412; }
  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-thumb { background:#EDE6DF; border-radius:2px; }
`;

// ── MAIN APP ───────────────────────────────────────────────────
export default function YouBeTheJudge() {
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [personA, setPersonA] = useState({ name:"", side:"", zodiac:"", mbti:"", loveLanguage:"", attachment:"" });
  const [personB, setPersonB] = useState({ name:"", side:"", zodiac:"", mbti:"", loveLanguage:"", attachment:"" });
  const [topic, setTopic] = useState("");
  const [usePersonality, setUsePersonality] = useState(false);
  const [personalityDepth, setPersonalityDepth] = useState("zodiac");
  const [verdict, setVerdict] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [activeRecorder, setActiveRecorder] = useState(null);
  const [history, setHistory] = useState(mockHistory);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [judgeMode, setJudgeMode] = useState("neutral");
  const [caseName, setCaseName] = useState("");
  const [courtCases, setCourtCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [clarifyQsA, setClarifyQsA] = useState([]);
  const [clarifyQsB, setClarifyQsB] = useState([]);
  const [clarifyAnsA, setClarifyAnsA] = useState([]);
  const [clarifyAnsB, setClarifyAnsB] = useState([]);
  const [clarifyLoading, setClarifyLoading] = useState(false);
  // Remote flow state
  const [remoteMode, setRemoteMode] = useState(false); // true = remote, false = same phone
  const [remoteCode, setRemoteCode] = useState("");
  const [remoteStatus, setRemoteStatus] = useState("waiting"); // waiting | submitted | ready
  const [remoteBSide, setRemoteBSide] = useState("");
  const [remoteBClarifyQs, setRemoteBClarifyQs] = useState([]);
  const [remoteBClarifyAns, setRemoteBClarifyAns] = useState([]);
  const [simulatingRemoteB, setSimulatingRemoteB] = useState(false);
  const [notifications, setNotifications] = useState([
    { id:1, type:"votes", caseId:4, read:false, ts: Date.now()-3600000*2, message:"67 people have now ruled on your argument — Person A leads 61% vs 39%" },
    { id:2, type:"top_comment", caseId:4, read:false, ts: Date.now()-1800000, message:"Someone wrote a Top Comment on your case: \"Equal rent = equal climate rights 🏆\"" },
    { id:3, type:"votes", caseId:4, read:true, ts: Date.now()-86400000, message:"Your case hit 500 votes! The crowd is split 61/39." },
  ]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [joinError, setJoinError] = useState(false);
  const [courtLoading, setCourtLoading] = useState(false);
  const [reportedComments, setReportedComments] = useState(new Set());
  const [visitorId] = useState(() => {
    let id = localStorage.getItem('ybtj_visitor_id');
    if (!id) { id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('ybtj_visitor_id', id); }
    return id;
  });
  const [authUser, setAuthUser] = useState(null);
  const [communityPaywall, setCommunityPaywall] = useState(false);
  const recognitionRef = useRef(null);

  const COMMUNITY_FREE_LIMIT = 5;
  const getCommunityViews = () => parseInt(localStorage.getItem('ybtj_community_views')||'0', 10);
  const incrementCommunityViews = () => { const n = getCommunityViews()+1; localStorage.setItem('ybtj_community_views', String(n)); return n; };
  const canViewCommunity = () => getCommunityViews() < COMMUNITY_FREE_LIMIT;

  const SUPABASE_URL = 'https://imqmuoavgklywiduqctl.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltcW11b2F2Z2tseXdpZHVxY3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODgxOTIsImV4cCI6MjA5MTM2NDE5Mn0.fLukKz5GTaxjW5jZXEojRwJ3A7DIYJ8zxXfnrRqJej8';

  // Google OAuth: check for redirect callback or existing session
  useEffect(() => {
    const handleAuth = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        if (accessToken) {
          localStorage.setItem('ybtj_auth_token', accessToken);
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
      const token = localStorage.getItem('ybtj_auth_token');
      if (token) {
        try {
          const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY }
          });
          if (res.ok) {
            const user = await res.json();
            setAuthUser({ name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User', email: user.email, avatar: user.user_metadata?.avatar_url, token });
          } else { localStorage.removeItem('ybtj_auth_token'); }
        } catch(e) { localStorage.removeItem('ybtj_auth_token'); }
      }
    };
    handleAuth();
  }, []);

  const signInWithGoogle = () => {
    const redirectTo = window.location.origin;
    window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  };
  const signOut = () => { localStorage.removeItem('ybtj_auth_token'); setAuthUser(null); };

  // URL-based routing for /privacy, /terms, and /join/:code
  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/privacy") setScreen(SCREENS.PRIVACY);
    else if (path === "/terms") setScreen(SCREENS.TERMS);
    else if (path.startsWith("/join/")) {
      const code = path.split("/join/")[1];
      if (code) {
        // Attempt to load case — if it fails or times out, show error
        let timeout;
        const loadCase = async () => {
          try {
            timeout = setTimeout(() => { setJoinError(true); setScreen(SCREENS.HOME); }, 10000);
            const res = await fetch(`/api/case?code=${code}`);
            clearTimeout(timeout);
            if (!res.ok) { setJoinError(true); setScreen(SCREENS.HOME); return; }
            const data = await res.json();
            if (!data || !data.topic) { setJoinError(true); setScreen(SCREENS.HOME); return; }
            setTopic(data.topic || "");
            setPersonA(p => ({ ...p, name: data.personAName || "" }));
            setPersonB(p => ({ ...p, name: data.personBName || "" }));
            setRemoteCode(code);
            setRemoteMode(true);
            setScreen(SCREENS.REMOTE_B_LANDING);
          } catch (e) {
            clearTimeout(timeout);
            setJoinError(true);
            setScreen(SCREENS.HOME);
          }
        };
        loadCase();
      }
    }

    // Handle browser back/forward
    const handlePop = () => {
      const p = window.location.pathname;
      if (p === "/privacy") setScreen(SCREENS.PRIVACY);
      else if (p === "/terms") setScreen(SCREENS.TERMS);
      else if (p === "/") setScreen(SCREENS.HOME);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  // Fetch court cases from Supabase when Court screen is shown
  useEffect(() => {
    if (screen === SCREENS.COURT) {
      setCourtLoading(true);
      fetch('/api/court').then(r=>r.json()).then(d=>{
        if(d.data && d.data.length) setCourtCases(d.data.map(c=>({
          id:c.id, category:c.category, topic:c.topic,
          displayA:c.display_a, displayB:c.display_b,
          aiWinner:c.ai_winner, aiHeadline:c.ai_headline, aiRuling:c.ai_ruling,
          preview:c.preview,
          votes:{a:c.votes_a||0, b:c.votes_b||0}, totalVotes:c.total_votes||0,
          isOwn:false, myVote:null, timeAgo: getTimeAgo(c.created_at), comments:[]
        })));
        else setCourtCases(MOCK_COURT);
      }).catch(()=>{ setCourtCases(MOCK_COURT); }).finally(()=>setCourtLoading(false));
    }
  }, [screen]);

  // Fetch full case detail (with comments) when viewing a case
  const loadCaseDetail = async (caseId) => {
    try {
      const res = await fetch(`/api/court?id=${caseId}`);
      const d = await res.json();
      if(d.data) {
        const c = d.data;
        const mapped = {
          id:c.id, category:c.category, topic:c.topic,
          sideA:c.side_a, sideB:c.side_b,
          displayA:c.display_a, displayB:c.display_b,
          aiWinner:c.ai_winner, aiHeadline:c.ai_headline, aiRuling:c.ai_ruling,
          verdictJson: c.verdict_json,
          votes:{a:c.votes_a||0, b:c.votes_b||0}, totalVotes:c.total_votes||0,
          isOwn:false, myVote:null, timeAgo: getTimeAgo(c.created_at),
          comments: (c.comments||[]).map(cm=>({
            id:cm.id, caseId:c.id, username:cm.username, text:cm.text, tag:cm.tag,
            likes:cm.likes_count||0, likedByMe:false, ts:new Date(cm.created_at).getTime(), replies:[]
          }))
        };
        setSelectedCase(mapped);
        // Also update in courtCases list
        setCourtCases(prev=>prev.map(cc=>cc.id===caseId?{...cc,...mapped}:cc));
      }
    } catch(e) { console.error('Load case detail failed:', e); }
  };

  // Push browser history for SPA nav
  const navigateTo = (newScreen, path) => {
    if (path && window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    setScreen(newScreen);
  };

  const pushNotification = (type, caseId, message) => {
    setNotifications(prev => [{id:Date.now(), type, caseId, read:false, ts:Date.now(), message}, ...prev]);
  };

  const markNotifsRead = () => setNotifications(prev => prev.map(n => ({...n, read:true})));

  const startVoice = (person) => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) { alert("Voice not supported — type instead!"); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR(); r.continuous=true; r.interimResults=true; r.lang="en-US";
    recognitionRef.current=r; setRecording(true); setActiveRecorder(person);
    r.onresult = (e) => { let t=""; for(let i=0;i<e.results.length;i++) t+=e.results[i][0].transcript; if(person==="A") setPersonA(p=>({...p,side:t})); else setPersonB(p=>({...p,side:t})); };
    r.onerror = () => { setRecording(false); setActiveRecorder(null); };
    r.start();
  };
  const stopVoice = () => { if(recognitionRef.current) recognitionRef.current.stop(); setRecording(false); setActiveRecorder(null); };

  const getClarifyQuestions = async (sideText, otherSideText, onDone) => {
    setClarifyLoading(true);
    try {
      const res = await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tier:"free",max_tokens:300,messages:[{role:"user",content:`You're a warm, curious mediator. Ask 1-2 short clarifying questions about this argument side. Be specific, friendly. Max 15 words each. Max 2 questions.\n\nTheir side: "${sideText}"\n${otherSideText?`Other side: "${otherSideText}"`:""}\n\nRespond ONLY with valid JSON: {"questions":["q1","q2"]}`}]})});
      const data = await res.json();
      const parsed = JSON.parse(data.content.map(i=>i.text||"").join("").replace(/```json|```/g,"").trim());
      onDone(parsed.questions?.slice(0,2)||[]);
    } catch(e) { onDone([]); }
    setClarifyLoading(false);
  };

  const buildPrompt = () => {
    const tones = { funny:"Witty and fun. End with a SHORT playful roast of the loser — punchy, not cruel.", neutral:"Calm, impartial, professional. No roast. Just fair analysis." };
    let p = `You are a charming AI judge trained on debate frameworks. Analyze for consistency, evidence, emotional vs logical reasoning.\n\nTOPIC: "${topic||"General"}"\n\nPERSON A (${personA.name||"Person A"}): "${personA.side}"`;
    if (clarifyAnsA.length) p+=`\nClarifications from A:\n${clarifyQsA.map((q,i)=>`Q: ${q}\nA: ${clarifyAnsA[i]||"(skipped)"}`).join("\n")}`;
    p+=`\n\nPERSON B (${personB.name||"Person B"}): "${personB.side}"`;
    if (clarifyAnsB.length) p+=`\nClarifications from B:\n${clarifyQsB.map((q,i)=>`Q: ${q}\nA: ${clarifyAnsB[i]||"(skipped)"}`).join("\n")}`;
    if (usePersonality) {
      if (personalityDepth==="zodiac"||personalityDepth==="full") p+=`\nZodiac: ${personA.name}=${personA.zodiac||"?"}, ${personB.name}=${personB.zodiac||"?"}`;
      if (personalityDepth==="mbti"||personalityDepth==="full") p+=`\nMBTI: ${personA.name}=${personA.mbti||"?"}, ${personB.name}=${personB.mbti||"?"}`;
      if (personalityDepth==="full") { p+=`\n${personA.name}: Love Language=${personA.loveLanguage||"?"}, Attachment=${personA.attachment||"?"}`; p+=`\n${personB.name}: Love Language=${personB.loveLanguage||"?"}, Attachment=${personB.attachment||"?"}`; }
    }
    p+=`\n\nTONE: ${tones[judgeMode]}\n\nRespond ONLY with valid JSON (no markdown):\n{"winner":"${personA.name||"Person A"} or ${personB.name||"Person B"} or Tie","verdict_headline":"punchy headline under 10 words","ruling":"2-3 sentences","key_deciding_factor":"The single most important reason winner prevailed (1 sentence)","strongest_line":"Most compelling thing said — quote directly under 20 words","person_a_score":0-100,"person_b_score":0-100,"person_a_rationality":0-100,"person_b_rationality":0-100,"a_valid_points":["p1","p2"],"b_valid_points":["p1","p2"],"communication_tip":"one actionable tip","personality_insight":"${usePersonality?"one insight":""}","roast":"${judgeMode==="funny"?"short roast":""}"}`;
    return p;
  };

  const getVerdict = async () => {
    if (!personA.side||!personB.side) { alert("Both people need to share their side first!"); return; }
    setLoading(true); setScreen(SCREENS.VERDICT);
    try {
      const res = await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tier:"free",max_tokens:1200,messages:[{role:"user",content:buildPrompt()}]})});
      const data = await res.json();
      const parsed = JSON.parse(data.content.map(i=>i.text||"").join("").replace(/```json|```/g,"").trim());
      setVerdict(parsed); setShowConfetti(true); setTimeout(()=>setShowConfetti(false),2000);
      setHistory(h=>[{date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),topic:topic||"General argument",winner:parsed.winner,verdict:parsed.verdict_headline,category:topic||"General",scoreA:parsed.person_a_score||50,scoreB:parsed.person_b_score||50,caseName:""},...h]);
    } catch(e) { setVerdict({error:true,ruling:"Something went wrong. Please try again."}); }
    setLoading(false);
  };

  const submitToCourt = async (v, cat, displayA, displayB) => {
    try {
      const res = await fetch('/api/court?action=submit', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          topic: topic||"General argument", category: cat||"Random",
          sideA: personA.side, sideB: personB.side,
          displayA: displayA||personA.name||"Person A", displayB: displayB||personB.name||"Person B",
          aiWinner: v.winner===(personA.name||"Person A")?"A":v.winner===(personB.name||"Person B")?"B":"Tie",
          aiHeadline: v.verdict_headline, aiRuling: v.ruling,
          verdictJson: v, preview: v.verdict_headline, visitorId
        })
      });
      const d = await res.json();
      if(d.data) {
        const c = d.data;
        setCourtCases(prev=>[{id:c.id, category:c.category, topic:c.topic, displayA:c.display_a, displayB:c.display_b, aiWinner:c.ai_winner, aiHeadline:c.ai_headline, aiRuling:c.ai_ruling, preview:c.preview, votes:{a:0,b:0}, totalVotes:0, isOwn:true, myVote:null, timeAgo:"Just now", comments:[]}, ...prev]);
      }
    } catch(e) { console.error('Submit to court failed:', e); }
  };

  const voteOnCase = async (caseId, side) => {
    try {
      await fetch('/api/court?action=vote', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ caseId, side, visitorId })
      });
      setCourtCases(prev=>prev.map(c=>{
        if(c.id!==caseId||c.myVote) return c;
        const newVotes = {...c.votes,[side]:c.votes[side]+1};
        const newTotal = c.totalVotes+1;
        return {...c, votes:newVotes, totalVotes:newTotal, myVote:side};
      }));
    } catch(e) { console.error('Vote failed:', e); }
  };

  const addComment = async (caseId, text, tag) => {
    const banned = ["hate","slur","kill","die","stupid idiot"];
    if (banned.some(w => text.toLowerCase().includes(w))) return false;
    try {
      const res = await fetch('/api/court?action=comment', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ caseId, username: authUser?.name || MY_USERNAME, text, tag, visitorId })
      });
      const d = await res.json();
      if(d.data) {
        const cm = d.data;
        const comment = { id:cm.id, caseId, username:cm.username, text:cm.text, tag:cm.tag, likes:0, likedByMe:false, ts:Date.now(), replies:[] };
        setCourtCases(prev=>prev.map(c=> c.id!==caseId ? c : {...c, comments:[...c.comments, comment]}));
      }
      return true;
    } catch(e) { console.error('Comment failed:', e); return false; }
  };

  const addReply = (caseId, commentId, replyText) => {
    const banned = ["hate","slur","kill","die","stupid idiot"];
    if (banned.some(w => replyText.toLowerCase().includes(w))) return false;
    const reply = { id:`reply-${Date.now()}`, username:MY_USERNAME, text:replyText, likes:0, likedByMe:false, ts:Date.now() };
    setCourtCases(prev=>prev.map(c=>{
      if(c.id!==caseId) return c;
      return {...c, comments:c.comments.map(cm=>{
        if(cm.id!==commentId) return cm;
        const updatedReplies = [...(cm.replies||[]), reply];
        // If this comment just became top comment on own case, notify
        const newScore = commentScore({...cm, likes:cm.likes});
        if (c.isOwn && newScore > 20) {
          pushNotification("top_comment", caseId, `Someone replied to a Top Comment on your case: "${replyText.slice(0,60)}"`);
        }
        return {...cm, replies:updatedReplies};
      })};
    }));
    return true;
  };

  const toggleLike = async (caseId, commentId) => {
    try {
      const res = await fetch('/api/court?action=like', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ commentId, visitorId })
      });
      const d = await res.json();
      setCourtCases(prev=>prev.map(c=>{
        if(c.id!==caseId) return c;
        return {...c, comments:c.comments.map(cm=>{
          if(cm.id!==commentId) return cm;
          const nowLiked = d.liked !== undefined ? d.liked : !cm.likedByMe;
          return {...cm, likes: nowLiked ? cm.likes+1 : Math.max(0,cm.likes-1), likedByMe:nowLiked};
        })};
      }));
    } catch(e) { console.error('Like failed:', e); }
  };

  const reportComment = async (commentId) => {
    if (reportedComments.has(commentId)) return;
    try {
      await fetch('/api/court?action=report', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ commentId, visitorId, reason:'inappropriate' })
      });
      setReportedComments(prev => new Set([...prev, commentId]));
    } catch(e) { console.error('Report failed:', e); }
  };

  const getAISmartestComment = async (caseId, comments) => {
    if (!comments.length) return;
    try {
      const res = await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tier:"free",max_tokens:200,messages:[{role:"user",content:`You are evaluating user comments on an argument case. Pick the single most insightful, logically sound comment. Return only the comment id.\n\nComments:\n${comments.map(c=>`ID: ${c.id}\nText: ${c.text}\nTag: ${c.tag}`).join("\n\n")}\n\nRespond ONLY with valid JSON: {"smartest_id":"<id>","funniest_id":"<id>"}`}]})});
      const data = await res.json();
      const parsed = JSON.parse(data.content.map(i=>i.text||"").join("").replace(/```json|```/g,"").trim());
      setCourtCases(prev=>prev.map(c=>c.id===caseId?{...c,aiSmartestId:parsed.smartest_id,aiFunniestId:parsed.funniest_id}:c));
    } catch(e) {}
  };

  const reset = () => {
    setPersonA({name:"",side:"",zodiac:"",mbti:"",loveLanguage:"",attachment:""});
    setPersonB({name:"",side:"",zodiac:"",mbti:"",loveLanguage:"",attachment:""});
    setTopic(""); setVerdict(null); setCaseName("");
    setClarifyQsA([]); setClarifyQsB([]);
    setClarifyAnsA([]); setClarifyAnsB([]);
    setScreen(SCREENS.HOME);
  };

  const generateRemoteCode = () => {
    const code = Math.random().toString(36).substring(2,8).toUpperCase();
    setRemoteCode(code);
    return code;
  };

  const handleRemoteGetVerdict = async (bSide, bClarifyQs, bClarifyAns) => {
    if (!personA.side || !bSide) return;
    setLoading(true); setScreen(SCREENS.REMOTE_REVEAL);
    const tones = { funny:"Witty and fun. End with a SHORT playful roast — punchy, not cruel.", neutral:"Calm, impartial, professional. No roast." };
    let p = `You are a charming AI judge trained on debate frameworks.\n\nTOPIC: "${topic||"General"}"\n\nPERSON A (${personA.name||"Person A"}): "${personA.side}"`;
    if (clarifyAnsA.length) p+=`\nClarifications from A:\n${clarifyQsA.map((q,i)=>`Q: ${q}\nA: ${clarifyAnsA[i]||"(skipped)"}`).join("\n")}`;
    p+=`\n\nPERSON B (${personB.name||"Person B"}): "${bSide}"`;
    if (bClarifyAns?.length) p+=`\nClarifications from B:\n${bClarifyQs.map((q,i)=>`Q: ${q}\nA: ${bClarifyAns[i]||"(skipped)"}`).join("\n")}`;
    p+=`\n\nTONE: ${tones[judgeMode]}\n\nRespond ONLY with valid JSON (no markdown):\n{"winner":"${personA.name||"Person A"} or ${personB.name||"Person B"} or Tie","verdict_headline":"punchy headline under 10 words","ruling":"2-3 sentences","key_deciding_factor":"The single most important reason winner prevailed","strongest_line":"Most compelling quote under 20 words","person_a_score":0-100,"person_b_score":0-100,"person_a_rationality":0-100,"person_b_rationality":0-100,"a_valid_points":["p1","p2"],"b_valid_points":["p1","p2"],"communication_tip":"one actionable tip","roast":"${judgeMode==="funny"?"short roast":""}"}`;
    try {
      const res = await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,messages:[{role:"user",content:p}]})});
      const data = await res.json();
      const parsed = JSON.parse(data.content.map(i=>i.text||"").join("").replace(/```json|```/g,"").trim());
      setVerdict(parsed); setShowConfetti(true); setTimeout(()=>setShowConfetti(false),2500);
      setHistory(h=>[{date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),topic:topic||"General argument",winner:parsed.winner,verdict:parsed.verdict_headline,category:topic||"General",scoreA:parsed.person_a_score||50,scoreB:parsed.person_b_score||50},...h]);
    } catch(e) { setVerdict({error:true,ruling:"Something went wrong. Please try again."}); }
    setLoading(false);
  };

  const resetFull = () => {
    setRemoteMode(false); setRemoteCode(""); setRemoteStatus("waiting");
    setRemoteBSide(""); setRemoteBClarifyQs([]); setRemoteBClarifyAns([]);
    reset();
  };

  const handleAfterRecordA = () => {
    getClarifyQuestions(personA.side, personB.side, (qs) => {
      if (qs.length > 0) { setClarifyQsA(qs); setClarifyAnsA(new Array(qs.length).fill("")); setScreen(SCREENS.CLARIFY_A); }
      else setScreen(remoteMode ? SCREENS.RECORD_B : SCREENS.HANDOFF);
    });
  };

  const handleAfterRecordB = () => {
    getClarifyQuestions(personB.side, personA.side, (qs) => {
      if (qs.length > 0) { setClarifyQsB(qs); setClarifyAnsB(new Array(qs.length).fill("")); setScreen(SCREENS.CLARIFY_B); }
      else getVerdict();
    });
  };

  const currentCourtCase = selectedCase ? courtCases.find(x=>x.id===selectedCase.id)||selectedCase : null;

  return (
    <div style={S.root}>
      <style>{css}</style>
      {screen===SCREENS.HOME && <HomeScreen setScreen={setScreen} history={history} notifications={notifications} showNotifs={showNotifs} setShowNotifs={setShowNotifs} markNotifsRead={markNotifsRead} />}
      {screen===SCREENS.MODE_SELECT && <ModeSelectScreen topic={topic} personA={personA} personB={personB} onSamePhone={()=>{setRemoteMode(false);setScreen(SCREENS.RECORD_A);}} onRemote={()=>{setRemoteMode(true);generateRemoteCode();setScreen(SCREENS.REMOTE_SEND);}} onBack={()=>setScreen(SCREENS.SETUP)} />}
      {screen===SCREENS.SETUP && <SetupScreen personA={personA} setPersonA={setPersonA} personB={personB} setPersonB={setPersonB} topic={topic} setTopic={setTopic} usePersonality={usePersonality} setUsePersonality={setUsePersonality} personalityDepth={personalityDepth} setPersonalityDepth={setPersonalityDepth} judgeMode={judgeMode} setJudgeMode={setJudgeMode} setScreen={setScreen} />}
      {screen===SCREENS.REMOTE_SEND && <RemoteSendScreen code={remoteCode} personA={personA} personB={personB} topic={topic} onBack={()=>setScreen(SCREENS.SETUP)} onRecordMySide={()=>setScreen(SCREENS.RECORD_A)} />}
      {screen===SCREENS.REMOTE_WAITING && <RemoteWaitingScreen code={remoteCode} personA={personA} personB={personB} topic={topic} remoteStatus={remoteStatus} onSimulateB={()=>{ setRemoteStatus("submitted"); setTimeout(()=>{setRemoteBSide("Look, I've been very clear about my feelings here. I told them exactly how this made me feel and instead of engaging with what I said, they deflected and made it about something else entirely. The pattern is consistent — I raise an issue, they change the subject. I need them to actually hear me, not just wait for their turn to talk."); setRemoteStatus("ready");},1500); }} onReveal={()=>handleRemoteGetVerdict(remoteBSide, remoteBClarifyQs, remoteBClarifyAns)} />}
      {screen===SCREENS.REMOTE_B_LANDING && <RemoteBLandingScreen code={remoteCode} topic={topic} personBName={personB.name} onStart={()=>setScreen(SCREENS.REMOTE_B_RECORD)} />}
      {screen===SCREENS.REMOTE_B_RECORD && <RemoteBRecordScreen person={personB} setPerson={setPersonB} recording={recording&&activeRecorder==="B"} onStart={()=>startVoice("B")} onStop={stopVoice} onNext={(side)=>{ getClarifyQuestions(side, personA.side, (qs)=>{ if(qs.length>0){setRemoteBClarifyQs(qs);setRemoteBClarifyAns(new Array(qs.length).fill(""));setScreen(SCREENS.REMOTE_B_CLARIFY);}else{setRemoteBSide(side);setRemoteStatus("submitted");setTimeout(()=>setRemoteStatus("ready"),500);setScreen(SCREENS.REMOTE_WAITING);}});}} topic={topic} />}
      {screen===SCREENS.REMOTE_B_CLARIFY && <ClarifyScreen name={personB.name||"Person B"} color={C.blue} colorLight={C.blueLight} emoji="💙" questions={remoteBClarifyQs} answers={remoteBClarifyAns} setAnswers={setRemoteBClarifyAns} onNext={()=>{setRemoteStatus("submitted");setTimeout(()=>setRemoteStatus("ready"),500);setScreen(SCREENS.REMOTE_WAITING);}} onBack={()=>setScreen(SCREENS.REMOTE_B_RECORD)} isFinal />}
      {screen===SCREENS.RECORD_A && <RecordScreen person={personA} setPerson={setPersonA} name={personA.name||"Person A"} color={C.rose} colorLight={C.roseLight} emoji="🌸" recording={recording&&activeRecorder==="A"} onStart={()=>startVoice("A")} onStop={stopVoice} onNext={()=>{ if(remoteMode){ getClarifyQuestions(personA.side,"",(qs)=>{ if(qs.length>0){setClarifyQsA(qs);setClarifyAnsA(new Array(qs.length).fill(""));setScreen(SCREENS.CLARIFY_A);}else setScreen(SCREENS.REMOTE_WAITING);}); }else handleAfterRecordA(); }} nextLoading={clarifyLoading} onBack={()=>setScreen(remoteMode?SCREENS.REMOTE_SEND:SCREENS.SETUP)} otherPerson={personB} topic={topic} />}
      {screen===SCREENS.CLARIFY_A && <ClarifyScreen name={personA.name||"Person A"} color={C.rose} colorLight={C.roseLight} emoji="🌸" questions={clarifyQsA} answers={clarifyAnsA} setAnswers={setClarifyAnsA} onNext={()=>remoteMode?setScreen(SCREENS.REMOTE_WAITING):setScreen(SCREENS.HANDOFF)} onBack={()=>setScreen(SCREENS.RECORD_A)} />}
      {screen===SCREENS.HANDOFF && (
        <div style={S.screen} className="fade-in">
          <div style={{...S.card, textAlign:'center', padding:'60px 24px', marginTop:60}}>
            <div style={{fontSize:48, marginBottom:16}}>🔒</div>
            <h2 style={{...S.title, fontSize:28, marginBottom:12}}>Pass the phone</h2>
            <p style={{...S.sub, fontSize:16, marginBottom:32}}>No peeking! It's {personB.name||"Person B"}'s turn to share their side.</p>
            <button className="pop" style={S.btnPrimary} onClick={()=>setScreen(SCREENS.RECORD_B)}>I'm ready</button>
          </div>
        </div>
      )}
      {screen===SCREENS.RECORD_B && <RecordScreen person={personB} setPerson={setPersonB} name={personB.name||"Person B"} color={C.blue} colorLight={C.blueLight} emoji="💙" recording={recording&&activeRecorder==="B"} onStart={()=>startVoice("B")} onStop={stopVoice} onNext={handleAfterRecordB} nextLoading={clarifyLoading} onBack={()=>clarifyQsA.length>0?setScreen(SCREENS.CLARIFY_A):setScreen(SCREENS.RECORD_A)} isFinal={true} otherPerson={personA} topic={topic} />}
      {screen===SCREENS.CLARIFY_B && <ClarifyScreen name={personB.name||"Person B"} color={C.blue} colorLight={C.blueLight} emoji="💙" questions={clarifyQsB} answers={clarifyAnsB} setAnswers={setClarifyAnsB} onNext={()=>getVerdict()} onBack={()=>setScreen(SCREENS.RECORD_B)} isFinal />}
      {screen===SCREENS.PERSONALITY && <PersonalityScreen personA={personA} setPersonA={setPersonA} personB={personB} setPersonB={setPersonB} depth={personalityDepth} onNext={getVerdict} onBack={()=>clarifyQsB.length>0?setScreen(SCREENS.CLARIFY_B):setScreen(SCREENS.RECORD_B)} />}
      {screen===SCREENS.VERDICT && <VerdictScreen verdict={verdict} loading={loading} personA={personA} personB={personB} judgeMode={judgeMode} showConfetti={showConfetti} showShare={showShare} setShowShare={setShowShare} onReset={reset} onSubmitCourt={submitToCourt} setScreen={setScreen} caseName={caseName} setCaseName={setCaseName} onNameCase={(name)=>setHistory(h=>[{...h[0],caseName:name},...h.slice(1)])} topic={topic} />}
      {screen===SCREENS.REMOTE_REVEAL && <VerdictScreen verdict={verdict} loading={loading} personA={personA} personB={{...personB,side:remoteBSide}} judgeMode={judgeMode} showConfetti={showConfetti} showShare={showShare} setShowShare={setShowShare} onReset={resetFull} onSubmitCourt={submitToCourt} setScreen={setScreen} isRemote caseName={caseName} setCaseName={setCaseName} onNameCase={(name)=>setHistory(h=>[{...h[0],caseName:name},...h.slice(1)])} topic={topic} />}
      {screen===SCREENS.HISTORY && <HistoryScreen history={history} onBack={()=>setScreen(SCREENS.HOME)} />}
      {screen===SCREENS.COURT && <CourtScreen cases={courtCases} loading={courtLoading} onVote={voteOnCase} onSelect={c=>{if(!canViewCommunity()){setCommunityPaywall(true);return;} incrementCommunityViews();setSelectedCase(c);loadCaseDetail(c.id);setScreen(SCREENS.CASE_DETAIL);}} onBack={()=>setScreen(SCREENS.HOME)} authUser={authUser} onSignIn={signInWithGoogle} onSignOut={signOut} showPaywall={communityPaywall} onDismissPaywall={()=>setCommunityPaywall(false)} freeViewsLeft={COMMUNITY_FREE_LIMIT - getCommunityViews()} />}
      {screen===SCREENS.CASE_DETAIL && currentCourtCase && <CaseDetailScreen c={currentCourtCase} onVote={side=>voteOnCase(currentCourtCase.id,side)} onComment={(text,tag)=>addComment(currentCourtCase.id,text,tag)} onReply={(commentId,text)=>addReply(currentCourtCase.id,commentId,text)} onLike={(commentId)=>toggleLike(currentCourtCase.id,commentId)} onReport={(commentId)=>reportComment(commentId)} reportedComments={reportedComments} onGetAIPicks={()=>getAISmartestComment(currentCourtCase.id,currentCourtCase.comments)} onBack={()=>setScreen(SCREENS.COURT)} judgeMode={judgeMode} authUser={authUser} onSignIn={signInWithGoogle} />}
      {screen===SCREENS.PRIVACY && <PrivacyScreen onBack={()=>navigateTo(SCREENS.HOME,"/")} />}
      {screen===SCREENS.TERMS && <TermsScreen onBack={()=>navigateTo(SCREENS.HOME,"/")} />}
      {/* Join error banner */}
      {joinError && screen===SCREENS.HOME && (
        <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:C.rose,color:"#fff",borderRadius:14,padding:"12px 20px",fontSize:13,fontWeight:600,zIndex:1000,boxShadow:"0 4px 20px rgba(232,68,90,0.3)",maxWidth:360,textAlign:"center"}}>
          Case not found or link expired. <button style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:8,padding:"4px 10px",fontSize:12,cursor:"pointer",marginLeft:8,fontFamily:"inherit"}} onClick={()=>setJoinError(false)}>Dismiss</button>
        </div>
      )}
    </div>
  );
}

// ── HOME ───────────────────────────────────────────────────────
function HomeScreen({ setScreen, history, notifications, showNotifs, setShowNotifs, markNotifsRead }) {
  const [voted, setVoted] = useState({});
  const debate = DAILY_DEBATES[0];
  const vote = (id,side) => { if(voted[id]!==undefined) return; setVoted(v=>({...v,[id]:side})); };
  const unread = notifications.filter(n=>!n.read).length;
  const notifIcon = { votes:"🗳️", comment:"💬", top_comment:"🏆" };

  const formatTime = (ts) => {
    const mins = Math.floor((Date.now()-ts)/60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins/60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs/24)}d ago`;
  };

  return (
    <div style={S.screen} className="fade-in">
      {/* Notification panel */}
      {showNotifs && (
        <div style={{position:"fixed",inset:0,background:"rgba(26,20,18,0.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:999,padding:"60px 16px 0"}}>
          <div style={{...S.card, width:"100%", maxWidth:400, maxHeight:"70vh", overflow:"auto"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
              <h3 style={{...S.title, fontSize:17, margin:0}}>Notifications 🔔</h3>
              <button style={{background:"none", border:"none", fontSize:13, color:C.textLight, cursor:"pointer", fontFamily:"inherit"}} onClick={()=>{setShowNotifs(false); markNotifsRead();}}>Mark all read · Close</button>
            </div>
            {notifications.length === 0 && <p style={{...S.sub, textAlign:"center", padding:"20px 0"}}>No notifications yet. Share a case with the Community to start getting reactions!</p>}
            {notifications.map(n => (
              <div key={n.id} style={{display:"flex", gap:10, padding:"10px 12px", borderRadius:14, background:n.read?C.surface:C.roseLight, border:`1px solid ${n.read?C.border:"#F5C0C8"}`, marginBottom:8}}>
                <span style={{fontSize:20, flexShrink:0}}>{notifIcon[n.type]||"📬"}</span>
                <div style={{flex:1}}>
                  <p style={{fontSize:12, color:C.text, lineHeight:1.5, margin:"0 0 3px"}}>{n.message}</p>
                  <span style={{fontSize:10, color:C.textLight}}>{formatTime(n.ts)}</span>
                </div>
                {!n.read && <div style={{width:8, height:8, borderRadius:"50%", background:C.rose, flexShrink:0, marginTop:4}} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:24}}>
        <div>
          <h1 style={{fontSize:36, fontWeight:800, letterSpacing:-1.5, margin:"0 0 2px", background:`linear-gradient(135deg, ${C.rose}, ${C.peach})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>You Be The Judge ⚖️</h1>
          <p style={{fontSize:13, color:C.textMid, margin:0}}>Finally, a judge who doesn't take sides.</p>
        </div>
        <button style={{position:"relative", background:unread>0?C.roseLight:C.surfaceWarm, border:`1.5px solid ${unread>0?"#F5C0C8":C.border}`, borderRadius:14, padding:"10px 12px", fontSize:20, cursor:"pointer", lineHeight:1}} className="pop" onClick={()=>setShowNotifs(true)}>
          🔔
          {unread > 0 && <span style={{position:"absolute", top:-4, right:-4, background:C.rose, color:"#fff", borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center"}}>{unread}</span>}
        </button>
      </div>

      <button style={S.btnPrimary} className="pop" onClick={()=>setScreen("setup")}>⚖️ Settle an Argument</button>
      <div style={S.btnRow}>
        <button style={{...S.btnGhost,flex:1}} className="pop" onClick={()=>setScreen("history")}>📋 My Cases</button>
        <button style={{...S.btnGhost,flex:1}} className="pop" onClick={()=>setScreen("court")}>👥 Community</button>
      </div>

      <div style={{...S.card, background:`linear-gradient(135deg,#FFF8F6,#FFF4FF)`}}>
        <p style={{...S.label, color:C.rose}}>How it works ✨</p>
        {[["🎙️","Speak or type — voice-first"],["🤔","AI asks clarifying questions before ruling"],["📊","Scores logic + key deciding factor"],["👥","Anonymously post to the Community — public votes & comments"]].map(([icon,txt])=>(
          <div key={txt} style={{display:"flex", gap:10, alignItems:"center", marginBottom:7}}>
            <span style={{fontSize:16, flexShrink:0}}>{icon}</span>
            <span style={{fontSize:12, color:C.textMid}}>{txt}</span>
          </div>
        ))}
      </div>

      {/* Pro Judge upsell */}
      <div style={{...S.card, background:`linear-gradient(135deg, ${C.lavLight}, #FFF8E8)`, borderColor:`${C.lavender}30`, cursor:"pointer"}} className="pop" onClick={async()=>{try{const r=await fetch('/api/stripe?action=checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitor_id:localStorage.getItem('ybtj_visitor_id')})});const d=await r.json();if(d.url){window.location.href=d.url;}else{alert('Unable to start checkout. Please try again.');console.error('Stripe response:',d);}}catch(e){alert('Something went wrong. Please try again.');console.error('Stripe error:',e);}}}>
        <div style={{display:"flex", gap:12, alignItems:"center"}}>
          <div style={{fontSize:28, flexShrink:0}}>👨‍⚖️</div>
          <div style={{flex:1}}>
            <div style={{display:"flex", alignItems:"center", gap:6, marginBottom:3}}>
              <span style={{fontSize:14, fontWeight:800, color:C.lavender}}>Pro</span>
              <span style={{background:C.gold, color:"#fff", borderRadius:6, padding:"1px 7px", fontSize:9, fontWeight:700}}>$4.99/mo</span>
            </div>
            <p style={{fontSize:11, color:C.textMid, margin:0, lineHeight:1.5}}>Unlimited verdicts, personality analysis, custom judge personas, and ad-free Community.</p>
          </div>
          <span style={{color:C.lavender, fontSize:16}}>→</span>
        </div>
      </div>

      <div style={{...S.card, borderColor:"#F5C0C8"}}>
        <p style={{...S.label, color:C.rose}}>🔥 Daily Debate — Who's Right?</p>
        <p style={{fontSize:14, fontWeight:700, color:C.text, marginBottom:12, lineHeight:1.4}}>{debate.topic}</p>
        {voted[debate.id]===undefined ? (
          <div style={S.twoCol}>
            {debate.labels.map((lbl,i)=><button key={i} style={{...S.btnGhost, padding:"10px 8px", fontSize:11, lineHeight:1.4, textAlign:"center"}} className="pop" onClick={()=>vote(debate.id,i)}>{lbl}</button>)}
          </div>
        ) : (
          <div style={{display:"flex", flexDirection:"column", gap:7}}>
            {debate.labels.map((lbl,i)=>(
              <div key={i}>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                  <span style={{fontSize:11, fontWeight:voted[debate.id]===i?700:400, color:voted[debate.id]===i?C.text:C.textLight}}>{lbl} {voted[debate.id]===i?"← you":""}</span>
                  <span style={{fontSize:11, fontWeight:700, color:C.rose}}>{debate.votes[i]}%</span>
                </div>
                <div style={S.barTrack}><div style={{...S.barFill, width:`${debate.votes[i]}%`, background:voted[debate.id]===i?C.rose:C.borderMid}} className="bar-fill" /></div>
              </div>
            ))}
            <p style={{fontSize:11, color:C.textLight, marginTop:4}}>⚖️ AI says: <strong style={{color:C.text}}>{debate.votes[0]>debate.votes[1]?debate.labels[0]:debate.labels[1]}</strong> wins</p>
          </div>
        )}
      </div>
      <div>
        <p style={{...S.label, textAlign:"center"}}>Popular topics</p>
        <div style={S.chipsRow}>{ARGUMENT_TOPICS.slice(0,6).map(t=><span key={t} style={S.chip}>{t}</span>)}</div>
      </div>
      {/* Footer links */}
      <div style={{display:"flex", justifyContent:"center", gap:16, paddingTop:12, paddingBottom:8}}>
        <a href="/privacy" style={{fontSize:11, color:C.textLight, textDecoration:"none"}} onClick={e=>{e.preventDefault();setScreen("privacy");window.history.pushState(null,"","/privacy");}}>Privacy Policy</a>
        <a href="/terms" style={{fontSize:11, color:C.textLight, textDecoration:"none"}} onClick={e=>{e.preventDefault();setScreen("terms");window.history.pushState(null,"","/terms");}}>Terms of Service</a>
      </div>
    </div>
  );
}

// ── SETUP ──────────────────────────────────────────────────────
function SetupScreen({ personA, setPersonA, personB, setPersonB, topic, setTopic, usePersonality, setUsePersonality, personalityDepth, setPersonalityDepth, judgeMode, setJudgeMode, setScreen }) {
  const MODES = [{id:"neutral",icon:"⚖️",label:"Neutral Judge",desc:"Calm, fair, impartial"},{id:"funny",icon:"😂",label:"Funny Roast",desc:"Witty ruling + roasts the loser"}];
  return (
    <div style={S.screen} className="fade-in">
      <div style={{textAlign:"center", paddingTop:12}}><h2 style={S.title}>Set the Scene 🎬</h2><p style={S.sub}>Who's arguing and what about?</p></div>
      <div style={S.card}>
        <label style={S.label}>What's the argument about?</label>
        <input style={S.input} name="topic" placeholder="e.g. who forgot to buy milk" value={topic} onChange={e=>setTopic(e.target.value)} />
        <div style={S.chipsRow}>{ARGUMENT_TOPICS.map(t=><span key={t} style={{...S.chip, background:topic===t?C.rose:C.surfaceWarm, color:topic===t?"#fff":C.textMid, borderColor:topic===t?C.rose:C.border}} onClick={()=>setTopic(t)}>{t}</span>)}</div>
      </div>
      <div style={S.twoCol}>
        <div style={{...S.card, borderTop:`3px solid ${C.border}`}}><label style={{...S.label, color:C.text}}>Person A</label><input style={S.input} name="personA" placeholder="Their name" required value={personA.name} onChange={e=>setPersonA(p=>({...p,name:e.target.value}))} /></div>
        <div style={{...S.card, borderTop:`3px solid ${C.border}`}}><label style={{...S.label, color:C.text}}>Person B</label><input style={S.input} name="personB" placeholder="Their name" required value={personB.name} onChange={e=>setPersonB(p=>({...p,name:e.target.value}))} /></div>
      </div>
      <div style={S.card}>
        <label style={S.label}>Judge Vibe 🎭</label>
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {MODES.map(m=>(
            <div key={m.id} style={{display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:14, border:`1.5px solid ${judgeMode===m.id?C.rose:C.border}`, background:judgeMode===m.id?C.roseLight:C.surface, cursor:"pointer"}} className="pop" onClick={()=>setJudgeMode(m.id)}>
              <span style={{fontSize:20}}>{m.icon}</span>
              <div style={{flex:1}}><div style={{fontSize:13, fontWeight:700, color:judgeMode===m.id?C.rose:C.text}}>{m.label}</div><div style={{fontSize:11, color:C.textLight}}>{m.desc}</div></div>
              {judgeMode===m.id && <span style={{color:C.rose, fontWeight:700}}>✓</span>}
            </div>
          ))}
        </div>
      </div>
      {/* Personality quiz removed from setup — now offered as post-verdict upsell */}
      <button style={S.btnPrimary} className="pop" onClick={()=>setScreen(SCREENS.MODE_SELECT)}>Next: Choose How to Play →</button>
    </div>
  );
}

// ── MODE SELECT ────────────────────────────────────────────────
function ModeSelectScreen({ topic, personA, personB, onSamePhone, onRemote, onBack }) {
  return (
    <div style={S.screen} className="fade-in">
      <div style={{textAlign:"center", paddingTop:16}}>
        <div style={{fontSize:44, marginBottom:8}}>📱</div>
        <h2 style={S.title}>How are you doing this?</h2>
        <p style={S.sub}>Same room or different phones?</p>
      </div>

      {/* Same phone */}
      <div style={{...S.card, cursor:"pointer", border:`2px solid ${C.rose}`, background:C.roseLight}} className="pop" onClick={onSamePhone}>
        <div style={{display:"flex", gap:14, alignItems:"center"}}>
          <div style={{fontSize:40, flexShrink:0}}>🤝</div>
          <div>
            <div style={{fontSize:15, fontWeight:800, color:C.rose, marginBottom:4}}>Same Phone</div>
            <div style={{fontSize:12, color:C.textMid, lineHeight:1.5}}>You're together right now. Pass the phone back and forth — each person records their side privately before handing it over.</div>
            <div style={{marginTop:8, display:"flex", gap:6, flexWrap:"wrap"}}>
              {["Classic mode","In-person","Quick"].map(t=><span key={t} style={{...S.chip, padding:"3px 9px", fontSize:10}}>{t}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Remote */}
      <div style={{...S.card, cursor:"pointer", border:`2px solid ${C.blue}`, background:C.blueLight}} className="pop" onClick={onRemote}>
        <div style={{display:"flex", gap:14, alignItems:"center"}}>
          <div style={{fontSize:40, flexShrink:0}}>🔗</div>
          <div>
            <div style={{fontSize:15, fontWeight:800, color:C.blue, marginBottom:4}}>Send a Link <span style={{background:C.blue, color:"#fff", borderRadius:6, fontSize:9, padding:"2px 7px", marginLeft:4, fontWeight:700}}>RECOMMENDED</span></div>
            <div style={{fontSize:12, color:C.textMid, lineHeight:1.5}}>You record your side, then send a code to the other person. They submit their side on their own phone — neither of you sees the other's argument until the verdict drops simultaneously.</div>
            <div style={{marginTop:8, display:"flex", gap:6, flexWrap:"wrap"}}>
              {["Sealed submissions","Remote","No peeking"].map(t=><span key={t} style={{...S.chip, padding:"3px 9px", fontSize:10, background:C.blueLight, borderColor:`${C.blue}40`, color:C.blue}}>{t}</span>)}
            </div>
          </div>
        </div>
      </div>

      <div style={{...S.card, background:C.goldLight, borderColor:`${C.gold}40`}}>
        <p style={{fontSize:12, color:C.textMid, lineHeight:1.6}}>
          💡 <strong style={{color:C.text}}>Why sealed submissions are better:</strong> When you can't see the other side before writing yours, arguments are more honest. No adjusting your story based on what they said. The judge gets the real version of events.
        </p>
      </div>

      <button style={S.btnGhost} className="pop" onClick={onBack}>← Back to Setup</button>
    </div>
  );
}

// ── REMOTE SEND SCREEN (Person A sent, waiting for B) ──────────
function RemoteSendScreen({ code, personA, personB, topic, onBack, onRecordMySide }) {
  const [copied, setCopied] = useState(false);
  const link = `youbethejudge.ai/join/${code}`;

  const copyLink = () => {
    navigator.clipboard?.writeText(link).catch(()=>{});
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  };

  return (
    <div style={S.screen} className="fade-in">
      <div style={{textAlign:"center", paddingTop:16}}>
        <div style={{fontSize:44, marginBottom:8}}>🔗</div>
        <h2 style={S.title}>Send this to {personB.name||"Person B"}</h2>
        <p style={S.sub}>They'll submit their side on their own phone. Neither of you sees the other's argument until the verdict drops.</p>
      </div>

      {/* The code */}
      <div style={{...S.card, background:`linear-gradient(135deg, ${C.blueLight}, #fff)`, textAlign:"center", padding:24}}>
        <p style={{...S.label, color:C.blue, marginBottom:12}}>Case Code</p>
        <div style={{fontFamily:"'Plus Jakarta Sans',monospace", fontSize:42, fontWeight:800, letterSpacing:8, color:C.blue, marginBottom:16}}>{code}</div>
        <p style={{fontSize:11, color:C.textLight, marginBottom:16}}>They enter this at youbethejudge.ai/join — or just share the link below</p>
        <button style={{...S.btnGhost, borderColor:`${C.blue}60`, color:C.blue, width:"100%", fontSize:13}} className="pop" onClick={copyLink}>
          {copied ? "✓ Copied!" : `📋 Copy Link — ${link}`}
        </button>
      </div>

      {/* Case summary */}
      <div style={S.card}>
        <label style={S.label}>What they'll see</label>
        <div style={{background:C.surfaceWarm, borderRadius:12, padding:12}}>
          <p style={{fontSize:12, fontWeight:700, color:C.text, marginBottom:4}}>⚖️ {personA.name||"Person A"} has asked you to settle an argument</p>
          <p style={{fontSize:12, color:C.textMid, marginBottom:8}}><strong>Topic:</strong> {topic||"General dispute"}</p>
          <p style={{fontSize:11, color:C.textLight}}>Your side will be kept private until both submissions are in. The verdict reveals simultaneously.</p>
        </div>
      </div>

      {/* Share options */}
      <div style={S.card}>
        <label style={S.label}>Send via</label>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
          {[["💬 iMessage",""],["📱 WhatsApp",""],["📧 Email",""],["📋 Copy Code",""]].map(([label])=>(
            <button key={label} style={{...S.btnGhost, padding:"10px", fontSize:12, textAlign:"center"}} className="pop" onClick={copyLink}>{label}</button>
          ))}
        </div>
      </div>

      <button style={S.btnPrimary} className="pop" onClick={onRecordMySide}>
        Record My Side First →
      </button>
      <button style={S.btnGhost} className="pop" onClick={onBack}>← Back</button>
    </div>
  );
}

// ── REMOTE WAITING SCREEN ──────────────────────────────────────
function RemoteWaitingScreen({ code, personA, personB, topic, remoteStatus, onSimulateB, onReveal }) {
  const [revealed, setRevealed] = useState(false);

  const handleReveal = () => {
    setRevealed(true);
    onReveal();
  };

  return (
    <div style={S.screen} className="fade-in">
      <div style={{textAlign:"center", paddingTop:16}}>
        <div style={{fontSize:44, marginBottom:8}} className={remoteStatus==="waiting"?"spin-fun":""}>
          {remoteStatus==="waiting"?"⏳":remoteStatus==="submitted"?"🔒":"✅"}
        </div>
        <h2 style={S.title}>
          {remoteStatus==="waiting" ? `Waiting for ${personB.name||"Person B"}…` :
           remoteStatus==="submitted" ? "Submission received!" :
           "Both sides are in! 🎉"}
        </h2>
        <p style={S.sub}>
          {remoteStatus==="waiting" ? `You're locked in. ${personB.name||"Person B"} hasn't submitted yet.` :
           remoteStatus==="submitted" ? "Processing their side…" :
           "Neither of you has seen the other's argument. Ready for the simultaneous reveal?"}
        </p>
      </div>

      {/* Status card */}
      <div style={S.card}>
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:C.roseLight, borderRadius:12, border:`1px solid ${C.rose}40`}}>
            <div style={{display:"flex", gap:8, alignItems:"center"}}>
              <span style={{fontSize:16}}>🌸</span>
              <span style={{fontSize:13, fontWeight:700, color:C.text}}>{personA.name||"Person A"} (you)</span>
            </div>
            <span style={{background:C.teal, color:"#fff", borderRadius:8, fontSize:10, fontWeight:700, padding:"3px 9px"}}>✓ Submitted</span>
          </div>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:remoteStatus==="waiting"?C.surfaceWarm:remoteStatus==="submitted"?C.goldLight:C.tealLight, borderRadius:12, border:`1px solid ${remoteStatus==="waiting"?C.border:remoteStatus==="submitted"?`${C.gold}40`:`${C.teal}40`}`}}>
            <div style={{display:"flex", gap:8, alignItems:"center"}}>
              <span style={{fontSize:16}}>💙</span>
              <span style={{fontSize:13, fontWeight:700, color:C.text}}>{personB.name||"Person B"}</span>
            </div>
            {remoteStatus==="waiting" && <span style={{background:C.gold, color:"#fff", borderRadius:8, fontSize:10, fontWeight:700, padding:"3px 9px"}}>⏳ Waiting…</span>}
            {remoteStatus==="submitted" && <span style={{background:C.gold, color:"#fff", borderRadius:8, fontSize:10, fontWeight:700, padding:"3px 9px"}}>🔄 Processing…</span>}
            {remoteStatus==="ready" && <span style={{background:C.teal, color:"#fff", borderRadius:8, fontSize:10, fontWeight:700, padding:"3px 9px"}}>✓ Submitted</span>}
          </div>
        </div>
      </div>

      {remoteStatus==="waiting" && (
        <>
          <div style={{...S.card, background:C.surfaceWarm, textAlign:"center"}}>
            <p style={{fontSize:12, color:C.textMid, lineHeight:1.6, marginBottom:10}}>Share the code again if they need it:</p>
            <div style={{fontFamily:"monospace", fontSize:32, fontWeight:800, letterSpacing:6, color:C.blue}}>{code}</div>
          </div>
          {/* Demo button for prototype */}
          <button style={{...S.btnGhost, fontSize:11, color:C.textLight, borderColor:C.border}} className="pop" onClick={onSimulateB}>
            🧪 Demo: Simulate Person B submitting
          </button>
        </>
      )}

      {remoteStatus==="ready" && !revealed && (
        <div style={{...S.card, background:`linear-gradient(135deg, ${C.roseLight}, ${C.blueLight})`, textAlign:"center", padding:24}}>
          <div style={{fontSize:36, marginBottom:10}}>🔒 → ⚖️</div>
          <h3 style={{fontSize:17, fontWeight:800, color:C.text, marginBottom:8}}>Sealed. Ready to reveal.</h3>
          <p style={{fontSize:12, color:C.textMid, lineHeight:1.6, marginBottom:16}}>The verdict drops the moment you tap. If {personB.name||"Person B"} is with you, do it together. If not, the verdict card is shareable instantly after.</p>
          <button style={{...S.btnPrimary, fontSize:15, padding:"16px"}} className="pop" onClick={handleReveal}>
            ⚖️ Drop the Verdict
          </button>
        </div>
      )}
    </div>
  );
}

// ── REMOTE B LANDING (Person B's phone experience) ─────────────
function RemoteBLandingScreen({ code, topic, personBName, onStart }) {
  return (
    <div style={S.screen} className="fade-in">
      <div style={{textAlign:"center", paddingTop:24}}>
        <div style={{fontSize:52, marginBottom:8}}>⚖️</div>
        <h1 style={{fontSize:32, fontWeight:800, letterSpacing:-1, margin:"0 0 6px", background:`linear-gradient(135deg, ${C.rose}, ${C.peach})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>You Be The Judge</h1>
        <p style={{fontSize:14, color:C.textMid, margin:"0 0 4px"}}>You've been called to court 👀</p>
        <p style={{fontSize:12, color:C.textLight}}>Code: <strong style={{color:C.blue, letterSpacing:2}}>{code}</strong></p>
      </div>

      <div style={{...S.card, background:`linear-gradient(135deg, ${C.blueLight}, #fff)`, textAlign:"center", padding:24}}>
        <div style={{fontSize:28, marginBottom:10}}>💙</div>
        <h3 style={{fontSize:16, fontWeight:800, color:C.text, marginBottom:8}}>{personBName||"Person B"}, it's your turn</h3>
        <p style={{fontSize:12, color:C.textMid, lineHeight:1.6, marginBottom:4}}><strong>Topic:</strong> {topic||"General dispute"}</p>
        <p style={{fontSize:11, color:C.textLight, lineHeight:1.6}}>The other person has already submitted their side. You won't see it until after you submit yours. The verdict reveals simultaneously for both of you.</p>
      </div>

      <div style={S.card}>
        <label style={S.label}>The rules ⚖️</label>
        {[["🔒","Your side stays sealed until both are submitted"],["👀","You can't see their argument before submitting"],["⚡","Verdict drops simultaneously on both phones"],["🌐","You can post to the Community anonymously after"]].map(([icon,txt])=>(
          <div key={txt} style={{display:"flex", gap:10, alignItems:"center", marginBottom:8}}>
            <span style={{fontSize:16}}>{icon}</span>
            <span style={{fontSize:12, color:C.textMid}}>{txt}</span>
          </div>
        ))}
      </div>

      <button style={S.btnPrimary} className="pop" onClick={onStart}>
        💙 Submit My Side
      </button>
    </div>
  );
}

// ── REMOTE B RECORD ────────────────────────────────────────────
function RemoteBRecordScreen({ person, setPerson, recording, onStart, onStop, onNext, topic }) {
  const [nextLoading, setNextLoading] = useState(false);
  const handleNext = () => {
    setNextLoading(true);
    onNext(person.side);
  };
  return (
    <div style={S.screen} className="fade-in">
      <div style={{textAlign:"center", paddingTop:12}}>
        <div style={{width:52, height:52, borderRadius:"50%", background:C.blueLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px", fontSize:24}}>💙</div>
        <h2 style={{...S.title, color:C.blue}}>Your Side</h2>
        <p style={S.sub}>Speak your truth. The other person can't see this yet.</p>
      </div>
      <div style={{...S.card, textAlign:"center", borderColor:recording?C.blue:C.border, background:recording?C.blueLight:C.surface, transition:"all 0.3s"}}>
        <div style={{width:80, height:80, borderRadius:"50%", background:recording?C.blue:C.blueLight, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", margin:"0 auto 10px", cursor:"pointer", border:`2px solid ${recording?C.blue:C.border}`, transition:"all 0.2s"}} onClick={recording?onStop:onStart} className="pop">
          <span style={{fontSize:28}}>{recording?"⏹":"🎙️"}</span>
        </div>
        <p style={{fontSize:11, color:recording?C.blue:C.textLight, fontWeight:600, letterSpacing:1, textTransform:"uppercase"}}>{recording?"Recording... tap to stop":"Tap to speak"}</p>
        {recording && <div style={{width:8, height:8, borderRadius:"50%", background:C.blue, margin:"8px auto 0"}} className="pulse" />}
      </div>
      <div style={S.card}>
        <label style={S.label}>Or type your side ✍️</label>
        <textarea style={S.textarea} placeholder={`What's your side of the story?`} value={person.side} onChange={e=>setPerson(p=>({...p,side:e.target.value.slice(0,5000)}))} rows={5} maxLength={5000} />
        <div style={{display:"flex", justifyContent:"space-between", marginTop:4}}>
          <span style={{fontSize:10, color:C.textLight}}>Min 50 · Max 5,000 chars</span>
          <span style={{fontSize:10, fontWeight:600, color:person.side.length>4500?person.side.length>4800?C.rose:C.gold:C.textLight}}>{person.side.length}/5000</span>
        </div>
      </div>
      <div style={{...S.card, background:C.goldLight, borderColor:`${C.gold}40`}}>
        <p style={{fontSize:11, color:C.textMid, lineHeight:1.6}}>🔒 <strong style={{color:C.text}}>Your submission is sealed.</strong> The other person cannot see what you write until after the verdict. Be honest — the judge sees everything.</p>
      </div>
      <button style={{...S.btnPrimary, opacity:(!person.side||person.side.length<50||nextLoading)?0.5:1}} className="pop" onClick={handleNext} disabled={!person.side||person.side.length<50||nextLoading}>
        {nextLoading?"🤔 Generating questions...":person.side.length<50?`Need ${50-person.side.length} more chars`:"🔒 Seal & Submit →"}
      </button>
    </div>
  );
}


function RecordScreen({ person, setPerson, name, color, colorLight, emoji, recording, onStart, onStop, onNext, nextLoading, onBack, isFinal, otherPerson, topic }) {
  const [refining, setRefining] = useState(false);
  const [refined, setRefined] = useState(null);
  const [suggestingPoints, setSuggestingPoints] = useState(false);
  const [suggestedPoints, setSuggestedPoints] = useState([]);
  const [rebuttals, setRebuttals] = useState([]);
  const [rebuttalInput, setRebuttalInput] = useState("");
  const [rebuttalRec, setRebuttalRec] = useState(false);
  const rebuttalRef = useRef(null);

  const refineArgument = async () => {
    if (!person.side) return; setRefining(true); setRefined(null);
    try {
      const res = await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,messages:[{role:"user",content:`Make this argument cleaner and more persuasive without changing meaning.\n\nArgument: "${person.side}"\n\nRespond ONLY with valid JSON: {"refined":"improved version","what_changed":"one sentence"}`}]})});
      const data = await res.json();
      setRefined(JSON.parse(data.content.map(i=>i.text||"").join("").replace(/```json|```/g,"").trim()));
    } catch(e) { setRefined({error:true}); }
    setRefining(false);
  };

  const suggestPoints = async () => {
    if (!person.side) return; setSuggestingPoints(true);
    try {
      const res = await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:400,messages:[{role:"user",content:`Suggest 3 additional supporting points.\n\nArgument: "${person.side}"\n${otherPerson?.side?`Other side: "${otherPerson.side}"`:""}\n\nRespond ONLY with valid JSON: {"points":["p1","p2","p3"]}`}]})});
      const data = await res.json();
      setSuggestedPoints(JSON.parse(data.content.map(i=>i.text||"").join("").replace(/```json|```/g,"").trim()).points||[]);
    } catch(e) { setSuggestedPoints([]); }
    setSuggestingPoints(false);
  };

  const addPoint = (pt) => { setPerson(p=>({...p,side:p.side?`${p.side} ${pt}`:pt})); setSuggestedPoints(prev=>prev.filter(p=>p!==pt)); };
  const startRebuttalVoice = () => {
    if (!("webkitSpeechRecognition" in window)&&!("SpeechRecognition" in window)) return;
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition; const r=new SR(); r.continuous=true; r.interimResults=true; r.lang="en-US"; rebuttalRef.current=r; setRebuttalRec(true);
    r.onresult=(e)=>{ let t=""; for(let i=0;i<e.results.length;i++) t+=e.results[i][0].transcript; setRebuttalInput(t); };
    r.onerror=()=>setRebuttalRec(false); r.start();
  };
  const stopRebuttalVoice=()=>{ if(rebuttalRef.current) rebuttalRef.current.stop(); setRebuttalRec(false); };
  const addRebuttal=()=>{ if(!rebuttalInput.trim()) return; setRebuttals(prev=>[...prev,rebuttalInput.trim()]); setPerson(p=>({...p,side:p.side?`${p.side} Also: ${rebuttalInput.trim()}`:rebuttalInput.trim()})); setRebuttalInput(""); };

  return (
    <div style={S.screen} className="fade-in">
      <div style={{textAlign:"center", paddingTop:12}}>
        <div style={{width:52, height:52, borderRadius:"50%", background:colorLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px", fontSize:24}}>{emoji}</div>
        <h2 style={{...S.title, color}}>{name}'s Side</h2>
        <p style={S.sub}>Speak your truth — don't hold back 👀</p>
      </div>
      <div style={{...S.card, textAlign:"center", borderColor:recording?color:C.border, background:recording?colorLight:C.surface, transition:"all 0.3s"}}>
        <div style={{width:80, height:80, borderRadius:"50%", background:recording?color:colorLight, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", margin:"0 auto 10px", cursor:"pointer", border:`2px solid ${recording?color:C.border}`, transition:"all 0.2s"}} onClick={recording?onStop:onStart} className="pop">
          <span style={{fontSize:28}}>{recording?"⏹":"🎙️"}</span>
        </div>
        <p style={{fontSize:11, color:recording?color:C.textLight, fontWeight:600, letterSpacing:1, textTransform:"uppercase"}}>{recording?"Recording... tap to stop":"Tap to speak"}</p>
        {recording && <div style={{width:8, height:8, borderRadius:"50%", background:color, margin:"8px auto 0"}} className="pulse" />}
      </div>
      <div style={S.card}>
        <label style={S.label}>Or type it out ✍️</label>
        <textarea style={S.textarea} placeholder={`${name}, what's your side of the story?`} value={person.side} onChange={e=>setPerson(p=>({...p,side:e.target.value.slice(0,5000)}))} rows={4} maxLength={5000} />
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: person.side ? 4 : 0}}>
          <span style={{fontSize:10, color:C.textLight}}>Min 50 · Max 5,000 chars</span>
          <span style={{fontSize:10, fontWeight:600, color:person.side.length>4500?person.side.length>4800?C.rose:C.gold:C.textLight}}>{person.side.length}/5000</span>
        </div>
        {person.side && (
          <div style={{marginTop:10}}>
            <button style={{background:colorLight, color, border:`1.5px solid ${color}40`, borderRadius:10, padding:"8px 14px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", width:"100%"}} className="pop" onClick={refineArgument} disabled={refining}>{refining?"✨ Making it shine...":"✨ Polish my argument"}</button>
            {refined&&!refined.error&&(
              <div style={{background:C.tealLight, border:`1.5px solid ${C.teal}40`, borderRadius:14, padding:14, marginTop:10}}>
                <label style={{...S.label, color:C.teal, fontSize:9}}>✨ Polished version</label>
                <p style={{fontSize:13, color:C.text, lineHeight:1.65, fontStyle:"italic", margin:"0 0 6px"}}>"{refined.refined}"</p>
                {refined.what_changed&&<p style={{fontSize:10, color:C.textLight, margin:"0 0 10px"}}>💡 {refined.what_changed}</p>}
                <div style={S.btnRow}>
                  <button style={{flex:1, background:C.teal, color:"#fff", border:"none", borderRadius:10, padding:"9px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit"}} className="pop" onClick={()=>{setPerson(p=>({...p,side:refined.refined}));setRefined(null);}}>✓ Use this</button>
                  <button style={{flex:1, background:"transparent", border:`1.5px solid ${C.border}`, borderRadius:10, padding:"9px", fontSize:11, cursor:"pointer", color:C.textMid, fontFamily:"inherit"}} onClick={()=>setRefined(null)}>✗ Keep mine</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div style={S.btnRow}>
        <button style={S.btnGhost} className="pop" onClick={onBack}>← Back</button>
        <button style={{...S.btnPrimary, flex:1, opacity:(person.side.length<50||nextLoading)?0.7:1}} className="pop" onClick={onNext} disabled={person.side.length<50||nextLoading}>
          {nextLoading?"🤔 Thinking of questions...":person.side.length<50&&person.side.length>0?`Need ${50-person.side.length} more chars`:"Next →"}
        </button>
      </div>
    </div>
  );
}

// ── CLARIFY ────────────────────────────────────────────────────
function ClarifyScreen({ name, color, colorLight, emoji, questions, answers, setAnswers, onNext, onBack, isFinal }) {
  const updateAnswer = (i, val) => { const u=[...answers]; u[i]=val; setAnswers(u); };
  const [voiceIdx, setVoiceIdx] = useState(null);
  const voiceRef = useRef(null);
  const startVoice = (i) => {
    if (!("webkitSpeechRecognition" in window)&&!("SpeechRecognition" in window)) return;
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition; const r=new SR(); r.continuous=true; r.interimResults=true; r.lang="en-US"; voiceRef.current=r; setVoiceIdx(i);
    r.onresult=(e)=>{ let t=""; for(let j=0;j<e.results.length;j++) t+=e.results[j][0].transcript; updateAnswer(i, t); };
    r.onerror=()=>setVoiceIdx(null); r.start();
  };
  const stopVoice=()=>{ if(voiceRef.current) voiceRef.current.stop(); setVoiceIdx(null); };
  return (
    <div style={S.screen} className="fade-in">
      <div style={{textAlign:"center", paddingTop:12}}>
        <div style={{width:52, height:52, borderRadius:"50%", background:colorLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px", fontSize:24}}>{emoji}</div>
        <h2 style={{...S.title, color}}>A few questions, {name} 🤔</h2>
        <p style={S.sub}>Help the judge understand your full picture</p>
      </div>
      <div style={{...S.card, background:`linear-gradient(135deg, ${colorLight}, #fff)`, borderColor:`${color}30`}}>
        <p style={{fontSize:11, color:C.textLight, letterSpacing:1.5, textTransform:"uppercase", marginBottom:10, fontWeight:700}}>⚖️ Before ruling, the judge wants to know…</p>
        {questions.map((q, i) => (
          <div key={i} style={{marginBottom: i<questions.length-1?20:0}}>
            <label style={{...S.label, color, fontSize:10, marginBottom:6}}>{i+1} of {questions.length}</label>
            <p style={{fontSize:14, fontWeight:700, color:C.text, marginBottom:10, lineHeight:1.4}}>"{q}"</p>
            <div style={{display:"flex", gap:8, alignItems:"flex-start"}}>
              <textarea style={{...S.textarea, flex:1, marginBottom:0}} placeholder="Your answer (optional)..." value={answers[i]||""} onChange={e=>updateAnswer(i, e.target.value)} rows={3} />
              <button style={{width:40, height:40, borderRadius:10, border:`1.5px solid ${voiceIdx===i?color:C.border}`, background:voiceIdx===i?color:C.surfaceWarm, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:voiceIdx===i?"#fff":C.textMid, flexShrink:0}} onClick={voiceIdx===i?stopVoice:()=>startVoice(i)}>{voiceIdx===i?"⏹":"🎙"}</button>
            </div>
          </div>
        ))}
      </div>
      <p style={{fontSize:11, color:C.textLight, textAlign:"center"}}>Answering helps the judge rule more accurately</p>
      <div style={S.btnRow}>
        <button style={S.btnGhost} className="pop" onClick={onBack}>← Back</button>
        <button style={{...S.btnGhost, flex:1}} className="pop" onClick={onNext}>Skip →</button>
        <button style={{...S.btnPrimary, flex:1}} className="pop" onClick={onNext}>{isFinal?"⚖️ Get the Verdict":"Next →"}</button>
      </div>
    </div>
  );
}

// ── PERSONALITY ────────────────────────────────────────────────
function PersonalityScreen({ personA, setPersonA, personB, setPersonB, depth, onNext, onBack }) {
  const Sel = ({label,value,onChange,options})=>(<div style={{marginBottom:10}}><label style={{...S.label,fontSize:9}}>{label}</label><select style={S.input} value={value} onChange={e=>onChange(e.target.value)}><option value="">Select...</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select></div>);
  return (
    <div style={S.screen} className="fade-in">
      <div style={{textAlign:"center", paddingTop:12}}><h2 style={S.title}>Personality Profiles 🔮</h2><p style={S.sub}>Help the judge understand who you really are</p></div>
      <div style={S.twoCol}>
        <div style={{...S.card, borderTop:`3px solid ${C.border}`}}>
          <label style={{...S.label, color:C.text}}>{personA.name||"Person A"}</label>
          {(depth==="zodiac"||depth==="full")&&<Sel label="Zodiac ✨" value={personA.zodiac} onChange={v=>setPersonA(p=>({...p,zodiac:v}))} options={ZODIAC} />}
          {(depth==="mbti"||depth==="full")&&<Sel label="MBTI 🧠" value={personA.mbti} onChange={v=>setPersonA(p=>({...p,mbti:v}))} options={MBTI} />}
          {depth==="full"&&<><Sel label="Love Language 💛" value={personA.loveLanguage} onChange={v=>setPersonA(p=>({...p,loveLanguage:v}))} options={LOVE_LANGS} /><Sel label="Attachment 🔗" value={personA.attachment} onChange={v=>setPersonA(p=>({...p,attachment:v}))} options={ATTACHMENT} /></>}
        </div>
        <div style={{...S.card, borderTop:`3px solid ${C.border}`}}>
          <label style={{...S.label, color:C.text}}>{personB.name||"Person B"}</label>
          {(depth==="zodiac"||depth==="full")&&<Sel label="Zodiac ✨" value={personB.zodiac} onChange={v=>setPersonB(p=>({...p,zodiac:v}))} options={ZODIAC} />}
          {(depth==="mbti"||depth==="full")&&<Sel label="MBTI 🧠" value={personB.mbti} onChange={v=>setPersonB(p=>({...p,mbti:v}))} options={MBTI} />}
          {depth==="full"&&<><Sel label="Love Language 💛" value={personB.loveLanguage} onChange={v=>setPersonB(p=>({...p,loveLanguage:v}))} options={LOVE_LANGS} /><Sel label="Attachment 🔗" value={personB.attachment} onChange={v=>setPersonB(p=>({...p,attachment:v}))} options={ATTACHMENT} /></>}
        </div>
      </div>
      <div style={S.btnRow}><button style={S.btnGhost} className="pop" onClick={onBack}>← Back</button><button style={{...S.btnPrimary, flex:1}} className="pop" onClick={onNext}>⚖️ Get the Verdict</button></div>
    </div>
  );
}

// ── VERDICT ────────────────────────────────────────────────────
function VerdictScreen({ verdict, loading, personA, personB, judgeMode, showConfetti, showShare, setShowShare, onReset, onSubmitCourt, setScreen, isRemote, caseName, setCaseName, onNameCase, topic }) {
  const [submitModal, setSubmitModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const SUGGESTIONS = ["Thermostatgate","Dishgate","The Incident","FinancialGate","The Apology Affair","Snackgate","Bedtimegate","The Great Debate"];

  const handleSaveName = (n) => {
    const finalName = (n || nameInput).trim();
    if (!finalName) return;
    setCaseName(finalName);
    onNameCase(finalName);
    setNameSaved(true);
  };
  if (loading) return (<div style={{...S.screen, justifyContent:"center", alignItems:"center", minHeight:"100vh"}} className="fade-in"><div style={{textAlign:"center"}}><div style={{fontSize:64, marginBottom:12}} className="spin-fun">⚖️</div><h2 style={S.title}>The judge is deliberating…</h2><p style={S.sub}>Reviewing all the evidence 👀</p></div></div>);
  if (!verdict) return null;
  if (verdict.error) return <div style={{...S.screen, justifyContent:"center"}} className="fade-in"><div style={S.card}><p style={S.sub}>{verdict.ruling}</p><button style={S.btnPrimary} onClick={onReset}>Try again</button></div></div>;

  const isTie = verdict.winner==="Tie"||verdict.winner?.toLowerCase().includes("tie");
  const winnerIsA = verdict.winner===(personA.name||"Person A");
  const wColor = isTie?C.gold:winnerIsA?C.rose:C.blue;
  const wBg = isTie?C.goldLight:winnerIsA?C.roseLight:C.blueLight;

  return (
    <div style={S.screen} className="fade-in">
      {showConfetti && <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:100,zIndex:1000,pointerEvents:"none"}} className="verdict-pop">🎉</div>}
      <div style={{...S.card, background:wBg, borderColor:`${wColor}50`, textAlign:"center", padding:24}} className="verdict-pop">
        <div style={{display:"inline-block", background:wColor, color:"#fff", borderRadius:20, padding:"5px 16px", fontSize:12, fontWeight:700, marginBottom:10}}>{isTie?"⚡ It's a tie!":`🏆 ${verdict.winner} wins`}</div>
        <h2 style={{fontSize:18, fontWeight:800, color:wColor, marginBottom:10, lineHeight:1.3}}>"{verdict.verdict_headline}"</h2>
        <p style={{fontSize:13, color:C.textMid, lineHeight:1.7}}>{verdict.ruling}</p>
      </div>

      {(verdict.key_deciding_factor || verdict.strongest_line) && (
        <div style={{...S.card, background:`linear-gradient(135deg,#FFFBF0,#FFF8E8)`, borderColor:`${C.gold}40`}}>
          {verdict.key_deciding_factor && <div style={{marginBottom:verdict.strongest_line?12:0}}><label style={{...S.label, color:C.gold, fontSize:9}}>⚡ Key Deciding Factor</label><p style={{fontSize:13, color:C.text, fontWeight:600, lineHeight:1.5, margin:0}}>{verdict.key_deciding_factor}</p></div>}
          {verdict.strongest_line && <div style={{borderTop:verdict.key_deciding_factor?`1px solid ${C.gold}30`:"none", paddingTop:verdict.key_deciding_factor?12:0}}><label style={{...S.label, color:C.gold, fontSize:9}}>💬 Strongest Argument</label><p style={{fontSize:13, color:C.textMid, fontStyle:"italic", lineHeight:1.5, margin:0}}>"{verdict.strongest_line}"</p></div>}
        </div>
      )}

      <div style={S.twoCol}>
        {[[personA.name||"Person A",C.rose,verdict.person_a_score,verdict.person_a_rationality,verdict.a_valid_points],[personB.name||"Person B",C.blue,verdict.person_b_score,verdict.person_b_rationality,verdict.b_valid_points]].map(([name,color,score,logic,points])=>(
          <div key={name} style={{...S.card, borderTop:`3px solid ${color}`}}>
            <label style={{...S.label, color}}>{name}</label>
            <ScoreBar label="Overall" value={score} color={color} />
            <ScoreBar label="Logic" value={logic} color={color} />
            <div style={{marginTop:6}}>{(points||[]).map((pt,i)=><div key={i} style={{fontSize:10, color:C.textMid, marginBottom:3}}>✓ {pt}</div>)}</div>
          </div>
        ))}
      </div>

      {verdict.roast&&judgeMode==="funny"&&<div style={{...S.card, background:C.goldLight, borderColor:`${C.gold}40`}}><label style={{...S.label, color:C.gold}}>🔥 The Roast</label><p style={{fontSize:13, color:C.textMid, fontStyle:"italic"}}>"{verdict.roast}"</p></div>}
      {verdict.communication_tip&&<div style={{...S.card, background:C.tealLight, borderColor:`${C.teal}40`}}><label style={{...S.label, color:C.teal}}>💬 Communication tip</label><p style={{fontSize:12, color:C.textMid, lineHeight:1.65}}>{verdict.communication_tip}</p></div>}
      {verdict.personality_insight&&<div style={{...S.card, background:C.lavLight, borderColor:`${C.lavender}40`}}><label style={{...S.label, color:C.lavender}}>🔮 Personality insight</label><p style={{fontSize:12, color:C.textMid, lineHeight:1.65}}>{verdict.personality_insight}</p></div>}

      {/* ── PERSONALITY UPSELL (post-verdict) ── */}
      {!verdict.personality_insight && (
        <div style={{...S.card, background:`linear-gradient(135deg, ${C.lavLight}, #fff)`, borderColor:`${C.lavender}40`, textAlign:"center", padding:20}}>
          <div style={{fontSize:32, marginBottom:8}}>🔮</div>
          <h3 style={{fontSize:15, fontWeight:800, color:C.lavender, marginBottom:6}}>Want a deeper analysis?</h3>
          <p style={{fontSize:12, color:C.textMid, lineHeight:1.6, marginBottom:14}}>Unlock personality-powered insights — see how your zodiac signs, MBTI types, love languages, and attachment styles shaped this argument.</p>
          <div style={{display:"inline-block", background:C.lavender, color:"#fff", borderRadius:8, padding:"2px 10px", fontSize:10, fontWeight:700, marginBottom:12}}>PRO</div>
          <p style={{fontSize:11, color:C.textLight}}>$4.99/month — unlimited verdicts + personality analysis + custom judges</p>
        </div>
      )}

      {/* ── RESOLUTION PLAYBOOK (Pro only) ── */}
      <ResolutionPlaybook verdict={verdict} personA={personA} personB={personB} topic={topic} />

      {/* ── NAME THIS CASE ── */}
      {!nameSaved ? (
        <div style={{...S.card, background:`linear-gradient(135deg, ${C.goldLight}, #fff)`, borderColor:`${C.gold}40`}}>
          <label style={{...S.label, color:C.gold}}>🏷️ Name this case</label>
          <p style={{fontSize:12, color:C.textMid, marginBottom:10, lineHeight:1.5}}>Give it a name for your history — something you'll both remember. Like <em>Thermostatgate</em>.</p>
          <input
            style={{...S.input, marginBottom:10, fontSize:14, fontWeight:600}}
            placeholder="e.g. Thermostatgate, The Lasagna Incident…"
            value={nameInput}
            onChange={e=>setNameInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handleSaveName()}
          />
          <div style={{display:"flex", flexWrap:"wrap", gap:5, marginBottom:10}}>
            {SUGGESTIONS.map(s=>(
              <span key={s} style={{...S.chip, fontSize:10, padding:"4px 10px", cursor:"pointer"}} className="pop" onClick={()=>{setNameInput(s);handleSaveName(s);}}>
                {s}
              </span>
            ))}
          </div>
          <div style={S.btnRow}>
            <button style={{...S.btnGhost, flex:1, fontSize:12}} className="pop" onClick={()=>setNameSaved(true)}>Skip</button>
            <button style={{...S.btnPrimary, flex:2, fontSize:12, background:`linear-gradient(135deg, ${C.gold}, #E09A20)`}} className="pop" onClick={()=>handleSaveName()} disabled={!nameInput.trim()}>
              🏷️ Save Name
            </button>
          </div>
        </div>
      ) : (
        <div style={{...S.card, background:C.goldLight, borderColor:`${C.gold}40`, textAlign:"center", padding:14}}>
          <span style={{fontSize:22}}>🏷️</span>
          <p style={{fontSize:14, fontWeight:800, color:C.text, marginTop:4}}>{caseName || "Case saved"}</p>
          <p style={{fontSize:11, color:C.textLight, marginTop:2}}>Saved to your case history</p>
        </div>
      )}

      <div style={S.btnRow}>
        <button style={{...S.btnGhost, fontSize:12, padding:"11px 12px"}} className="pop" onClick={()=>setShowShare(true)}>📤 Share</button>
        <button style={{...S.btnSoft, flex:1, fontSize:12}} className="pop" onClick={()=>setSubmitModal(true)}>👥 Post to Community</button>
        <button style={{...S.btnPrimary, flex:1, fontSize:12}} className="pop" onClick={onReset}>New ✨</button>
      </div>

      {submitModal && <SubmitToCourtModal verdict={verdict} personA={personA} personB={personB} onSubmit={(cat,dA,dB)=>{onSubmitCourt(verdict,cat,dA,dB);setSubmitModal(false);setScreen("court");}} onClose={()=>setSubmitModal(false)} />}
      {showShare===true&&(
        <div style={{position:"fixed",inset:0,background:"rgba(26,20,18,0.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20}}>
          <div style={{...S.card, width:"100%", maxWidth:360, textAlign:"center"}}>
            <h3 style={{...S.title, fontSize:18, marginBottom:12}}>Share this verdict 📤</h3>
            <div style={{background:`linear-gradient(135deg,${wBg},#fff)`, border:`1.5px solid ${wColor}40`, borderRadius:16, padding:20, margin:"0 0 16px"}}>
              <div style={{fontSize:28, marginBottom:6}}>⚖️</div>
              <div style={{color:wColor, fontWeight:800, fontSize:16, marginBottom:4}}>{isTie?"It's a tie!":`${verdict.winner} wins`}</div>
              <div style={{color:C.textMid, fontSize:12}}>"{verdict.verdict_headline}"</div>
              {verdict.key_deciding_factor&&<div style={{color:C.textLight, fontSize:10, marginTop:6}}>⚡ {verdict.key_deciding_factor}</div>}
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12}}>
              {["📋 Copy","📱 Instagram","🐦 Twitter","💬 iMessage"].map(s=><button key={s} style={{...S.btnGhost, padding:"10px", fontSize:11}} onClick={()=>setShowShare(false)}>{s}</button>)}
            </div>
            <button style={S.btnGhost} onClick={()=>setShowShare(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, value, color }) {
  return (<div style={{marginBottom:8}}><div style={{display:"flex", justifyContent:"space-between", marginBottom:3}}><span style={{fontSize:9, letterSpacing:1.5, color:C.textLight, textTransform:"uppercase", fontWeight:600}}>{label}</span><span style={{fontSize:9, color, fontWeight:700}}>{value}%</span></div><div style={S.barTrack}><div style={{...S.barFill, width:`${value}%`, background:color}} className="bar-fill" /></div></div>);
}

// ── RESOLUTION PLAYBOOK (Pro only) ─────────────────────────────
function ResolutionPlaybook({ verdict, personA, personB, topic }) {
  const [playbook, setPlaybook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const generatePlaybook = async () => {
    setLoading(true);
    try {
      const prompt = `Based on this argument verdict, create a Resolution Playbook — actionable mediation steps both parties can follow to actually resolve this conflict.

TOPIC: "${topic||"General"}"
PERSON A (${personA.name||"Person A"}): "${personA.side}"
PERSON B (${personB.name||"Person B"}): "${personB.side}"
WINNER: ${verdict.winner}
RULING: ${verdict.ruling}
KEY FACTOR: ${verdict.key_deciding_factor||""}

Respond ONLY with valid JSON (no markdown):
{"title":"short playbook title","steps":[{"step":"Step title","action":"1-2 sentence action item for both parties","who":"both/winner/loser"},{"step":"Step 2","action":"...","who":"both"},{"step":"Step 3","action":"...","who":"both"}],"conversation_starter":"A specific opening line one person can say to start resolving this","ground_rules":["rule 1","rule 2","rule 3"]}`;
      const res = await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tier:"free",max_tokens:800,messages:[{role:"user",content:prompt}]})});
      const data = await res.json();
      const parsed = JSON.parse(data.content.map(i=>i.text||"").join("").replace(/```json|```/g,"").trim());
      setPlaybook(parsed);
      setExpanded(true);
    } catch(e) { console.error("Playbook error:",e); }
    setLoading(false);
  };

  if (!playbook && !loading) {
    return (
      <div style={{...S.card, background:`linear-gradient(135deg, ${C.tealLight}, #fff)`, borderColor:`${C.teal}40`, textAlign:"center", padding:20}}>
        <div style={{fontSize:32, marginBottom:8}}>📋</div>
        <h3 style={{fontSize:15, fontWeight:800, color:C.teal, marginBottom:6}}>Resolution Playbook</h3>
        <p style={{fontSize:12, color:C.textMid, lineHeight:1.6, marginBottom:14}}>Get actionable mediation steps to actually resolve this conflict — conversation starters, ground rules, and a step-by-step plan.</p>
        <div style={{display:"inline-block", background:C.teal, color:"#fff", borderRadius:8, padding:"2px 10px", fontSize:10, fontWeight:700, marginBottom:12}}>PRO</div>
        <button style={{...S.btnPrimary, background:`linear-gradient(135deg, ${C.teal}, #1E8A66)`, width:"100%", marginTop:8}} className="pop" onClick={async()=>{try{const r=await fetch('/api/stripe?action=checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitor_id:localStorage.getItem('ybtj_visitor_id')})});const d=await r.json();if(d.url){window.location.href=d.url;}else{alert('Unable to start checkout. Please try again.');}}catch(e){alert('Something went wrong. Please try again.');}}}>
          Unlock Resolution Playbook — $4.99/mo
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{...S.card, background:C.tealLight, borderColor:`${C.teal}40`, textAlign:"center", padding:20}}>
        <div style={{fontSize:32, marginBottom:8}} className="spin-fun">📋</div>
        <p style={{fontSize:13, fontWeight:600, color:C.teal}}>Building your Resolution Playbook...</p>
      </div>
    );
  }

  return (
    <div style={{...S.card, background:`linear-gradient(135deg, ${C.tealLight}, #fff)`, borderColor:`${C.teal}40`}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer"}} onClick={()=>setExpanded(!expanded)}>
        <div>
          <label style={{...S.label, color:C.teal}}>📋 Resolution Playbook</label>
          <p style={{fontSize:12, fontWeight:700, color:C.text, margin:0}}>{playbook.title}</p>
        </div>
        <span style={{fontSize:16, color:C.teal}}>{expanded?"▲":"▼"}</span>
      </div>
      {expanded && (
        <div style={{marginTop:14}}>
          {playbook.steps?.map((s,i)=>(
            <div key={i} style={{background:C.surface, border:`1px solid ${C.teal}30`, borderRadius:12, padding:12, marginBottom:8}}>
              <div style={{display:"flex", gap:8, alignItems:"center", marginBottom:4}}>
                <span style={{background:C.teal, color:"#fff", borderRadius:"50%", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0}}>{i+1}</span>
                <span style={{fontSize:13, fontWeight:700, color:C.text}}>{s.step}</span>
              </div>
              <p style={{fontSize:12, color:C.textMid, lineHeight:1.6, margin:"0 0 0 30px"}}>{s.action}</p>
            </div>
          ))}
          {playbook.conversation_starter && (
            <div style={{background:C.goldLight, border:`1px solid ${C.gold}40`, borderRadius:12, padding:12, marginTop:4}}>
              <label style={{...S.label, color:C.gold, fontSize:9}}>💬 Conversation Starter</label>
              <p style={{fontSize:12, color:C.text, fontStyle:"italic", margin:0, lineHeight:1.5}}>"{playbook.conversation_starter}"</p>
            </div>
          )}
          {playbook.ground_rules?.length > 0 && (
            <div style={{marginTop:8}}>
              <label style={{...S.label, color:C.teal, fontSize:9}}>Ground Rules</label>
              {playbook.ground_rules.map((r,i)=><p key={i} style={{fontSize:11, color:C.textMid, margin:"0 0 4px", lineHeight:1.5}}>• {r}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SUBMIT TO COURT ────────────────────────────────────────────
function SubmitToCourtModal({ verdict, personA, personB, onSubmit, onClose }) {
  const [cat, setCat] = useState("Relationship");
  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");

  const autoGenA = () => setNameA(genUsername());
  const autoGenB = () => setNameB(genUsername());

  const useReal = () => {
    setNameA(personA.name||"");
    setNameB(personB.name||"");
  };

  const displayA = nameA.trim() || "Person A";
  const displayB = nameB.trim() || "Person B";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(26,20,18,0.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20,overflowY:"auto"}}>
      <div style={{...S.card, width:"100%", maxWidth:380}}>
        <h3 style={{...S.title, fontSize:16, marginBottom:4}}>👥 Post to Community</h3>
        <p style={{...S.sub, fontSize:12, marginBottom:16}}>Others vote and comment. You see every reaction. Your identity stays private.</p>

        {/* Name pickers */}
        <label style={{...S.label, marginBottom:10}}>Display names</label>

        {/* Quick options */}
        <div style={{display:"flex", gap:6, marginBottom:12, flexWrap:"wrap"}}>
          <button style={{...S.btnGhost, padding:"7px 12px", fontSize:11, flex:1}} className="pop" onClick={()=>{setNameA("Person A");setNameB("Person B");}}>
            👤 Keep anonymous
          </button>
          <button style={{...S.btnGhost, padding:"7px 12px", fontSize:11, flex:1}} className="pop" onClick={useReal}>
            ✏️ Use real names
          </button>
        </div>

        <div style={S.twoCol}>
          <div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4}}>
              <span style={{fontSize:10, color:C.textMid, fontWeight:700, letterSpacing:1}}>PERSON A</span>
              <button style={{fontSize:10, color:C.lavender, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600}} onClick={autoGenA}>✨ Auto</button>
            </div>
            <input style={{...S.input, marginBottom:0, fontSize:13}} placeholder="Person A" value={nameA} onChange={e=>setNameA(e.target.value.slice(0,20))} maxLength={20} />
          </div>
          <div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4}}>
              <span style={{fontSize:10, color:C.textMid, fontWeight:700, letterSpacing:1}}>PERSON B</span>
              <button style={{fontSize:10, color:C.lavender, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600}} onClick={autoGenB}>✨ Auto</button>
            </div>
            <input style={{...S.input, marginBottom:0, fontSize:13}} placeholder="Person B" value={nameB} onChange={e=>setNameB(e.target.value.slice(0,20))} maxLength={20} />
          </div>
        </div>

        <p style={{fontSize:10, color:C.textLight, margin:"8px 0 16px", lineHeight:1.5}}>
          No need to use real names. You can autogenerate a fun nickname or leave blank to stay as Person A & B.
        </p>

        {/* Category */}
        <label style={S.label}>Category</label>
        <div style={{display:"flex", flexWrap:"wrap", gap:6, marginBottom:14, justifyContent:"flex-start"}}>
          {CATEGORIES.filter(c=>c!=="All").map(c=>(
            <span key={c} style={{...S.chip, background:cat===c?C.rose:C.surfaceWarm, color:cat===c?"#fff":C.textMid, borderColor:cat===c?C.rose:C.border}} onClick={()=>setCat(c)}>{c}</span>
          ))}
        </div>

        {/* Preview */}
        <div style={{background:C.surfaceWarm, borderRadius:12, padding:12, marginBottom:16}}>
          <p style={{fontSize:10, color:C.textLight, letterSpacing:1.5, textTransform:"uppercase", marginBottom:6}}>Preview</p>
          <div style={S.twoCol}>
            <div style={{background:C.roseLight, borderRadius:8, padding:"7px 10px", borderLeft:`2px solid ${C.rose}`}}>
              <div style={{fontSize:9, color:C.rose, fontWeight:700, letterSpacing:1, marginBottom:2}}>{displayA.toUpperCase()}</div>
              <div style={{fontSize:10, color:C.textMid, lineHeight:1.4}}>"{personA.side?.slice(0,50)}…"</div>
            </div>
            <div style={{background:C.blueLight, borderRadius:8, padding:"7px 10px", borderLeft:`2px solid ${C.blue}`}}>
              <div style={{fontSize:9, color:C.blue, fontWeight:700, letterSpacing:1, marginBottom:2}}>{displayB.toUpperCase()}</div>
              <div style={{fontSize:10, color:C.textMid, lineHeight:1.4}}>"{personB.side?.slice(0,50)}…"</div>
            </div>
          </div>
          <p style={{fontSize:10, color:C.textLight, marginTop:8}}>{cat} · {displayA} vs {displayB}</p>
        </div>

        <div style={S.btnRow}>
          <button style={S.btnGhost} className="pop" onClick={onClose}>Cancel</button>
          <button style={{...S.btnPrimary, flex:1}} className="pop" onClick={()=>onSubmit(cat, nameA.trim()||"Person A", nameB.trim()||"Person B")}>
            Post to Community 👥
          </button>
        </div>
      </div>
    </div>
  );
}

// ── THE COURT ──────────────────────────────────────────────────
function CourtScreen({ cases, loading, onVote, onSelect, onBack, authUser, onSignIn, onSignOut, showPaywall, onDismissPaywall, freeViewsLeft }) {
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("hot");
  const filtered = cases.filter(c=>cat==="All"||c.category===cat).sort((a,b)=>sort==="hot"?b.totalVotes-a.totalVotes:b.id-a.id);
  return (
    <div style={S.screen} className="fade-in">
      {/* Metered paywall overlay */}
      {showPaywall && (
        <div style={{position:"fixed",inset:0,background:"rgba(26,20,18,0.6)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20}}>
          <div style={{...S.card, width:"100%", maxWidth:360, textAlign:"center", padding:28}} className="verdict-pop">
            <div style={{fontSize:40, marginBottom:12}}>🔒</div>
            <h3 style={{...S.title, fontSize:18, marginBottom:8}}>You've read your 5 free verdicts</h3>
            <p style={{...S.sub, fontSize:12, marginBottom:20, lineHeight:1.6}}>Unlock unlimited Community access, personality analysis, custom judge personas, and more with Pro.</p>
            <button style={{...S.btnPrimary, marginBottom:10}} className="pop" onClick={async()=>{try{const r=await fetch('/api/stripe?action=checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitor_id:localStorage.getItem('ybtj_visitor_id')})});const d=await r.json();if(d.url){window.location.href=d.url;}else{alert('Unable to start checkout. Please try again.');console.error('Stripe response:',d);}}catch(e){alert('Something went wrong. Please try again.');console.error('Stripe error:',e);}}}>Upgrade to Pro — $4.99/mo</button>
            <button style={S.btnGhost} onClick={onDismissPaywall}>Maybe later</button>
          </div>
        </div>
      )}
      <div style={{textAlign:"center", paddingTop:12}}><h2 style={S.title}>👥 Community</h2><p style={S.sub}>Real arguments. Anonymous. Vote, then discuss.</p></div>
      {freeViewsLeft > 0 && freeViewsLeft <= 3 && <p style={{textAlign:"center", fontSize:11, color:C.gold, fontWeight:600, margin:"-4px 0 0"}}>{freeViewsLeft} free verdict{freeViewsLeft===1?"":"s"} remaining</p>}
      {authUser ? (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"8px 0",fontSize:13,color:C.textMid}}>
          {authUser.avatar && <img src={authUser.avatar} style={{width:22,height:22,borderRadius:"50%"}} alt="" />}
          <span>Signed in as <strong style={{color:C.text}}>{authUser.name}</strong></span>
          <button onClick={onSignOut} style={{background:"none",border:"none",color:C.rose,cursor:"pointer",fontSize:13,textDecoration:"underline",padding:0}}>Sign out</button>
        </div>
      ) : (
        <button onClick={onSignIn} className="pop" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,margin:"0 auto 8px",padding:"8px 20px",background:C.surface,border:`1px solid ${C.borderMid}`,borderRadius:8,cursor:"pointer",fontSize:13,color:C.text}}>
          <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 010-9.18l-7.98-6.19a24.003 24.003 0 000 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Sign in with Google to comment
        </button>
      )}
      <div style={S.twoCol}>
        {[["hot","🔥 Hot"],["new","✨ New"]].map(([v,l])=><button key={v} style={{...S.btnGhost, background:sort===v?C.rose:C.surface, color:sort===v?"#fff":C.textMid, borderColor:sort===v?C.rose:C.borderMid}} className="pop" onClick={()=>setSort(v)}>{l}</button>)}
      </div>
      <div style={S.chipsRow}>{CATEGORIES.map(c=><span key={c} style={{...S.chip, background:cat===c?C.rose:C.surfaceWarm, color:cat===c?"#fff":C.textMid, borderColor:cat===c?C.rose:C.border}} onClick={()=>setCat(c)}>{c}</span>)}</div>
      {loading && <p style={{textAlign:"center", color:C.textLight, fontSize:13, padding:20}}>Loading cases...</p>}
      {!loading && filtered.length===0 && <p style={{textAlign:"center", color:C.textLight, fontSize:13, padding:20}}>No cases yet. Be the first to share a verdict with the Community!</p>}
      {filtered.map(c=><CourtCard key={c.id} c={c} onSelect={onSelect} />)}
      <button style={S.btnGhost} className="pop" onClick={onBack}>← Back home</button>
    </div>
  );
}

function CourtCard({ c, onSelect }) {
  // Smart truncation — end at last complete word under 120 chars
  const truncate = (text, max=120) => {
    if (!text || text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut) + "…";
  };

  const hasVoted = !!c.myVote;
  const voteTotal = (c.votes.a||0) + (c.votes.b||0);
  const pctA = voteTotal > 0 ? Math.round((c.votes.a/voteTotal)*100) : 50;
  const pctB = voteTotal > 0 ? Math.round((c.votes.b/voteTotal)*100) : 50;
  const aiColor = c.aiWinner==="A"?C.rose:c.aiWinner==="B"?C.blue:C.gold;
  const commentCount = (c.comments||[]).length;

  return (
    <div style={{...S.card, display:"flex", flexDirection:"column", gap:10, cursor:"pointer"}} className="pop" onClick={()=>onSelect(c)}>
      {/* Header */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div style={{display:"flex", gap:6}}>
          <span style={{...S.chip, fontSize:10, padding:"3px 9px"}}>{c.category}</span>
          {c.isOwn&&<span style={{background:C.teal, color:"#fff", borderRadius:20, fontSize:9, padding:"3px 8px", fontWeight:700}}>yours ⚖️</span>}
        </div>
        <span style={{fontSize:10, color:C.textLight}}>{c.timeAgo}</span>
      </div>

      {/* Topic */}
      <p style={{fontSize:14, fontWeight:700, color:C.text, margin:0, lineHeight:1.3}}>{c.topic}</p>
      {/* Byline */}
      <p style={{fontSize:11, color:C.textLight, margin:0}}>{c.displayA||"Person A"} vs {c.displayB||"Person B"}</p>

      {/* Previews */}
      <div style={S.twoCol}>
        <div style={{background:C.roseLight, borderRadius:12, padding:"9px 11px", borderLeft:`2px solid ${C.rose}`}}>
          <div style={{fontSize:9, color:C.rose, fontWeight:700, letterSpacing:1.5, marginBottom:3}}>{(c.displayA||"PERSON A").toUpperCase()}</div>
          <div style={{fontSize:10, color:C.textMid, lineHeight:1.5}}>"{truncate(c.sideA)}"</div>
        </div>
        <div style={{background:C.blueLight, borderRadius:12, padding:"9px 11px", borderLeft:`2px solid ${C.blue}`}}>
          <div style={{fontSize:9, color:C.blue, fontWeight:700, letterSpacing:1.5, marginBottom:3}}>{(c.displayB||"PERSON B").toUpperCase()}</div>
          <div style={{fontSize:10, color:C.textMid, lineHeight:1.5}}>"{truncate(c.sideB)}"</div>
        </div>
      </div>

      {/* After-vote summary — visible on card */}
      {hasVoted && (
        <div>
          <CourtBars pctA={pctA} pctB={pctB} myVote={c.myVote} displayA={c.displayA} displayB={c.displayB} />
          <div style={{background:C.surfaceWarm, borderRadius:10, padding:"8px 10px", marginTop:8, borderLeft:`2px solid ${aiColor}`}}>
            <div style={{fontSize:9, color:aiColor, fontWeight:700, letterSpacing:1.5, marginBottom:2}}>⚖️ AI RULED: {c.aiWinner==="Tie"?"TIE":(c.aiWinner==="A"?(c.displayA||"Person A"):(c.displayB||"Person B")).toUpperCase()}</div>
            <div style={{fontSize:10, color:C.textMid, fontStyle:"italic"}}>"{c.aiHeadline}"</div>
          </div>
          {c.isOwn&&<div style={{background:C.tealLight, borderRadius:10, padding:"8px 10px", marginTop:6, border:`1px solid ${C.teal}40`}}><div style={{fontSize:9, color:C.teal, fontWeight:700, letterSpacing:1.5, marginBottom:2}}>YOUR CASE · {c.totalVotes} votes</div><div style={{fontSize:10, color:C.textMid}}>{pctA>pctB?`${pctA}% sided with ${c.displayA||"Person A"}`:pctB>pctA?`${pctB}% sided with ${c.displayB||"Person B"}`:"The crowd is perfectly split!"}</div></div>}
        </div>
      )}

      {/* Single CTA — always opens full case */}
      <div style={{background:hasVoted?C.surfaceWarm:`linear-gradient(135deg, ${C.roseLight}, ${C.blueLight})`, borderRadius:12, padding:"11px 14px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <span style={{fontSize:12, fontWeight:600, color:hasVoted?C.textMid:C.text}}>
          {hasVoted ? `💬 Discuss (${commentCount} comments)` : "📖 Read both sides & judge →"}
        </span>
        <span style={{fontSize:11, color:C.textLight}}>{c.totalVotes.toLocaleString()} votes</span>
      </div>
    </div>
  );
}

function CourtBars({ pctA, pctB, myVote, displayA, displayB }) {
  const labelA = displayA||"Person A";
  const labelB = displayB||"Person B";
  return (
    <div style={{display:"flex", flexDirection:"column", gap:6}}>
      {[["a",labelA,C.rose,pctA],["b",labelB,C.blue,pctB]].map(([side,label,color,pct])=>(
        <div key={side}>
          <div style={{display:"flex", justifyContent:"space-between", marginBottom:3}}>
            <span style={{fontSize:10, fontWeight:myVote===side?700:400, color:myVote===side?C.text:C.textLight}}>{label} {myVote===side?"← you":""}</span>
            <span style={{fontSize:10, fontWeight:700, color}}>{pct}%</span>
          </div>
          <div style={S.barTrack}><div style={{...S.barFill, width:`${pct}%`, background:color}} className="bar-fill" /></div>
        </div>
      ))}
    </div>
  );
}

// ── CASE DETAIL + COMMENTS ─────────────────────────────────────
function CaseDetailScreen({ c, onVote, onComment, onReply, onLike, onReport, reportedComments, onGetAIPicks, onBack, judgeMode, authUser, onSignIn }) {
  const voteTotal = (c.votes.a||0) + (c.votes.b||0);
  const pctA = voteTotal > 0 ? Math.round((c.votes.a/voteTotal)*100) : 50;
  const pctB = voteTotal > 0 ? Math.round((c.votes.b/voteTotal)*100) : 50;
  const hasVoted = !!c.myVote;
  const aiColor = c.aiWinner==="A"?C.rose:c.aiWinner==="B"?C.blue:C.gold;
  const [commentText, setCommentText] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reported, setReported] = useState({});
  const [showAll, setShowAll] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [shareComment, setShareComment] = useState(null);
  const [tallying, setTallying] = useState(false);
  const [revealResults, setRevealResults] = useState(hasVoted);

  const handleVoteWithReveal = (side) => {
    setTallying(true);
    onVote(side);
    setTimeout(() => { setTallying(false); setRevealResults(true); }, 1500);
  };

  const sortedComments = [...(c.comments||[])].sort((a,b)=>commentScore(b)-commentScore(a));
  const topComment = sortedComments[0];
  const restComments = sortedComments.slice(1);
  const visibleRest = showAll ? restComments : restComments.slice(0, 4);

  const handleComment = () => {
    if (!commentText.trim() || !selectedTag) return;
    if (commentText.length > 500) return;
    setSubmitting(true);
    const ok = onComment(commentText.trim(), selectedTag);
    if (ok) { setCommentText(""); setSelectedTag(null); }
    setSubmitting(false);
  };

  const handleReply = (commentId) => {
    if (!replyText.trim()) return;
    onReply(commentId, replyText.trim());
    setReplyText(""); setReplyingTo(null);
  };

  const formatTime = (ts) => {
    const mins = Math.floor((Date.now()-ts)/60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins/60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs/24)}d ago`;
  };

  const tagInfo = (tagId) => COMMENT_TAGS.find(t=>t.id===tagId)||COMMENT_TAGS[0];
  const isRelSafe = false;

  const CommentCard = ({ cm, isTop }) => {
    const t = tagInfo(cm.tag);
    if (reported[cm.id]) return null;
    if (isRelSafe && cm.tag==="FUNNY") return null;
    return (
      <div style={{background:isTop?C.goldLight:C.surface, border:`1.5px solid ${isTop?`${C.gold}40`:C.border}`, borderRadius:16, padding:14, marginBottom:10}} className="comment-in">
        {isTop && (
          <div style={{display:"flex", gap:6, marginBottom:8, flexWrap:"wrap"}}>
            <span style={{background:C.gold, color:"#fff", borderRadius:8, fontSize:8, fontWeight:700, padding:"2px 7px", letterSpacing:1}}>TOP COMMENT</span>
            {c.aiSmartestId===cm.id && <span style={{background:C.lavender, color:"#fff", borderRadius:8, fontSize:8, fontWeight:700, padding:"2px 7px", letterSpacing:1}}>✨ AI: SMARTEST</span>}
            {c.aiFunniestId===cm.id && <span style={{background:C.peach, color:"#fff", borderRadius:8, fontSize:8, fontWeight:700, padding:"2px 7px", letterSpacing:1}}>😂 AI: FUNNIEST</span>}
          </div>
        )}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6}}>
          <div style={{display:"flex", gap:6, alignItems:"center", flexWrap:"wrap"}}>
            <span style={{fontSize:12, fontWeight:700, color:C.text}}>{cm.username}</span>
            {cm.username===MY_USERNAME && <span style={{background:C.teal, color:"#fff", borderRadius:6, fontSize:8, padding:"1px 5px", fontWeight:700}}>you</span>}
            {cm.likes>=25 && <span style={{background:`linear-gradient(135deg,${C.gold},${C.peach})`, color:"#fff", borderRadius:6, fontSize:8, padding:"1px 6px", fontWeight:700}}>Community MVP</span>}
            {cm.likes>=10 && cm.likes<25 && <span style={{background:C.gold, color:"#fff", borderRadius:6, fontSize:8, padding:"1px 6px", fontWeight:700}}>Top Commenter</span>}
            {!isTop && c.aiSmartestId===cm.id && <span style={{background:C.lavender, color:"#fff", borderRadius:6, fontSize:8, padding:"1px 6px", fontWeight:700}}>✨ AI Smartest</span>}
            {!isTop && c.aiFunniestId===cm.id && <span style={{background:C.peach, color:"#fff", borderRadius:6, fontSize:8, padding:"1px 6px", fontWeight:700}}>😂 AI Funniest</span>}
          </div>
          <div style={{display:"flex", gap:5, alignItems:"center"}}>
            <span style={{background:t.bg, color:t.color, borderRadius:8, padding:"2px 7px", fontSize:9, fontWeight:700}}>{t.emoji} {t.label}</span>
            <span style={{fontSize:10, color:C.textLight}}>{formatTime(cm.ts)}</span>
          </div>
        </div>
        <p style={{fontSize:12, color:C.textMid, lineHeight:1.6, marginBottom:10}}>{cm.text}</p>

        {/* Action row */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:(cm.replies||[]).length>0||replyingTo===cm.id?10:0}}>
          <div style={{display:"flex", gap:6}}>
            <button style={{display:"flex", alignItems:"center", gap:4, background:cm.likedByMe?C.roseLight:"transparent", border:`1px solid ${cm.likedByMe?C.rose:C.border}`, borderRadius:10, padding:"4px 9px", fontSize:11, color:cm.likedByMe?C.rose:C.textMid, cursor:"pointer", fontFamily:"inherit"}} className={cm.likedByMe?"pop like-pop":"pop"} onClick={()=>onLike(cm.id)}>
              👍 {cm.likes}
            </button>
            <button style={{background:"transparent", border:`1px solid ${C.border}`, borderRadius:10, padding:"4px 9px", fontSize:11, color:replyingTo===cm.id?C.rose:C.textMid, cursor:"pointer", fontFamily:"inherit"}} className="pop" onClick={()=>{setReplyingTo(replyingTo===cm.id?null:cm.id); setReplyText("");}}>
              💬 Reply {(cm.replies||[]).length>0?`(${cm.replies.length})`:""}
            </button>
            <button style={{background:`linear-gradient(135deg,${C.roseLight},${C.blueLight})`, border:`1px solid ${C.border}`, borderRadius:10, padding:"4px 9px", fontSize:11, color:C.textMid, cursor:"pointer", fontFamily:"inherit"}} className="pop" onClick={()=>setShareComment(cm)}>
              📤 Share
            </button>
          </div>
          <button style={{fontSize:10, color: reportedComments?.has(cm.id)?C.teal:C.textLight, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit"}} onClick={()=>onReport&&onReport(cm.id)}>{reportedComments?.has(cm.id)?"Reported":"Report"}</button>
        </div>

        {/* Replies */}
        {(cm.replies||[]).length > 0 && (
          <div style={{borderLeft:`2px solid ${C.border}`, paddingLeft:12, marginTop:8, display:"flex", flexDirection:"column", gap:8}}>
            {cm.replies.map(reply => (
              <div key={reply.id}>
                <div style={{display:"flex", gap:6, alignItems:"center", marginBottom:3}}>
                  <span style={{fontSize:11, fontWeight:700, color:C.text}}>{reply.username}</span>
                  {reply.username===MY_USERNAME && <span style={{background:C.teal, color:"#fff", borderRadius:6, fontSize:8, padding:"1px 5px", fontWeight:700}}>you</span>}
                  <span style={{fontSize:10, color:C.textLight}}>{formatTime(reply.ts)}</span>
                </div>
                <p style={{fontSize:11, color:C.textMid, lineHeight:1.5, margin:0}}>{reply.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Reply input */}
        {replyingTo === cm.id && (
          <div style={{marginTop:10, display:"flex", gap:8, alignItems:"flex-end"}}>
            <textarea style={{...S.textarea, flex:1, marginBottom:0, fontSize:12, padding:"9px 12px"}} placeholder="Write a reply..." value={replyText} onChange={e=>setReplyText(e.target.value.slice(0,280))} rows={2} />
            <button style={{...S.btnPrimary, width:"auto", padding:"9px 14px", fontSize:12, opacity:!replyText.trim()?0.5:1}} className="pop" onClick={()=>handleReply(cm.id)} disabled={!replyText.trim()}>Post</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={S.screen} className="fade-in">

      {/* Share comment card modal */}
      {shareComment && (
        <div style={{position:"fixed",inset:0,background:"rgba(26,20,18,0.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20}}>
          <div style={{...S.card, width:"100%", maxWidth:360, textAlign:"center"}}>
            <h3 style={{...S.title, fontSize:16, marginBottom:12}}>Share this take 📤</h3>
            {/* Shareable card preview */}
            <div style={{background:`linear-gradient(135deg, #FFF8F6, #FFF4FF)`, border:`1.5px solid ${C.border}`, borderRadius:16, padding:16, marginBottom:16, textAlign:"left"}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
                <span style={{fontSize:11, fontWeight:700, color:C.text}}>{shareComment.username}</span>
                <span style={{background:tagInfo(shareComment.tag).bg, color:tagInfo(shareComment.tag).color, borderRadius:8, padding:"2px 8px", fontSize:9, fontWeight:700}}>{tagInfo(shareComment.tag).emoji} {tagInfo(shareComment.tag).label}</span>
              </div>
              <p style={{fontSize:13, color:C.textMid, lineHeight:1.6, margin:"0 0 10px", fontStyle:"italic"}}>"{shareComment.text}"</p>
              <div style={{borderTop:`1px solid ${C.border}`, paddingTop:8, display:"flex", justifyContent:"space-between"}}>
                <span style={{fontSize:10, color:C.textLight}}>on: {c.topic}</span>
                <span style={{fontSize:10, fontWeight:700, color:C.rose}}>⚖️ You Be The Judge</span>
              </div>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10}}>
              {["📋 Copy","📱 Instagram","🐦 Twitter","💬 iMessage"].map(s=><button key={s} style={{...S.btnGhost, padding:"9px", fontSize:11}} onClick={()=>setShareComment(null)}>{s}</button>)}
            </div>
            <button style={S.btnGhost} onClick={()=>setShareComment(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:"flex", gap:6, alignItems:"center", marginBottom:4}}>
        <span style={S.chip}>{c.category}</span>
        {c.isOwn&&<span style={{background:C.teal, color:"#fff", borderRadius:20, fontSize:9, padding:"3px 9px", fontWeight:700}}>your case ⚖️</span>}
        <span style={{fontSize:10, color:C.textLight, marginLeft:"auto"}}>{c.timeAgo}</span>
      </div>
      <h2 style={{...S.title, fontSize:18}}>{c.topic}</h2>
      <p style={{...S.sub, marginBottom:4}}>{c.totalVotes.toLocaleString()} votes · {(c.comments||[]).length} comments 👀</p>
      <p style={{fontSize:12, color:C.textLight, marginBottom:4}}>{c.displayA||"Person A"} vs {c.displayB||"Person B"}</p>

      <div style={{...S.card, borderLeft:`3px solid ${C.rose}`}}><label style={{...S.label, color:C.rose}}>{c.displayA||"Person A"} 🌸</label><p style={{fontSize:13, color:C.text, lineHeight:1.7}}>"{c.sideA}"</p></div>
      <div style={{...S.card, borderLeft:`3px solid ${C.blue}`}}><label style={{...S.label, color:C.blue}}>{c.displayB||"Person B"} 💙</label><p style={{fontSize:13, color:C.text, lineHeight:1.7}}>"{c.sideB}"</p></div>

      {/* Vote to see results — only gates verdict/breakdown, not comments */}
      {!hasVoted && !tallying ? (
        <div style={{...S.card, background:`linear-gradient(135deg,#FFF8F6,#FFF4FF)`, textAlign:"center", padding:20}}>
          <div style={{fontSize:28, marginBottom:6}}>🗳️</div>
          <h3 style={{...S.title, fontSize:15, marginBottom:4}}>Who's right?</h3>
          <p style={{...S.sub, fontSize:11, marginBottom:14}}>Vote to see the AI verdict + how the crowd split</p>
          <div style={{display:"flex", flexDirection:"column", gap:8}}>
            <button style={{...S.btnGhost, borderColor:`${C.rose}60`, color:C.rose, padding:"13px"}} className="pop" onClick={()=>handleVoteWithReveal("a")}>👆 {c.displayA||"Person A"} is right</button>
            <button style={{...S.btnGhost, borderColor:`${C.blue}60`, color:C.blue, padding:"13px"}} className="pop" onClick={()=>handleVoteWithReveal("b")}>👆 {c.displayB||"Person B"} is right</button>
          </div>
        </div>
      ) : tallying ? (
        <div style={{...S.card, background:`linear-gradient(135deg,#FFF8F6,#FFF4FF)`, textAlign:"center", padding:28}}>
          <div style={{fontSize:36, marginBottom:10}} className="spin-fun">🗳️</div>
          <h3 style={{...S.title, fontSize:16, marginBottom:6}}>Tallying votes<span className="tally-dots"></span></h3>
          <p style={{...S.sub, fontSize:11}}>Counting what {c.totalVotes.toLocaleString()}+ people think</p>
        </div>
      ) : revealResults ? (
        <div style={S.card} className="tally-reveal">
          <label style={S.label}>The people have spoken 🗳️</label>
          <CourtBars pctA={pctA} pctB={pctB} myVote={c.myVote} displayA={c.displayA} displayB={c.displayB} />
          <div style={{...S.card, background:C.surfaceWarm, borderLeft:`3px solid ${aiColor}`, marginTop:12}}>
            <label style={{...S.label, color:aiColor}}>⚖️ AI Verdict — {c.aiWinner==="Tie"?"Tie":`${c.aiWinner==="A"?(c.displayA||"Person A"):(c.displayB||"Person B")} wins`}</label>
            <p style={{fontSize:13, fontWeight:700, color:C.text, marginBottom:6}}>"{c.aiHeadline}"</p>
            <p style={{fontSize:12, color:C.textMid, lineHeight:1.65}}>{c.aiRuling}</p>
          </div>
          <div style={{background:C.goldLight, borderRadius:12, padding:14, marginTop:10, border:`1px solid ${C.gold}40`}}>
            <label style={{...S.label, color:C.gold, fontSize:9}}>Who agreed with who ✨</label>
            <div style={{display:"flex", flexDirection:"column", gap:8}}>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <span style={{fontSize:16}}>🫵</span>
                <p style={{fontSize:12, color:C.textMid, margin:0, lineHeight:1.5}}>You agreed with <strong style={{color:c.myVote==="a"?C.rose:C.blue}}>{c.myVote==="a"?(c.displayA||"Person A"):(c.displayB||"Person B")}</strong></p>
              </div>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <span style={{fontSize:16}}>⚖️</span>
                <p style={{fontSize:12, color:C.textMid, margin:0, lineHeight:1.5}}>AI agreed with <strong style={{color:c.aiWinner==="A"?C.rose:c.aiWinner==="B"?C.blue:C.gold}}>{c.aiWinner==="Tie"?"neither — it's a tie":c.aiWinner==="A"?(c.displayA||"Person A"):(c.displayB||"Person B")}</strong></p>
              </div>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <span style={{fontSize:16}}>👥</span>
                <p style={{fontSize:12, color:C.textMid, margin:0, lineHeight:1.5}}>The crowd agreed with <strong style={{color:pctA>pctB?C.rose:pctB>pctA?C.blue:C.gold}}>{pctA>pctB?(c.displayA||"Person A"):pctB>pctA?(c.displayB||"Person B"):"neither — it's split"}</strong> {pctA!==pctB&&<span style={{fontSize:11, color:C.textLight}}>({Math.max(pctA,pctB)}%)</span>}</p>
              </div>
            </div>
            {c.myVote===(c.aiWinner==="A"?"a":"b")&&<p style={{fontSize:11, color:C.teal, fontWeight:600, marginTop:8, paddingTop:8, borderTop:`1px solid ${C.gold}30`}}>You and the AI are on the same page</p>}
            {c.myVote!==(c.aiWinner==="A"?"a":"b")&&c.aiWinner!=="Tie"&&<p style={{fontSize:11, color:C.rose, fontWeight:600, marginTop:8, paddingTop:8, borderTop:`1px solid ${C.gold}30`}}>You and the AI disagree</p>}
          </div>
          {c.isOwn&&<div style={{background:C.tealLight, borderRadius:12, padding:12, marginTop:10, border:`1px solid ${C.teal}40`}}><label style={{...S.label, color:C.teal, fontSize:9}}>Your case · public verdict ⚖️</label><p style={{fontSize:12, color:C.textMid, lineHeight:1.55}}>{pctA>pctB?`${pctA}% sided with ${c.displayA||"Person A"}. The crowd ${c.aiWinner==="A"?"agrees with":"disagrees with"} the AI.`:pctB>pctA?`${pctB}% sided with ${c.displayB||"Person B"}. The crowd ${c.aiWinner==="B"?"agrees with":"disagrees with"} the AI.`:"The public is perfectly split on your case!"}</p></div>}
        </div>
      ) : null}

      {/* ── COMMENTS — always visible ── */}
      <div style={S.card}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
          <label style={{...S.label, margin:0}}>💬 Comments ({(c.comments||[]).length})</label>
          {!c.aiSmartestId && (c.comments||[]).length >= 3 && (
            <button style={{background:C.lavLight, color:C.lavender, border:`1px solid ${C.lavender}40`, borderRadius:10, padding:"5px 10px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit"}} className="pop" onClick={onGetAIPicks}>✨ Get AI Picks</button>
          )}
        </div>

        {topComment && <CommentCard cm={topComment} isTop={true} />}
        {visibleRest.map(cm => <CommentCard key={cm.id} cm={cm} isTop={false} />)}

        {restComments.length > 4 && !showAll && (
          <button style={{...S.btnGhost, width:"100%", fontSize:11, padding:"9px", marginBottom:14}} onClick={()=>setShowAll(true)}>Show {restComments.length - 4} more comments</button>
        )}

        {/* Comment input */}
        <div style={{borderTop:`1px solid ${C.border}`, paddingTop:14}}>
          {!authUser ? (
            <div style={{textAlign:"center",padding:"16px 0"}}>
              <p style={{fontSize:12,color:C.textMid,marginBottom:10}}>Sign in to join the discussion</p>
              <button onClick={onSignIn} className="pop" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"9px 22px",background:C.surface,border:`1px solid ${C.borderMid}`,borderRadius:8,cursor:"pointer",fontSize:13,color:C.text,fontFamily:"inherit"}}>
                <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 010-9.18l-7.98-6.19a24.003 24.003 0 000 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                Sign in with Google
              </button>
            </div>
          ) : (
          <>
          <label style={{...S.label, fontSize:10}}>Add your take as <strong style={{color:C.text}}>{authUser.name}</strong></label>
          <div style={{display:"flex", gap:5, flexWrap:"wrap", marginBottom:10}}>
            {COMMENT_TAGS.filter(t => !(isRelSafe && t.id==="FUNNY")).map(t=>(
              <button key={t.id} style={{background:selectedTag===t.id?t.bg:"transparent", border:`1.5px solid ${selectedTag===t.id?t.color:C.border}`, borderRadius:12, padding:"5px 10px", fontSize:10, color:selectedTag===t.id?t.color:C.textMid, cursor:"pointer", fontFamily:"inherit", fontWeight:selectedTag===t.id?700:500}} className="pop" onClick={()=>setSelectedTag(selectedTag===t.id?null:t.id)}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <textarea style={{...S.textarea, fontSize:13}} placeholder="Share your take (max 500 chars)..." value={commentText} onChange={e=>setCommentText(e.target.value.slice(0,500))} rows={3} />
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8}}>
            <span style={{fontSize:10, color:commentText.length>450?C.rose:C.textLight}}>{commentText.length}/500</span>
            <button style={{...S.btnPrimary, width:"auto", padding:"10px 20px", fontSize:12, opacity:(!commentText.trim()||!selectedTag)?0.5:1}} className="pop" onClick={handleComment} disabled={!commentText.trim()||!selectedTag||submitting}>
              {submitting?"Posting...":"Post comment"}
            </button>
          </div>
          {!selectedTag && commentText.length > 0 && <p style={{fontSize:11, color:C.rose, marginTop:6}}>Pick a comment type above ↑</p>}
          </>
          )}
        </div>
      </div>
      <button style={S.btnGhost} className="pop" onClick={onBack}>← Back to the Community</button>
    </div>
  );
}

// ── PRIVACY POLICY ────────────────────────────────────────────
function PrivacyScreen({ onBack }) {
  return (
    <div style={S.screen} className="fade-in">
      <div style={{paddingTop:12}}>
        <button style={{...S.btnGhost, marginBottom:16, padding:"8px 14px", fontSize:12}} className="pop" onClick={onBack}>← Back home</button>
        <h1 style={{...S.title, fontSize:24}}>Privacy Policy</h1>
        <p style={{...S.sub, marginBottom:16}}>Last updated: April 9, 2026</p>
      </div>

      <div style={S.card}>
        <h3 style={{fontSize:15, fontWeight:700, color:C.text, marginBottom:8}}>1. Information We Collect</h3>
        <p style={{fontSize:13, color:C.textMid, lineHeight:1.7, margin:0}}>When you use You Be The Judge ("the Service"), we collect the argument text you submit, anonymous display names you choose, and votes and comments you post to the Community. If you use our SMS notification feature, we collect your phone number solely for sending case updates. We do not require account creation or collect email addresses to use the core Service.</p>
      </div>

      <div style={S.card}>
        <h3 style={{fontSize:15, fontWeight:700, color:C.text, marginBottom:8}}>2. How We Use Your Information</h3>
        <p style={{fontSize:13, color:C.textMid, lineHeight:1.7, margin:0}}>Argument text is sent to Anthropic's Claude AI API to generate verdicts. This data is processed in real-time and is not stored by Anthropic for training purposes. We use your phone number (if provided) exclusively to send SMS notifications about your case status via Twilio. Community posts (votes, comments) are stored to power the Community feature and are visible to other users.</p>
      </div>

      <div style={S.card}>
        <h3 style={{fontSize:15, fontWeight:700, color:C.text, marginBottom:8}}>3. Data Storage and Security</h3>
        <p style={{fontSize:13, color:C.textMid, lineHeight:1.7, margin:0}}>Case data for the remote argument flow is stored temporarily in Upstash Redis and is automatically deleted after 24 hours. Community data is stored on our servers. We use industry-standard security measures including HTTPS encryption, rate limiting, and input validation to protect your data.</p>
      </div>

      <div style={S.card}>
        <h3 style={{fontSize:15, fontWeight:700, color:C.text, marginBottom:8}}>4. Third-Party Services</h3>
        <p style={{fontSize:13, color:C.textMid, lineHeight:1.7, margin:0}}>We use the following third-party services: Anthropic (Claude AI) for verdict generation, Vercel for hosting, Upstash Redis for temporary data storage, and Twilio for SMS notifications. Each service has its own privacy policy governing their use of data.</p>
      </div>

      <div style={S.card}>
        <h3 style={{fontSize:15, fontWeight:700, color:C.text, marginBottom:8}}>5. Your Rights</h3>
        <p style={{fontSize:13, color:C.textMid, lineHeight:1.7, margin:0}}>You can use the Service without providing any personal information. If you've shared your phone number for SMS notifications, you can opt out at any time by replying STOP to any message. Community comments can be reported for removal. For data deletion requests, contact us at support@youbethejudge.ai.</p>
      </div>

      <div style={S.card}>
        <h3 style={{fontSize:15, fontWeight:700, color:C.text, marginBottom:8}}>6. Children's Privacy</h3>
        <p style={{fontSize:13, color:C.textMid, lineHeight:1.7, margin:0}}>The Service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we learn we have collected data from a child under 13, we will delete it promptly.</p>
      </div>

      <div style={S.card}>
        <h3 style={{fontSize:15, fontWeight:700, color:C.text, marginBottom:8}}>7. Changes to This Policy</h3>
        <p style={{fontSize:13, color:C.textMid, lineHeight:1.7, margin:0}}>We may update this Privacy Policy from time to time. We will notify users of material changes by posting the new policy on this page with an updated revision date.</p>
      </div>

      <div style={{...S.card, background:C.surfaceWarm, textAlign:"center"}}>
        <p style={{fontSize:13, color:C.textMid, margin:0}}>Questions? Contact us at <strong style={{color:C.text}}>support@youbethejudge.ai</strong></p>
      </div>

      <button style={S.btnGhost} className="pop" onClick={onBack}>← Back home</button>
    </div>
  );
}

// ── TERMS OF SERVICE ──────────────────────────────────────────
function TermsScreen({ onBack }) {
  return (
    <div style={S.screen} className="fade-in">
      <div style={{paddingTop:12}}>
        <button style={{...S.btnGhost, marginBottom:16, padding:"8px 14px", fontSize:12}} className="pop" onClick={onBack}>← Back home</button>
        <h1 style={{...S.title, fontSize:24}}>Terms of Service</h1>
        <p style={{...S.sub, marginBottom:16}}>Last updated: April 9, 2026</p>
      </div>

      <div style={S.card}>
        <h3 style={{fontSize:15, fontWeight:700, color:C.text, marginBottom:8}}>1. Acceptance of Terms</h3>
        <p style={{fontSize:13, color:C.textMid, lineHeight:1.7, margin:0}}>By accessing or using You Be The Judge ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
      </div>

      <div style={S.card}>
        <h3 style={{fontSize:15, fontWeight:700, color:C.text, marginBottom:8}}>2. Description of Service</h3>
        <p style={{fontSize:13, color:C.textMid, lineHeight:1.7, margin:0}}>You Be The Judge is an AI-powered argument resolution tool. Users submit two sides of an argument, and an AI judge (powered by Anthropic's Claude) provides a verdict. The Service also includes a Community feature where users can vote and comment on anonymized cases.</p>
      </div>

      <div style={S.card}>
        <h3 style={{fontSize:15, fontWeight:700, color:C.text, marginBottom:8}}>3. AI Verdicts Disclaimer</h3>
        <p style={{fontSize:13, color:C.textMid, lineHeight:1.7, margin:0}}>AI-generated verdicts are for entertainment purposes only and should not be considered legal, professional, or therapeutic advice. The AI's rulings are based on the information provided and may not reflect the full context of any situation. Users should not rely on AI verdicts for important life decisions.</p>
      </div>

      <div style={S.card}>
        <h3 style={{fontSize:15, fontWeight:700, color:C.text, marginBottom:8}}>4. User Conduct</h3>
        <p style={{fontSize:13, color:C.textMid, lineHeight:1.7, margin:0}}>You agree not to use the Service to submit content that is hateful, threatening, harassing, defamatory, or otherwise objectionable. You agree not to attempt to abuse, manipulate, or overwhelm the Service through automated requests, prompt injection, or other technical means. We reserve the right to remove content and restrict access to users who violate these terms.</p>
      </div>

      <div style={S.card}>
        <h3 style={{fontSize:15, fontWeight:700, color:C.text, marginBottom:8}}>5. Community Guidelines</h3>
        <p style={{fontSize:13, color:C.textMid, lineHeight:1.7, margin:0}}>When participating in the Community, keep comments respectful and constructive. Personal attacks, hate speech, and harassment will not be tolerated. Comments that violate community guidelines may be removed without notice.</p>
      </div>

      <div style={S.card}>
        <h3 style={{fontSize:15, fontWeight:700, color:C.text, marginBottom:8}}>6. SMS Notifications</h3>
        <p style={{fontSize:13, color:C.textMid, lineHeight:1.7, margin:0}}>By providing your phone number, you consent to receive SMS notifications related to your case status. Message and data rates may apply. You can opt out at any time by replying STOP. Message frequency varies based on case activity.</p>
      </div>

      <div style={S.card}>
        <h3 style={{fontSize:15, fontWeight:700, color:C.text, marginBottom:8}}>7. Intellectual Property</h3>
        <p style={{fontSize:13, color:C.textMid, lineHeight:1.7, margin:0}}>The Service, including its design, features, and branding, is owned by You Be The Judge. User-submitted arguments and comments remain the intellectual property of their respective authors, but by submitting content to the Community, you grant us a non-exclusive license to display that content within the Service.</p>
      </div>

      <div style={S.card}>
        <h3 style={{fontSize:15, fontWeight:700, color:C.text, marginBottom:8}}>8. Limitation of Liability</h3>
        <p style={{fontSize:13, color:C.textMid, lineHeight:1.7, margin:0}}>The Service is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the Service, including but not limited to relationship outcomes influenced by AI verdicts.</p>
      </div>

      <div style={S.card}>
        <h3 style={{fontSize:15, fontWeight:700, color:C.text, marginBottom:8}}>9. Changes to Terms</h3>
        <p style={{fontSize:13, color:C.textMid, lineHeight:1.7, margin:0}}>We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the updated terms.</p>
      </div>

      <div style={{...S.card, background:C.surfaceWarm, textAlign:"center"}}>
        <p style={{fontSize:13, color:C.textMid, margin:0}}>Questions? Contact us at <strong style={{color:C.text}}>support@youbethejudge.ai</strong></p>
      </div>

      <button style={S.btnGhost} className="pop" onClick={onBack}>← Back home</button>
    </div>
  );
}

// ── HISTORY + BEHAVIOR STATS ───────────────────────────────────
function HistoryScreen({ history, onBack }) {
  const [tab, setTab] = useState("stats");
  const total = history.length;
  const catCounts = history.reduce((acc,h)=>{ const cat=h.category||"General"; acc[cat]=(acc[cat]||0)+1; return acc; },{});
  const topCat = Object.entries(catCounts).sort((a,b)=>b[1]-a[1])[0];
  const allNames = [...new Set(history.map(h=>h.winner).filter(w=>w!=="Tie"))];
  const personStats = allNames.map(name=>{
    const theirWins = history.filter(h=>h.winner===name);
    const theirGames = history.filter(h=>h.winner===name||(h.winner!=="Tie"&&allNames.find(n=>n!==name&&h.winner===n)));
    const winRate = theirGames.length?Math.round((theirWins.length/theirGames.length)*100):0;
    const catWins = theirWins.reduce((acc,h)=>{ const cat=h.category||"General"; acc[cat]=(acc[cat]||0)+1; return acc; },{});
    const bestCat = Object.entries(catWins).sort((a,b)=>b[1]-a[1])[0];
    const worstCat = Object.entries(catCounts).filter(([k])=>!catWins[k]).sort((a,b)=>b[1]-a[1])[0];
    return { name, wins:theirWins.length, winRate, bestCat:bestCat?.[0], worstCat:worstCat?.[0] };
  });

  return (
    <div style={S.screen} className="fade-in">
      <div style={{textAlign:"center", paddingTop:12}}><h2 style={S.title}>My Cases 📋</h2><p style={S.sub}>{total} arguments settled · The receipts are here</p></div>
      <div style={{display:"flex", gap:6, background:C.surfaceWarm, borderRadius:16, padding:4}}>
        {[["stats","📊 Stats"],["cases","📋 Cases"],["report","📅 Weekly"]].map(([v,l])=>(
          <button key={v} style={{flex:1, padding:"9px 6px", borderRadius:12, border:"none", background:tab===v?C.surface:undefined, color:tab===v?C.text:C.textLight, fontWeight:tab===v?700:500, fontSize:12, cursor:"pointer", fontFamily:"inherit", boxShadow:tab===v?"0 1px 4px rgba(0,0,0,0.08)":undefined}} onClick={()=>setTab(v)}>{l}</button>
        ))}
      </div>

      {tab==="stats" && (
        <>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10}}>
            {[["🏆",total,"Total cases"],["🔥",topCat?topCat[0]:"—","Top topic"],["⚡",history.filter(h=>h.winner==="Tie").length,"Ties"]].map(([icon,val,label])=>(
              <div key={label} style={{...S.card, textAlign:"center", padding:14}}><div style={{fontSize:22, marginBottom:2}}>{icon}</div><div style={{fontSize:18, fontWeight:800, color:C.text, letterSpacing:-0.5}}>{val}</div><div style={{fontSize:10, color:C.textLight}}>{label}</div></div>
            ))}
          </div>
          {personStats.map(ps=>(
            <div key={ps.name} style={{...S.card, background:`linear-gradient(135deg,${C.roseLight},#fff)`}}>
              <label style={{...S.label, color:C.rose}}>{ps.name}'s argument patterns 🧠</label>
              <div style={{display:"flex", flexDirection:"column", gap:8}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:"#fff", borderRadius:12, border:`1px solid ${C.border}`}}>
                  <span style={{fontSize:12, color:C.textMid}}>Overall win rate</span>
                  <span style={{fontSize:14, fontWeight:800, color:ps.winRate>=50?C.teal:C.rose}}>{ps.winRate}%</span>
                </div>
                {ps.bestCat&&<div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:"#fff", borderRadius:12, border:`1px solid ${C.border}`}}><span style={{fontSize:12, color:C.textMid}}>Wins most in</span><span style={{fontSize:12, fontWeight:700, color:C.teal}}>🏆 {ps.bestCat}</span></div>}
                {ps.worstCat&&<div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:"#fff", borderRadius:12, border:`1px solid ${C.border}`}}><span style={{fontSize:12, color:C.textMid}}>Loses most in</span><span style={{fontSize:12, fontWeight:700, color:C.rose}}>📉 {ps.worstCat}</span></div>}
                <div style={{padding:"10px 12px", background:C.goldLight, borderRadius:12, border:`1px solid ${C.gold}30`}}>
                  <p style={{fontSize:12, color:C.textMid, margin:0, lineHeight:1.5}}>
                    {ps.winRate>=70?`${ps.name} is dominating — winning ${ps.winRate}% of arguments. Unstoppable.`:ps.winRate>=50?`${ps.name} wins more than they lose. Solid track record.`:ps.winRate>=30?`${ps.name} is losing more than winning. Time to level up those arguments.`:`${ps.name} might want to take a debate class. Just saying. 😅`}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {Object.keys(catCounts).length>0&&<div style={S.card}><label style={S.label}>Arguments by topic 📊</label>{Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).map(([cat,count])=>(
            <div key={cat} style={{marginBottom:8}}><div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}><span style={{fontSize:12, color:C.textMid}}>{cat}</span><span style={{fontSize:12, fontWeight:700, color:C.text}}>{count}x</span></div><div style={S.barTrack}><div style={{...S.barFill, width:`${(count/total)*100}%`, background:C.rose}} className="bar-fill" /></div></div>
          ))}</div>}
        </>
      )}

      {tab==="cases" && history.map((h,i)=>(
        <div key={i} style={S.card}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6}}>
            <div>
              {h.caseName ? (
                <div style={{fontSize:15, fontWeight:800, color:C.text, marginBottom:2}}>🏷️ {h.caseName}</div>
              ) : null}
              <div style={{fontSize:h.caseName?11:13, fontWeight:h.caseName?400:600, color:h.caseName?C.textLight:C.text}}>{h.topic}</div>
            </div>
            <span style={{fontSize:11, fontWeight:700, color:h.winner==="Tie"?C.gold:C.teal, flexShrink:0, marginLeft:8}}>{h.winner==="Tie"?"⚡ Tie":`🏆 ${h.winner}`}</span>
          </div>
          <div style={{fontSize:11, color:C.textLight, fontStyle:"italic", marginBottom:h.scoreA!==undefined?8:0}}>"{h.verdict}"</div>
          {h.scoreA!==undefined&&<div style={{...S.twoCol, marginTop:4}}><div style={{fontSize:10, color:C.rose}}>Person A: <strong>{h.scoreA}%</strong></div><div style={{fontSize:10, color:C.blue}}>Person B: <strong>{h.scoreB}%</strong></div></div>}
          <div style={{display:"flex", justifyContent:"space-between", marginTop:6}}>
            <span style={{fontSize:10, color:C.textLight}}>{h.date}</span>
            {!h.caseName && <span style={{fontSize:10, color:C.gold, cursor:"pointer"}} onClick={()=>{}}>+ Name this case</span>}
          </div>
        </div>
      ))}

      {tab==="report" && (
        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          <div style={{...S.card, background:`linear-gradient(135deg,#FFF8F6,#FFF0F3)`, borderColor:`${C.rose}30`}}>
            <label style={{...S.label, color:C.rose}}>📅 This Week's Report</label>
            <h3 style={{fontSize:16, fontWeight:800, color:C.text, marginBottom:4}}>{total===0?"No arguments yet!":total===1?"1 argument settled":`${total} arguments settled`}</h3>
            <p style={{fontSize:12, color:C.textMid, lineHeight:1.6, margin:0}}>{total===0?"Start your first argument to get your weekly report.":`You've settled ${total} argument${total>1?"s":""} total. ${topCat?`Most drama: ${topCat[0]}.`:""} ${personStats[0]?`${personStats[0].name} leads at ${personStats[0].winRate}% win rate.`:""}`}</p>
          </div>
          {personStats.map(ps=>(
            <div key={ps.name} style={S.card}>
              <label style={{...S.label, color:C.lavender}}>{ps.name}'s week ✨</label>
              <div style={{display:"flex", flexDirection:"column", gap:6}}>
                <div style={{display:"flex", justifyContent:"space-between", padding:"8px 10px", background:C.lavLight, borderRadius:10}}><span style={{fontSize:12, color:C.textMid}}>Win rate</span><span style={{fontSize:13, fontWeight:800, color:C.lavender}}>{ps.winRate}%</span></div>
                {ps.bestCat&&<div style={{display:"flex", justifyContent:"space-between", padding:"8px 10px", background:C.tealLight, borderRadius:10}}><span style={{fontSize:12, color:C.textMid}}>Strongest in</span><span style={{fontSize:12, fontWeight:700, color:C.teal}}>{ps.bestCat}</span></div>}
                {ps.worstCat&&<div style={{display:"flex", justifyContent:"space-between", padding:"8px 10px", background:C.roseLight, borderRadius:10}}><span style={{fontSize:12, color:C.textMid}}>Weakest in</span><span style={{fontSize:12, fontWeight:700, color:C.rose}}>{ps.worstCat}</span></div>}
                <div style={{padding:"10px 12px", background:C.goldLight, borderRadius:10, border:`1px solid ${C.gold}30`}}><p style={{fontSize:11, color:C.textMid, margin:0, lineHeight:1.5}}>"{ps.name} is {ps.winRate>=60?"winning":"losing"} ${ps.winRate}% of arguments this period. The data has spoken." ⚖️</p></div>
              </div>
            </div>
          ))}
          <div style={{...S.card, background:C.surfaceWarm, textAlign:"center"}}><div style={{fontSize:32, marginBottom:8}}>📬</div><p style={{fontSize:13, fontWeight:700, color:C.text, marginBottom:4}}>Weekly report coming soon</p><p style={{fontSize:11, color:C.textLight, lineHeight:1.5}}>Every Sunday: argument patterns, win streaks, and one AI insight about your communication style.</p></div>
        </div>
      )}

      <button style={S.btnGhost} className="pop" onClick={onBack}>← Back home</button>
    </div>
  );
}
