# Parroto API Data Contracts & Wire Envelopes

**Target**: `https://parroto.app/` (`https://api.parroto.app/api`)  
**Scope**: Strictly value-free JSON schema shapes extracted from captured `network-content` (`phase: "response"`) payloads during approved guest browser scenarios (`request_body: false`, `header_values: false`).  
**Redaction**: All sample values, IDs, usernames, tokens, and timestamps are omitted and replaced strictly with JSON primitive/structural type descriptors (`string`, `number`, `boolean`, `null`, `array(empty)`, `object`).

---

## 1. Global Client Transport Conventions (`pages/_app-7c4028110a8b19a9.js @585600–588700`)

- **Base URL & Timeout**: `https://api.parroto.app/api`, `timeout: 30000`, default `Content-Type: application/json` (or `multipart/form-data` via `postWithFormData` / `putWithFormData`).
- **Observed Standard Request Headers (`header_names`)**:
  - `accept`, `accept-language`, `referer`, `user-agent`, `sec-ch-ua*`, `x-user-timezone` (populated dynamically using `Intl.DateTimeFormat().resolvedOptions().timeZone`).
  - `authorization`: Present on requests marked `generateKey: true` (observed at runtime on `GET /api/lessons?...` in `ev_22f2...`) or when `ACCESS_TOKEN` is stored; all values redacted.
- **Encrypted Response Envelope**:
  ```json
  {
    "encrypted": "boolean",
    "data": "string"
  }
  ```
  Observed on `GET /api/exams/published/parroto-ielts-2026-reading-test-1` (`ev_332e...`). When `encrypted === true`, `_app` response interceptor decrypts `response.data.data` client-side (`u.ow(e.data.data, await d.tB())`). Next.js SSG lesson payloads (`/_next/data/{buildId}/en/lessons/{mode}/{slug}.json`) similarly wrap encrypted lesson data inside `pageProps.payload: "string"`.
- **Static Error Handling Contract (`_app` interceptor)**:
  - `403` with `code === "ACCOUNT_BANNED"` -> `CustomEvent("error:account-banned")`
  - `403` with `code === "USERNAME_REQUIRED"` -> `CustomEvent("error:username-required")`
  - `401` with `message === "Token has expired"` -> queues concurrent requests, refreshes Firebase ID token via `currentUser.getIdToken(true)`, replays queued requests, or dispatches `"auth:expired"` on failure. *(Verified statically in `_app`; not triggered during guest observation.)*

---

## 2. Runtime-Captured Response Schema Shapes (`https://api.parroto.app`)

### 2.1 `GET /api/promo/active`
- **Status**: `200` (`487` bytes, `application/json; charset=utf-8`)
- **Evidence**: `ev_d70629d2c51d537ea29e7cfb0000c21a2efecd89b62243928706855c0eac1d2c`
```json
{
  "status": "string",
  "data": {
    "events": [
      {
        "code": "string",
        "name": "string",
        "description": "string",
        "image_url": "string",
        "discount_rate": "number",
        "starts_at": "number",
        "ends_at": "number",
        "allowed_priceIds": ["string"],
        "allowed_providers": ["string"],
        "event_id": "string"
      }
    ]
  }
}
```

### 2.2 `GET /api/lessons/daily`
- **Status**: `200` (`2,704` bytes, `application/json; charset=utf-8`)
- **Evidence**: `ev_61f1a86e9a35a4cbc2c5c3ba3dd2b250fdeab06532d1d3597df202456abc1089`
```json
{
  "status": "string",
  "message": "string",
  "data": [
    {
      "_id": "string",
      "title": "string",
      "slug": "string",
      "difficulty": "string",
      "thumbnail": "string",
      "type": "string",
      "is_pro": "boolean",
      "view_count": "number",
      "fake_count": "number",
      "total_view_count": "number"
    }
  ],
  "meta": {
    "source": "string",
    "dateKey": "string"
  }
}
```

