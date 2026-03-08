import { useState } from "react";

const ANTHROPIC_API_URL = "/api/proxy";
const TRACKS = {
  immediate: {
    id: "immediate",
    label: "⚡ 즉시형",
    sublabel: "오늘 안에 발사",
    color: "#ff6b35",
    bg: "#ff6b3512",
    border: "#ff6b35",
    description: "밈·챌린지처럼 24~48시간 안에 꺼지는 키워드예요. 지금 이 순간 올라타지 않으면 타이밍이 사라져요.",
    action: "🚨 오늘 발사 필수",
    guide: ["지금 바로 카피 골라서 발송 예약하세요", "내일로 미루면 이미 식어있어요", "퀄리티보다 속도가 우선인 유형이에요"],
  },
  opportunity: {
    id: "opportunity",
    label: "🔥 기회형",
    sublabel: "3~7일 내 발사",
    color: "#00ff9f",
    bg: "#00ff9f12",
    border: "#00ff9f",
    description: "관악산처럼 방송·사건 하나가 트리거가 돼서 며칠간 불이 붙는 키워드예요. 가장 바이럴 가능성이 높아요.",
    action: "🎯 이번 주 안에 발사",
    guide: ["불 붙는 초반에 올라타는 게 핵심이에요", "날씨 조건이 맞는 날 골라서 발사하세요", "3일 이상 연속 활용도 가능해요"],
  },
  sustained: {
    id: "sustained",
    label: "🌱 지속형",
    sublabel: "주 단위 캠페인",
    color: "#7b9cff",
    bg: "#7b9cff12",
    border: "#7b9cff",
    description: "볼륨은 높지만 갑자기 뜬 게 아닌 계절성·반복성 키워드예요. 급하지 않으니 기획 캠페인으로 활용하세요.",
    action: "📅 캠페인 일정에 편입",
    guide: ["급하게 쓸 필요 없어요. 캘린더에 넣으세요", "A/B 테스트나 시리즈 푸시로 활용하세요", "롱런하는 콘텐츠 소재로 씁니다"],
  },
};

const SYSTEM_PROMPT = `당신은 날씨 앱 마케팅 전략가입니다. 키워드를 아래 3가지 트랙으로 분류해 분석하세요.

【즉시형 immediate】밈·챌린지·유행어처럼 24~48시간 안에 소비되고 꺼지는 것. 오늘 발사 안 하면 타이밍 사라짐.
【기회형 opportunity】방송 1편·사건 하나가 트리거가 돼서 며칠간 달아오르는 것(관악산 사례). 3~7일 유효. 가장 바이럴 가능성 높음.
【지속형 sustained】언급 볼륨은 높지만 이미 며칠째 지속 중인 계절성·반복성 키워드. 급하지 않음.

반드시 아래 JSON 형식으로만 응답하세요:

{
  "scanned_at": "오늘 날짜와 시간",
  "signals": [
    {
      "keyword": "키워드",
      "track": "immediate" | "opportunity" | "sustained",
      "source": "발견 플랫폼/출처",
      "spike_reason": "왜 갑자기 이번 주에 터졌는지 (즉시형/기회형만, 지속형은 null)",
      "since_when": "언제부터 언급 증가했는지",
      "description": "날씨 앱과의 연결 포인트 한 줄",
      "urgency": "즉시형=오늘 안에 / 기회형=며칠 내 / 지속형=캠페인으로",
      "scores": {
        "outdoor": { "score": 0, "reason": "" },
        "weather_quality": { "score": 0, "reason": "" },
        "sns_upload": { "score": 0, "reason": "" },
        "weather_condition": { "score": 0, "reason": "" }
      },
      "total_score": 0,
      "verdict": "즉시발사" | "검토후발사" | "패스",
      "push_copies": ["카피1 (이모지 포함, 30자 이내)", "카피2 (이모지 포함, 30자 이내)"],
      "push_timing": "발송 최적 타이밍"
    }
  ],
  "top_pick": "가장 추천 키워드",
  "top_pick_track": "immediate" | "opportunity" | "sustained",
  "top_pick_reason": "왜 지금 이게 가장 바이럴 가능성이 높은지"
}

점수: outdoor 0~3, weather_quality 0~3, sns_upload 0~2, weather_condition 0~2
verdict: 7점↑=즉시발사, 4~6점=검토후발사, 3점↓=패스
⚠️ 중요 규칙:
- 즉시형과 기회형은 반드시 웹 검색으로 실제 스파이크를 확인한 것만 넣어라
- 스파이크 증거(언제, 어떤 계기로 급증했는지)를 찾지 못하면 해당 트랙은 비워도 된다
- 억지로 채우지 마라. 없으면 없는 거다
- 지속형은 볼륨 높은 계절성 키워드로 채워도 되지만, 즉시형/기회형을 지속형으로 슬그머니 넣지 마라
- 총 개수보다 정확도가 우선이다`;

