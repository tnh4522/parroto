# Parroto Route Candidates (Static vs. Runtime Verified)

**Target**: `https://parroto.app/`  
**Evidence References**:
- **Authoritative Next.js Build & SSG Manifests**: `_buildManifest.js` & `_ssgManifest.js` (`steps/313` / `steps/342`, build `hUvNpCe7E_Hr-Ai_sSmoX`, **82 Next.js page entries** in `sortedPages`, **65 SSG routes** in `__SSG_MANIFEST`)
- **Static AST Route Extraction**: `analyze_web_bundle` (`ev_1dc77cbcbcb2c41259a42a427276fb24aad86410276ffa1009d9f7be6e3b92c7` / `ev_cf679c41eb6197ca02b716eacdc752468a9bc323e27a53bc72f18f2fb1ff2288` — 74 static path patterns, 211 occurrences across 46 homepage scripts)
- **Runtime Verification**: Phase 1 `capture_browser_scenario` checks (45 directly tested routes/URLs) and runtime `/_next/data/hUvNpCe7E_Hr-Ai_sSmoX/*.json` fetches (`ev_d70629d2c51d537ea29e7cfb0000c21a2efecd89b62243928706855c0eac1d2c`)

---

## 1. Complete Next.js Route Table from `_buildManifest.js` (`sortedPages`)

*(Confidence: **High / Static Build Manifest** for route existence in the client build; **Runtime Verified** only where noted from Phase 1/2 browser observations. Internal Next.js entries `/_app`, `/_error`, `/404`, and `sitemap-*.xml` are separated at the bottom.)*

### A. Marketing, Auth, Billing & Info Routes
| Route Pattern | In `_ssgManifest` | Runtime Status Observed | Chunk Entry (`pages/...`) |
| :--- | :---: | :--- | :--- |
| `/` | Yes | Verified Public (`ev_7a1e7660...`) | `pages/index-6f4afc05d397fa22.js` |
| `/login` | Yes | Verified Public (`ev_3fb54740...`) | `pages/login-fc17acec50b07863.js` |
| `/auth/action` | No | Unvisited (Firebase email-link / action handler) | `pages/auth/action-1923cbe291d72969.js` |
| `/pricing` | Yes | Verified Public (`ev_643c1003...`) | `pages/pricing-7cfdda568fdde10a.js` |
| `/checkout` | Yes | Unvisited | `pages/checkout-cd590d070b0a02a3.js` |
| `/activation` | Yes | Unvisited (gift/code activation page) | `pages/activation-f11aed67cc130c1d.js` |
| `/link` | Yes | Unvisited | `pages/link-61253e1ce1131093.js` |
| `/about-us` | Yes | Verified Public (`ev_29e2dfc0...`) | `pages/about-us-86118884d00b562d.js` |
| `/about-us/advisors` | Yes | Verified Public (`ev_428e6480...`) | `pages/about-us/advisors-68d2fbc69d827b0d.js` |
| `/authors` | Yes | Verified Public (`ev_d1ad9f0c...`) | `pages/authors-647e2f577233b7e5.js` |
| `/contact-us` | Yes | Verified Public (`ev_e249b624...`) | `pages/contact-us-a7285e8dfe5c5998.js` |
| `/privacy-policy` | Yes | Verified Public (`ev_38d0bc91...`) | `pages/privacy-policy-dcffd50419c28ef1.js` |
| `/terms-of-service` | Yes | Verified Public (`ev_1acb7253...`) | `pages/terms-of-service-032acc77d53c8f10.js` |

*(Note: `/blog`, `/blog/categories/[slug]`, and `/blog/[slug]` were observed live in Phase 1 [`ev_9d629e9d6a55deded2580fa0dc48dff4ea5d4a26870718fcb4b34cd13cfd1f8f`] and appear in `_buildManifest.js` `__rewrites.afterFiles` `/:nextInternalLocale(...)/blog/:path*`, indicating `/blog` is rewritten/served separately from `sortedPages`.)*

