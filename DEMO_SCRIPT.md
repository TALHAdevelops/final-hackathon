# MaintainIQ — Demo Video Script (~3–4 min)

**Live app:** https://maintainiq-web.vercel.app
**Login:** admin@maintainiq.com / Admin@123 · tech@maintainiq.com / Tech@123

> Tip: Do a dry run once. Keep two browser windows ready — one desktop (admin console), one mobile-size (public QR page). Speak the *value*, not just clicks.

---

## 0. Intro (15s)
- "This is **MaintainIQ** — an AI-powered QR maintenance and asset-history platform. Every physical asset gets a digital identity, a QR page, AI-assisted issue reporting, and a permanent service history."

## 1. Admin registers an asset (30s)
- Log in as **admin**.
- Show the **Dashboard** — stat cards (assets, open issues, critical, service due).
- Go to **Assets → New Asset** → name "Classroom Projector 01", category "Projector", location "Room A-101" → **Create**.
- On the asset page, point out: **auto code `AST-00xx`** and the **QR code** (download / copy link / open public page).
- "Notice the QR encodes a stable public ID — renaming the asset never breaks the QR."

## 2. Public reports an issue with AI Triage (60s) — the highlight
- Click **Open public page** (or scan the QR with a phone).
- Show the **mobile-friendly public page** — safe info only, no internal data.
- Tap **Report an issue** → type in plain language:
  *"The projector display is flickering and sometimes does not detect HDMI."*
- Tap **AI Triage** → show the **structured result**: professional title, category, priority, possible causes, safe initial checks.
- "The reporter can review and **edit** any field before submitting — AI is advisory, humans decide."
- Change one field to show it's editable → **Submit** → show the **issue reference number**.

## 3. Internal triage & assignment (30s)
- Back in the admin console → **Issues** → open the new issue.
- Show the **AI Triage** panel saved on the issue.
- **Assign** it to a technician (Tech User).

## 4. Technician does the work (45s)
- Log out → log in as **technician** (tech@maintainiq.com).
- Open the assigned issue → **Start inspection** (asset moves to *Under Inspection*).
- **Record maintenance**: notes "Replaced damaged HDMI cable", part "HDMI cable", cost 1200 → save (asset → *Under Maintenance*).
- "The system blocks resolving without a maintenance note, and rejects negative cost."
- **Resolve** → asset returns to **Operational**.

## 5. Permanent history (20s)
- Open the asset → scroll to the **history timeline**:
  `Created → Issue Reported → Assigned → Status Changed → Maintenance Recorded → Resolved`.
- "This append-only timeline answers *who, what, when* for every asset — the real product value."

## 6. Close (15s)
- Back to **Dashboard** — show the updated counts.
- "Backend-enforced roles, a strict issue state machine, AI triage with safe fallback, and a complete audit trail — all live on Vercel. Thank you."

---

## What to emphasise for judges
- **AI is focused triage**, not a chatbot — structured, editable, safe.
- **Backend enforces** authorization + business rules (not just hidden buttons).
- **Complete workflow**: asset → issue → maintenance → history.
- **Deployed & working** end-to-end.
