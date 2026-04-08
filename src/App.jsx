import { useState, useRef } from "react";

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
  JUDGE_VIBE:"judge_vibe",
  PERSONALITY:"personality", VERDICT:"verdict",
  HISTORY:"history", COURT:"court", CASE_DETAIL:"case_detail",
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

const CATEGORIES = ["All","Relationship","Family","Work","Money","Roommates","Friends","Random"];
const ZODIAC = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const MBTI = ["INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP","ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"];
const LOVE_LANGS = ["Words of Affirmation","Acts of Service","Receiving Gifts","Quality Time","Physical Touch"];
const ATTACHMENT = ["Secure","Anxious","Avoidant","Fearful-Avoidant"];
const ARGUMENT_TOPICS = ["Chores","Money","Relationships","Work","Social","General"];
const RELATIONSHIP_TYPES = ["Friends","Family","Couple","Coworkers","Strangers on the Internet"];
const JUDGE_MODES = [{id:"funny",icon:"😂",label:"Funny Roast",desc:"Witty ruling + roasts the loser"},{id:"neutral",icon:"⚖️",label:"Neutral Judge",desc:"Calm, fair, impartial"},{id:"safe",icon:"❤️",label:"Relationship-Safe",desc:"Constructive, no winner-shaming"}];

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
].map(c => ({ ...c, comments: seedComments(c.id) }));

