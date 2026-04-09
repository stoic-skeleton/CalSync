# CalSync — User Journey Stories

---

## Journey 1: The F1 Fan Who Misses Every Qualifying

**Persona:** Priya, 28. Watches Formula 1 but always misses qualifying because she can never remember the time difference between race weekends.

**Journey:**

1. **Discovers CalSync** via a Reddit post in r/formula1 linking to CalSync.  
2. **Lands on the home page** (`/`) — reads the tagline "Never miss a game again. Sports schedules, synced to your calendar." Immediately understands the value. Clicks "Browse Sports".  
3. **Browses leagues** (`/browse`) — filters by Motorsport. Sees the Formula 1 card with 24 upcoming events. Clicks it.  
4. **Sees the calendar generation option** — clicks "Get Calendar" for Formula 1.  
5. **Arrives at `/get-calendar?leagues=1`** — sees her selection (🏎️ Formula 1), picks **30 minutes** reminder.  
6. **Clicks "Generate Calendar Link"** — instantly gets a modal with her unique feed URL.  
7. **Taps "Apple Calendar"** on her iPhone — Calendar app opens automatically and asks "Subscribe to this calendar?" She taps Yes.  
8. **Next race weekend** — her phone buzzes 30 min before Practice 1, Qualifying, and Race. She never misses a session again.  
9. **Bahrain GP gets postponed** — she wakes up and the event in her calendar has already updated. No manual edits needed.

**Key moments of delight:**
- One tap to subscribe (webcal:// link opens Calendar app directly).
- Reminders baked in — zero setup in the calendar app.
- Schedule changes appear automatically on next poll.

---

## Journey 2: The IPL Die-Hard Following One Team

**Persona:** Arjun, 34. Supports Mumbai Indians religiously. Works shifts and needs alerts only for MI matches, not the whole tournament.

**Journey:**

1. **Finds CalSync** by searching "IPL calendar Google Calendar 2026".  
2. **Browses leagues** (`/browse`) — clicks IPL. Sees all 10 teams listed.  
3. **Clicks Mumbai Indians** — lands on the team page, sees upcoming matches.  
4. **Clicks "Get Calendar"** for Mumbai Indians only.  
5. **Arrives at `/get-calendar?teams=42`** — sees "Mumbai Indians" chip. Picks **60 minutes** reminder (wants time to get home from work before the match starts).  
6. **Generates the feed** — copies the `.ics` URL.  
7. **Opens Google Calendar on desktop** — pastes the URL under "Other calendars → From URL". Calendar syncs immediately.  
8. **Gets a notification** 60 minutes before every MI match with the venue, opponent, and broadcast info already in the event description.  
9. **Mid-season** — MI qualifies for playoffs. New playoff fixtures appear in his calendar automatically within 6 hours of the schedule being announced.

**Key moments of delight:**
- Team-only filtering — only sees MI matches, not 70+ other games.
- 60-min reminder fits his commute pattern.
- Playoff fixtures appear without any action on his part.

---

## Journey 3: The Multi-Sport Household

**Persona:** The Hendersons. Marcus follows the NBA (Lakers), his partner Jess follows MLS (LAFC). They share a family Google Calendar.

**Journey:**

1. **Marcus visits CalSync** — browses Basketball → NBA → Los Angeles Lakers. Gets a Lakers-only feed URL. Adds it to Google Calendar with a 15-min reminder.  
2. **Jess does the same** — browses Soccer → MLS → LAFC. Gets a separate LAFC-only feed URL with no reminder (she prefers just the events, no alarm).  
3. **Both feeds sit in Google Calendar** — Marcus's shows Lakers games in one colour, Jess's LAFC in another.  
4. **They notice a conflict** — Lakers playoff game and LAFC home opener clash on the same Saturday. Visible in one glance on their shared calendar view.  
5. **NBA adjusts a tip-off time** (happens frequently in playoffs) — the event in Marcus's calendar updates automatically on the next poll. No "oh wait, the time changed" confusion.

**Key moments of delight:**
- Two separate feeds, one per person's preferences.
- Reminder can be set independently per feed (15m vs none).
- Different calendar colours keep things visually clear.

---

## Journey 4: The Casual Fan Wanting the Whole Schedule

**Persona:** Sofia, 22. Watches whatever sport is on. Wants all NFL, NBA, and MLS games in one calendar without managing multiple subscriptions.

**Journey:**

1. **Visits `/get-calendar`** with no prior browsing — goes straight to the browse page.  
2. **Selects NFL, NBA, and MLS** on the Browse page (three league chips).  
3. **Arrives at `/get-calendar?leagues=3,4,5`** — sees all three leagues in her summary. Picks **None** for reminders (just wants the events visible).  
4. **Generates the feed** — one URL covers all three leagues' full schedules (1,800+ events).  
5. **Pastes it into Outlook** (work calendar) — subscribes via the Outlook button in the modal.  
6. **Glances at her Outlook week view** — can see at a glance when there's a big game on that evening.

**Key moments of delight:**
- One feed for multiple leagues — no juggling three separate subscriptions.
- Zero reminders (her choice) keeps her calendar clean.
- Works in Outlook, not just Google/Apple.

---

## Journey 5: Operator Checking Feed Adoption

**Persona:** Dev, the CalSync operator. Wants to know which leagues are popular and whether the reminder feature is being used.

**Journey:**

1. **Calls `GET /api/admin/feeds`** (or opens `http://localhost:8000/docs` → admin endpoint in Swagger UI).  
2. **Sees the full list** of generated feed hashes with:
   - `league_ids` — what sport each feed covers.
   - `access_count` — how many times each feed has been fetched by a calendar client.
   - `last_accessed_at` — whether the feed is still actively being polled.
   - `reminder_minutes` — which reminder interval was chosen (or null).
3. **Notices** IPL and Formula 1 feeds have the highest access counts. NBA feeds tend to use 15m reminders.  
4. **Identifies stale feeds** (low access_count, last_accessed_at > 30 days ago) — no one is polling them.  
5. **Uses data** to decide which leagues to add next (e.g. La Liga was requested in the Reddit thread).

**Key moments of delight:**
- Real-time analytics with no extra tooling.
- `reminder_minutes` field shows feature adoption.
- Foundation for a future admin dashboard UI.

---

## End-to-End Flow (Technical Summary)

```
User Action                    System Response
───────────────────────────    ──────────────────────────────────────────────────
Browse /browse                 GET /api/leagues → league cards rendered
Click a league                 GET /api/leagues/{slug} → team list
Click "Get Calendar"           Navigate to /get-calendar?leagues=N
Choose reminder, Generate      POST /api/feeds {league_ids, team_ids, reminder_minutes}
                               → CalendarFeed row created, Redis cache pre-warmed
                               → Modal shows feed_url + webcal_url
Click platform button          Calendar app opens / subscribes (webcal://)
Calendar app polls             GET /cal/{hash}.ics
                               → Redis hit → return cached ICS (fast path)
                               → Redis miss → PostgreSQL query → build_ics()
                                  → VALARM injected per event if reminder_minutes set
                                  → cache result → return bytes
                               → access_count++ on CalendarFeed
Backend scheduler fires        Every 6h: all adapters re-ingest from external APIs
                               → upsert events → Redis cache invalidated
Calendar app re-polls          Gets updated ICS with new/cancelled/rescheduled events
User gets notification         Calendar app fires VALARM N minutes before event start
```
