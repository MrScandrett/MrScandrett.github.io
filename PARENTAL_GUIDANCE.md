# Parental Guidance Policy
**Mr. Scandrett's ClassroomOS — Christian K-12 Homeschool STEAM Lab**
Last reviewed: 2026-04-20

---

## Purpose

This document defines the content standards, approval statuses, and grade-band rules that govern every student-facing link, tool, media item, and page in this repository. It is the single source of truth for what is permitted, restricted, or prohibited. Any new external resource must pass this checklist before it is added to the site.

---

## Pass / Fail Criteria

### 1. Worldview Fit
**Fail if the tool or destination:**
- Normalizes occultism, witchcraft, astrology, or anti-Christian spiritual frameworks as fact or lifestyle
- Presents sexual content, gender ideology, or anti-family messaging as educational baseline
- Frames Christianity, theism, or traditional family structure as hostile, primitive, or harmful
- Uses crude or profane humor, innuendo, or shock content as part of the core experience

**Pass examples:** NASA science pages, Khan Academy, Britannica, Scratch, PhET simulations, Google Arts & Culture, Smithsonian Learning Lab.

### 2. Age Appropriateness
**Fail if the tool or destination:**
- Is rated or self-described as 13+ or 17+ and the student audience is younger
- Contains content that a reasonable Christian parent would consider emotionally or developmentally inappropriate for the assigned grade band
- Requires account creation from minors without explicit parental/teacher control

**K-5 standard is strictest.** When in doubt, escalate to Teacher Only.

### 3. Violence and Fear
**Fail if:**
- Primary game loop centers on graphic combat, gore, or killing
- Imagery is disturbing, horror-themed, or designed to frighten
- Combat or war is presented without any historical, strategic, or educational framing

**Pass with guidance if:** war or death appears in a clearly educational historical context (Oregon Trail, Freeciv with teacher framing, Age-of-Empires-style strategy used for systems thinking).

### 4. Language and Tone
**Fail if:**
- Profanity, slurs, sexual language, or crude humor appears in the tool's own UI or default content
- The site's marketing copy or community highlights use language incompatible with a Christian classroom
- Peer-generated content is prominently surfaced without moderation (comments, feeds, forums)

### 5. AI Use
**Fail if:**
- The AI tool has no usage guardrails for minors and is linked without a classroom pledge or teacher gate
- The AI workflow is designed to replace student thinking rather than scaffold it
- The AI tool accesses student personal data without transparent disclosure

**Pass with guidance if:** an AI pledge or classroom agreement is displayed before access (existing pledge modal in this site qualifies).

### 6. Privacy and Community Risk
**Fail if:**
- The site enables unmoderated public chat, DMs, or social feed browsing by default
- Algorithmic recommendation sidebars can lead students to unrelated content within 1–2 clicks
- Students can post publicly, follow strangers, or be followed without teacher awareness
- Account creation collects student PII without a school-appropriate privacy policy (COPPA/FERPA)

### 7. Ads, Upsells, and UGC Feeds
**Flag for review if:**
- The tool shows display ads, sponsored content, or age-inappropriate advertising
- The homepage or dashboard surfaces user-generated content feeds that are not curated for minors
- Aggressive account-creation prompts or paywalls interrupt the student workflow

---

## Approval Statuses

| Status | Meaning |
|---|---|
| `Approved` | Safe for all students in the listed grade band, no teacher escort needed |
| `Approved — Teacher Guidance` | Safe for use, but teacher should frame the task; tool has some risk factor (AI, community content, mature topics) |
| `Needs Age Gate` | Content is appropriate for older students only; must be hidden from lower grade bands |
| `Teacher Only` | Visible only to teacher; not surfaced to students in Student Mode |
| `Remove` | Remove from the site entirely; risk outweighs educational value |

---

## Grade Bands

| Band | Grades | Standard |
|---|---|---|
| `K-2` | Kindergarten–2nd | Heavily curated. No external community content. No accounts unless district-issued. No AI tools. |
| `3-5` | 3rd–5th | Guided creation and research. Limited external discovery. AI tools require pledge + teacher. |
| `6-8` | 6th–8th | Guided research and collaboration. Broader tool access. AI requires pledge. Community tools need teacher gate. |
| `9-12` | 9th–12th | Broadest access. Still filtered for worldview and maturity. Developer/platform tools permitted with teacher framing. |
| `Teacher` | Staff only | Visible in Teacher Mode only; never shown in Student Mode regardless of grade. |

**Default conservative rule:** When a tool's minimum grade is uncertain, assign the higher grade band.

---

## Student Mode Enforcement Rules

When the site is in **Student Mode**:
- `Teacher Only` and `Remove` tools are hidden from all tile grids and search results
- `Needs Age Gate` tools are hidden unless the selected grade level meets or exceeds the minimum band
- `Approved — Teacher Guidance` tools remain visible but should carry a visible guidance badge
- The AI pledge modal must be completed before any AI tool opens

---

## Maintenance Requirements

Before publishing any new resource:
- [ ] No new external domain without a completed PG review entry in `parental-guidance-inventory.csv`
- [ ] No new student-facing media without thumbnail and descriptive text review
- [ ] No new AI tool without teacher-guidance language and explicit grade band assignment
- [ ] No new game without checking: is the primary mechanic combat/gore? Does the site have unmoderated community content?
- [ ] Review the `parental-guidance-inventory.csv` file at least once per semester

---

## Quick Reference — High-Risk Tool Categories

| Category | Default posture |
|---|---|
| AI chat/image/video generators | 6-8 minimum with pledge; Teacher Only for platform/console tools |
| Community art galleries (ArtStation, DeviantArt) | Teacher Only — mature portfolio content is common |
| Game asset stores with UGC | Teacher preview required before student access |
| ROM/emulator sites | Teacher Only — unvetted game library |
| Retro OS parodies (Windows 93) | Teacher Only — "hacker culture," unpredictable content |
| Social/music platforms with community feeds | Teacher Guidance minimum; verify education-specific subdomain |
| Open-source game lists (GitHub) | Teacher Only — unfiltered repository lists |
| Video generation AI (Sora) | 9-12 Teacher Guidance only |
| Developer consoles (OpenAI Platform, Anthropic Console) | Teacher Only |

---

*This policy applies to all HTML pages, data JSON files, lesson references, video library items, and student project templates in this repository.*
