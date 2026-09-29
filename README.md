# Hospital Appointment Booking

A web app for booking hospital appointments, with separate views for patients, doctors and hospital admin staff.

This version is a **working front-end demo**. It runs entirely in the browser with no server, so it can be hosted for free on GitHub Pages and tested by anyone with the link. See [docs/PRODUCTION_GUIDE.md](docs/PRODUCTION_GUIDE.md) for what's needed to turn it into a live system.

---

## Features

### Patients
- Sign in with Google (simulated in the demo), then add a mobile number once.
- Book in four steps: department, doctor, date, then a 15-minute time slot.
- Booked slots are striped; past times are greyed out; lunch break is skipped.
- Each doctor shows their next available slot.
- After confirming, WhatsApp opens with the booking details ready to send to the hospital's number.
- "My appointments" lists upcoming and past visits. Cancelling also opens WhatsApp with a cancellation message.

### Doctors
- Sign in with their hospital Google email, then a password.
- First sign-in: create a password (8+ characters, letters, a number and a symbol).
- 5 wrong passwords lock the account for 5 minutes.
- Each doctor sees **only their own schedule**, day by day.
- Mark each visit as completed or missed, with undo.

### Admin
- No sign-in in this demo (to be handled separately).
- All appointments with filters for date, department, doctor and status, plus search by patient, phone or reference.
- Cancel any upcoming booking; WhatsApp opens a chat with the patient to notify them.
- Doctors tab: mark doctors on leave or available, add doctors with their Google email, hours and working days, and reset a doctor's password.
- WhatsApp messages tab: a log of every booking and cancellation message.

---

## Demo accounts

| Role | How to sign in |
|---|---|
| Patient (returning) | Continue with Google → **Meera Joshi** |
| Patient (new) | Continue with Google → **Rahul Deshpande** (asks for a mobile number) |
| Doctor (password set) | Continue with Google → **Dr. Ananya Rao**, password **Clinic@2026** |
| Doctor (first sign-in) | Pick any other doctor to see the create-password screen |
| Admin | Just switch to the Admin tab |

Use **Reset demo data** in the footer to restore the sample data.

---

## Project structure

```
hospital-booking/
├── index.html              Page shell: loads fonts, styles and scripts
├── assets/
│   ├── css/
│   │   └── styles.css      All styling, including light and dark mode
│   └── js/
│       ├── config.js       Settings you can change (name, WhatsApp number, slot length…)
│       └── app.js          All app logic: data, views, sign-in, booking, admin
├── docs/
│   └── PRODUCTION_GUIDE.md What to build to take this live
├── .nojekyll               Tells GitHub Pages to serve files as they are
├── .gitignore
└── README.md
```

There is no build step and no dependencies. It's plain HTML, CSS and JavaScript.

---

## Configuration

Open `assets/js/config.js` and change the values:

| Setting | What it does | Example |
|---|---|---|
| `hospitalName` | Name shown in the header, sign-in screens and WhatsApp messages | `'Sunrise Hospital'` |
| `hospitalWhatsApp` | Hospital WhatsApp number: country code + number, no `+`, spaces or dashes | `'919876543210'` |
| `slotMinutes` | Length of each appointment | `15` |
| `lunchStart`, `lunchEnd` | Break with no slots (24-hour time) | `'13:00'`, `'14:00'` |
| `bookingWindowDays` | How far ahead patients can book | `14` |
| `departments` | Departments shown to patients | `['Cardiology', 'ENT']` |
| `demoDoctorPassword` | Demo-only password for the first sample doctor | `'Clinic@2026'` |

**Sample doctors and patients** are defined in the `seed()` function in `assets/js/app.js`. Edit names, departments, rooms, hours (`start`, `end` in 24-hour format) and working days (`days`: 0 = Sunday … 6 = Saturday).