### 2.3 `GET /api/lessons/{lessonId}/comments?page=1&limit=10`
- **Status**: `200` (`8,080` bytes, `application/json; charset=utf-8`)
- **Evidence**: `ev_0b6d49270985540f55205125e0008a77ae50401118c6bfab0c0e98484c18898f`, `ev_ee5f8906c47e9ee6d6f20f47717903905071fd67024597fa7a31bd57125d9371`
```json
{
  "status": "string",
  "message": "string",
  "data": {
    "comments": [
      {
        "_id": "string",
        "lesson_id": "string",
        "author_id": "string",
        "content": "string",
        "parent_comment_id": "null",
        "child_count": "number",
        "is_system": "boolean",
        "system_meta": {
          "type": "string",
          "score": "number"
        },
        "deleted_at": "null",
        "created_at": "number",
        "updated_at": "number",
        "last_activity_at": "number",
        "author": {
          "uid": "string",
          "username": "null",
          "displayName": "string",
          "photoURL": "string",
          "selected_avatar_frame": "null",
          "selected_background": "null",
          "selected_badge": "null",
          "level": "number",
          "premium": {
            "status": "object",
            "is_lifetime": "object",
            "expires_at": "object",
            "activated_at": "object",
            "price_id": "object",
            "total_months": "object"
          },
          "role": "null"
        },
        "replies": ["array(empty)"]
      }
    ],
    "total": "number",
    "page": "number",
    "limit": "number",
    "totalPages": "number"
  }
}
```

### 2.4 `GET /api/prices`
- **Status**: `200` (`3,691` bytes, `application/json; charset=utf-8`)
- **Evidence**: `ev_3c26affad61bcf5504f05972a49f6144c2d6bcda7d900214de89cc65cc463791`
```json
{
  "data": [
    {
      "id": "string",
      "product_id": "string",
      "type": "string",
      "description": "string",
      "name": "string",
      "billing_cycle": "null",
      "trial_period": "null",
      "tax_mode": "string",
      "unit_price": {
        "amount": "string",
        "currency_code": "string"
      },
      "unit_price_overrides": [
        {
          "country_codes": ["string"],
          "unit_price": {
            "amount": "object",
            "currency_code": "object"
          }
        }
      ],
      "custom_data": {
        "duration": "string",
        "is_lifetime": "string",
        "service": "string"
      },
      "status": "string",
      "quantity": {
        "minimum": "number",
        "maximum": "number"
      },
      "product": {
        "id": "string",
        "name": "string",
        "tax_category": "string",
        "type": "string",
        "description": "string",
        "image_url": "string",
        "custom_data": "null",
        "status": "string",
        "import_meta": "null",
        "created_at": "string",
        "updated_at": "string"
      },
      "import_meta": "null",
      "created_at": "string",
      "updated_at": "string"
    }
  ],
  "meta": {
    "request_id": "string",
    "pagination": {
      "per_page": "number",
      "estimated_total": "number",
      "has_more": "boolean"
    }
  }
}
```

### 2.5 `GET /api/leaderboard/monthly?month={yyyymm}`
- **Status**: `200` (`39,466` bytes, `application/json; charset=utf-8`)
- **Evidence**: `ev_e9d03dda025dad15e499af4697737a23d1c8015201635fdd01999c36b5580fed`
```json
{
  "status": "string",
  "message": "string",
  "data": {
    "month": "string",
    "leaderboard": [
      {
        "user_id": "string",
        "sentences_completed": "number",
        "vocabulary_cards_completed": "number",
        "active_time": "number",
        "user": {
          "uid": "string",
          "username": "null",
          "displayName": "string",
          "photoURL": "string",
          "selected_avatar_frame": "null",
          "selected_background": "null",
          "selected_badge": "null",
          "level": "number",
          "premium": {
            "status": "object",
            "is_lifetime": "object",
            "expires_at": "object",
            "activated_at": "object",
            "price_id": "object",
            "total_months": "object"
          },
          "role": "null"
        },
        "shadowing_level": "number",
        "dictation_level": "number"
      }
    ],
    "reward_event": {
      "_id": "string",
      "code": "string",
      "name": "string",
      "type": "string",
      "month": "string",
      "status": "string",
      "conditions": {
        "rank": ["number"]
      },
      "rewards": {
        "1": [{"code": "object", "name": "object", "image_url": "object", "type": "object", "diamond_amount": "object"}],
        "2": [{"code": "object", "name": "object", "image_url": "object", "type": "object", "diamond_amount": "object"}],
        "3": [{"code": "object", "name": "object", "image_url": "object", "type": "object", "diamond_amount": "object"}],
        "50": [{"code": "object", "name": "object", "image_url": "object", "type": "object", "diamond_amount": "object"}]
      },
      "created_at": "number",
      "updated_at": "number",
      "is_closed": "boolean"
    },
    "updated_at": "number"
  }
}
```

