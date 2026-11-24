# Parroto Authentication & Subscription Boundaries

**Target**: `https://parroto.app/`  
**Observation Constraint**: Investigated strictly as an unauthenticated guest without credentials or restriction bypass.

---

## 1. Authentication Mechanism Observed

- **Auth Providers** (observed on `/login` `ev_3fb547403619103a7f2e8b2f253f9f0450c37747b32c0bc174f4fff9ac2cd23e` and Login modal `ev_5319352ab8cb8b7b55b707adf7ef31714a0e89b1eec7dcc460fd309853e48a42`):
  - **OAuth**: `Continue with Google`, `Continue with Apple`
  - **Email**: `Enter your email` input + `Continue with Email` button (client-side email validation disables `Continue with Email` when invalid email syntax such as `"not-an-email"` is entered — `ev_971d6eb8dc1431c2a35717c1539ffc4a7f09a735dfd4faea85431375a7ac7643`).
- **Observed Auth Client State** (from `inspect_web_page` storage inventory `ev_7a1e7660783ab55108f78dea50b311774befc6c7e49719b526dc00e6cc1622b1`):
  - IndexedDB databases `firebase-heartbeat-database` and `firebaseLocalStorageDb` are present (indicating Firebase Authentication / client persistence; exact token values redacted by REA).

---

## 2. Classification of Access Boundaries

Parroto enforces **four distinct boundary patterns** across the site:

### Boundary Type A: Hard Route-Level Auth Gates (Blocked Unauthenticated)
| Route | Enforcement Behavior | Observable UI | Evidence Reference |
| :--- | :--- | :--- | :--- |
| `/profile` | App shell renders with empty `<main>`, immediately opens blocking **`Welcome Back` Login Modal**. | `Welcome Back` modal (`Google`, `Apple`, `Email`). | `ev_bffb35005e628fd97d0ef8b80aa48c2fa7ba363e5e8310341c643306436badf4` |
| `/affiliate` | App shell renders with empty `<main>`, immediately opens blocking **`Welcome Back` Login Modal**. | `Welcome Back` modal (`Google`, `Apple`, `Email`). | `ev_943885070e6c9e2fdcc4bf7b6c5837726094e44112e714ca0dcb631f047bcf9a` |
| `/my-notes` | Marketing navbar + footer render; `<main>` is replaced inline by the **`Welcome Back` Login form**. | Full login card at `/my-notes`. | `ev_669b86436774819a0cbe4faf2e60ed8ebd0395ed7d003809fd3eafbbf0f7847d` |
| `/my-vocabulary` | Marketing navbar + footer render; `<main>` is replaced inline by the **`Welcome Back` Login form**. | Full login card at `/my-vocabulary`. | `ev_59aebc4ef59fe393a72d09185e9bbcbe6d790f1343d3bc0d4e4e8fab9926c130` |
| `/review` | App shell renders a dedicated **auth gate screen** inside `<main>`. | `"Unlock Your Review Journey"` + `"Sign in to Start"` button. | `ev_32070082b86a94057828e407349c777abea31cd2b9faccedb01cfa4c611e97d4` |

### Boundary Type B: Feature-Level Auth Gates (Public Shell, Gated Action)
| Route | Publicly Accessible Part | Auth-Gated Functionality | Evidence Reference |
| :--- | :--- | :--- | :--- |
| `/practice-english-speaking` | Level buttons (`A1`–`C2`), topic chips, `Create a Room` UI, `Available Rooms` header. | Voice Chat (`"Please log in to use Voice Chat."` + `Log In` button; `CREATE ROOM` blocked/disabled). | `ev_e6ede8dfbc6dbf91a506e91ad878dfaa8a7ffcdb7d05e869fa732f07111ad67e` |
| `/exams/ielts/parroto-ielts-2026-reading-test-1` | Exam structure, `Test Mode` / `Practice Mode` selection, public user scores & comments (`4464`). | Clicking **`Start Exam`** opens the **`Welcome Back` Login Modal**. | `ev_09c6d60021bd8e3d94568749b11863a4b81993da674cc4ed0bbdd3fecc8d24b9`, `ev_ff319840f3f63f374f8d48466d5e598e111fd6b372af2ea525fe5240df03334d` |
| `/vocabulary/ielts-600` (Free deck) | Deck description, FAQ, and `24 words from this deck` preview table. | Interactive flashcard study (`"Login Required — You need to login to learn vocabulary"` + `Login` button). | `ev_ab4119e816060ee9e9f16070058b093cf38a7beec06cb3cd49bd421dd03aafd7` |
| `/vocab-battle` | Game intro + Top 10 PvP Leaderboard. | Matchmaking (`"Log in to play Vocab Battle and challenge other players!"`, `Log In` button, `[disabled]` `Find Match`). | `ev_6df3a4e49dbe4df3e8059dca6959a1e64fb76be87853dbec1d8f76b8b159807c` |
| `/missions` | Page header + `Recent completers` feed container. | Starting/completing daily missions (`"Log in to start today's missions"` + `Log in` button). | `ev_a4695936bb0fb7eb5293a3ee9c0061130621049b2ed3fad45b9981e754092bda` |
| `/topics`, `/dictation`, `/shadowing` | Browsing & playing free video lessons. | Creating custom lessons from YouTube (`"Sign in to create your own lesson"`, also badged `AI` + `PRO`). | `ev_e7406c1fac39de6df8cef364bcd9ee1bb4046b80986235e54ab844a8c7de3ba6` |
| `/community` | Reading forum posts & topic filters. | Viewing `My Stats` (`"Login to see your stats"`) and user-specific actions (favorites/posting). | `ev_1de3fd7c1c524ad59a23e6a382dd2752789aec6d107103833ffa96fac40ae25c` |
| `/feedbacks` | Reading average rating (`4.1`), 45 reviews, and Parroto Team replies. | Submitting feedback (`"Log in to share feedback"` + `Log in now` button). | `ev_4c0d63edc51b421df85b3a529ac5a4297cbac1d73504dc082d4042a37e36d7c3` |
| `/shop` | Browsing Streak Freeze, Avatar Frames, Backgrounds. | `Buy` / `Purchase` buttons `[disabled]` (requires account + diamonds); `Inventory` requires account. | `ev_4e4bea54c03e40374c69e1cd1b45eb41407fb180359fe4083ab059ab0739859e` |
| `/chat` | Reading `Community Chat` stream & milestone broadcasts. | `Friends` tab / sending private chat (per `/privacy-policy`, private chat also requires one-time date-of-birth age verification). | `ev_04dbe47dea029e373eb9694341470dfc8ad066f7c147fa496a24b7cddbc8f604`, `ev_38d0bc917c88832d9782e3592db4cea189a67fd8d71c48647ac4879964e75dd6` |
| `/dashboard` | Guest shell (`0 days`, `0 XP`), `Quick review`, featured lessons. | Synced user progress, check-in rewards, and saved streak freezes (requires account). | `ev_6d4ee75bc4876e06f08adda2876af4dec58519a76f129860b5455726d4248442` |

