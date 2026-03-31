"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

export default function ConsentPage() {
  const params = useParams();
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [error, setError] = useState(null);
  const [parentName, setParentName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [signatureMode, setSignatureMode] = useState("type"); // "type" or "draw"
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get", token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else {
          setRecord(data);
          if (data.status === "signed") setSigned(true);
        }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load consent form"); setLoading(false); });
  }, [token]);

  // Canvas drawing handlers
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1A1A1A";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    }
  };

  const getSignatureData = () => {
    if (signatureMode === "draw" && canvasRef.current && hasDrawn) {
      return canvasRef.current.toDataURL("image/png");
    }
    return null;
  };

  const handleSign = async () => {
    if (!parentName.trim()) return;
    if (signatureMode === "draw" && !hasDrawn) return;
    setSigning(true);
    try {
      const signatureImage = getSignatureData();
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign", token,
          parentName: parentName.trim(),
          relationship: relationship.trim(),
          signatureImage,
        }),
      });
      const data = await res.json();
      if (data.signed) setSigned(true);
      else setError(data.error || "Something went wrong");
    } catch { setError("Failed to submit — please try again"); }
    setSigning(false);
  };

  const C = { bg: "#FFFFFF", text: "#1A1A1A", muted: "#888888", light: "#BBBBBB", border: "#E5E5E5", green: "#059669" };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#FAFAF8" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #E5E5E5", borderTopColor: "#1A1A1A", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
          <style dangerouslySetInnerHTML={{ __html: "@keyframes spin { to { transform: rotate(360deg); } }" }} />
          <p style={{ color: "#888", fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !record) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#FAFAF8", padding: 20 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Form not found</h1>
          <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6 }}>This consent link may have expired or already been used. Please contact SilkFutures if you need a new one.</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#FAFAF8", padding: 20 }}>
        <div style={{ textAlign: "center", maxWidth: 440 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#05966915", border: "1.5px solid #05966940", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28, color: C.green }}>✓</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Thank you</h1>
          <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7, margin: "0 0 8px" }}>
            Your consent has been recorded for <strong style={{ color: C.text }}>{record?.young_people?.name}</strong>.
          </p>
          <p style={{ color: "#BBB", fontSize: 12, lineHeight: 1.6 }}>
            You can withdraw consent at any time by contacting SilkFutures at toni@silkfutures.com.
          </p>
        </div>
      </div>
    );
  }

  const ypName = record?.young_people?.name || "your young person";

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#FAFAF8" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px 60px" }}>

        {/* Header with logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <img src="/logo-small.png" alt="SilkFutures" style={{ height: 44, width: "auto" }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: "0.08em", textTransform: "uppercase" }}>SilkFutures</div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>Community Interest Company</div>
          </div>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", color: C.text }}>Parent / Guardian Consent</h1>
        <p style={{ fontSize: 14, color: C.muted, margin: "0 0 28px" }}>for <strong style={{ color: C.text }}>{ypName}</strong></p>

        {/* About SilkFutures */}
        <div style={{ background: C.bg, borderRadius: 12, padding: "20px 22px", marginBottom: 14, border: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 14, color: "#444", lineHeight: 1.8, margin: 0 }}>
            SilkFutures is a Cardiff-based community interest company. We run music-based mentoring sessions with young people aged 11–25, using rap, songwriting, and music production as tools for personal development. Our sessions are free, and we work primarily in communities facing higher levels of deprivation.
          </p>
        </div>

        {/* What we need consent for */}
        <div style={{ background: C.bg, borderRadius: 12, padding: "20px 22px", marginBottom: 14, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>What we're asking consent for</div>
          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.8, margin: "0 0 12px" }}>
            To support {ypName} effectively and meet our responsibilities as a safeguarding organisation, we collect and store some information during their time with us. This includes:
          </p>
          <div style={{ display: "grid", gap: 6 }}>
            {[
              "Their first name and basic contact details",
              "Session attendance, engagement scores, and wellbeing indicators",
              "Notes written by their mentor about what happened in sessions",
              "Any creative work they produce (songs, recordings) — only with their permission",
              "Photos or videos from sessions — only with permission",
            ].map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: C.green, fontSize: 14, marginTop: 1, flexShrink: 0 }}>·</span>
                <span style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expandable detail */}
        <div style={{ background: C.bg, borderRadius: 12, marginBottom: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <button onClick={() => setExpanded(!expanded)} style={{
            width: "100%", padding: "16px 22px", border: "none", background: "transparent",
            display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>How data is stored, used, and protected</span>
            <span style={{ fontSize: 16, color: C.muted, transform: expanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
          </button>

          {expanded && (
            <div style={{ padding: "0 22px 20px" }}>
              {[
                { title: "Why we collect it", items: ["To tailor sessions to what each young person needs", "To track progress so mentors can see what's working", "To produce impact reports for our funders (which keeps these programmes free)", "To identify safeguarding concerns early"] },
                { title: "How it's kept safe", items: ["Stored securely with encrypted connections", "Only mentors and programme leads can access session data", "Safeguarding information is handled in line with Cardiff Council procedures", "We never sell, share, or use personal data for marketing", "Data is deleted when no longer needed"] },
                { title: "AI technology", items: ["Our platform uses AI tools to help mentors prepare for sessions and write up notes", "Session information is processed by a secure AI service", "No data is stored by the AI provider", "Young people's data is never used to train AI models"] },
              ].map((section, si) => (
                <div key={si} style={{ marginBottom: si < 2 ? 16 : 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>{section.title}</div>
                  {section.items.map((item, ii) => (
                    <div key={ii} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 3 }}>
                      <span style={{ color: C.light, fontSize: 12, marginTop: 2, flexShrink: 0 }}>·</span>
                      <span style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>{item}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Your rights */}
        <div style={{ background: C.bg, borderRadius: 12, padding: "16px 22px", marginBottom: 28, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>Your rights</div>
          <p style={{ fontSize: 13, color: "#666", lineHeight: 1.7, margin: 0 }}>
            You can ask to see, correct, or delete any data we hold about {ypName} at any time. You can withdraw this consent by emailing <strong>toni@silkfutures.com</strong>. Withdrawing consent won't affect any support already provided.
          </p>
        </div>

        {/* Consent + signature */}
        <div style={{ background: C.bg, borderRadius: 12, padding: "24px 22px", border: `1px solid ${C.border}`, borderTop: `3px solid ${C.text}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>Consent</div>
          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.7, margin: "0 0 20px" }}>
            By signing below, I confirm I have read and understood the above, and I give consent for SilkFutures CIC to collect and store the data described as part of {ypName}'s involvement in the programme.
          </p>

          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Your full name *</label>
              <input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Enter your full name..." style={{
                width: "100%", padding: "12px 14px", borderRadius: 8, border: `1.5px solid ${parentName.trim() ? C.text : C.border}`,
                fontSize: 15, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
              }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Relationship to {ypName}</label>
              <select value={relationship} onChange={e => setRelationship(e.target.value)} style={{
                width: "100%", padding: "12px 14px", borderRadius: 8, border: `1.5px solid ${C.border}`,
                fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff",
              }}>
                <option value="">Select...</option>
                <option value="Parent">Parent</option>
                <option value="Guardian">Guardian</option>
                <option value="Carer">Carer</option>
                <option value="Other family member">Other family member</option>
                <option value="Social worker">Social worker</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Signature mode toggle */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 6, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>Signature</label>
            <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 10 }}>
              <button onClick={() => setSignatureMode("type")} style={{
                flex: 1, padding: "8px 0", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: signatureMode === "type" ? C.text : "transparent",
                color: signatureMode === "type" ? "#fff" : C.muted,
              }}>Type name</button>
              <button onClick={() => setSignatureMode("draw")} style={{
                flex: 1, padding: "8px 0", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: signatureMode === "draw" ? C.text : "transparent",
                color: signatureMode === "draw" ? "#fff" : C.muted,
                borderLeft: `1px solid ${C.border}`,
              }}>Draw signature</button>
            </div>

            {signatureMode === "type" ? (
              <div style={{ padding: "20px 16px", background: "#FAFAF8", borderRadius: 8, border: `1px dashed ${C.border}`, textAlign: "center" }}>
                {parentName.trim() ? (
                  <div style={{ fontSize: 24, fontFamily: "'Georgia', serif", fontStyle: "italic", color: C.text }}>{parentName}</div>
                ) : (
                  <div style={{ fontSize: 13, color: C.light }}>Your typed name will appear here as your signature</div>
                )}
              </div>
            ) : (
              <div>
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={150}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                  style={{ width: "100%", height: 150, background: "#FAFAF8", borderRadius: 8, border: `1px dashed ${C.border}`, cursor: "crosshair", touchAction: "none" }}
                />
                <button onClick={clearCanvas} style={{ background: "none", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", marginTop: 4, textDecoration: "underline" }}>Clear signature</button>
              </div>
            )}
          </div>

          {error && <p style={{ color: "#DC2626", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}

          <button onClick={handleSign} disabled={!parentName.trim() || (signatureMode === "draw" && !hasDrawn) || signing} style={{
            width: "100%", padding: "16px 0", borderRadius: 10, border: "none",
            background: (parentName.trim() && (signatureMode === "type" || hasDrawn)) ? C.text : "#D4D4D4",
            color: (parentName.trim() && (signatureMode === "type" || hasDrawn)) ? "#fff" : "#999",
            fontSize: 16, fontWeight: 800, cursor: (parentName.trim() && !signing) ? "pointer" : "default",
            transition: "all 0.2s",
          }}>
            {signing ? "Submitting..." : "I Consent — Sign Form"}
          </button>

          <p style={{ fontSize: 11, color: C.light, textAlign: "center", margin: "12px 0 0", lineHeight: 1.5 }}>
            By tapping this button you are providing your electronic signature, which has the same legal effect as a handwritten signature.
          </p>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <p style={{ fontSize: 11, color: C.light }}>SilkFutures CIC · Company No. 12461003 · Cardiff, Wales</p>
        </div>
      </div>
    </div>
  );
}