### B. Core Learning, Lessons, Vocabulary, Grammar & Stories Routes
| Route Pattern | In `_ssgManifest` | Runtime Status Observed | Chunk Entry (`pages/...`) |
| :--- | :---: | :--- | :--- |
| `/dashboard` | Yes | Verified Guest Shell (`ev_6d4ee75b...`) | `pages/dashboard-33c0c7d2537f465e.js` |
| `/topics` | Yes | Verified Public (`ev_e7406c1f...`) | `pages/topics-8eab54cdd5a6edc5.js` |
| `/topics/[slug]` | Yes | Linked in DOM (`/topics/ielts-listening`, `/topics/toeic-listening`) | `pages/topics/[slug]-db2368136a2fcd3b.js` |
| `/dictation` | Yes | Verified Public (`ev_4fe831b3...`) | `pages/dictation-5bd8446c3c4c540b.js` |
| `/shadowing` | Yes | Verified Public (`ev_ddf72275...`) | `pages/shadowing-d0d09eb12a7e8226.js` |
| `/lessons/dictation/[lessonSlug]` | Yes | Verified Free (`ev_bf3a3c3e...`) & PRO Gate (`ev_87e6cc22...`) | `pages/lessons/dictation/[lessonSlug]-01fe17e6d24da86f.js` |
| `/lessons/shadowing/[lessonSlug]` | Yes | Verified Load (`ev_ee5f8906...`) | `pages/lessons/shadowing/[lessonSlug]-7c8d157924f8ffda.js` |
| `/shorts` | Yes | Verified Public (`ev_f0307284...`) | `pages/shorts-b07bc1cc0745a95e.js` |
| `/community-lessons` | Yes | Unvisited (linked as `Explore community lessons` on `/topics`) | `pages/community-lessons-9dbc17ad4c7c4c53.js` |
| `/community-lessons/channels` | Yes | Unvisited (linked as `YouTube channels` on `/topics`) | `pages/community-lessons/channels-73d1ad029892cf18.js` |
| `/community-lessons/channels/[channelId]` | Yes | Unvisited | `pages/community-lessons/channels/[channelId]-9f4f7532e03491ad.js` |
| `/community-lessons/tags` | Yes | Unvisited | `pages/community-lessons/tags-0ad5592d95ab2e9e.js` |
| `/community-lessons/tags/[slug]` | Yes | Unvisited | `pages/community-lessons/tags/[slug]-ea22d24f74316bb7.js` |
| `/community-lessons/[id]/edit` | Yes | Unvisited | `pages/community-lessons/[id]/edit-905ff77d6821d656.js` |
| `/dictionary/[word]` | Yes | Unvisited | `pages/dictionary/[word]-4635355c271bfce6.js` |
| `/grammar` | Yes | Verified Public (`ev_a8b0559c...`) | `pages/grammar-bcf3b3b0396e59fb.js` |
| `/grammar/[slug]` | Yes | Verified Public (`/grammar/subject-pronouns`, `ev_50fb38ef...`) | `pages/grammar/[slug]-e2b35cd7ff73b309.js` |
| `/grammar/my-learning` | Yes | Unvisited | `pages/grammar/my-learning-090aff1cc59803a4.js` |
| `/grammar/review` | Yes | Unvisited | `pages/grammar/review-52f303567ff7faf7.js` |
| `/stories` | Yes | Verified Public (`ev_7eadb7ea...`) | `pages/stories-cda1559f8626b4b7.js` |
| `/stories/[slug]` | Yes | Verified Public (`/stories/cinderella`, `ev_7400c075...`) | `pages/stories/[slug]-c7207fa305da9b42.js` |
| `/review` | Yes | Verified Auth-Blocked (`ev_32070082...`) | `pages/review-3db83da15ddf2708.js` |

