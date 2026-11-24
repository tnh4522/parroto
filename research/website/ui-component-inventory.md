# Parroto UI Component Inventory

**Target**: `https://parroto.app/`  
**Viewports Inspected**: Desktop (`1280x720`) and Mobile (`390x844`)

---

## 1. Global Navigation & Chrome Components

| Component | Locations Observed | Controls & Behavior | Evidence Reference |
| :--- | :--- | :--- | :--- |
| **Promotional Top Banner** | Top of `/` and App Shell pages | Displays `"Teachers' Day Sale — Celebrate Teachers' Day with 25% off Parroto Lifetime..."` (and switches on mobile initial render to `"Download the Parroto app to learn anytime, anywhere"`). Contains `Claim offer now` button (opens Lifetime Checkout modal), App Store & Google Play badges, and `X` dismiss button. | `ev_ea2ef4ec7ac8e2fd9c91009e76ea59eaf37baaf47449b7db46ced66a59ffe15a`, `ev_66d1e16a7581a26d77fe5f96dd48549f01fc27fab8e6f0c5350a6ce05fefd860`, `ev_b889da4f7a905f1dac9a35ed46b4436bd4b6890889d3d870f15d7aeb46889056` |
| **Marketing Top Header (`banner`)** | `/`, `/login`, `/pricing`, `/about-us`, `/authors`, `/blog`, `/privacy-policy`, `/terms-of-service`, `/contact-us`, `/my-notes`, `/my-vocabulary`, 404 | Desktop: Logo, 5 direct links, `More v` dropdown (8 items with `NEW` badges on `Stories` & `Grammar`), Theme toggle, UI Language menu (17 languages), Settings gear (`Translation Language`), `Login` button. Mobile (`390px`): collapses into Logo + `Toggle menu` hamburger drawer. | `ev_d1b92d71c34e1116acdd3c5bd0a7c0512b51b57428dd391e6da018c508f36850`, `ev_76d68c876e9f1d0eeacf586e9a40cb5a35f4e30d8c7e1aeef51776bde0269bb4`, `ev_24f34861406c3d30e1c8f0a03e934f81afa27dc2fa7550e97512089643f62828` |
| **App Shell Sidebar (`<aside>`)** | `/dashboard`, `/topics`, `/dictation`, `/shadowing`, `/vocabulary`, `/grammar`, `/practice-english-speaking`, `/exams/*`, `/games`, `/vocab-battle`, `/stories`, `/review`, `/community`, `/leaderboard`, `/chat`, `/feedbacks`, `/shop`, `/affiliate`, `/profile`, `/lessons/*` | Collapsible left sidebar (`<< Collapse`, `Scroll for more`) with Learning links, `Community` group, `LOGIN` CTA, and `Translation Language` gear button. Collapses on mobile (`390px`) into an `Open menu` drawer trigger in the compact top bar. | `ev_e7406c1fac39de6df8cef364bcd9ee1bb4046b80986235e54ab844a8c7de3ba6`, `ev_cb5ba38062d80485744efcb19434d1c473edecaa4010c06015e8a974c90dc22f` |
| **App Shell Top Bar** | Same as App Shell Sidebar | Desktop: `Search dictionary` pill button, `Translation Language` gear, Theme toggle, `English v` language selector. Mobile: `[Open menu]` + `[Parroto]` + `[Search dictionary]` icon. | `ev_e7406c1fac39de6df8cef364bcd9ee1bb4046b80986235e54ab844a8c7de3ba6`, `ev_cb5ba38062d80485744efcb19434d1c473edecaa4010c06015e8a974c90dc22f` |
| **Floating Social Share Bar** | Desktop viewports (hidden on `390px` mobile) | Right-edge vertical floating bar with share toggles (Facebook, X, LinkedIn, Telegram, WhatsApp, LINE, Weibo, collapse `>`). | `ev_ea2ef4ec7ac8e2fd9c91009e76ea59eaf37baaf47449b7db46ced66a59ffe15a`, `ev_66d1e16a7581a26d77fe5f96dd48549f01fc27fab8e6f0c5350a6ce05fefd860` |
| **Floating Community Chat Launcher** | Bottom-right of Desktop & Mobile | Circular dark chat icon button with small `X` close badge. | `ev_ea2ef4ec7ac8e2fd9c91009e76ea59eaf37baaf47449b7db46ced66a59ffe15a`, `ev_66d1e16a7581a26d77fe5f96dd48549f01fc27fab8e6f0c5350a6ce05fefd860` |
| **Toast Notification Region** | Global (`region "Notifications (F8)"`) | Displays dismissible status/error toasts (observed red toast `"Error: Unable to load vocabulary cards"` on `/vocabulary/ielts-band-6-7`). | `ev_b237359c78cde90f9467fe24a30f71e0325c13f087d99099c5c44fc866538e14` |