After changing the sample data, click **Reset demo data** in the footer (or clear the site's storage) so the browser loads the new data.

---

## Run it on your computer

**Option 1:** double-click `index.html` to open it in your browser.

**Option 2 (recommended):** run a small local server from the project folder so it behaves exactly like the hosted version:

```bash
# Python 3
python3 -m http.server 8000
# then open http://localhost:8000
```

or

```bash
# Node.js
npx serve .
```

---

## Host it on GitHub Pages

GitHub Pages hosts static sites for free from a GitHub repository. Pages is free for **public** repositories; private repositories need a paid GitHub plan.

### 1. Create the repository

1. Sign in at [github.com](https://github.com) (create an account if needed).
2. Click **+** (top right) → **New repository**.
3. Name it, for example `hospital-booking`.
4. Choose **Public**.
5. Leave "Add a README" **unticked** (this project already has one).
6. Click **Create repository**.

### 2. Upload the code

**Option A: using the website (no Git needed)**

1. On the new repository page, click **uploading an existing file**.
2. Drag in **everything inside** the `hospital-booking` folder: `index.html`, the `assets` and `docs` folders, `README.md`, `.nojekyll` and `.gitignore`.
   - `.nojekyll` and `.gitignore` are hidden files on Mac and some Windows setups. On Mac press `Cmd + Shift + .` in Finder to show them. On Windows, enable **View → Hidden items**.
3. Click **Commit changes**.

Make sure `index.html` sits at the top level of the repository, not inside another folder.

**Option B: using Git on the command line**

```bash
cd hospital-booking
git init
git add .
git commit -m "Initial commit: hospital booking demo"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/hospital-booking.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username.

### 3. Turn on GitHub Pages

1. In the repository, go to **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Set **Branch** to `main` and the folder to `/ (root)`, then click **Save**.
4. Wait 1–2 minutes and refresh the page. A link appears at the top:

```
https://YOUR-USERNAME.github.io/hospital-booking/
```

That's your live site. Share this link for testing.

### 4. Updating the site

Every change pushed to the `main` branch republishes automatically within a minute or two.

- **Website:** open a file on GitHub → pencil icon → edit → **Commit changes**. Or use **Add file → Upload files** to replace files.
- **Git:**
  ```bash
  git add .
  git commit -m "Describe your change"
  git push
  ```

If you don't see a change, do a hard refresh (`Ctrl + Shift + R`, or `Cmd + Shift + R` on Mac).

### 5. Custom domain (optional)

To use your own address such as `booking.yourhospital.com`:

1. In **Settings → Pages → Custom domain**, enter `booking.yourhospital.com` and save.
2. At your domain provider, add a **CNAME** record:
   - Name / host: `booking`
   - Value / points to: `YOUR-USERNAME.github.io`
3. Wait for DNS to update (from a few minutes up to a day), then tick **Enforce HTTPS** in the Pages settings.

### Troubleshooting

| Problem | Fix |
|---|---|
| 404 page | Check `index.html` is at the top level of the repo, and Pages is set to `main` / `(root)`. Wait a couple of minutes after enabling. |
| Page loads without styling | The `assets` folder is missing or in the wrong place. Paths must be `assets/css/styles.css` and `assets/js/app.js`. |
| Old data still showing | Data is saved in each browser. Use **Reset demo data** in the footer. |
| WhatsApp doesn't open | The browser blocked the pop-up. Use the **Open WhatsApp** button on the confirmation screen, or allow pop-ups for the site. |

---

## Important limitations of this demo

- **Data is stored only in the browser** (`localStorage`). Each device has its own copy; a booking on one phone won't appear on another. Nothing is shared between patients, doctors and admins on different devices.
- **Google sign-in is simulated.** No real Google account is checked.
- **Doctor passwords** are hashed and stored in the browser for demonstration only.
- **The admin screen has no sign-in.**
- **WhatsApp messages** only go out when the person taps send in WhatsApp. There are no automatic reminders.
- **Do not enter real patient data.** GitHub Pages sites are public.

All of these are addressed by adding a backend. See [docs/PRODUCTION_GUIDE.md](docs/PRODUCTION_GUIDE.md).