### C. Vocabulary & Vocabulary Games Routes
| Route Pattern | In `_ssgManifest` | Runtime Status Observed | Chunk Entry (`pages/...`) |
| :--- | :---: | :--- | :--- |
| `/vocabulary` | Yes | Verified Public (`ev_29f43f7f...`) | `pages/vocabulary-0103bec48bb01aab.js` |
| `/vocabulary/[slug]` | Yes | Verified Partial (`/vocabulary/ielts-600`, `ev_ab4119e8...`; PRO `ev_b237359c...`) | `pages/vocabulary/[slug]-b9ff988e28ba127a.js` |
| `/vocabulary/cards` | Yes | Unvisited | `pages/vocabulary/cards-fab9c93341a711f6.js` |
| `/vocabulary/published` | No | Unvisited | `pages/vocabulary/published-6b526f25d9f2b0ef.js` |
| `/vocabulary/review` | Yes | Unvisited | `pages/vocabulary/review-ac485dca82467c83.js` |
| `/my-vocabulary` | Yes | Verified Auth-Blocked (`ev_59aebc4e...`) | `pages/my-vocabulary-d2e3ee160cffb4bc.js` |
| `/my-vocabulary/[id]` | No | Unvisited | `pages/my-vocabulary/[id]-36d074bc7b95b49b.js` |
| `/my-notes` | Yes | Verified Auth-Blocked (`ev_669b8643...`) | `pages/my-notes-baa1542488e21fb7.js` |
| `/games` | Yes | Verified Public (`ev_203d2b21...`) | `pages/games-f6ab19be7f9749ec.js` |
| `/vocab-battle` | Yes | Verified Auth-Gated PvP (`ev_6df3a4e4...`) | `pages/vocab-battle-49de7f2f521e62f9.js` |
| `/vocabulary/bridge-builder` | Yes | Linked on `/games` | `pages/vocabulary/bridge-builder-ce35980a08217866.js` |
| `/vocabulary/bubble-pop` | Yes | Unvisited | `pages/vocabulary/bubble-pop-06557d58d5379505.js` |
| `/vocabulary/fruit-toss` | Yes | Linked on `/games` | `pages/vocabulary/fruit-toss-6e262376990542d1.js` |
| `/vocabulary/quiz-meteor` | Yes | Unvisited | `pages/vocabulary/quiz-meteor-797dc684bc4a102e.js` |
| `/vocabulary/sky-runner` | Yes | Linked on `/games` | `pages/vocabulary/sky-runner-5a0e6bc869ef34c2.js` |
| `/vocabulary/spelling-bee` | Yes | Linked on `/games` | `pages/vocabulary/spelling-bee-4d64ea41569febf9.js` |
| `/vocabulary/typing-game` | Yes | Linked on `/games` (`Word Shooter`) | `pages/vocabulary/typing-game-a3e6e88b410c2a29.js` |
| `/vocabulary/word-guess` | Yes | Unvisited | `pages/vocabulary/word-guess-68b3e7deeb51f100.js` |
| `/vocabulary/word-match` | Yes | Unvisited | `pages/vocabulary/word-match-595b8bcd99fb51db.js` |
| `/vocabulary/word-rain` | Yes | Verified Public (`ev_7bd9f0e6...`) | `pages/vocabulary/word-rain-025eb8f0bfd76f84.js` |

### D. IELTS & TOEIC Exam Routes
| Route Pattern | In `_ssgManifest` | Runtime Status Observed | Chunk Entry (`pages/...`) |
| :--- | :---: | :--- | :--- |
| `/exams/ielts` | Yes | Verified Partial (`ev_f064a605...`) | `pages/exams/ielts-8c78eb4d13213b8d.js` |
| `/exams/ielts/sets/[setSlug]` | No | Verified Public (`ev_2e7d9ff1...`) | `pages/exams/ielts/sets/[setSlug]-d2840b00d471072f.js` |
| `/exams/ielts/[slug]` | No | Verified Public + Auth-Gated Start (`ev_09c6d600...`, `ev_ff319840...`) | `pages/exams/ielts/[slug]-8041903b66f8f501.js` |
| `/exams/ielts/session/[sessionId]` | No | Unvisited (Auth-gated behind `Start Exam`) | `pages/exams/ielts/session/[sessionId]-6f0f28530bbc80e2.js` |
| `/exams/ielts/session/[sessionId]/result` | No | Unvisited | `pages/exams/ielts/session/[sessionId]/result-62115488edf446de.js` |
| `/exams/ielts/analytics` | Yes | Unvisited | `pages/exams/ielts/analytics-c339812a36582ce4.js` |
| `/exams/ielts/history` | Yes | Unvisited | `pages/exams/ielts/history-18a48321520a0118.js` |
| `/exams/toeic` | Yes | Verified Partial (`ev_ccbd1b37...`; `/exams` redirects here `ev_f7842d84...`) | `pages/exams/toeic-5c4c5af36cc054b4.js` |
| `/exams/toeic/sets/[setSlug]` | No | Linked on `/exams/toeic` | `pages/exams/toeic/sets/[setSlug]-f3b735a9126d865c.js` |
| `/exams/toeic/[slug]` | No | Unvisited | `pages/exams/toeic/[slug]-fe8283850b3d4af9.js` |
| `/exams/toeic/session/[sessionId]` | No | Unvisited | `pages/exams/toeic/session/[sessionId]-ad3606b406aa9505.js` |
| `/exams/toeic/session/[sessionId]/result` | No | Unvisited | `pages/exams/toeic/session/[sessionId]/result-e89aa95f83e6f880.js` |
| `/exams/toeic/analytics` | Yes | Unvisited | `pages/exams/toeic/analytics-ccc2ed62a126adc9.js` |
| `/exams/toeic/history` | Yes | Unvisited | `pages/exams/toeic/history-ca55aee9ea40161c.js` |

