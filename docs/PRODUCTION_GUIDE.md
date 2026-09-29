# Taking the app live

The demo runs entirely in the browser. For real use, patients, doctors and admins must share one set of data, sign-ins must be verified, and messages should go out on their own. That needs a **backend**: a server plus a database. The front end in this repo can stay almost as it is. Its data calls get pointed at the backend instead of `localStorage`.

## 1. Architecture

```
 Patient / Doctor / Admin browser
            │  HTTPS
            ▼
 Front end (this repo) ── GitHub Pages or any static host
            │  API calls (JSON)
            ▼
 Backend API ── checks sign-ins, applies booking rules
      │               │
      ▼               ▼
 Database        Notifications (WhatsApp / email) + daily reminder job
```

Two practical routes:

| Route | Good for | Notes |
|---|---|---|
| **Supabase** (hosted Postgres + auth) | Fastest start, small team | Google sign-in and email+password are built in. Row-level security keeps each doctor to their own rows. Free tier available to start. |
| **Custom Node.js (Express) + PostgreSQL** | Full control | Host on Render, Railway, AWS or similar. More code, but no platform lock-in. |

Either way, choose a server region in India (for example Mumbai) to keep patient data in-country.

## 2. Database tables

```sql
CREATE TABLE doctors (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,        -- hospital Google email
  department    TEXT NOT NULL,
  room          TEXT,
  start_time    TIME NOT NULL,               -- e.g. 09:00
  end_time      TIME NOT NULL,               -- e.g. 17:00
  working_days  SMALLINT[] NOT NULL,         -- 0 = Sunday ... 6 = Saturday
  available     BOOLEAN NOT NULL DEFAULT TRUE,
  password_hash TEXT,                        -- NULL until the doctor creates one
  failed_logins SMALLINT NOT NULL DEFAULT 0,
  locked_until  TIMESTAMPTZ
);

CREATE TABLE patients (
  id          SERIAL PRIMARY KEY,
  google_sub  TEXT UNIQUE NOT NULL,          -- Google's permanent user id
  email       TEXT NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE appointments (
  id           SERIAL PRIMARY KEY,
  ref          TEXT UNIQUE NOT NULL,         -- e.g. MH-1201
  patient_id   INT NOT NULL REFERENCES patients(id),
  doctor_id    INT NOT NULL REFERENCES doctors(id),
  starts_at    TIMESTAMPTZ NOT NULL,
  patient_name TEXT NOT NULL,                -- may differ if booked for family
  phone        TEXT NOT NULL,
  reason       TEXT,
  status       TEXT NOT NULL DEFAULT 'booked'
               CHECK (status IN ('booked','completed','no-show','cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stops two people booking the same doctor at the same time,
-- even if they press confirm at the same moment.
CREATE UNIQUE INDEX one_booking_per_slot
  ON appointments (doctor_id, starts_at)
  WHERE status <> 'cancelled';

CREATE TABLE messages (
  id             SERIAL PRIMARY KEY,
  appointment_id INT REFERENCES appointments(id),
  channel        TEXT NOT NULL,              -- 'whatsapp' or 'email'
  kind           TEXT NOT NULL,              -- 'confirmation', 'reminder', 'cancellation'
  recipient      TEXT NOT NULL,
  status         TEXT NOT NULL,              -- 'queued', 'sent', 'delivered', 'failed'
  sent_at        TIMESTAMPTZ
);
```

## 3. Sign-in

### Patients: Google sign-in
1. In [Google Cloud Console](https://console.cloud.google.com), create a project → **APIs & Services → Credentials → Create OAuth client ID** (type: Web application).
2. Add your site under **Authorised JavaScript origins**, e.g. `https://YOUR-USERNAME.github.io` and your custom domain.
3. Fill in the **OAuth consent screen** (app name, logo, privacy policy link).
4. On the front end, use Google Identity Services to show the real "Sign in with Google" button. It returns an ID token.
5. Send the token to the backend. The backend **must verify it** with Google's library (never trust it unchecked), then creates or finds the patient by `google_sub` and starts a session using a secure, `httpOnly` cookie.

### Doctors: Google + password
1. Same Google sign-in as patients, but the backend only accepts emails listed in the `doctors` table.
2. If `password_hash` is empty, ask the doctor to create one. Hash it with **bcrypt** or **argon2** on the server. Never store or log the plain password.
3. Otherwise check the password. After 5 failures, set `locked_until` to 5 minutes ahead.
4. Every API call for schedules must check the signed-in doctor's id on the server, so a doctor can never load another doctor's data, even by editing requests.
5. Admin "Reset password" sets `password_hash` back to NULL.

### Admin
Handled separately, as planned. At minimum: a separate sign-in, access limited to named staff, and a log of who changed what.

## 4. Bot and abuse protection

- Google sign-in already blocks most automated sign-ups.
- Limit each patient to a few upcoming bookings (for example 3).
- Add rate limiting on the booking API (for example 10 requests per minute per user).
- The unique index above prevents double-booking of a slot.
- Validate every input on the server (dates within the booking window, slot inside the doctor's hours, phone format).

## 5. Messages and reminders

**Current demo:** `wa.me` links. Free, no setup, but the person must tap send, and nothing can be sent automatically.

**For automatic confirmations and same-day reminders**, pick one:

| Option | Cost (India, approx.) | Setup | Best for |
|---|---|---|---|
| WhatsApp Cloud API (utility template) | About ₹0.115 per message + 18% GST as of mid-2026, plus any provider fee | Meta Business verification and template approval, usually a few days | Reminders patients actually see |
| Email (Amazon SES, Brevo, Resend, etc.) | Free tiers or a few rupees per thousand | Hours: verify your domain (SPF, DKIM) | Lowest cost, fastest setup |

A good balance is to send **confirmations by email** and **same-day reminders on WhatsApp**. Check current WhatsApp rates before launch, as Meta changes them from time to time.

**Reminder job:** a scheduled task (cron) runs every morning, for example at 7:00 AM, finds today's `booked` appointments, sends one reminder each, and records it in `messages`.

## 6. Privacy and security

Health information is sensitive personal data.

- Follow India's **Digital Personal Data Protection Act, 2023**. Tell patients what you collect and why, get their consent, collect only what's needed, and let them ask for their data to be deleted. Get legal advice before launch.
- Use HTTPS everywhere (GitHub Pages and most hosts provide it).
- Keep secret keys (Google client secret, WhatsApp token, database password) in the server's environment variables, **never** in this front-end repo.
- Take daily database backups and test restoring them.
- Keep an audit log of cancellations, status changes and admin actions.

## 7. Launch checklist

- [ ] Backend and database set up in an India region
- [ ] Real Google sign-in with server-side token check
- [ ] Doctor passwords hashed with bcrypt or argon2, lockout working
- [ ] Doctors can only see their own schedule (tested by trying another doctor's id)
- [ ] Admin sign-in in place
- [ ] Double-booking blocked in the database
- [ ] Booking limits and rate limiting on
- [ ] Confirmation and reminder messages sending, with failures logged
- [ ] Privacy policy and consent text published
- [ ] Backups running
- [ ] Demo-only parts removed: sample data, `demoDoctorPassword`, "Reset demo data" link
