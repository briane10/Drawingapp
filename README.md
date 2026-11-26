# ✏️ Sketch Quest

A drawing course that takes you from your **first wobbly line to realistic, full-color animal drawings**.
Built for **iPad + Apple Pencil**, fun for ages 10 and up.

## What's inside

- **10 worlds, 50+ lessons**: Line Land → Shape Town → Seeing Forest → Form Mountains → Perspective City →
  Shadow Valley → Motion Plains → Master's Studio → Realism Ridge → 👑 **Boss Mode**
- **Instant feedback**: most exercises are scored automatically (line accuracy, circle roundness,
  value scales, shading, color likeness) with friendly tips from Pip the pencil.
- **Animals that get more realistic as you level up**:
  - 🙂 Cartoon: fish, snail, cat face, owl
  - ✏️ Simplified with construction shapes: bird, turtle, bunny, penguin, puppy
  - 🌗 Shaded with real light & shadow: fox, elephant, horse, lion, dragon
  - 📷 Realistic anatomy, fur and eyes: wolf, house cat
  - 👑 **Boss Mode**: full-color realistic drawings with the grid method, from a built-in reference or **your own photo**
    (outline → shadow map → local color → values → texture → details). Saves as you go.
- **Every new exercise is different**: lines, shapes, 3D boxes, perspective scenes, poses and shaded forms are generated fresh.
- **Game stuff**: XP and ranks (Doodler → Legend), stars, badges, daily warm-ups, streaks, a practice gym,
  and **My Zoo**, which collects every animal you draw (plus "first try vs now" comparisons).

## Apple Pencil

- Pressure changes line thickness.
- **Palm rejection**: once the Pencil is detected, fingers don't draw (you can turn finger drawing back on in *Me → Settings*).
- **Two-finger tap = undo**, three-finger tap = redo.
- Tools: pencil (light / medium / dark), pen, marker, color pencil, soft pastel, eraser, full color picker.

## Install on your iPad

The app is a web app you add to your Home Screen. It opens full-screen and works offline.

1. **Host it** (one time). Open the repository's **Settings → Pages** (the repo's settings, not your account's).
   Under *Build and deployment*, choose **Source: Deploy from a branch**, pick this branch and the **/ (root)** folder,
   then **Save**. After a minute the app is live at `https://<your-username>.github.io/<repo-name>/`.
2. On the iPad, open that link in **Safari**.
3. Tap **Share ⬆︎ → Add to Home Screen → Add**.
4. Open **Sketch Quest** from your Home Screen.

Progress and drawings are saved on the device. Use *Me → Settings → Back up progress* to keep a copy.

## Run locally

No build step, no dependencies:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Code map

| File | What it does |
| --- | --- |
| `js/canvas.js` | Drawing board: Pencil pressure, palm rejection, gestures, undo/redo |
| `js/curriculum.js` | All worlds and lessons (theory + exercise settings) |
| `js/animals.js` | Step-by-step animal drawings and their realism levels |
| `js/generators.js` | Procedural exercise targets (lines, boxes, perspective, poses, shaded forms) |
| `js/scoring.js` | Auto-scoring and feedback tips |
| `js/realism.js` | Shaded and colored 3D-looking animal references |
| `js/exercise.js` | Lesson runner for every exercise type, including Boss Mode |
| `js/store.js` | Progress, XP, badges, streaks (localStorage), drawings and saved projects (IndexedDB) |
| `js/views.js`, `js/app.js` | Screens and navigation |
