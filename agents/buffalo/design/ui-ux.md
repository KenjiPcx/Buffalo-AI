# VibeCheck UI/UX Design Document

## Design Philosophy

VibeCheck is designed for non-technical users who need confidence, not complexity. The UI should feel like a helpful friend testing their app, not a scary technical tool. Every design decision prioritizes clarity over features, and understanding over information density.

## User Experience Flows

### Flow 1: Fire and Forget (Simplest)

```
User → Enters URL → "We'll email you" → Close tab → Email with report link

```

**Use Case**: User is busy, just wants results later
**Pros**: Zero friction, can multitask
**Cons**: No engagement, might forget about test

### Flow 2: Lightweight Monitor (Recommended for MVP)

```
User → Enters URL → Progress view → Real-time discoveries → View report

```

**Use Case**: User wants to see progress without overwhelming detail
**Pros**: Balanced engagement, builds anticipation
**Cons**: Requires 2-minute attention span

### Flow 3: Full Spectator Mode (Hackathon Demo)

```
User → Enters URL → Watch agents work → See live screenshots → Interactive report

```

**Use Case**: Demo purposes, technical users who want to see everything
**Pros**: Impressive for demos, shows multi-agent power
**Cons**: Overwhelming for average users

## UI Layouts

### 1. Landing Page / Initial Input

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│                     VibeCheck ✨                      │
│           Pre-launch confidence for AI apps           │
│                                                        │
│        ┌─────────────────────────────────┐           │
│        │ <https://yourapp.com>            │           │
│        └─────────────────────────────────┘           │
│                                                        │
│              [▶ Test My App]                          │
│                                                        │
│         ⚡ Tests in ~2 mins · No setup needed         │
│                                                        │
└────────────────────────────────────────────────────────┘

```

**Design Notes**:

- Single input field (no cognitive load)
- One clear CTA button
- Trust indicators (time estimate, no setup)
- Friendly emoji to reduce intimidation

### 2. Progress View (Lightweight Monitor - DEFAULT)

```
┌────────────────────────────────────────────────────────┐
│  Testing: yourapp.com                    [Cancel Test] │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Overall Progress                                      │
│  ████████████████░░░░░░░░░░  65%                     │
│                                                        │
│  🔍 Active Agents                                      │
│  ┌──────────────────────────────────────────────┐     │
│  │ Explorer: Mapping site structure...          │     │
│  │ Executor #1: Testing signup flow ✓           │     │
│  │ Executor #2: Testing checkout flow...        │     │
│  │ Bug Hunter: Clicking all buttons (23/47)     │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
│  📍 Discoveries (2 found)                             │
│  ┌──────────────────────────────────────────────┐     │
│  │ ⚠️ Broken checkout at payment step           │     │
│  │    [thumbnail]                               │     │
│  │                                              │     │
│  │ ⚠️ Contact form missing validation           │     │
│  │    [thumbnail]                               │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
│  ⏱ Elapsed: 1:23 · Est. remaining: 0:37              │
│                                                        │
└────────────────────────────────────────────────────────┘

```

**Design Notes**:

- Primary focus on overall progress
- Agent names humanized (not "AGENT_EXECUTOR_01")
- Issues shown as discovered (builds anticipation)
- Thumbnails provide visual proof without overwhelming
- Time estimates manage expectations

### 3. Spectator Mode (Hackathon Demo View)

```
┌────────────────────────────────────────────────────────┐
│  Testing: yourapp.com              🔴 LIVE  [Stop]     │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Agent Swarm Status                                    │
│ ┌─────────────┬─────────────┬─────────────┐          │
│ │ EXPLORER    │ PLANNER     │ REPORTER    │          │
│ │ ✅ Complete │ 🔄 Active   │ ⏸ Waiting   │          │
│ │ Found:      │ Flows: 5    │             │          │
│ │ 12 pages    │ Tests: 23   │             │          │
│ └─────────────┴─────────────┴─────────────┘          │
│                                                        │
│  Parallel Testing (Split View)                        │
│ ┌──────────────────┬──────────────────┐              │
│ │ Browser #1       │ Browser #2       │              │
│ │ Testing: Signup  │ Testing: Checkout│              │
│ │ [Live preview]   │ [Live preview]   │              │
│ │ Step 3/5         │ Step 4/7         │              │
│ └──────────────────┴──────────────────┘              │
│ ┌──────────────────┬──────────────────┐              │
│ │ Browser #3       │ Bug Hunter       │              │
│ │ Testing: Profile │ Random clicking  │              │
│ │ [Live preview]   │ [Live preview]   │              │
│ │ Step 2/4         │ Found 2 errors   │              │
│ └──────────────────┴──────────────────┘              │
│                                                        │
│  Live Issue Feed                                      │
│  ┌──────────────────────────────────────────────┐     │
│  │ 1:24 ⚠️ Payment form won't accept input      │     │
│  │ 1:22 ✓ Login flow completed successfully     │     │
│  │ 1:20 ⚠️ Dead link found: /old-pricing        │     │
│  │ 1:18 ✓ Signup flow completed                 │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
└────────────────────────────────────────────────────────┘