const USER_PROMPT = `지금 이 순간 한국 SNS(인스타그램, 틱톡, X), 네이버 실시간 검색어, 커뮤니티(에펨코리아, 더쿠, 블라인드)에서 화제인 키워드를 웹 검색으로 찾아주세요.

즉시형(24~48h) / 기회형(3~7일) / 지속형(계절·반복) 3트랙으로 분류하고, 날씨 앱 푸시 알림 가능성을 점수화해서 즉시 사용 가능한 카피를 작성해주세요.`;

const verdictStyle = {
  "즉시발사": { bg: "#ff445518", border: "#ff4455", text: "#ff4455", label: "🚀 즉시발사" },
  "검토후발사": { bg: "#ffaa0018", border: "#ffaa00", text: "#ffaa00", label: "⚡ 검토후발사" },
  "패스": { bg: "#33333318", border: "#444", text: "#555", label: "✕ 패스" },
};

function ScoreBar({ label, score, max, reason }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
        <span style={{ fontSize: "11px", color: "#555", fontFamily: "monospace" }}>{label}</span>
        <span style={{ fontSize: "11px", color: "#888", fontFamily: "monospace" }}>{score}/{max}</span>
      </div>
      <div style={{ background: "#111", borderRadius: "2px", height: "3px" }}>
        <div style={{
          height: "100%", width: `${(score / max) * 100}%`,
          background: score >= max * 0.7 ? "#00ff9f" : score >= max * 0.4 ? "#ffaa00" : "#444",
          borderRadius: "2px",
        }} />
      </div>
      {reason && <div style={{ fontSize: "10px", color: "#3a3a4a", marginTop: "2px", fontFamily: "monospace" }}>{reason}</div>}
    </div>
  );
}