const mockHistory = [
  { date:"Apr 3", topic:"Dishes in the sink", winner:"Alex", verdict:"Jordan didn't have a leg to stand on", category:"Chores & Household", scoreA:78, scoreB:34, caseName:"Dishgate" },
  { date:"Mar 28", topic:"Being late to dinner", winner:"Jordan", verdict:"Alex was being unreasonable", category:"Social Plans", scoreA:41, scoreB:72, caseName:"The Dinner Incident" },
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
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
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
  const [judgeMode, setJudgeMode] = useState("funny");
  const [caseName, setCaseName] = useState("");
  const [courtCases, setCourtCases] = useState(MOCK_COURT);
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
  const recognitionRef = useRef(null);

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
      const res = await fetch("https://youbethejudge.ai/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:300,messages:[{role:"user",content:`You're a warm, curious mediator. Ask 1-2 short clarifying questions about this argument side. Be specific, friendly. Max 15 words each. Max 2 questions.\n\nTheir side: "${sideText}"\n${otherSideText?`Other side: "${otherSideText}"`:""}\n\nRespond ONLY with valid JSON: {"questions":["q1","q2"]}`}]})});
      const data = await res.json();
      const parsed = JSON.parse(data.content.map(i=>i.text||"").join("").replace(/```json|```/g,"").trim());
      onDone(parsed.questions?.slice(0,2)||[]);
    } catch(e) { onDone([]); }
    setClarifyLoading(false);
  };

  const buildPrompt = () => {
    const tones = { funny:"Witty and fun. End with a SHORT playful roast of the loser — punchy, not cruel.", neutral:"Calm, impartial, professional. No roast. Just fair analysis.", safe:"Warm and relationship-safe. Constructive, no winner-shaming, no roast." };
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
      const res = await fetch("https://youbethejudge.ai/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1200,messages:[{role:"user",content:buildPrompt()}]})});
      const data = await res.json();
      const parsed = JSON.parse(data.content.map(i=>i.text||"").join("").replace(/```json|```/g,"").trim());
      setVerdict(parsed); setShowConfetti(true); setTimeout(()=>setShowConfetti(false),2000);
      setHistory(h=>[{date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),topic:topic||"General argument",winner:parsed.winner,verdict:parsed.verdict_headline,category:topic||"General",scoreA:parsed.person_a_score||50,scoreB:parsed.person_b_score||50,caseName:""},...h]);
    } catch(e) { setVerdict({error:true,ruling:"Something went wrong. Please try again."}); }
    setLoading(false);
  };

  const submitToCourt = (v, cat, displayA, displayB) => {
    const newCase = {
      id:Date.now(), category:cat||"Random", topic:topic||"General argument",
      sideA:personA.side, sideB:personB.side,
      displayA: displayA||"Person A", displayB: displayB||"Person B",
      aiWinner:v.winner===(personA.name||"Person A")?"A":v.winner===(personB.name||"Person B")?"B":"Tie",
      aiHeadline:v.verdict_headline, aiRuling:v.ruling,
      votes:{a:0,b:0}, totalVotes:0, isOwn:true, myVote:null, timeAgo:"Just now", comments:[]
    };
    setCourtCases(prev=>[newCase,...prev]);
  };

  const voteOnCase = (caseId, side) => {
    setCourtCases(prev=>prev.map(c=>{
      if(c.id!==caseId||c.myVote) return c;
      const newVotes = {...c.votes,[side]:c.votes[side]+1};
      const newTotal = c.totalVotes+1;
      const pctA = Math.round((newVotes.a/newTotal)*100);
      const pctB = Math.round((newVotes.b/newTotal)*100);
      // Fire notification if it's the user's own case
      if (c.isOwn) {
        const milestones = [10,50,100,250,500,1000];
        if (milestones.includes(newTotal)) {
          pushNotification("votes", caseId, `Your case just hit ${newTotal} votes! The crowd is split ${pctA}% vs ${pctB}%.`);
        } else {
          pushNotification("votes", caseId, `${newTotal} people have now ruled on your argument — Person ${pctA>pctB?"A":"B"} leads ${Math.max(pctA,pctB)}% vs ${Math.min(pctA,pctB)}%`);
        }
      }
      return {...c,votes:newVotes,totalVotes:newTotal,myVote:side};
    }));
  };

  const addComment = (caseId, text, tag) => {
    const banned = ["hate","slur","kill","die","stupid idiot"];
    if (banned.some(w => text.toLowerCase().includes(w))) return false;
    const comment = { id:`${caseId}-${Date.now()}`, caseId, username:MY_USERNAME, text, tag, likes:0, likedByMe:false, ts:Date.now(), replies:[] };
    setCourtCases(prev=>prev.map(c=>{
      if(c.id!==caseId) return c;
      const updated = {...c, comments:[...c.comments, comment]};
      // Notify owner if commenting on their case
      if (c.isOwn) {
        pushNotification("comment", caseId, `${MY_USERNAME} commented on your case: "${text.slice(0,60)}${text.length>60?"...":""}"`);
      }
      return updated;
    }));
    return true;
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

  const toggleLike = (caseId, commentId) => {
    setCourtCases(prev=>prev.map(c=>{
      if(c.id!==caseId) return c;
      const updatedComments = c.comments.map(cm=>{
        if(cm.id!==commentId) return cm;
        const nowLiked = !cm.likedByMe;
        const newLikes = nowLiked ? cm.likes+1 : cm.likes-1;
        // Notify own case owner when their post gets a top comment
        if (c.isOwn && nowLiked && newLikes >= 10) {
          pushNotification("top_comment", caseId, `A comment on your case just hit ${newLikes} likes: "${cm.text.slice(0,50)}..."`);
        }
        return {...cm, likes:newLikes, likedByMe:nowLiked};
      });
      return {...c, comments:updatedComments};
    }));
  };

  const getAISmartestComment = async (caseId, comments) => {
    if (!comments.length) return;
    try {
      const res = await fetch("https://youbethejudge.ai/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:200,messages:[{role:"user",content:`You are evaluating user comments on an argument case. Pick the single most insightful, logically sound comment. Return only the comment id.\n\nComments:\n${comments.map(c=>`ID: ${c.id}\nText: ${c.text}\nTag: ${c.tag}`).join("\n\n")}\n\nRespond ONLY with valid JSON: {"smartest_id":"<id>","funniest_id":"<id>"}`}]})});
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
    const tones = { funny:"Witty and fun. End with a SHORT playful roast — punchy, not cruel.", neutral:"Calm, impartial, professional. No roast.", safe:"Warm, relationship-safe. No roast. Focus on growth." };
    let p = `You are a charming AI judge trained on debate frameworks.\n\nTOPIC: "${topic||"General"}"\n\nPERSON A (${personA.name||"Person A"}): "${personA.side}"`;
    if (clarifyAnsA.length) p+=`\nClarifications from A:\n${clarifyQsA.map((q,i)=>`Q: ${q}\nA: ${clarifyAnsA[i]||"(skipped)"}`).join("\n")}`;
    p+=`\n\nPERSON B (${personB.name||"Person B"}): "${bSide}"`;
    if (bClarifyAns?.length) p+=`\nClarifications from B:\n${bClarifyQs.map((q,i)=>`Q: ${q}\nA: ${bClarifyAns[i]||"(skipped)"}`).join("\n")}`;
    p+=`\n\nTONE: ${tones[judgeMode]}\n\nRespond ONLY with valid JSON (no markdown):\n{"winner":"${personA.name||"Person A"} or ${personB.name||"Person B"} or Tie","verdict_headline":"punchy headline under 10 words","ruling":"2-3 sentences","key_deciding_factor":"The single most important reason winner prevailed","strongest_line":"Most compelling quote under 20 words","person_a_score":0-100,"person_b_score":0-100,"person_a_rationality":0-100,"person_b_rationality":0-100,"a_valid_points":["p1","p2"],"b_valid_points":["p1","p2"],"communication_tip":"one actionable tip","roast":"${judgeMode==="funny"?"short roast":""}"}`;
    try {
      const res = await fetch("https://youbethejudge.ai/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1200,messages:[{role:"user",content:p}]})});
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
      else setScreen(SCREENS.RECORD_B);
    });
  };

  const handleAfterRecordB = () => {
    getClarifyQuestions(personB.side, personA.side, (qs) => {
      if (qs.length > 0) { setClarifyQsB(qs); setClarifyAnsB(new Array(qs.length).fill("")); setScreen(SCREENS.CLARIFY_B); }
      else setScreen(SCREENS.JUDGE_VIBE);
    });
  };

  const currentCourtCase = selectedCase ? courtCases.find(x=>x.id===selectedCase.id)||selectedCase : null;

  return (
    <div style={S.root}>
      <style>{css}</style>
      {screen===SCREENS.HOME && <HomeScreen setScreen={setScreen} history={history} notifications={notifications} showNotifs={showNotifs} setShowNotifs={setShowNotifs} markNotifsRead={markNotifsRead} />}
      {screen===SCREENS.MODE_SELECT && <ModeSelectScreen topic={topic} personA={personA} personB={personB} onSamePhone={()=>{setRemoteMode(false);setScreen(SCREENS.RECORD_A);}} onRemote={()=>{setRemoteMode(true);generateRemoteCode();setScreen(SCREENS.REMOTE_SEND);}} onBack={()=>setScreen(SCREENS.SETUP)} />}
      {screen===SCREENS.SETUP && <SetupScreen personA={personA} setPersonA={setPersonA} personB={personB} setPersonB={setPersonB} topic={topic} setTopic={setTopic} caseName={caseName} setCaseName={setCaseName} usePersonality={usePersonality} setUsePersonality={setUsePersonality} personalityDepth={personalityDepth} setPersonalityDepth={setPersonalityDepth} judgeMode={judgeMode} setJudgeMode={setJudgeMode} setScreen={setScreen} />}
      {screen===SCREENS.REMOTE_SEND && <RemoteSendScreen code={remoteCode} personA={personA} personB={personB} topic={topic} onBack={()=>setScreen(SCREENS.SETUP)} onRecordMySide={()=>setScreen(SCREENS.RECORD_A)} />}
      {screen===SCREENS.REMOTE_WAITING && <RemoteWaitingScreen code={remoteCode} personA={personA} personB={personB} topic={topic} remoteStatus={remoteStatus} onSimulateB={()=>{ setRemoteStatus("submitted"); setTimeout(()=>{setRemoteBSide("Look, I've been very clear about my feelings here. I told them exactly how this made me feel and instead of engaging with what I said, they deflected and made it about something else entirely. The pattern is consistent — I raise an issue, they change the subject. I need them to actually hear me, not just wait for their turn to talk."); setRemoteStatus("ready");},1500); }} onReveal={()=>handleRemoteGetVerdict(remoteBSide, remoteBClarifyQs, remoteBClarifyAns)} />}
      {screen===SCREENS.REMOTE_B_LANDING && <RemoteBLandingScreen code={remoteCode} topic={topic} personBName={personB.name} onStart={()=>setScreen(SCREENS.REMOTE_B_RECORD)} />}
      {screen===SCREENS.REMOTE_B_RECORD && <RemoteBRecordScreen person={personB} setPerson={setPersonB} recording={recording&&activeRecorder==="B"} onStart={()=>startVoice("B")} onStop={stopVoice} onNext={(side)=>{ getClarifyQuestions(side, personA.side, (qs)=>{ if(qs.length>0){setRemoteBClarifyQs(qs);setRemoteBClarifyAns(new Array(qs.length).fill(""));setScreen(SCREENS.REMOTE_B_CLARIFY);}else{setRemoteBSide(side);setRemoteStatus("submitted");setTimeout(()=>setRemoteStatus("ready"),500);setScreen(SCREENS.REMOTE_WAITING);}});}} topic={topic} />}
      {screen===SCREENS.REMOTE_B_CLARIFY && <ClarifyScreen name={personB.name||"Person B"} color={C.blue} colorLight={C.blueLight} emoji="" questions={remoteBClarifyQs} answers={remoteBClarifyAns} setAnswers={setRemoteBClarifyAns} onNext={()=>{setRemoteStatus("submitted");setTimeout(()=>setRemoteStatus("ready"),500);setScreen(SCREENS.REMOTE_WAITING);}} onBack={()=>setScreen(SCREENS.REMOTE_B_RECORD)} isFinal />}
      {screen===SCREENS.RECORD_A && <RecordScreen person={personA} setPerson={setPersonA} name={personA.name||"Person A"} color={C.rose} colorLight={C.roseLight} emoji="" recording={recording&&activeRecorder==="A"} onStart={()=>startVoice("A")} onStop={stopVoice} onNext={()=>{ if(remoteMode){ getClarifyQuestions(personA.side,"",(qs)=>{ if(qs.length>0){setClarifyQsA(qs);setClarifyAnsA(new Array(qs.length).fill(""));setScreen(SCREENS.CLARIFY_A);}else setScreen(SCREENS.REMOTE_WAITING);}); }else handleAfterRecordA(); }} nextLoading={clarifyLoading} onBack={()=>setScreen(remoteMode?SCREENS.REMOTE_SEND:SCREENS.SETUP)} otherPerson={personB} topic={topic} />}
      {screen===SCREENS.CLARIFY_A && <ClarifyScreen name={personA.name||"Person A"} color={C.rose} colorLight={C.roseLight} emoji="" questions={clarifyQsA} answers={clarifyAnsA} setAnswers={setClarifyAnsA} onNext={()=>remoteMode?setScreen(SCREENS.REMOTE_WAITING):setScreen(SCREENS.RECORD_B)} onBack={()=>setScreen(SCREENS.RECORD_A)} />}
      {screen===SCREENS.RECORD_B && <RecordScreen person={personB} setPerson={setPersonB} name={personB.name||"Person B"} color={C.blue} colorLight={C.blueLight} emoji="" recording={recording&&activeRecorder==="B"} onStart={()=>startVoice("B")} onStop={stopVoice} onNext={handleAfterRecordB} nextLoading={clarifyLoading} onBack={()=>clarifyQsA.length>0?setScreen(SCREENS.CLARIFY_A):setScreen(SCREENS.RECORD_A)} isFinal={!usePersonality} otherPerson={personA} topic={topic} />}
      {screen===SCREENS.CLARIFY_B && <ClarifyScreen name={personB.name||"Person B"} color={C.blue} colorLight={C.blueLight} emoji="" questions={clarifyQsB} answers={clarifyAnsB} setAnswers={setClarifyAnsB} onNext={()=>setScreen(SCREENS.JUDGE_VIBE)} onBack={()=>setScreen(SCREENS.RECORD_B)} isFinal />}
      {screen===SCREENS.JUDGE_VIBE && <JudgeVibeScreen judgeMode={judgeMode} setJudgeMode={setJudgeMode} onNext={()=>usePersonality?setScreen(SCREENS.PERSONALITY):getVerdict()} onBack={()=>clarifyQsB.length>0?setScreen(SCREENS.CLARIFY_B):setScreen(SCREENS.RECORD_B)} />}
      {screen===SCREENS.PERSONALITY && <PersonalityScreen personA={personA} setPersonA={setPersonA} personB={personB} setPersonB={setPersonB} depth={personalityDepth} onNext={getVerdict} onBack={()=>setScreen(SCREENS.JUDGE_VIBE)} />}
      {screen===SCREENS.VERDICT && <VerdictScreen verdict={verdict} loading={loading} personA={personA} personB={personB} judgeMode={judgeMode} showConfetti={showConfetti} showShare={showShare} setShowShare={setShowShare} onReset={reset} onSubmitCourt={submitToCourt} setScreen={setScreen} caseName={caseName} setCaseName={setCaseName} onNameCase={(name)=>setHistory(h=>[{...h[0],caseName:name},...h.slice(1)])} />}
      {screen===SCREENS.REMOTE_REVEAL && <VerdictScreen verdict={verdict} loading={loading} personA={personA} personB={{...personB,side:remoteBSide}} judgeMode={judgeMode} showConfetti={showConfetti} showShare={showShare} setShowShare={setShowShare} onReset={resetFull} onSubmitCourt={submitToCourt} setScreen={setScreen} isRemote caseName={caseName} setCaseName={setCaseName} onNameCase={(name)=>setHistory(h=>[{...h[0],caseName:name},...h.slice(1)])} />}
      {screen===SCREENS.HISTORY && <HistoryScreen history={history} onBack={()=>setScreen(SCREENS.HOME)} />}
      {screen===SCREENS.COURT && <CourtScreen cases={courtCases} onVote={voteOnCase} onSelect={c=>{setSelectedCase(c);setScreen(SCREENS.CASE_DETAIL);}} onBack={()=>setScreen(SCREENS.HOME)} />}
      {screen===SCREENS.CASE_DETAIL && currentCourtCase && <CaseDetailScreen c={currentCourtCase} onVote={side=>voteOnCase(currentCourtCase.id,side)} onComment={(text,tag)=>addComment(currentCourtCase.id,text,tag)} onReply={(commentId,text)=>addReply(currentCourtCase.id,commentId,text)} onLike={(commentId)=>toggleLike(currentCourtCase.id,commentId)} onGetAIPicks={()=>getAISmartestComment(currentCourtCase.id,currentCourtCase.comments)} onBack={()=>setScreen(SCREENS.COURT)} judgeMode={judgeMode} />}
    </div>
  );
}

// ── HOME ───────────────────────────────────────────────────────
function HomeScreen({ setScreen, history, notifications, showNotifs, setShowNotifs, markNotifsRead }) {
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
            {notifications.length === 0 && <p style={{...S.sub, textAlign:"center", padding:"20px 0"}}>No notifications yet. Post a case to Community to start getting reactions!</p>}
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
          <p style={{fontSize:13, color:C.textMid, margin:0}}>Type or record both sides. We rule. Done.</p>
        </div>
        <button style={{position:"relative", background:unread>0?C.roseLight:C.surfaceWarm, border:`1.5px solid ${unread>0?"#F5C0C8":C.border}`, borderRadius:14, padding:"10px 12px", fontSize:20, cursor:"pointer", lineHeight:1}} className="pop" onClick={()=>setShowNotifs(true)}>
          🔔
          {unread > 0 && <span style={{position:"absolute", top:-4, right:-4, background:C.rose, color:"#fff", borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center"}}>{unread}</span>}
        </button>
      </div>

      <div style={{flex:1, display:"flex", flexDirection:"column", justifyContent:"center", gap:20, paddingTop:40, paddingBottom:20}}>
        <button style={{...S.btnPrimary, fontSize:20, padding:"24px 20px"}} className="pop" onClick={()=>setScreen("setup")}>Start an Argument</button>
        <div style={S.btnRow}>
          <button style={{...S.btnGhost,flex:1}} className="pop" onClick={()=>setScreen("history")}>My Cases</button>
          <button style={{...S.btnGhost,flex:1}} className="pop" onClick={()=>setScreen("court")}>Community</button>
        </div>
      </div>
    </div>
  );
}

// ── SETUP ──────────────────────────────────────────────────────
function SetupScreen({ personA, setPersonA, personB, setPersonB, topic, setTopic, caseName, setCaseName, usePersonality, setUsePersonality, personalityDepth, setPersonalityDepth, judgeMode, setJudgeMode, setScreen }) {
  const [selectedTag, setSelectedTag] = useState("");
  const [relationship, setRelationship] = useState("");
  return (
    <div style={S.screen} className="fade-in">
      <div style={{textAlign:"center", paddingTop:12}}><h2 style={S.title}>Set the Scene 🎬</h2><p style={S.sub}>Who's arguing and what about?</p></div>
      <div style={S.card}>
        <label style={S.label}>Argument Title 🏷️</label>
        <input style={S.input} placeholder="e.g. Thermostat Gate" value={caseName} maxLength={100} onChange={e=>setCaseName(e.target.value.slice(0,100))} />
        <div style={{fontSize:10, color:C.textLight, textAlign:"right", marginTop:4}}>{(caseName||"").length}/100</div>
        <label style={{...S.label, marginTop:14}}>What's the argument about?</label>
        <textarea style={{...S.input, minHeight:72, resize:"vertical", fontFamily:"inherit"}} placeholder="e.g. who forgot to buy milk and now we're three days in…" value={topic} onChange={e=>setTopic(e.target.value)} />
        <label style={{...S.label, marginTop:14}}>Tag a category</label>
        <div style={S.chipsRow}>{ARGUMENT_TOPICS.map(t=><span key={t} style={{...S.chip, background:selectedTag===t?C.rose:C.surfaceWarm, color:selectedTag===t?"#fff":C.textMid, borderColor:selectedTag===t?C.rose:C.border}} onClick={()=>setSelectedTag(t)}>{t}</span>)}</div>
      </div>
      <div style={S.twoCol}>
        <div style={S.card}><label style={S.label}>Person A</label><input style={S.input} placeholder="Their name" value={personA.name} onChange={e=>setPersonA(p=>({...p,name:e.target.value}))} /></div>
        <div style={S.card}><label style={S.label}>Person B</label><input style={S.input} placeholder="Their name" value={personB.name} onChange={e=>setPersonB(p=>({...p,name:e.target.value}))} /></div>
      </div>
      <div style={S.card}>
        <label style={S.label}>Who's Arguing?</label>
        <select style={{...S.input, fontFamily:"inherit", cursor:"pointer"}} value={relationship} onChange={e=>setRelationship(e.target.value)}>
          <option value="">Select…</option>
          {RELATIONSHIP_TYPES.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div style={S.card}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div><label style={S.label}>Personality Depth 🔮 <span style={{background:C.gold, color:"#fff", borderRadius:6, padding:"1px 6px", fontSize:8, letterSpacing:1, marginLeft:4}}>PREMIUM</span></label><p style={{...S.sub, fontSize:11}}>Optional · Zodiac, MBTI & more</p></div>
          <div style={{background:usePersonality?C.rose:C.surfaceWarm, color:usePersonality?"#fff":C.textMid, border:`1.5px solid ${usePersonality?C.rose:C.border}`, borderRadius:20, padding:"7px 16px", fontSize:11, fontWeight:700, cursor:"pointer"}} onClick={()=>setUsePersonality(v=>!v)}>{usePersonality?"ON":"OFF"}</div>
        </div>
        {usePersonality && (
          <div style={{display:"flex", gap:6, marginTop:10, flexWrap:"wrap"}}>
            {[["zodiac","🌙 Zodiac"],["mbti","🧠 MBTI"],["full","✨ Full Deep Dive"]].map(([v,l])=>(
              <button key={v} style={{...S.btnGhost, padding:"7px 12px", fontSize:11, background:personalityDepth===v?C.rose:C.surface, color:personalityDepth===v?"#fff":C.textMid, borderColor:personalityDepth===v?C.rose:C.border}} onClick={()=>setPersonalityDepth(v)}>{l}</button>
            ))}
          </div>
        )}
      </div>
      <button style={S.btnPrimary} className="pop" onClick={()=>setScreen(SCREENS.MODE_SELECT)}>Next →</button>
    </div>
  );
}

// ── JUDGE VIBE ────────────────────────────────────────────────
function JudgeVibeScreen({ judgeMode, setJudgeMode, onNext, onBack }) {
  return (
    <div style={S.screen} className="fade-in">
      <div style={{textAlign:"center", paddingTop:16}}>
        <div style={{fontSize:44, marginBottom:8}}>🎭</div>
        <h2 style={S.title}>Pick the Judge's Vibe</h2>
        <p style={S.sub}>How should the AI rule on your case?</p>
      </div>
      <div style={S.card}>
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {JUDGE_MODES.map(m=>(
            <div key={m.id} style={{display:"flex", alignItems:"center", gap:10, padding:"13px 14px", borderRadius:14, border:`1.5px solid ${judgeMode===m.id?C.rose:C.border}`, background:judgeMode===m.id?C.roseLight:C.surface, cursor:"pointer"}} className="pop" onClick={()=>setJudgeMode(m.id)}>
              <span style={{fontSize:22}}>{m.icon}</span>
              <div style={{flex:1}}><div style={{fontSize:14, fontWeight:700, color:judgeMode===m.id?C.rose:C.text}}>{m.label}</div><div style={{fontSize:11, color:C.textLight}}>{m.desc}</div></div>
              {judgeMode===m.id && <span style={{color:C.rose, fontWeight:700}}>✓</span>}
            </div>
          ))}
        </div>
      </div>
      <button style={S.btnPrimary} className="pop" onClick={onNext}>⚖️ Reveal the Verdict</button>
      <button style={S.btnGhost} className="pop" onClick={onBack}>← Back</button>
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
  const link = `https://youbethejudge.ai/join/${code}`;
  const aName = personA.name || "Someone";
  const bName = personB.name || "you";
  const msg = `⚖️ ${aName} wants you to settle an argument on YouBeTheJudge.\n\nTopic: ${topic||"General dispute"}\n\nTap to submit your side (it stays private until both are in):\n${link}`;

  const copyLink = () => {
    navigator.clipboard?.writeText(link).catch(()=>{});
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  };

  // sms: works on iOS Safari and Android. iOS uses ?&body=, Android uses ?body=. Use & form which works on both via iOS quirk.
  const ua = typeof navigator!=="undefined" ? navigator.userAgent : "";
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const smsHref = isIOS
    ? `sms:&body=${encodeURIComponent(msg)}`
    : `sms:?body=${encodeURIComponent(msg)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(`${aName} wants you to settle an argument`)}&body=${encodeURIComponent(msg)}`;

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
        <p style={{fontSize:11, color:C.textLight, marginBottom:12}}>They enter this at youbethejudge.ai/join — or tap the link below</p>
        <a href={link} target="_blank" rel="noopener noreferrer" style={{display:"block", background:"#fff", border:`1.5px solid ${C.blue}60`, borderRadius:14, padding:"12px 14px", color:C.blue, fontSize:13, fontWeight:700, textDecoration:"underline", wordBreak:"break-all", marginBottom:10}}>{link}</a>
        <button style={{...S.btnGhost, borderColor:`${C.blue}60`, color:C.blue, width:"100%", fontSize:13}} className="pop" onClick={copyLink}>
          {copied ? "✓ Link copied to clipboard!" : "📋 Copy link"}
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
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
          <a href={smsHref} style={{...S.btnGhost, padding:"14px 8px", fontSize:13, textAlign:"center", textDecoration:"none", display:"block"}} className="pop">💬 iMessage</a>
          <a href={mailHref} style={{...S.btnGhost, padding:"14px 8px", fontSize:13, textAlign:"center", textDecoration:"none", display:"block"}} className="pop">📧 Email</a>
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
              <span style={{fontSize:16}}></span>
              <span style={{fontSize:13, fontWeight:700, color:C.text}}>{personA.name||"Person A"} (you)</span>
            </div>
            <span style={{background:C.teal, color:"#fff", borderRadius:8, fontSize:10, fontWeight:700, padding:"3px 9px"}}>✓ Submitted</span>
          </div>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:remoteStatus==="waiting"?C.surfaceWarm:remoteStatus==="submitted"?C.goldLight:C.tealLight, borderRadius:12, border:`1px solid ${remoteStatus==="waiting"?C.border:remoteStatus==="submitted"?`${C.gold}40`:`${C.teal}40`}`}}>
            <div style={{display:"flex", gap:8, alignItems:"center"}}>
              <span style={{fontSize:16}}></span>
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
        <div style={{fontSize:28, marginBottom:10}}></div>
        <h3 style={{fontSize:16, fontWeight:800, color:C.text, marginBottom:8}}>{personBName||"Person B"}, it's your turn</h3>
        <p style={{fontSize:12, color:C.textMid, lineHeight:1.6, marginBottom:4}}><strong>Topic:</strong> {topic||"General dispute"}</p>
        <p style={{fontSize:11, color:C.textLight, lineHeight:1.6}}>The other person has already submitted their side. You won't see it until after you submit yours. The verdict reveals simultaneously for both of you.</p>
      </div>

      <div style={S.card}>
        <label style={S.label}>The rules ⚖️</label>
        {[["🔒","Your side stays sealed until both are submitted"],["👀","You can't see their argument before submitting"],["⚡","Verdict drops simultaneously on both phones"],["🌐","You can post to Community anonymously after"]].map(([icon,txt])=>(
          <div key={txt} style={{display:"flex", gap:10, alignItems:"center", marginBottom:8}}>
            <span style={{fontSize:16}}>{icon}</span>
            <span style={{fontSize:12, color:C.textMid}}>{txt}</span>
          </div>
        ))}
      </div>

      <button style={S.btnPrimary} className="pop" onClick={onStart}>
        Submit My Side
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
        <div style={{width:52, height:52, borderRadius:"50%", background:C.blueLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px", fontSize:24}}></div>
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
        <textarea style={S.textarea} placeholder={`What's your side of the story?`} value={person.side} onChange={e=>setPerson(p=>({...p,side:e.target.value.slice(0,5000)}))} rows={8} maxLength={5000} />
        <div style={{display:"flex", justifyContent:"space-between", marginTop:4}}>
          <span style={{fontSize:10, color:C.textLight}}>Min 50 · Max 5000 chars</span>
          <span style={{fontSize:10, fontWeight:600, color:person.side.length>4500?person.side.length>4900?C.rose:C.gold:C.textLight}}>{person.side.length}/5000</span>
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
      const res = await fetch("https://youbethejudge.ai/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:600,messages:[{role:"user",content:`Make this argument cleaner and more persuasive without changing meaning.\n\nArgument: "${person.side}"\n\nRespond ONLY with valid JSON: {"refined":"improved version","what_changed":"one sentence"}`}]})});
      const data = await res.json();
      setRefined(JSON.parse(data.content.map(i=>i.text||"").join("").replace(/```json|```/g,"").trim()));
    } catch(e) { setRefined({error:true}); }
    setRefining(false);
  };

  const suggestPoints = async () => {
    if (!person.side) return; setSuggestingPoints(true);
    try {
      const res = await fetch("https://youbethejudge.ai/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:400,messages:[{role:"user",content:`Suggest 3 additional supporting points.\n\nArgument: "${person.side}"\n${otherPerson?.side?`Other side: "${otherPerson.side}"`:""}\n\nRespond ONLY with valid JSON: {"points":["p1","p2","p3"]}`}]})});
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
        <textarea style={S.textarea} placeholder={`${name}, what's your side of the story?`} value={person.side} onChange={e=>setPerson(p=>({...p,side:e.target.value.slice(0,5000)}))} rows={8} maxLength={5000} />
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: person.side ? 4 : 0}}>
          <span style={{fontSize:10, color:C.textLight}}>Min 50 · Max 5000 chars</span>
          <span style={{fontSize:10, fontWeight:600, color:person.side.length>4500?person.side.length>4900?C.rose:C.gold:C.textLight}}>{person.side.length}/5000</span>
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
      <div style={S.card}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div><label style={S.label}>Need more ammo? 💡</label><p style={{...S.sub, fontSize:11}}>AI suggests points you might've missed</p></div>
          <button style={{background:C.goldLight, color:C.gold, border:`1.5px solid ${C.gold}40`, borderRadius:10, padding:"7px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit"}} className="pop" onClick={suggestPoints} disabled={suggestingPoints||!person.side}>{suggestingPoints?"...":"Suggest"}</button>
        </div>
        {suggestedPoints.length>0&&<div style={{marginTop:10, display:"flex", flexDirection:"column", gap:6}}>{suggestedPoints.map((pt,i)=><div key={i} style={{background:C.goldLight, border:`1px solid ${C.gold}40`, borderRadius:10, padding:"9px 12px", display:"flex", alignItems:"center", gap:8, cursor:"pointer"}} className="pop" onClick={()=>addPoint(pt)}><span style={{fontSize:11, color:C.textMid, flex:1}}>+ {pt}</span><span style={{fontSize:10, color:C.gold, fontWeight:700}}>Add</span></div>)}</div>}
      </div>
      <div style={{...S.card, borderLeft:`3px solid ${color}`}}>
        <label style={{...S.label, color}}>🔁 Add a rebuttal</label>
        <p style={{...S.sub, fontSize:11, marginBottom:10}}>Thought of something else? Drop it here.</p>
        <div style={{display:"flex", gap:8, alignItems:"flex-start"}}>
          <textarea style={{...S.textarea, flex:1, marginBottom:0}} placeholder="One more thing..." value={rebuttalInput} onChange={e=>setRebuttalInput(e.target.value)} rows={2} />
          <div style={{display:"flex", flexDirection:"column", gap:6}}>
            <button style={{width:40, height:40, borderRadius:10, border:`1.5px solid ${rebuttalRec?color:C.border}`, background:rebuttalRec?color:C.surfaceWarm, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:rebuttalRec?"#fff":C.textMid}} onClick={rebuttalRec?stopRebuttalVoice:startRebuttalVoice}>{rebuttalRec?"⏹":"🎙"}</button>
            <button style={{width:40, height:40, borderRadius:10, border:`1.5px solid ${C.border}`, background:C.surfaceWarm, fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:C.textMid}} disabled={!rebuttalInput.trim()} onClick={addRebuttal}>＋</button>
          </div>
        </div>
        {rebuttals.map((r,i)=><div key={i} style={{background:C.surfaceWarm, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", fontSize:11, color:C.textMid, marginTop:6}}>🔁 {r}</div>)}
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
            <textarea style={S.textarea} placeholder="Your answer (optional — skip if you want)..." value={answers[i]||""} onChange={e=>updateAnswer(i, e.target.value)} rows={3} />
          </div>
        ))}
      </div>
      <p style={{fontSize:11, color:C.textLight, textAlign:"center"}}>Answering helps the judge rule more accurately</p>
      <div style={S.btnRow}>
        <button style={S.btnGhost} className="pop" onClick={onBack}>← Back</button>
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
        <div style={S.card}>
          <label style={S.label}>{personA.name||"Person A"}</label>
          {(depth==="zodiac"||depth==="full")&&<Sel label="Zodiac ✨" value={personA.zodiac} onChange={v=>setPersonA(p=>({...p,zodiac:v}))} options={ZODIAC} />}
          {(depth==="mbti"||depth==="full")&&<Sel label="MBTI 🧠" value={personA.mbti} onChange={v=>setPersonA(p=>({...p,mbti:v}))} options={MBTI} />}
          {depth==="full"&&<><Sel label="Love Language 💛" value={personA.loveLanguage} onChange={v=>setPersonA(p=>({...p,loveLanguage:v}))} options={LOVE_LANGS} /><Sel label="Attachment 🔗" value={personA.attachment} onChange={v=>setPersonA(p=>({...p,attachment:v}))} options={ATTACHMENT} /></>}
        </div>
        <div style={S.card}>
          <label style={S.label}>{personB.name||"Person B"}</label>
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
// ── SHARE CARD GENERATOR (vertical 1080x1920) ───────────────────
function _roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function _wrap(ctx,text,x,y,maxW,lh){const words=String(text||"").split(" ");let line="";const lines=[];for(const w of words){const t=line+w+" ";if(ctx.measureText(t).width>maxW&&line){lines.push(line.trim());line=w+" ";}else line=t;}if(line)lines.push(line.trim());lines.forEach((ln,i)=>ctx.fillText(ln,x,y+i*lh));return lines.length*lh;}
async function generateVerdictShareCard({verdict, personA, personB, caseName, format="image"}) {
  const W=1080,H=1920;
  const canvas=document.createElement("canvas");
  canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext("2d");
  const isTie=verdict.winner==="Tie"||verdict.winner?.toLowerCase().includes("tie");
  const winnerIsA=verdict.winner===(personA.name||"Person A");
  const wColor=isTie?"#D4A574":winnerIsA?"#E8909A":"#7B9FB8";
  const wBg=isTie?"#FAF3E8":winnerIsA?"#FBE9EC":"#E5EDF3";
  const aName=personA.name||"Person A", bName=personB.name||"Person B";
  const sA=verdict.person_a_score||50, sB=verdict.person_b_score||50;

  function drawFrame(p) {
    // Background gradient
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,wBg); g.addColorStop(0.6,"#FFFFFF"); g.addColorStop(1,wBg);
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // Decorative border
    ctx.strokeStyle=wColor+"30"; ctx.lineWidth=8;
    _roundRect(ctx,30,30,W-60,H-60,40); ctx.stroke();

    // Header brand
    ctx.fillStyle="#5C4A3D"; ctx.textAlign="center";
    ctx.font="700 38px -apple-system,system-ui,sans-serif";
    ctx.fillText("⚖️  YOUBETHEJUDGE.AI", W/2, 130);
    ctx.fillStyle="#8B7B6F"; ctx.font="600 28px -apple-system,system-ui,sans-serif";
    ctx.fillText((caseName||"THE VERDICT").toUpperCase(), W/2, 180);

    // Winner badge (animated scale)
    const scale=Math.min(1, p*1.4);
    const badgeText=isTie?"⚡ IT'S A TIE":`🏆 ${verdict.winner.toUpperCase()} WINS`;
    ctx.save();
    ctx.translate(W/2, 320);
    ctx.scale(scale, scale);
    ctx.font="800 60px -apple-system,system-ui,sans-serif";
    const tw=ctx.measureText(badgeText).width;
    const bw=tw+100, bh=120;
    ctx.fillStyle=wColor;
    _roundRect(ctx,-bw/2,-bh/2,bw,bh,60); ctx.fill();
    ctx.fillStyle="#FFFFFF";
    ctx.fillText(badgeText, 0, 22);
    ctx.restore();

    // Headline
    ctx.fillStyle=wColor;
    ctx.font="800 64px -apple-system,system-ui,sans-serif";
    const headHeight=_wrap(ctx, `"${verdict.verdict_headline||""}"`, W/2, 520, W-160, 80);

    // Score bars (animated count-up)
    const sy=540+headHeight+80;
    const animA=Math.round(sA*Math.min(1,p*1.2));
    const animB=Math.round(sB*Math.min(1,p*1.2));
    drawScore(aName, animA, "#E8909A", 140, sy);
    drawScore(bName, animB, "#7B9FB8", 140, sy+170);

    // Key deciding factor card
    if(verdict.key_deciding_factor) {
      const ky=sy+360;
      ctx.fillStyle="#FAF3E8";
      _roundRect(ctx,80,ky,W-160,290,32); ctx.fill();
      ctx.strokeStyle="#D4A57460"; ctx.lineWidth=4; ctx.stroke();
      ctx.fillStyle="#B8954D"; ctx.textAlign="center";
      ctx.font="700 28px -apple-system,system-ui,sans-serif";
      ctx.fillText("⚡ KEY DECIDING FACTOR", W/2, ky+58);
      ctx.fillStyle="#3D2E25";
      ctx.font="600 38px -apple-system,system-ui,sans-serif";
      _wrap(ctx, verdict.key_deciding_factor, W/2, ky+125, W-220, 52);
    }

    // CTA footer
    ctx.fillStyle="#5C4A3D"; ctx.textAlign="center";
    ctx.font="600 36px -apple-system,system-ui,sans-serif";
    ctx.fillText("Settle your fight at", W/2, H-180);
    ctx.fillStyle=wColor; ctx.font="800 56px -apple-system,system-ui,sans-serif";
    ctx.fillText("youbethejudge.ai", W/2, H-110);
  }
  function drawScore(name, score, color, x, y) {
    ctx.fillStyle="#3D2E25"; ctx.textAlign="left";
    ctx.font="700 42px -apple-system,system-ui,sans-serif";
    ctx.fillText(name, x, y);
    ctx.fillStyle=color; ctx.textAlign="right";
    ctx.font="800 48px -apple-system,system-ui,sans-serif";
    ctx.fillText(`${score}%`, W-x, y);
    const barW=W-x*2;
    ctx.fillStyle="#E8DDD0"; _roundRect(ctx,x,y+22,barW,28,14); ctx.fill();
    ctx.fillStyle=color; _roundRect(ctx,x,y+22,Math.max(28,barW*(score/100)),28,14); ctx.fill();
  }

  if(format==="image") {
    drawFrame(1);
    return await new Promise(res=>canvas.toBlob(b=>res({blob:b,ext:"png",mime:"image/png"}),"image/png",0.95));
  }
  // Video: animate over ~4.5s, hold final frame ~1s
  if(typeof MediaRecorder==="undefined"||!canvas.captureStream) {
    drawFrame(1);
    return await new Promise(res=>canvas.toBlob(b=>res({blob:b,ext:"png",mime:"image/png"}),"image/png",0.95));
  }
  const stream=canvas.captureStream(30);
  const candidates=["video/mp4;codecs=avc1.42E01E","video/mp4","video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];
  const mime=candidates.find(m=>{try{return MediaRecorder.isTypeSupported(m);}catch{return false;}}) || "video/webm";
  const rec=new MediaRecorder(stream, {mimeType:mime, videoBitsPerSecond:8_000_000});
  const chunks=[]; rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  const stopped=new Promise(r=>rec.onstop=r);
  rec.start();
  const start=performance.now(), DUR=4500;
  await new Promise(resolve=>{
    function tick(){const t=performance.now()-start;const p=Math.min(1,t/DUR);drawFrame(p);if(p<1)requestAnimationFrame(tick);else resolve();}
    tick();
  });
  await new Promise(r=>setTimeout(r,1100));
  rec.stop(); await stopped;
  const blob=new Blob(chunks,{type:mime});
  const ext=mime.includes("mp4")?"mp4":"webm";
  return {blob, ext, mime};
}
async function shareOrDownload(blob, filename, title) {
  try {
    const file=new File([blob], filename, {type:blob.type});
    if(navigator.canShare && navigator.canShare({files:[file]})) {
      await navigator.share({files:[file], title, text:"⚖️ Settle your fights at youbethejudge.ai"});
      return true;
    }
  } catch(e){}
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
  return false;
}

function VerdictScreen({ verdict, loading, personA, personB, judgeMode, showConfetti, showShare, setShowShare, onReset, onSubmitCourt, setScreen, isRemote, caseName, setCaseName, onNameCase }) {
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
        {[[personA.name||"Person A",C.rose,verdict.person_a_score,verdict.person_a_rationality,verdict.a_valid_points,""],[personB.name||"Person B",C.blue,verdict.person_b_score,verdict.person_b_rationality,verdict.b_valid_points,""]].map(([name,color,score,logic,points,em])=>(
          <div key={name} style={{...S.card, borderTop:`3px solid ${color}`}}>
            <label style={{...S.label, color}}>{name} {em}</label>
            <ScoreBar label="Overall" value={score} color={color} />
            <ScoreBar label="Logic" value={logic} color={color} />
            <div style={{marginTop:6}}>{(points||[]).map((pt,i)=><div key={i} style={{fontSize:10, color:C.textMid, marginBottom:3}}>✓ {pt}</div>)}</div>
          </div>
        ))}
      </div>

      {verdict.roast&&judgeMode==="funny"&&<div style={{...S.card, background:C.goldLight, borderColor:`${C.gold}40`}}><label style={{...S.label, color:C.gold}}>🔥 The Roast</label><p style={{fontSize:13, color:C.textMid, fontStyle:"italic"}}>"{verdict.roast}"</p></div>}
      {verdict.communication_tip&&<div style={{...S.card, background:C.tealLight, borderColor:`${C.teal}40`}}><label style={{...S.label, color:C.teal}}>💬 Communication tip</label><p style={{fontSize:12, color:C.textMid, lineHeight:1.65}}>{verdict.communication_tip}</p></div>}
      {verdict.personality_insight&&<div style={{...S.card, background:C.lavLight, borderColor:`${C.lavender}40`}}><label style={{...S.label, color:C.lavender}}>🔮 Personality insight</label><p style={{fontSize:12, color:C.textMid, lineHeight:1.65}}>{verdict.personality_insight}</p></div>}

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
        <button style={{...S.btnSoft, flex:1, fontSize:12}} className="pop" onClick={()=>setSubmitModal(true)}>🏛️ Post Anonymously to Court</button>
        <button style={{...S.btnPrimary, flex:1, fontSize:12}} className="pop" onClick={onReset}>New ✨</button>
      </div>

      {submitModal && <SubmitToCourtModal verdict={verdict} personA={personA} personB={personB} onSubmit={(cat,dA,dB)=>{onSubmitCourt(verdict,cat,dA,dB);setSubmitModal(false);setScreen("court");}} onClose={()=>setSubmitModal(false)} />}
      {showShare===true&&(
        <ShareModal verdict={verdict} personA={personA} personB={personB} caseName={caseName} wColor={wColor} wBg={wBg} isTie={isTie} onClose={()=>setShowShare(false)} />
      )}
    </div>
  );
}

function ShareModal({ verdict, personA, personB, caseName, wColor, wBg, isTie, onClose }) {
  const [busy, setBusy] = useState(null); // "image" | "video" | null
  const [status, setStatus] = useState("");
  const run = async (format) => {
    setBusy(format);
    setStatus(format==="video"?"Recording 5s video…":"Rendering image…");
    try {
      const { blob, ext } = await generateVerdictShareCard({ verdict, personA, personB, caseName, format });
      const slug = (caseName||verdict.verdict_headline||"verdict").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40) || "verdict";
      const filename = `youbethejudge-${slug}.${ext}`;
      const shared = await shareOrDownload(blob, filename, "My YouBeTheJudge verdict");
      setStatus(shared?"Shared! 🎉":"Saved to your device 📥");
    } catch(e) {
      setStatus("Couldn't generate — try again");
    }
    setBusy(null);
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(26,20,18,0.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20}}>
      <div style={{...S.card, width:"100%", maxWidth:380, textAlign:"center"}}>
        <h3 style={{...S.title, fontSize:18, marginBottom:6}}>Share this verdict 📤</h3>
        <p style={{fontSize:11, color:C.textLight, marginBottom:14}}>Vertical 9:16 — perfect for Reels, TikTok, and Stories</p>
        <div style={{background:`linear-gradient(135deg,${wBg},#fff)`, border:`1.5px solid ${wColor}40`, borderRadius:16, padding:18, margin:"0 0 16px"}}>
          <div style={{fontSize:26, marginBottom:6}}>⚖️</div>
          <div style={{color:wColor, fontWeight:800, fontSize:15, marginBottom:4}}>{isTie?"It's a tie!":`${verdict.winner} wins`}</div>
          <div style={{color:C.textMid, fontSize:12}}>"{verdict.verdict_headline}"</div>
          {verdict.key_deciding_factor&&<div style={{color:C.textLight, fontSize:10, marginTop:6}}>⚡ {verdict.key_deciding_factor}</div>}
        </div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10}}>
          <button style={{...S.btnSoft, padding:"14px 8px", fontSize:12}} disabled={!!busy} onClick={()=>run("image")}>📸 Save Image</button>
          <button style={{...S.btnPrimary, padding:"14px 8px", fontSize:12}} disabled={!!busy} onClick={()=>run("video")}>🎬 Save Video</button>
        </div>
        {status && <div style={{fontSize:11, color:C.textMid, margin:"6px 0 12px"}}>{busy?"⏳ ":""}{status}</div>}
        <button style={S.btnGhost} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, color }) {
  return (<div style={{marginBottom:8}}><div style={{display:"flex", justifyContent:"space-between", marginBottom:3}}><span style={{fontSize:9, letterSpacing:1.5, color:C.textLight, textTransform:"uppercase", fontWeight:600}}>{label}</span><span style={{fontSize:9, color, fontWeight:700}}>{value}%</span></div><div style={S.barTrack}><div style={{...S.barFill, width:`${value}%`, background:color}} className="bar-fill" /></div></div>);
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
        <h3 style={{...S.title, fontSize:16, marginBottom:4}}>🏛️ Post to Community</h3>
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
              <span style={{fontSize:10, color:C.rose, fontWeight:700, letterSpacing:1}}>PERSON A</span>
              <button style={{fontSize:10, color:C.lavender, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600}} onClick={autoGenA}>✨ Auto</button>
            </div>
            <input style={{...S.input, marginBottom:0, fontSize:13}} placeholder="Person A" value={nameA} onChange={e=>setNameA(e.target.value.slice(0,20))} maxLength={20} />
          </div>
          <div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4}}>
              <span style={{fontSize:10, color:C.blue, fontWeight:700, letterSpacing:1}}>PERSON B</span>
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
            Post to Community 🏛️
          </button>
        </div>
      </div>
    </div>
  );
}