### 2.6 `GET /api/exams/published/{examSlug}`
- **Status**: `200` (`1,068` bytes, `application/json; charset=utf-8`)
- **Evidence**: `ev_332e7c82b29005b7c582886e499f5cfa2e29b6dd040f330c0f9c87b8bfab64d5`
```json
{
  "encrypted": "boolean",
  "data": "string"
}
```

### 2.7 `GET /api/exams/{examId}/comments?page=1&limit=20`
- **Status**: `200` (`16,089` bytes, `application/json; charset=utf-8`)
- **Evidence**: `ev_332e7c82b29005b7c582886e499f5cfa2e29b6dd040f330c0f9c87b8bfab64d5`
```json
{
  "status": "string",
  "message": "string",
  "data": {
    "comments": [
      {
        "_id": "string",
        "exam_id": "string",
        "author_id": "string",
        "content": "string",
        "parent_comment_id": "null",
        "child_count": "number",
        "is_system": "boolean",
        "session_id": "string",
        "deleted_at": "null",
        "created_at": "number",
        "updated_at": "number",
        "last_activity_at": "number",
        "author": {
          "uid": "string",
          "username": "string",
          "displayName": "string",
          "photoURL": "string",
          "selected_avatar_frame": "null",
          "selected_background": "null",
          "selected_badge": "null",
          "level": "number",
          "premium": {
            "status": "object",
            "is_lifetime": "object",
            "expires_at": "object",
            "activated_at": "object",
            "price_id": "object",
            "total_months": "object"
          },
          "role": "null"
        },
        "replies": ["array(empty)"]
      }
    ],
    "total": "number",
    "page": "number",
    "limit": "number",
    "totalPages": "number"
  }
}
```

### 2.8 `GET /api/shop/items?limit=100&isApproved=true&locale=en`
- **Status**: `200` (`18,733` bytes, `application/json; charset=utf-8`)
- **Evidence**: `ev_13a05aa667760cef065cbe1fe117fb587f0e5096dd0acca2aecb919fafb63c1e`
```json
{
  "status": "string",
  "data": {
    "items": [
      {
        "_id": "string",
        "name": "string",
        "description": "string",
        "type": "string",
        "price": "number",
        "currency": "string",
        "imageUrl": "string",
        "isActive": "boolean",
        "isApproved": "boolean",
        "order": "number",
        "properties": {
          "rarity": "string",
          "description": "string"
        },
        "discount": {
          "percentage": "number",
          "startDate": "null",
          "endDate": "null",
          "isActive": "boolean"
        },
        "locale": "null",
        "createdAt": "string",
        "updatedAt": "string",
        "__v": "number"
      }
    ],
    "pagination": {
      "page": "number",
      "limit": "number",
      "total": "number",
      "totalPages": "number"
    }
  }
}
```

### 2.9 `GET /api/streak/config`
- **Status**: `200` (`1,190` bytes, `application/json; charset=utf-8`)
- **Evidence**: `ev_13a05aa667760cef065cbe1fe117fb587f0e5096dd0acca2aecb919fafb63c1e`
```json
{
  "status": "string",
  "message": "string",
  "data": {
    "daily_checkin_reward": "number",
    "freeze_price_diamond": "number",
    "freeze_max_owned": "number",
    "milestones": [
      {
        "days": "number",
        "badge_code": "string",
        "diamonds": "number",
        "freeze_gift": "number",
        "emit_feed": "boolean"
      }
    ]
  }
}
```

### 2.10 `GET /api/stories?sort=popular&page=1&limit=18`
- **Status**: `200` (`61,517` bytes, `application/json; charset=utf-8`)
- **Evidence**: `ev_5432320bf196de1e62450eb7aa245ec3edf27c3955f48215cd6e9a90b205809d`
```json
{
  "status": "string",
  "message": "string",
  "data": {
    "items": [
      {
        "_id": "string",
        "slug": "string",
        "title": "string",
        "localized": {
          "vi": {"title": "object", "description": "object"},
          "id": {"title": "object", "description": "object"},
          "th": {"title": "object", "description": "object"},
          "ja": {"title": "object", "description": "object"},
          "zh-TW": {"title": "object", "description": "object"},
          "ar": {"title": "object", "description": "object"}
        },
        "description": "string",
        "collection": "string",
        "level": "string",
        "word_count": "number",
        "reading_time_min": "number",
        "cover_image": "string",
        "thumbnail": "string",
        "is_pro": "boolean",
        "tags": ["string"],
        "total_view_count": "number",
        "favorite_count": "number",
        "comment_count": "number",
        "total_duration_ms": "number",
        "audio_status": "string",
        "published_at": "string",
        "created_at": "string"
      }
    ],
    "total": "number",
    "page": "number",
    "limit": "number",
    "totalPages": "number"
  }
}
```