### Boundary Type C: Subscription / `PRO` Paywall Boundaries
| Content / Feature | Free vs. PRO Boundary | Observed Paywall UI | Evidence Reference |
| :--- | :--- | :--- | :--- |
| `PRO`-badged Video Lessons (e.g., `/lessons/dictation/holiday-shipping-hustle`) | Video media metadata & comment count load, but interactive dictation workspace and transcript text are locked. | `"Premium Feature — This lesson is for PRO accounts. Upgrade your account to access all exclusive lessons."` + **`UNLOCK PRO`** button; transcript lines masked as `** *****`. | `ev_87e6cc2275dda71b25029a54b450d5a5b9cb990f268a0a63468f905c13b33a6a` |
| `PRO`-badged Vocabulary Decks (e.g., `/vocabulary/ielts-band-6-7`, `IELTS Band 8-9`, `ETS TOEIC`, `Common TOEIC Idioms`) | Marked `PRO` on `/exams/ielts` and `/exams/toeic`; deck detail shows `Login Required` + error toast `"Error: Unable to load vocabulary cards"` unauthenticated; FAQ states `"a few advanced decks are reserved for PRO members"`. | `Login Required` card + error toast (`Notifications (F8)`). | `ev_b237359c78cde90f9467fe24a30f71e0325c13f087d99099c5c44fc866538e14`, `ev_f064a605f24b055ef731d2d89abbc883c1835d694a4f4684ea9516de53bef5ad` |
| YouTube AI Lesson Generator (`/topics`, `/dictation`, `/shadowing`) | Badged both `AI` and `PRO`, accompanied by `"Sign in to create your own lesson"`. | Requires both authentication and `PRO` status. | `ev_e7406c1fac39de6df8cef364bcd9ee1bb4046b80986235e54ab844a8c7de3ba6` |
| Paid Plans (`/pricing` & Promo Checkout Modal) | `/pricing` lists Free vs. Premium (1m / 3m / 1y one-time payment; Pro decks, priority support, ad-free); Promo banner opens `Order Summary` for `Parroto Premium Lifetime` (`Subtotal $80`, `Discount -30%`, `International Card` / `Domestic Banking`, `Affiliate code`). | Checkout dialog & Pricing FAQ. | `ev_643c1003e66d283b4578dadd97de86119e8e67203b66481de6d9037e6948f5b9`, `ev_b889da4f7a905f1dac9a35ed46b4436bd4b6890889d3d870f15d7aeb46889056` |

### Boundary Type D: Fully Public Pages (No Auth or Subscription Observed)
- `/` (Homepage), `/login`, `/pricing`, `/about-us`, `/about-us/advisors`, `/authors`, `/blog`, `/privacy-policy`, `/terms-of-service`, `/contact-us`, `/grammar`, `/grammar/[slug]` (tested `/grammar/subject-pronouns`), `/stories`, `/stories/[slug]` (tested `/stories/cinderella`), `/shorts`, `/games`, `/vocabulary`, `/vocabulary/word-rain`, `/leaderboard`, and free dictation lessons (`/lessons/dictation/first-class-upgrade-perks`).

---

## 3. Inaccessible Authenticated Paths (Recorded Without Probing Private Data)

- Authenticated user-specific exam session endpoints/routes (`/exams/sessions/*`, `/exams/sessions/analytics`, `/exams/sessions/history`), personal notes (`/my-notes`), personal vocabulary (`/my-vocabulary`), SRS review queue (`/review`), user profile (`/profile`), and affiliate commissions/payouts (`/affiliate/*`) are gated behind login and were **not** accessed beyond their public auth boundaries.
