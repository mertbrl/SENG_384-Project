import { useEffect, useState } from "react";

const NDA_TEXT = [
  {
    title: "1. Purpose",
    body: "This Agreement is made between the Post Owner (Disclosing Party) and the Requester (Receiving Party) to facilitate secure initial contact and multidisciplinary innovation within the Health AI platform.",
  },
  {
    title: "2. Confidential information",
    body: '"Confidential Information" refers to any project pitches, technical ideas, or clinical needs shared during the initial meeting. Health AI only facilitates the initial contact and does not store or take responsibility for shared intellectual property.',
  },
  {
    title: "3. Obligations of the receiving party",
    body: "The Receiving Party agrees to use the Confidential Information solely for evaluating a potential collaboration, and shall not disclose any information to third parties without prior written consent. No patient data or sensitive technical documents shall be requested or shared through this platform.",
  },
  {
    title: "4. Exclusions",
    body: "This Agreement does not apply to information already in the public domain or previously known to the Receiving Party.",
  },
  {
    title: "5. Term",
    body: "This non-disclosure obligation remains in effect for 24 months from the date of the meeting request.",
  },
  {
    title: "6. Acceptance",
    body: 'By clicking "Accept NDA and Send Request," the user acknowledges they have read and agreed to these terms. Acceptance is recorded with timestamp and IP address for audit purposes.',
  },
];

export default function NDAModal({ post, initialMessage = "", onClose, onSend }) {
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMessage(initialMessage);
  }, [initialMessage]);

  const handleSend = async () => {
    if (!accepted || !String(message || "").trim()) return;
    setLoading(true);
    try {
      await onSend({ message: String(message).trim(), ndaAccepted: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "560px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nda-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "18px 24px 14px",
            borderBottom: "1px solid #eaecf0",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "#FAEEDA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
            }}
          >
            🔒
          </div>
          <div>
            <p id="nda-modal-title" style={{ fontSize: "16px", fontWeight: 600, margin: 0, color: "#1a1a2e" }}>
              Non-Disclosure Agreement
            </p>
            <p style={{ fontSize: "12px", color: "#888", margin: 0 }}>
              Required before expressing interest · NDA v1.0
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "#999",
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div
          style={{
            padding: "16px 24px",
            background: "#f8fafc",
            overflowY: "auto",
            flex: 1,
            borderBottom: "1px solid #eaecf0",
          }}
        >
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a2e", margin: "0 0 12px" }}>
            Health AI Platform - Standard Mutual Non-Disclosure Agreement
          </p>
          {post?.title ? (
            <p style={{ fontSize: "12px", color: "#667085", margin: "0 0 16px" }}>
              Related post: {post.title}
            </p>
          ) : null}
          <div style={{ display: "grid", gap: "14px" }}>
            {NDA_TEXT.map((section) => (
              <section key={section.title}>
                <p style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: 700, color: "#111827" }}>
                  {section.title}
                </p>
                <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.6, color: "#475467" }}>
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          <div style={{ marginTop: "18px" }}>
            <label
              htmlFor="nda-message"
              style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: 600, color: "#1a1a2e" }}
            >
              First-contact message
            </label>
            <textarea
              id="nda-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Add a short first-contact note for the post owner."
              rows={4}
              style={{
                width: "100%",
                resize: "vertical",
                minHeight: "110px",
                borderRadius: "12px",
                border: "1px solid #d0d5dd",
                padding: "12px 14px",
                font: "inherit",
                color: "#101828",
                background: "#fff",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div style={{ padding: "16px 24px 20px", flexShrink: 0 }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px", color: "#344054" }}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              style={{ marginTop: "2px" }}
            />
            <span>I have read and accept the NDA terms above.</span>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "1px solid #d0d5dd",
                background: "#fff",
                color: "#344054",
                borderRadius: "999px",
                padding: "10px 16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!accepted || !String(message || "").trim() || loading}
              style={{
                border: "none",
                background: !accepted || !String(message || "").trim() || loading ? "#f2b37a" : "#f17300",
                color: "#fff",
                borderRadius: "999px",
                padding: "10px 16px",
                fontWeight: 700,
                cursor: !accepted || !String(message || "").trim() || loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Sending..." : "Accept NDA and Send Request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