// ── THE COURT ──────────────────────────────────────────────────
function CourtScreen({ cases, onVote, onSelect, onBack }) {
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("hot");
  const filtered = cases.filter(c=>cat==="All"||c.category===cat).sort((a,b)=>sort==="hot"?b.totalVotes-a.totalVotes:b.id-a.id);
  return (
    <div style={S.screen} className="fade-in">
      <div style={{textAlign:"center", paddingTop:12}}><h2 style={S.title}>🏛️ Community</h2><p style={S.sub}>Real arguments. Anonymous. Vote, then discuss.</p></div>
      <div style={S.twoCol}>
        {[["hot","🔥 Hot"],["new","✨ New"]].map(([v,l])=><button key={v} style={{...S.btnGhost, background:sort===v?C.rose:C.surface, color:sort===v?"#fff":C.textMid, borderColor:sort===v?C.rose:C.borderMid}} className="pop" onClick={()=>setSort(v)}>{l}</button>)}
      </div>
      <div style={S.chipsRow}>{CATEGORIES.map(c=><span key={c} style={{...S.chip, background:cat===c?C.rose:C.surfaceWarm, color:cat===c?"#fff":C.textMid, borderColor:cat===c?C.rose:C.border}} onClick={()=>setCat(c)}>{c}</span>)}</div>
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
function CaseDetailScreen({ c, onVote, onComment, onReply, onLike, onGetAIPicks, onBack, judgeMode }) {
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
  const isRelSafe = judgeMode === "safe";

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
          <button style={{fontSize:10, color:C.textLight, background:"none", border:"none", cursor:"pointer"}} onClick={()=>setReported(r=>({...r,[cm.id]:true}))}>Report</button>
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

      <div style={S.card}><label style={S.label}>{c.displayA||"Person A"}</label><p style={{fontSize:13, color:C.text, lineHeight:1.7}}>"{c.sideA}"</p></div>
      <div style={S.card}><label style={S.label}>{c.displayB||"Person B"}</label><p style={{fontSize:13, color:C.text, lineHeight:1.7}}>"{c.sideB}"</p></div>

      {/* Vote to see results — only gates verdict/breakdown, not comments */}
      {!hasVoted ? (
        <div style={{...S.card, background:`linear-gradient(135deg,#FFF8F6,#FFF4FF)`, textAlign:"center", padding:20}}>
          <div style={{fontSize:28, marginBottom:6}}>🗳️</div>
          <h3 style={{...S.title, fontSize:15, marginBottom:4}}>Who's right?</h3>
          <p style={{...S.sub, fontSize:11, marginBottom:14}}>Vote to see the AI verdict + how the crowd split</p>
          <div style={{display:"flex", flexDirection:"column", gap:8}}>
            <button style={{...S.btnGhost, borderColor:`${C.rose}60`, color:C.rose, padding:"13px"}} className="pop" onClick={()=>onVote("a")}>👆 {c.displayA||"Person A"} is right</button>
            <button style={{...S.btnGhost, borderColor:`${C.blue}60`, color:C.blue, padding:"13px"}} className="pop" onClick={()=>onVote("b")}>👆 {c.displayB||"Person B"} is right</button>
          </div>
        </div>
      ) : (
        <div style={S.card}>
          <label style={S.label}>The people have spoken 🗳️</label>
          <CourtBars pctA={pctA} pctB={pctB} myVote={c.myVote} displayA={c.displayA} displayB={c.displayB} />
          <div style={{...S.card, background:C.surfaceWarm, borderLeft:`3px solid ${aiColor}`, marginTop:12}}>
            <label style={{...S.label, color:aiColor}}>⚖️ AI Verdict — {c.aiWinner==="Tie"?"Tie":`${c.aiWinner==="A"?(c.displayA||"Person A"):(c.displayB||"Person B")} wins`}</label>
            <p style={{fontSize:13, fontWeight:700, color:C.text, marginBottom:6}}>"{c.aiHeadline}"</p>
            <p style={{fontSize:12, color:C.textMid, lineHeight:1.65}}>{c.aiRuling}</p>
          </div>
          <div style={{background:C.goldLight, borderRadius:12, padding:12, marginTop:10, border:`1px solid ${C.gold}40`}}>
            <label style={{...S.label, color:C.gold, fontSize:9}}>You vs AI vs crowd ✨</label>
            <p style={{fontSize:11, color:C.textMid, lineHeight:1.5}}>
              <strong>You voted:</strong> {c.myVote==="a"?(c.displayA||"Person A"):(c.displayB||"Person B")} · <strong>AI:</strong> {c.aiWinner==="Tie"?"Tie":c.aiWinner==="A"?(c.displayA||"Person A"):(c.displayB||"Person B")} · <strong>Crowd:</strong> {pctA>pctB?`${c.displayA||"Person A"} (${pctA}%)`:pctB>pctA?`${c.displayB||"Person B"} (${pctB}%)`:"split"}
            </p>
            {c.myVote===(c.aiWinner==="A"?"a":"b")&&<p style={{fontSize:11, color:C.teal, fontWeight:600, marginTop:4}}>✓ You agreed with the AI!</p>}
            {c.myVote!==(c.aiWinner==="A"?"a":"b")&&c.aiWinner!=="Tie"&&<p style={{fontSize:11, color:C.rose, fontWeight:600, marginTop:4}}>You disagreed with AI — {Math.max(pctA,pctB)}% of the crowd agrees with you</p>}
          </div>
          {c.isOwn&&<div style={{background:C.tealLight, borderRadius:12, padding:12, marginTop:10, border:`1px solid ${C.teal}40`}}><label style={{...S.label, color:C.teal, fontSize:9}}>Your case · public verdict ⚖️</label><p style={{fontSize:12, color:C.textMid, lineHeight:1.55}}>{pctA>pctB?`${pctA}% sided with ${c.displayA||"Person A"}. The crowd ${c.aiWinner==="A"?"agrees with":"disagrees with"} the AI.`:pctB>pctA?`${pctB}% sided with ${c.displayB||"Person B"}. The crowd ${c.aiWinner==="B"?"agrees with":"disagrees with"} the AI.`:"The public is perfectly split on your case!"}</p></div>}
        </div>
      )}

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
          <label style={{...S.label, fontSize:10}}>Add your take as <strong style={{color:C.text}}>{MY_USERNAME}</strong></label>
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
        </div>
      </div>
      <button style={S.btnGhost} className="pop" onClick={onBack}>← Back to Community</button>
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
              <label style={S.label}>{ps.name}'s argument patterns 🧠</label>
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
            <label style={S.label}>📅 This Week's Report</label>
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