```

**Design Notes**:

- Shows Coral's multi-agent capabilities clearly
- Live browser previews for "wow" factor
- Agent status cards show delegation/coordination
- Real-time feed creates excitement
- Perfect for hackathon judges to see parallelization

### 4. Report View

```
┌────────────────────────────────────────────────────────┐
│  VibeCheck Report · yourapp.com         [Download PDF] │
├────────────────────────────────────────────────────────┤
│                                                        │
│  🎯 Test Summary                                       │
│  ┌──────────────────────────────────────────────┐     │
│  │ ✅ 3 flows working   ⚠️ 2 critical issues    │     │
│  │ 🔍 47 elements tested  📄 12 pages checked   │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
│  🚨 Critical Issues (Fix Before Launch)               │
│  ┌──────────────────────────────────────────────┐     │
│  │ 1. Checkout breaks at payment                │     │
│  │    "Credit card field not accepting input"   │     │
│  │    📸 [Screenshot showing broken form]       │     │
│  │    Steps to reproduce:                       │     │
│  │    1. Add item to cart                       │     │
│  │    2. Go to checkout                         │     │
│  │    3. Try entering card → fails              │     │
│  │                                              │     │
│  │ 2. Password reset leads to 404               │     │
│  │    "Reset link broken"                       │     │
│  │    📸 [Screenshot of 404 page]               │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
│  ✅ Working Flows                                      │
│  ┌──────────────────────────────────────────────┐     │
│  │ • User signup → confirmation → dashboard ✓   │     │
│  │ • Browse → add to cart → view cart ✓        │     │
│  │ • Profile settings → update → save ✓        │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
│  🔍 Minor Issues (5)                    [Show All]     │
│                                                        │
│  💡 Recommendations                                    │
│  ┌──────────────────────────────────────────────┐     │
│  │ 1. Fix payment integration before launch     │     │
│  │ 2. Test password reset flow urgently         │     │
│  │ 3. Add email validation to contact form      │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
│         [Test Again]    [Share Report]                 │
│                                                        │
└────────────────────────────────────────────────────────┘

```

**Design Notes**:

- Summary at top for quick scanning
- Critical issues with screenshots (visual proof)
- Clear reproduction steps (actionable)
- Positive reinforcement (what's working)
- Recommendations in priority order

### 5. Mobile Responsive View

```
┌─────────────────┐
│   VibeCheck ✨  │
│                 │
│ ┌─────────────┐ │
│ │ URL here    │ │
│ └─────────────┘ │
│   [Test App]    │
├─────────────────┤
│ Testing: 65%    │
│ ████████░░░     │
│                 │
│ Found Issues: 2 │
│                 │
│ ⚠️ Broken       │
│    checkout     │
│ ⚠️ Dead links   │
│                 │
│ Time: 1:23      │
└─────────────────┘

```

**Design Notes**:

- Stack everything vertically
- Hide agent details (too much for mobile)
- Focus on progress and issue count
- Expandable sections for details

## Visual Design System

### Color Palette

```
Primary:       #6366F1  (Indigo - Trust/Tech)
Success:       #10B981  (Green - Working)
Warning:       #F59E0B  (Amber - Issues)
Error:         #EF4444  (Red - Critical)
Background:    #FFFFFF  (White)
Surface:       #F9FAFB  (Light Gray)
Text Primary:  #111827  (Near Black)
Text Secondary:#6B7280  (Gray)

```

### Typography

```
Headings:   Inter/System Font - Bold
Body:       Inter/System Font - Regular
Monospace:  Monaco/Consolas - Code snippets
Size Scale: 12/14/16/20/24/32px

```

### Component Patterns

```
Buttons:       Rounded, strong shadow on hover
Cards:         Light border, subtle shadow
Progress Bar:  Thick, animated gradient
Badges:        Rounded full, emoji + text
Screenshots:   Bordered, with caption below

```

## Progressive Disclosure Strategy

### Level 1: Minimal (Default View)

```
What Users See:
- Overall progress bar
- Issue counter
- Time estimate
- Basic agent status

Hidden:
- Technical details
- Console logs
- Network activity

```

### Level 2: Expanded (Click "Show Details")

```
Additional Info:
- Which specific flows being tested
- Live issue descriptions
- Agent coordination
- Screenshot previews