---

## 2. Dialogs & Modals

1. **Login Modal (`Welcome Back`)**:
   - Triggered by `Login` button, `Start Exam`, or hard auth gates (`/profile`, `/affiliate`).
   - Components: `Continue with Google`, `Continue with Apple`, `Enter your email` textbox, `Continue with Email` submit button (disabled on invalid email), Terms/Privacy links, close `X` button, mascot illustration.
   - Evidence: `ev_5319352ab8cb8b7b55b707adf7ef31714a0e89b1eec7dcc460fd309853e48a42`, `ev_971d6eb8dc1431c2a35717c1539ffc4a7f09a735dfd4faea85431375a7ac7643`, `ev_ff319840f3f63f374f8d48466d5e598e111fd6b372af2ea525fe5240df03334d`
2. **Translation Language Modal (`Select Your Translation Language`)**:
   - Triggered by gear icon or first visit to a lesson (`/lessons/dictation/*`).
   - Components: `Translation Language` combobox, `Skip`, `Confirm`, `Close` (`X`).
   - Evidence: `ev_76d68c876e9f1d0eeacf586e9a40cb5a35f4e30d8c7e1aeef51776bde0269bb4`, `ev_bfff84539e7297274eb9a6bcb82ae9a2df35271a3674083d8d8df8da5486e5a0`
3. **Dictionary Modal (`Dictionary`)**:
   - Triggered by `Search dictionary` button in App Shell header.
   - Components: `Search dictionary` textbox, empty-state prompt (`"Type an English word to look up and save to your notebook"`), `Close` button.
   - Evidence: `ev_91c96871902ff6f861311db35edf802432c041dab5904f8e479158e57bf69689`
4. **Lifetime Checkout Modal (`Order Summary`)**:
   - Triggered by `Teachers' Day Sale` promo banner.
   - Components: Payment method tabs (`International Card`, `Domestic Banking`), `Parroto Premium Lifetime` line items (`Subtotal $80`, `Tax $0`, `Discount -30%`, `Total $80`), `Affiliate code` input (`Enter referral code`) + disabled `Apply` button, `contact@parroto.app` link, `Close` button. Observed initial loading spinner prior to render.
   - Evidence: `ev_b889da4f7a905f1dac9a35ed46b4436bd4b6890889d3d870f15d7aeb46889056`

---

## 3. Forms, Inputs & Interactive Controls by Feature Area