function SignalCard({ signal, trackInfo, isTop }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(null);
  const vStyle = verdictStyle[signal.verdict] || verdictStyle["패스"];

  const copyText = (text, i) => {
    navigator.clipboard?.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div style={{
      background: "#0c0c18", border: `1px solid ${isTop ? trackInfo.border : "#181828"}`,
      borderRadius: "10px", padding: "18px", position: "relative",
      boxShadow: isTop ? `0 0 20px ${trackInfo.border}20` : "none",
    }}>
      {isTop && (
        <div style={{
          position: "absolute", top: "-1px", right: "14px",
          background: trackInfo.border, color: "#000",
          fontSize: "9px", fontWeight: "800", padding: "2px 10px",
          borderRadius: "0 0 6px 6px", fontFamily: "monospace", letterSpacing: "1px"
        }}>★ TOP PICK</div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div>
          <div style={{ fontSize: "17px", fontWeight: "700", color: "#fff" }}>{signal.keyword}</div>
          <div style={{ fontSize: "10px", color: "#333", fontFamily: "monospace", marginTop: "2px" }}>via {signal.source}</div>
        </div>
        <div style={{
          background: vStyle.bg, border: `1px solid ${vStyle.border}`,
          color: vStyle.text, padding: "3px 10px", borderRadius: "20px",
          fontSize: "10px", fontWeight: "700", fontFamily: "monospace", whiteSpace: "nowrap"
        }}>{vStyle.label}</div>
      </div>

      {signal.spike_reason && (
        <div style={{ borderLeft: `3px solid ${trackInfo.border}`, paddingLeft: "10px", marginBottom: "10px" }}>
          <div style={{ fontSize: "10px", color: "#444", fontFamily: "monospace", marginBottom: "3px" }}>⚡ 급증 트리거</div>
          <div style={{ fontSize: "12px", color: "#bbb", lineHeight: "1.5" }}>{signal.spike_reason}</div>
          {signal.since_when && (
            <div style={{ fontSize: "10px", color: "#3a3a4a", marginTop: "2px", fontFamily: "monospace" }}>{signal.since_when}부터 급증</div>
          )}
        </div>
      )}

      <div style={{ fontSize: "12px", color: "#777", marginBottom: "12px", lineHeight: "1.6" }}>{signal.description}</div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <div style={{ fontSize: "30px", fontWeight: "900", color: trackInfo.color, fontFamily: "monospace", lineHeight: 1 }}>
          {signal.total_score}
        </div>
        <div>
          <div style={{ fontSize: "10px", color: "#333", fontFamily: "monospace" }}>/ 10점 날씨연결점수</div>
          <div style={{ fontSize: "10px", color: trackInfo.color, fontFamily: "monospace", marginTop: "2px" }}>{signal.urgency}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ background: "#111", borderRadius: "3px", height: "5px" }}>
            <div style={{
              height: "100%", width: `${signal.total_score * 10}%`,
              background: `linear-gradient(90deg, ${trackInfo.color}55, ${trackInfo.color})`,
              borderRadius: "3px",
            }} />
          </div>
        </div>
      </div>

      <button onClick={() => setExpanded(!expanded)} style={{
        width: "100%", background: "transparent", border: "1px solid #181828",
        color: "#333", padding: "5px", borderRadius: "4px",
        fontSize: "10px", cursor: "pointer", fontFamily: "monospace",
        marginBottom: expanded ? "12px" : "0"
      }}>
        {expanded ? "▲ 점수 상세 닫기" : "▼ 점수 상세 보기"}
      </button>

      {expanded && (
        <div style={{ background: "#080810", borderRadius: "6px", padding: "12px", marginBottom: "12px" }}>
          <ScoreBar label="야외 활동" score={signal.scores.outdoor.score} max={3} reason={signal.scores.outdoor.reason} />
          <ScoreBar label="날씨→경험 퀄리티" score={signal.scores.weather_quality.score} max={3} reason={signal.scores.weather_quality.reason} />
          <ScoreBar label="SNS 업로드 욕구" score={signal.scores.sns_upload.score} max={2} reason={signal.scores.sns_upload.reason} />
          <ScoreBar label="날씨 조건 필요성" score={signal.scores.weather_condition.score} max={2} reason={signal.scores.weather_condition.reason} />
        </div>
      )}

      {signal.verdict !== "패스" && signal.push_copies?.length > 0 && (
        <div style={{ marginTop: "12px" }}>
          <div style={{ fontSize: "10px", color: "#333", fontFamily: "monospace", letterSpacing: "1px", marginBottom: "6px" }}>
            PUSH COPY — 클릭하면 복사
          </div>
          {signal.push_copies.map((copy, i) => (
            <div key={i} onClick={() => copyText(copy, i)} style={{
              background: copied === i ? `${trackInfo.bg}` : "#080810",
              border: `1px solid ${copied === i ? trackInfo.border : "#181828"}`,
              borderRadius: "6px", padding: "9px 12px",
              fontSize: "12px", color: copied === i ? trackInfo.color : "#ccc",
              marginBottom: "5px", cursor: "pointer", fontFamily: "monospace",
              lineHeight: "1.5", transition: "all 0.2s"
            }}>
              {copied === i ? "✓ 복사됨" : `"${copy}"`}
            </div>
          ))}
          <div style={{ fontSize: "10px", color: "#2a2a3a", fontFamily: "monospace", marginTop: "4px" }}>⏱ {signal.push_timing}</div>
        </div>
      )}
    </div>
  );
}