```

### Level 3: Debug Mode (Developer Toggle)

```
Everything:
- Live browser feeds
- Console outputs
- API calls
- Agent decision logs
- Performance metrics

```

## Interaction Patterns

### During Testing

```
Every 10 seconds: Update progress bar
Every issue found: Subtle notification + counter increment
Every 30 seconds: Rotate agent status message
On hover: Show tooltip with more detail
On click "Stop": Confirm dialog → Generate partial report

```

### Report Interactions

```
Click screenshot: Lightbox with full size
Click "Steps to reproduce": Expand/collapse
Click "Download PDF": Generate formatted report
Click "Test Again": Return to input with same URL
Click "Share": Copy link to clipboard

```

## Animation & Microinteractions

### Loading States

```
Progress Bar:    Smooth fill animation
Agent Cards:     Pulse when active
Issue Badge:     Bounce in when discovered
Screenshots:     Fade in when loaded
Status Text:     Typewriter effect for updates

```

### Transitions

```
Page Changes:    Slide left/right
Modal Opens:     Fade + scale up
Cards Appear:    Stagger in from top
Errors:          Shake animation
Success:         Checkmark draw animation

```

## Responsive Breakpoints

```
Mobile:     320px - 768px   (Single column, hidden details)
Tablet:     768px - 1024px  (Two column, condensed)
Desktop:    1024px - 1440px (Full layout)
Wide:       1440px+         (Centered with max-width)

```

## Accessibility Considerations

### WCAG 2.1 AA Compliance

```
- Color contrast ratio: 4.5:1 minimum
- Focus indicators on all interactive elements
- Keyboard navigation support
- Screen reader announcements for status updates
- Alt text for all screenshots
- Semantic HTML structure

```

### Accessibility Features

```
- High contrast mode toggle
- Reduced motion option
- Font size controls
- Status announcements for screen readers
- Keyboard shortcuts (Space to start, Esc to cancel)

```

## Empty States & Error Handling

### Empty States

```
No URL entered: "Paste your app URL to start testing"
No issues found: "Great news! No issues detected 🎉"
No flows detected: "Hmm, we couldn't find any interactive flows"

```

### Error States

```
Invalid URL: "That doesn't look like a valid URL"
Site unreachable: "Can't reach that site - is it public?"
Test timeout: "Test taking too long - generating partial report"
Agent crash: "Something went wrong - retrying..."

```

## Notification Strategy

### In-App Notifications

```
Test Started:    "Testing started! (~2 minutes)"
50% Complete:    "Halfway done - found X issues"
90% Complete:    "Almost done - generating report..."
Test Complete:   "Report ready! View your results"

```

### Email Notifications (Optional)

```
Subject: "VibeCheck Report: X issues found on [site]"
Preview: "We found X critical issues that need fixing..."
CTA: "View Full Report"

```

## Demo-Specific Features

### Hackathon Presentation Mode

```
- Larger fonts for projection
- High contrast for bright rooms
- Automatic progression (no clicking needed)
- Highlighted multi-agent coordination
- Sound effects for discoveries (optional)
- Split screen showing 4+ agents working
- Real-time issue counter (big, animated)
- Victory animation when test completes

```

### Demo Script UI Support

```
1. URL Input: Pre-filled with demo site
2. Start: Dramatic button animation
3. Progress: Fast-forward option (2x speed)
4. Issues: Highlight as discovered
5. Report: Auto-scroll through findings

```

## Implementation Priority

### Phase 1 (Day 1-2): Core UI

- Landing page with URL input
- Basic progress view
- Simple report display

### Phase 2 (Day 3-4): Polish

- Agent status displays
- Screenshot integration
- Animated transitions
- Mobile responsive

### Phase 3 (Day 5): Demo Mode

- Spectator view
- Live browser previews
- Enhanced animations
- Presentation mode

## Design Principles

1. **Clarity Over Cleverness**: Every element should be immediately understandable
2. **Progress Over Perfection**: Show something happening, even if imperfect
3. **Screenshots Over Descriptions**: Visual proof is more powerful than words
4. **Anticipation Building**: Gradual reveal of findings keeps users engaged
5. **Non-Technical Language**: "Broken" not "500 Error", "Can't click" not "Null pointer"

## Success Metrics

### User Understanding

- User can explain what's happening without help
- Report is actionable without technical knowledge
- Issues are clear enough to fix or delegate

### Engagement

- Users watch the full test (don't abandon)
- Users run multiple tests after fixing issues
- Users share reports with team/developers

### Demo Impact

- Judges understand multi-agent value in <30 seconds
- Clear visualization of parallel testing
- Memorable "wow" moment when issues found live