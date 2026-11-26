# 🏈 Play Caller

A live play-calling game for NFL and college football. Everyone watches the game on TV and,
before every snap, calls the next play on their phone or iPad:

- **Run or Pass**: 10 pts
- **Direction** (left / middle / right): +5
- **Distance** (< 5, 5–9, 10+ yards): +5
- 🚨 **Red zone**: how the drive ends (TD / FG / nothing): 20 pts

Players can be anywhere with internet. The leaderboard updates live on every device.

## How a game runs

1. The **host** taps **Start a new game**, picks today's game from the ESPN schedule, and shares the code (📤 button).
2. Players open the link (or type the code), pick a nickname and avatar, and start calling plays.
3. The host taps the big **🔒 LOCK** button at every snap. Picks can't be changed after that,
   and the next play opens right away.
4. Results arrive from ESPN's live play-by-play automatically (usually 10–60 seconds after the play),
   and everyone's score updates.
5. When a team gets inside the 20, the red zone call opens by itself and locks at the next snap.

**Host tips**
- Keep the host's phone or iPad **awake and on the game screen**. It's the one that reads ESPN.
  If it has to leave, any other device can tap *Make this device the host*.
- The app learns how far your TV is behind live (cable is ~5–10 s, streaming 20–60 s) from your
  first few lock taps, so the first results take a few plays to show up.
- Don't tap LOCK on kickoffs. Tapping it on a punt, field goal, or a play that gets
  flagged before the snap is fine: that round just doesn't count.
- If ESPN is slow or wrong, use **Enter result** or **Fix** in the play log. Scores recalculate for everyone.
- No game feed? Pick *No game feed* and enter each result yourself.

## One-time setup (Supabase, free)

The game needs a small online database so phones in different places can share a leaderboard.

1. Go to [supabase.com](https://supabase.com), sign up, and create a **New project** (free plan; any name/region; save the database password somewhere).
2. When it's ready, open **SQL Editor → New query**, paste everything from [`supabase.sql`](supabase.sql), and press **Run**.
   It should say *Success. No rows returned*.
3. Open **Project Settings → API** (or **Connect**) and copy:
   - the **Project URL** (`https://xxxx.supabase.co`)
   - the **anon public** key (or the **publishable** key, `sb_publishable_…`)

   ⚠️ Never use the `service_role` / secret key.
4. Put both into [`js/config.js`](js/config.js). Or, without editing files: open the app,
   tap **Connect Supabase** on the home screen and paste them. Invite links you share from that
   device will carry the settings to the other players.

The URL and anon key are meant to be public. The database rules only allow game actions, and the
database itself refuses picks made after LOCK. Anyone with a game code can join that game,
so use nicknames.

Without Supabase the app runs in **test mode**: it works between tabs on one device, handy for trying it out.

## Install on phones / iPads

Open the game link in Safari (or Chrome), then **Share → Add to Home Screen**.
The game is hosted with the rest of this repo on GitHub Pages at `https://<user>.github.io/<repo>/playcall/`.

## Where the data comes from

ESPN's public scoreboard and play-by-play feeds (`site.api.espn.com`). They're free and need no key,
but they're unofficial, so ESPN could change them without notice. If that happens, the host can
still run the game by entering results by hand.

Run vs pass, direction, and yards are read from the official play descriptions
(e.g. *"pass short right to … for 12 yards"*, *"up the middle for 4 yards"*, *"rush left for 6 yards gain"*).
Sacks and scrambles count as passes, and runs between the guards count as *middle*.