### 2.11 `GET /api/community-lessons?limit=24`
- **Status**: `200` (`25,220` bytes, `application/json; charset=utf-8`)
- **Evidence**: `ev_89cd5c4c38845f11ce3d6c1a9ad11cb7691ee30d42c60301a2f865d777442102`
```json
{
  "status": "string",
  "message": "string",
  "data": {
    "data": [
      {
        "_id": "string",
        "title": "string",
        "duration": "string",
        "slug": "string",
        "difficulty": "string",
        "tags": ["string"],
        "thumbnail": "string",
        "url": "string",
        "created_by": "string",
        "created_at": "string",
        "tag_translations": {
          "en": ["string"],
          "vi": ["string"]
        },
        "sentence_count": "number",
        "total_view_count": "number",
        "author": {
          "uid": "string",
          "username": "string",
          "displayName": "string",
          "photoURL": "string",
          "selected_avatar_frame": "null",
          "selected_background": "null",
          "selected_badge": "null",
          "level": "number",
          "premium": {
            "status": "object",
            "is_lifetime": "object",
            "expires_at": "object",
            "activated_at": "object",
            "price_id": "object",
            "total_months": "object"
          },
          "role": "null"
        }
      }
    ],
    "pagination": {
      "total": "number",
      "pages": "number",
      "current": "number",
      "limit": "number"
    }
  }
}
```

---

## 3. Runtime-Captured Next.js SSG Payload Shapes (`https://parroto.app/_next/data/...`)

### 3.1 Lesson Data Envelope (`dictation` / `shadowing`)
- **Path**: `/_next/data/{buildId}/en/lessons/{mode}/{lessonSlug}.json?lessonSlug={lessonSlug}` (`51,018` bytes, `ev_0b6d...`, `ev_ee5f...`)
```json
{
  "pageProps": {
    "payload": "string",
    "lessonTitle": "string",
    "_nextI18Next": "{initialI18nStore,initialLocale,userConfig}"
  },
  "__N_SSG": "boolean"
}
```

### 3.2 IELTS & TOEIC Exam Sets Envelope (`/en/exams/{ielts,toeic}.json`)
- **Size**: `46,620` / `47,212` bytes (`ev_d706...`, `ev_332e...`)
```json
{
  "pageProps": {
    "initialExamSets": [
      {
        "_id": "string",
        "exam_type_id": {
          "_id": "string",
          "code": "string",
          "name": {"en": "object", "vi": "object"}
        },
        "name": {"en": "string", "vi": "string"},
        "slug": "string",
        "source": "string",
        "year": "number",
        "total_exams": "number",
        "order": "number",
        "is_active": "boolean",
        "deleted_at": "null",
        "description": {}
      }
    ],
    "_nextI18Next": "{initialI18nStore,initialLocale,userConfig}"
  },
  "__N_SSG": "boolean"
}
```

### 3.3 Grammar Syllabus Envelope (`/en/grammar.json`)
- **Size**: `49,005` bytes (`ev_d706...`, `ev_13a0...`, `ev_3885...`)
```json
{
  "pageProps": {
    "initialLevel": "string",
    "initialItems": [
      {
        "grammar": {
          "id": "string",
          "slug": "string",
          "name": "string",
          "localizedName": "string",
          "cefrLevel": "string",
          "topicId": "string",
          "orderInSyllabus": "number",
          "shortDefinition": "string",
          "examTags": ["string"],
          "tags": ["string"],
          "isPro": "boolean"
        },
        "isLocked": "boolean",
        "progress": "null"
      }
    ],
    "_nextI18Next": "{initialI18nStore,initialLocale,userConfig}"
  },
  "__N_SSG": "boolean"
}
```

### 3.4 Community Channels Envelope (`/en/community-lessons/channels.json`)
- **Size**: `65,426` bytes (`ev_89cd...`)
```json
{
  "pageProps": {
    "channels": [
      {
        "channel_id": "string",
        "name": "string",
        "handle": "null",
        "url": "string",
        "thumbnail": "string",
        "lesson_count": "number"
      }
    ],
    "_nextI18Next": "{initialI18nStore,initialLocale,userConfig}"
  },
  "__N_SSG": "boolean"
}
```
