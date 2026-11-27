# 🕰️ Murder at Marrowby Manor

A murder mystery party game for **3–7 detectives, ages 10+**. Think *Clue* meets *Knives Out*.

Grandpa Ozzie Marrowby, the world's most famous puzzle-maker, is found in the bolted Clock Tower on his 80th
birthday. It looks like an accident. It isn't. Six suspects, one culprit, and 90 minutes until the
snowplow (and the police) arrive at midnight.

- **The TV board:** an iPad cast to the TV shows the story, the mansion map, the suspects, objections, and the big reveal.
- **Phones:** each detective searches rooms, questions suspects, tests theories, keeps a notebook and deduction grid, and makes the final accusation.

## Modes

| | 👥 Team mode | 🕵️ Individual mode |
| --- | --- | --- |
| Who's a "detective"? | Each team (2 or 3 teams) | Each player |
| Notebook | Shared by the team, on every teammate's phone | Your own |
| Actions per round | 3 searches · 2 questions · 1 theory | 2 searches · 1 question · 1 theory |
| Accusation | One per team | One per player |

| Difficulty | Rounds | Extras |
| --- | --- | --- |
| 🙂 Easy | 7 | More Case Cards, the grid marks them for you, hints when a clue contradicts a statement, no penalty for wrong objections |
| 🧐 Normal | 6 | Wrong objections −5 |
| 😈 Hard | 5 | Fewer Case Cards, no hints, wrong objections −10 |

## How a round works

Each round is 15 minutes of game time (10:30 PM → midnight):

- 🔍 **Search a room**: each search finds the next clue there. Some clues only show up in later rounds.
- 🗣️ **Question** a suspect (or Pembrook the butler). Some of them lie.
- 💭 **Test a theory** (*Clue*-style): name a suspect, method, room and motive. The next detective holding one of those
  as a **Case Card** secretly shows it to you. Case Cards are things that are definitely *not* the answer.
  Not every card is dealt, so “nobody could disprove it” is **not** proof!
- ⚡ **Objection!** (*Ace Attorney*-style): when a clue proves a statement is a lie, object with it in your Notebook.
  +15 points, the TV shows a big **OBJECTION!**, and the suspect tells the truth. Every suspect has a secret,
  so not every liar is the culprit.
- 📨 **Share** clues or Case Cards with another team or player (or don't).

The next round starts automatically when every detective has used their actions, or when the host taps **Next round**.

**Scoring:** Who 40 · How 20 · Where 20 · Why 20 · +10 per round left if you lock in early *and* get Who right ·
±objections.

## Three endings

The game randomly picks one of **three different solutions** each time (like the three endings of the 1985 *Clue* movie).
The clues, the lies and who gets framed all change with it, so the same family can play it three times.
The obvious answer is always a trap.

## Filmed scenes

[`SCRIPTS.md`](SCRIPTS.md) (or **🎬 Filming scripts** in the app) has an opening scene and three reveal scenes to
film at home. Upload them to YouTube as *Unlisted* and paste the links on the board under **🎬 Your filmed
scenes**. Without videos, the board shows the story as text and can read it aloud.
⚠️ The reveal scripts contain spoilers.

## Setup (one time)

The game uses the **same free Supabase project as Play Caller**. It just needs its own tables:

1. Open [`setup.html`](setup.html) in the app (or copy [`supabase.sql`](supabase.sql)).
2. In Supabase → **SQL Editor → New query**, paste it and press **Run**. It should say *Success. No rows returned*.

That's it. `js/config.js` already has the project URL and public key.
Without a database the game runs in **test mode** (tabs on one device), handy for trying it out.

## Playing

1. On the iPad: open `https://<user>.github.io/<repo>/mystery/`, tap **Start a new game**, and cast the screen to the TV
   (AirPlay → Screen Mirroring).
2. Everyone opens the same link on their phone, taps **Join**, and types the code from the TV.
3. Pick Team or Individual mode and a difficulty, then **Start the mystery**.

Tip: in the iPad's Settings → Display & Brightness, set **Auto-Lock** to *Never* during the game
(the board also asks the screen to stay awake).

## Code map

| File | What it does |
| --- | --- |
| `js/case.js` | The whole case: suspects, rooms, clues, statements, lies, and all three endings (**spoilers!**) |
| `js/engine.js` | Rules: dealing Case Cards, replaying moves into notebooks, theories, objections, scoring |
| `js/store.js` | Supabase + local test-mode data layer |
| `js/app.js` | The TV board and phone screens |
| `supabase.sql` | Tables, plus database rules that enforce the per-round action limits |

Every device replays the same list of moves to build each detective's notebook, so the database never stores
clue text. A determined kid with developer tools could still peek, so it's family-game-night safe, not cheat-proof.
