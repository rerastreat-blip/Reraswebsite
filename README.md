# Rera's Treat — Website

## Opening this in VS Code

1. Download and unzip this folder.
2. Open VS Code.
3. File → Open Folder → select the unzipped `reras-treat-website` folder.
4. You'll see:
   - `index.html` — Home page
   - `menu.html` — Menu page (dine in/pickup checkout with bank transfer)
   - `about.html` — About/Story page
   - `contact.html` — Contact page (socials + feedback form)
   - `style.css` — Shared styling for all pages
   - `images/` — Drop your real food photos here (see images/README.txt
     for exact filenames to use)

To preview it live while editing, install the free **"Live Server"**
extension in VS Code (Extensions icon → search "Live Server" → Install),
then right-click `index.html` → "Open with Live Server." It'll open in
your browser and auto-refresh every time you save a change.

## Adding your real photos

Just save your photos into the `images` folder using the filenames
listed in `images/README.txt`. The site automatically detects them and
swaps out the colorful placeholder blocks — no code editing required.

## Hosting it — simplest & cheapest option: Netlify (free)

1. Go to https://app.netlify.com and sign up (free, no card required).
2. Once logged in, you'll see a "Deploy manually" / drag-and-drop area
   on your dashboard.
3. Drag your whole `reras-treat-website` folder onto that area.
4. Netlify uploads it and gives you a live URL immediately
   (something like `rera-treat.netlify.app`).
5. Every time you make changes, just drag the updated folder back onto
   the same site's dashboard to redeploy — takes seconds.

This is completely free for a site like this (static HTML/CSS/JS, no
server needed).

## If you want your own domain (e.g. rerastreat.com)

1. Buy the domain from a registrar — Namecheap or Name.com are usually
   the cheapest for `.com` (roughly $10-15/year).
2. In Netlify: Site settings → Domain management → Add custom domain →
   enter your domain.
3. Netlify will show you DNS records to add at your registrar (usually
   just one or two lines). Add them there.
4. Wait 10 minutes to a few hours for DNS to update — then your domain
   points straight to the site, still hosted free on Netlify.

Total cost with a custom domain: just the ~$10-15/year for the domain
itself. Hosting stays free.

## Other free alternatives (if you'd rather not use Netlify)
- **Vercel** (vercel.com) — same drag-and-drop style deploy
- **GitHub Pages** — free if you're comfortable with Git/GitHub;
  push the folder to a repo and enable Pages in repo settings

## Next steps down the line
- `menu.html` fetches live products from ReraOS's menu API, deployed at
  `https://reraos-develop.up.railway.app` (see `API_ORIGIN` in
  `menu.html`). Only products with `status: "ACTIVE"` and
  `isAvailable: true` are shown; the first entry in `images` (if any)
  is used as the card photo, resolved against `API_ORIGIN` since
  images are stored as relative paths.
- Checkout on `menu.html` no longer routes to WhatsApp. Selecting items
  now opens a modal: choose dine in/pickup → enter name & phone →
  ReraOS creates the order and returns the payment account (bank name,
  account name, account number, amount) → customer taps "I Have Paid" →
  they see an on-screen acknowledgement. This calls three ReraOS
  endpoints in sequence: `POST /whatsapp-sessions` (start),
  `PATCH /whatsapp-sessions/:id` (cart + order type), then
  `POST /whatsapp-sessions/:id/checkout`, and finally
  `POST /whatsapp-sessions/:id/mark-paid`. Staff get an email the
  moment the order is created (before the customer even sees the
  payment screen) and a second email the moment "I Have Paid" is
  tapped — this second email requires the `notifyPaymentClaimed`
  addition in `apps/api/src/modules/orders/orders.service.ts` and
  `notifications.service.ts` to be deployed to Railway.
- The Contact page's feedback form now submits via **Netlify Forms** —
  no backend needed. After deploying to Netlify, go to
  **Site settings → Forms → Form notifications → Add notification →
  Email notification**, and set the email to `orders@rerastreat.com.ng`.
  Until that's set up, submissions are still captured under
  **Forms** in the Netlify dashboard, just not emailed anywhere.