function TrackSection({ trackKey, signals, topPick }) {
  const track = TRACKS[trackKey];
  const list = signals.filter(s => s.track === trackKey).sort((a, b) => b.total_score - a.total_score);
  if (!list.length) return null;

  return (
    <div style={{ marginBottom: "40px" }}>
      <div style={{
        background: track.bg, border: `1px solid ${track.border}`,
        borderRadius: "10px", padding: "18px 20px", marginBottom: "14px"
      }}>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontSize: "18px", fontWeight: "800", color: track.color }}>{track.label}</span>
              <span style={{
                background: track.border, color: "#000",
                fontSize: "9px", fontWeight: "800", padding: "2px 8px",
                borderRadius: "20px", fontFamily: "monospace"
              }}>{track.sublabel}</span>
            </div>
            <div style={{ fontSize: "12px", color: "#999", lineHeight: "1.6" }}>{track.description}</div>
          </div>
          <div style={{
            background: "#00000050", border: `1px solid ${track.border}30`,
            borderRadius: "8px", padding: "12px 14px", minWidth: "160px"
          }}>
            <div style={{ fontSize: "10px", color: "#444", fontFamily: "monospace", marginBottom: "4px" }}>담당자 액션</div>
            <div style={{ fontSize: "12px", fontWeight: "700", color: track.color, marginBottom: "8px" }}>{track.action}</div>
            {track.guide.map((g, i) => (
              <div key={i} style={{ fontSize: "11px", color: "#555", marginBottom: "3px", lineHeight: "1.4" }}>· {g}</div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {list.map((s, i) => (
          <SignalCard key={i} signal={s} trackInfo={track} isTop={s.keyword === topPick} />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [status, setStatus] = useState("idle");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState("all");

  const steps = [
    "SNS 실시간 트렌드 스캔 중...",
    "커뮤니티 급증 키워드 탐지 중...",
    "즉시형 / 기회형 / 지속형 분류 중...",
    "날씨 연결 점수 산출 중...",
    "푸시 카피 생성 중...",
  ];

  const run = async () => {
    setStatus("loading"); setData(null); setError(""); setStep(0);
    const iv = setInterval(() => setStep(p => p < steps.length - 1 ? p + 1 : p), 3500);
    try {
      const res = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
       headers: { 
  "Content-Type": "application/json",
  "x-api-key": API_KEY,              // ← 이 줄 추가
  "anthropic-version": "2023-06-01", // ← 이 줄 추가
  "anthropic-beta": "web-search-2025-03-05", // ← 이 줄 추가
},
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 5000,
          system: SYSTEM_PROMPT,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: USER_PROMPT }]
        })
      });
      const result = await res.json();
      clearInterval(iv);
      // 디버그용 - 나중에 지워도 됨
console.log("API 응답:", JSON.stringify(result));

// 웹서치 포함 응답에서 텍스트 추출
const text = result.content
  ?.filter(b => b.type === "text")
  .map(b => b.text)
  .join("") || "";

if (!text) {
  const errMsg = result.error?.message || JSON.stringify(result.content?.map(b => b.type));
  throw new Error("응답 없음: " + errMsg);
}
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("JSON 파싱 실패");
      setData(JSON.parse(match[0]));
      setStatus("done");
    } catch (e) {
      clearInterval(iv);
      setError(e.message);
      setStatus("error");
    }
  };

  const signals = data?.signals || [];
  const counts = {
    immediate: signals.filter(s => s.track === "immediate").length,
    opportunity: signals.filter(s => s.track === "opportunity").length,
    sustained: signals.filter(s => s.track === "sustained").length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07070f", color: "#fff", fontFamily: "'DM Sans','Apple SD Gothic Neo',sans-serif", padding: "32px 20px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:0.3} }
        *{box-sizing:border-box}
      `}</style>

      <div style={{ maxWidth: "760px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontSize: "10px", fontFamily: "monospace", color: "#7b9cff", letterSpacing: "3px", marginBottom: "8px" }}>
            WEATHER APP · PUSH SIGNAL SYSTEM
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", margin: "0 0 8px" }}>트렌드 신호 감지 대시보드</h1>
          <p style={{ fontSize: "12px", color: "#444", margin: "0 0 16px", lineHeight: "1.7" }}>
            버튼 하나로 오늘의 SNS 트렌드를 스캔하고 자동 분류해요.
            카피는 클릭하면 바로 복사돼요.
          </p>

          {/* Track legend */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {Object.values(TRACKS).map(t => (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", gap: "6px",
                background: t.bg, border: `1px solid ${t.border}40`,
                borderRadius: "20px", padding: "5px 12px"
              }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: t.color }}>{t.label}</span>
                <span style={{ fontSize: "10px", color: "#555", fontFamily: "monospace" }}>{t.sublabel}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scan Button */}
        {status !== "loading" && (
          <button onClick={run} style={{
            width: "100%", padding: "15px",
            background: status === "done" ? "transparent" : "#00ff9f10",
            border: `1px solid ${status === "done" ? "#181828" : "#00ff9f"}`,
            borderRadius: "8px", color: status === "done" ? "#444" : "#00ff9f",
            fontSize: "13px", fontWeight: "700", cursor: "pointer",
            fontFamily: "monospace", letterSpacing: "1px", marginBottom: "24px",
          }}>
            {status === "done" ? "↻  다시 스캔하기" : "▶  지금 신호 탐지 시작"}
          </button>
        )}

        {/* Loading */}
        {status === "loading" && (
          <div style={{ border: "1px solid #181828", borderRadius: "10px", padding: "32px", marginBottom: "24px", textAlign: "center" }}>
            <div style={{ width: "28px", height: "28px", margin: "0 auto 20px", border: "2px solid #181828", borderTop: "2px solid #00ff9f", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            {steps.map((s, i) => (
              <div key={i} style={{
                fontSize: "11px", fontFamily: "monospace", marginBottom: "6px",
                color: i === step ? "#00ff9f" : i < step ? "#252535" : "#181828",
                animation: i === step ? "blink 1s infinite" : "none"
              }}>
                {i < step ? "✓" : i === step ? "►" : "○"} {s}
              </div>
            ))}
          </div>
        )}

        {status === "error" && (
          <div style={{ border: "1px solid #ff4455", background: "#ff445510", borderRadius: "8px", padding: "14px", marginBottom: "24px", fontSize: "12px", color: "#ff4455", fontFamily: "monospace" }}>
            ✕ {error}
          </div>
        )}

        {/* Results */}
        {status === "done" && data && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>

            {/* Summary row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "8px", marginBottom: "20px" }}>
              {[
                { label: "스캔 시각", value: data.scanned_at, color: "#fff", mono: true },
                { label: "⚡ 즉시형", value: `${counts.immediate}건`, color: TRACKS.immediate.color },
                { label: "🔥 기회형", value: `${counts.opportunity}건`, color: TRACKS.opportunity.color },
                { label: "🌱 지속형", value: `${counts.sustained}건`, color: TRACKS.sustained.color },
              ].map((item, i) => (
                <div key={i} style={{ background: "#0c0c18", border: "1px solid #181828", borderRadius: "8px", padding: "12px 14px" }}>
                  <div style={{ fontSize: "10px", color: "#333", fontFamily: "monospace", marginBottom: "4px" }}>{item.label}</div>
                  <div style={{ fontSize: item.mono ? "11px" : "16px", fontWeight: "800", color: item.color, fontFamily: item.mono ? "monospace" : "inherit" }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Top Pick */}
            {data.top_pick && (() => {
              const t = TRACKS[data.top_pick_track] || TRACKS.opportunity;
              return (
                <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "16px 20px", marginBottom: "20px" }}>
                  <div style={{ fontSize: "10px", color: "#444", fontFamily: "monospace", marginBottom: "4px" }}>오늘의 TOP PICK</div>
                  <div style={{ fontSize: "17px", fontWeight: "800", color: "#fff", marginBottom: "4px" }}>{t.label} · {data.top_pick}</div>
                  <div style={{ fontSize: "12px", color: "#777", lineHeight: "1.5" }}>{data.top_pick_reason}</div>
                </div>
              );
            })()}

            {/* Tabs */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "24px", flexWrap: "wrap" }}>
              {[
                { id: "all", label: "전체 보기" },
                { id: "immediate", label: `⚡ 즉시형 ${counts.immediate ? `(${counts.immediate})` : ""}` },
                { id: "opportunity", label: `🔥 기회형 ${counts.opportunity ? `(${counts.opportunity})` : ""}` },
                { id: "sustained", label: `🌱 지속형 ${counts.sustained ? `(${counts.sustained})` : ""}` },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  padding: "6px 14px", borderRadius: "20px", cursor: "pointer",
                  fontSize: "11px", fontFamily: "monospace", fontWeight: "600",
                  border: tab === t.id ? "1px solid #fff" : "1px solid #181828",
                  background: tab === t.id ? "#fff" : "transparent",
                  color: tab === t.id ? "#000" : "#444",
                  transition: "all 0.15s"
                }}>{t.label}</button>
              ))}
            </div>

            {(tab === "all" || tab === "immediate") && <TrackSection trackKey="immediate" signals={signals} topPick={data.top_pick} />}
            {(tab === "all" || tab === "opportunity") && <TrackSection trackKey="opportunity" signals={signals} topPick={data.top_pick} />}
            {(tab === "all" || tab === "sustained") && <TrackSection trackKey="sustained" signals={signals} topPick={data.top_pick} />}

          </div>
        )}
      </div>
    </div>
  );
}
