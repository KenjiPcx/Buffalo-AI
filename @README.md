## buffalo.ai — Autonomous browser agents that test your site for launch confidence

Build and ship with confidence. buffalo.ai runs autonomous, AI-powered browser agents against your website to uncover broken flows, UX inconsistencies, and prelaunch issues. Just provide your website URL and an email address—our agents run in the background and deliver an actionable report to your inbox.

### Why buffalo.ai
- **Confidence to launch**: Catch regressions and rough edges before your users do.
- **No setup required**: Point us at a URL. That’s it.
- **Actionable output**: Clear, prioritized fixes—not just raw logs.

---

### What buffalo.ai tests

1) **Exploratory Tests**
- Crawl common layouts and navigation patterns across your site.
- Detect interactive elements (links, buttons, inputs, forms, menus, tabs, modals) and interact with them like a real user.
- Validate outcomes (navigation success, no crashes, expected content visible, no console errors).

2) **User Flow Tests**
- You describe the end-to-end flows that matter (e.g., “Sign up → Verify email → Create first project → Invite teammate”).
- Agents execute these steps deterministically, capturing screenshots, timings, and pass/fail evidence.
- Ideal for regression checks on core business journeys.

3) **Prelaunch Checks**
- Built-in checklist for common launch risks:
  - Style and component consistency
  - Copy quality and clarity
  - Broken links and 404s
  - Basic accessibility red flags
  - Meta, favicon, and social preview coverage
  - Mobile viewport and layout sanity checks

---

### How it works
1. Submit your **URL** and **email**.
2. Pick your test types. Optionally define one or more user flows as structured tasks.
3. Our browser agents run in the background—no need to keep the tab open.
4. Receive a **report** with findings, severity, evidence, and step-by-step fixes.

---

### Defining User Flows
Provide a short list of steps in plain language. The agent will interpret and execute them in a headless browser, capturing artifacts along the way.

Example flow:
1. Go to "/signup"
2. Fill email, password, and submit
3. Expect to see onboarding page containing text "Create your first project"
4. Click "New Project", name it "Acme Alpha", submit
5. Verify URL contains "/projects/" and page shows project name "Acme Alpha"

Tips:
- Be explicit about expected outcomes (URLs, text presence, modals opening, redirects, etc.).
- Reference elements by visible text where possible; the agent falls back to robust selectors.

---

### What’s in the report
- **Summary**: High-level pass/fail status for each test suite.
- **Findings**: Grouped by severity with reproducible steps.
- **Evidence**: Screenshots, console/network notes, and timing data.
- **Fixes**: Concrete suggestions and links to resources.
- **Coverage**: Pages visited, elements interacted with, flows attempted.

---

### Scope, privacy, and safety
- Only the domains you provide are crawled; rate limits and robots directives are respected where configured.
- Credentials are not required unless your flows demand authentication; share test credentials only for staging/test environments.
- Sensitive artifacts (PII, secrets) are redacted in stored logs and reports where possible.

---

### Roadmap
- Richer accessibility audits and contrast checks
- Visual diffing for UI regressions across builds
- CI/CD integration and per-PR summaries
- Custom assertion DSL with typeahead and templates
- Multi-tenant project dashboards and trend charts

---

### Getting started (alpha)
1. Enter your site URL and notification email.
2. Select test suites: Exploratory, User Flows, Prelaunch Checks.
3. Optionally add one or more user flows.
4. Click “Run Tests”. You’ll receive an email when your report is ready.

For questions or early access: hello@buffalo.ai