- **YouTube AI Lesson Creator** (`/topics`, `/dictation`, `/shadowing`): `Paste a YouTube link here...` textbox + `CREATE LESSON` button (`AI`, `PRO` badges) + quick buttons (`Passive listening`, `YouTube channels`, `Explore community lessons`). (`ev_e7406c1fac39de6df8cef364bcd9ee1bb4046b80986235e54ab844a8c7de3ba6`)
- **Content Filter Bars**:
  - Video topics: `Beginner` / `Advanced` segmented toggle + 25+ hashtag buttons + `More` expander (`ev_e7406c1fac39de6df8cef364bcd9ee1bb4046b80986235e54ab844a8c7de3ba6`)
  - Grammar (`/grammar`): `A1`–`C2` level chips, completion status tabs (`All`, `Not started`, `Learning`, `Reviewing`, `Mastered`), `Search grammar...` input (`ev_a8b0559cbb28098e8012e27a12df8028d82c66550033bdc8cc5156027e776901`)
  - Stories (`/stories`): `All stories` / `Saved` toggle, `All levels` + `A1`–`C2`, `Collection` pills, `Search stories…` input, `Sort` (`Most popular`, `Newest`), `Save` bookmark counter buttons (`ev_7eadb7ead3791439fe974ffe88e6482ff17b1f53bb98324a52907accac3bbd7f`)
  - FAQ (`/`): 7 category filter tabs (`All Questions`, `Our Method`, `Benefits`, `Who It's For`, `Usage Tips`, `Content`, `Technical`) + collapsible accordion items (`ev_b889da4f7a905f1dac9a35ed46b4436bd4b6890889d3d870f15d7aeb46889056`)
- **Dictation Lesson Player** (`/lessons/dictation/[slug]`):
  - `Hide Media` / `Hide Transcript` layout toggles, Video/audio player (`Start`, `Replay`, playhead, volume), Difficulty segmented control (`Easy`, `Normal`, `Hard`), Sentence playback bar (`Previous`, `Replay`, `Play`, `Next`, `1x` speed, settings, keyboard toggle), `Type your answer here...` textarea, per-word reveal eye buttons (`*****`), `SHOW ALL WORDS`, `NEXT >`, collapsible `Comments`, right-hand `Transcript` list with progress `%` (`ev_bf3a3c3e8c37c1389d45ed0eac66e341e82ddbb9ddc1fa1387f6abd09e04d432`)
- **Voice Chat Room Creator** (`/practice-english-speaking`):
  - Level selector (`A1`–`C2`), `TOPICS OF INTEREST` multi-select chips, `Room name *` textbox, `Max members` (`2`, `3`, `4`, `5`), `Public` / `Private` toggle, `CREATE ROOM` button, `Refresh` rooms button (`ev_e6ede8dfbc6dbf91a506e91ad878dfaa8a7ffcdb7d05e869fa732f07111ad67e`)
- **Exam Runner Setup & Comments** (`/exams/ielts/[slug]`):
  - `Test Mode` / `Practice Mode` selector cards, `Start Exam` button, `Write a comment...` input + disabled send button, paginated comment list (`ev_09c6d60021bd8e3d94568749b11863a4b81993da674cc4ed0bbdd3fecc8d24b9`)
- **Community & Shop Controls**:
  - Community (`/community`): `"What are you wondering about?"` composer, `All`/`Favorites`/`Editor's Choice` tabs (`ev_1de3fd7c1c524ad59a23e6a382dd2752789aec6d107103833ffa96fac40ae25c`)
  - Leaderboard (`/leaderboard`): Live countdown timer, `Previous Month` / `Next Month` (`ev_e163b3ec120b9254dc3a4c9cb0853d6afecdbef38e131ca627ee39378312869b`)
  - Shop (`/shop`): `Shop` / `Inventory` tabs, `All` / `Avatar Frames` / `Backgrounds` filters, disabled `Buy` / `Purchase` buttons (`ev_4e4bea54c03e40374c69e1cd1b45eb41407fb180359fe4083ab059ab0739859e`)

---

## 4. Observable UI States (Loading, Empty, Success, Error)