### E. Community, Speaking, Gamification & Account Routes
| Route Pattern | In `_ssgManifest` | Runtime Status Observed | Chunk Entry (`pages/...`) |
| :--- | :---: | :--- | :--- |
| `/practice-english-speaking` | Yes | Verified Partial / Auth-Gated Voice Chat (`ev_e6ede8df...`) | `pages/practice-english-speaking-4f5de74a05cee57d.js` |
| `/community` | Yes | Verified Partial (`ev_1de3fd7c...`) | `pages/community-de4f9712c39b5ad4.js` |
| `/community/[postId]` | No | Unvisited | `pages/community/[postId]-d5b4607195367447.js` |
| `/chat` | Yes | Verified Partial (`ev_04dbe47d...`) | `pages/chat-b36ce7e8d7cf46ed.js` |
| `/leaderboard` | Yes | Verified Public (`ev_e163b3ec...`) | `pages/leaderboard-e136975370b4d3a1.js` |
| `/feedbacks` | Yes | Verified Partial (`ev_4c0d63ed...`) | `pages/feedbacks-c1b8a18eb7cd4ee1.js` |
| `/missions` | Yes | Verified Auth-Blocked (`ev_a4695936...`) | `pages/missions-46832e12b887a128.js` |
| `/shop` | Yes | Verified Partial / Disabled Purchase (`ev_4e4bea54...`) | `pages/shop-d9b6f1f47f87e12b.js` |
| `/affiliate` | Yes | Verified Auth-Blocked (`ev_94388507...`) | `pages/affiliate-37ebf990dce696f1.js` |
| `/profile` | Yes | Verified Auth-Blocked (`ev_bffb3500...`) | `pages/profile-7833a32234e043f8.js` |
| `/profile/[id]` | No | Unvisited (public/user profile view) | `pages/profile/[id]-53cac24aebbd4946.js` |

### F. Internal Error & Sitemap Entries
- `/404` (`_ssgManifest: Yes`, verified at runtime `ev_ae1399a1...`), `/_app`, `/_error`
- `/sitemap-community.xml`, `/sitemap-grammar.xml`, `/sitemap-stories.xml`, `/sitemap-vocabulary.xml`

---

## 2. Confidence & Coverage Limitations

- **Confidence**: **High / Static Build Manifest** (`_buildManifest.js` + `_ssgManifest.js`), corroborated by `analyze_web_bundle` (`ev_cf679c41eb6197ca02b716eacdc752468a9bc323e27a53bc72f18f2fb1ff2288`) and runtime checks.
- **Limitations**:
  - Presence in `_buildManifest.js` establishes client bundle route registration, **not** unauthenticated accessibility or server-side authorization.
  - Locale-prefixed paths (`en`, `ar`, `de`, `el`, `es`, `id`, `ja`, `ko`, `ms`, `pt`, `ru`, `th`, `tr`, `uk`, `vi`, `zh-CN`, `zh-TW`) are handled by Next.js i18n routing (e.g., `/_next/data/hUvNpCe7E_Hr-Ai_sSmoX/en/*.json`).
  - Server-only redirects (such as `/exams` → `/exams/toeic`) or Next.js rewrites (`/blog*`) are not directly enumerated inside `sortedPages`.