| State Type | Where Observed | Exact Visual / DOM Behavior | Evidence Reference |
| :--- | :--- | :--- | :--- |
| **Loading** | `/pricing` (Paid plan card), `/vocabulary` (Decks area), `/` Checkout modal, `/missions` (`Recent completers`) | Circular spinner icon inside empty card container (`/pricing`, `/vocabulary`, Checkout modal) or `"Loading feed..."` placeholder text (`/missions`). | `ev_643c1003e66d283b4578dadd97de86119e8e67203b66481de6d9037e6948f5b9`, `ev_29f43f7fcf1844ed7c306783045f85ae4f23a2273c26f5cb54e69da7b85ae944`, `ev_b889da4f7a905f1dac9a35ed46b4436bd4b6890889d3d870f15d7aeb46889056`, `ev_a4695936bb0fb7eb5293a3ee9c0061130621049b2ed3fad45b9981e754092bda` |
| **Empty** | `Search dictionary` modal (`/topics`), `0` Diamonds (`/shop`), `0` Streak/XP (`/dashboard`) | Dictionary shows `"Type an English word to look up and save to your notebook"`; Shop/Dashboard show `0` counters and disabled purchase buttons. | `ev_91c96871902ff6f861311db35edf802432c041dab5904f8e479158e57bf69689`, `ev_4e4bea54c03e40374c69e1cd1b45eb41407fb180359fe4083ab059ab0739859e`, `ev_6d4ee75bc4876e06f08adda2876af4dec58519a76f129860b5455726d4248442` |
| **Success / Active** | FAQ filter & expand (`/`), Language dropdown (`/`), Checkout render (`/`), Story reader (`/stories/cinderella`), Free dictation (`/lessons/dictation/first-class-upgrade-perks`) | Expanded FAQ panel displays full answer; Language menu renders 17 languages; Checkout dialog displays discounted Lifetime summary; Free dictation renders interactive player and word masks. | `ev_b889da4f7a905f1dac9a35ed46b4436bd4b6890889d3d870f15d7aeb46889056`, `ev_76d68c876e9f1d0eeacf586e9a40cb5a35f4e30d8c7e1aeef51776bde0269bb4`, `ev_bf3a3c3e8c37c1389d45ed0eac66e341e82ddbb9ddc1fa1387f6abd09e04d432` |
| **Error / Validation** | `/nonexistent-404-check`, `/vocabulary/ielts-band-6-7`, `/login` invalid email | Custom `404 Page Not Found` with `Back to Home` CTA; red toast notification `"Error: Unable to load vocabulary cards"`; `Continue with Email` button becomes `[disabled]` on invalid email input `"not-an-email"`. | `ev_ae1399a19b7dac7f29acefaf972aa8cf113bc2b3b24f00c4b8dbba7c7750e4c9`, `ev_b237359c78cde90f9467fe24a30f71e0325c13f087d99099c5c44fc866538e14`, `ev_971d6eb8dc1431c2a35717c1539ffc4a7f09a735dfd4faea85431375a7ac7643` |

---

## 5. Responsive Layout Observations (Desktop `1280x720` vs. Mobile `390x844`)

- **Homepage (`/`)**:
  - Desktop (`1280x720`) displays horizontal navbar, side-by-side hero text & photo collage, and right-edge floating social share bar (`ev_ea2ef4ec7ac8e2fd9c91009e76ea59eaf37baaf47449b7db46ced66a59ffe15a`).
  - Mobile (`390x844`) hides the desktop nav links and floating share bar, collapses nav into a `Toggle menu` drawer, centers hero text with `Get Started Free` above the collage, and adapts the top banner (`ev_66d1e16a7581a26d77fe5f96dd48549f01fc27fab8e6f0c5350a6ce05fefd860`, `ev_24f34861406c3d30e1c8f0a03e934f81afa27dc2fa7550e97512089643f62828`).
- **App Shell (`/topics`)**:
  - Desktop shows persistent left `<aside>` sidebar + full `Search dictionary` pill + multi-card rows (`ev_e7406c1fac39de6df8cef364bcd9ee1bb4046b80986235e54ab844a8c7de3ba6`).
  - Mobile (`390x844`) hides `<aside>`, shows `[Open menu]` + `[Parroto]` + `[Search dictionary]` icon, stacks cards into horizontally scrollable rows, and exhibits slight horizontal button crowding on the 3 pill buttons (`Passive listening`, `YouTube channels`, `Community`) inside the YouTube AI lesson card (`ev_cb5ba38062d80485744efcb19434d1c473edecaa4010c06015e8a974c90dc22f`).
