/**
 * Help Center article data.
 *
 * Each article has a slug (used in URLs), title, category, and content.
 * Content is plain markdown — rendered by the HelpArticlePage component.
 */

export type HelpCategory =
    | "getting-started"
    | "subscription"
    | "courses-quizzes"
    | "care-plans"
    | "account"

export interface HelpArticle {
    slug: string
    title: string
    summary: string
    category: HelpCategory
    content: string
}

export const HELP_CATEGORIES: { value: HelpCategory; label: string; description: string }[] = [
    {
        value: "getting-started",
        label: "Getting started",
        description: "Create your account and start studying",
    },
    {
        value: "subscription",
        label: "Subscription & payments",
        description: "How to subscribe, pay, and manage your pass",
    },
    {
        value: "courses-quizzes",
        label: "Courses & quizzes",
        description: "How to browse courses, take quizzes, and review results",
    },
    {
        value: "care-plans",
        label: "Care plans",
        description: "Build, save, and share NANDA care plans",
    },
    {
        value: "account",
        label: "Account & profile",
        description: "Update your details and manage your login",
    },
]

export const HELP_ARTICLES: HelpArticle[] = [
    // ---- Getting Started ----
    {
        slug: "create-account",
        title: "How to create your NursifyGH account",
        summary: "Register with your email, level, and nursing program in under 2 minutes.",
        category: "getting-started",
        content: `# How to create your NursifyGH account

Creating your account takes about 2 minutes.

## Steps

1. Open **nursifygh.com** and click **"Create an account"** in the top-right corner.
2. Fill in the form:
   - **Email address** — use one you check often (e.g., a Gmail account).
   - **Full name** — your name as it appears on your student ID.
   - **Phone number** — a Ghanaian number (e.g., 0244123456).
   - **Nursing program** — pick your track: General Nursing (RGN), Midwifery (RM), Psychiatric Nursing (RPN), or Community Health Nursing (CHN).
   - **Academic level** — Level 100, 200, or 300.
   - **Institution** — the name of your nursing college.
   - **Password** — at least 8 characters. Use a mix of letters, numbers, and symbols.
3. Click **"Create account"**.

You'll be redirected to your dashboard immediately.

## What happens next?

- You can browse the platform and see your curriculum courses.
- **Content access requires a semester pass.** Subscribe with GHS 30 to unlock all courses, quizzes, and care plans for 120 days.

## Questions?

If you have any trouble, [contact support](/contact).`,
    },
    {
        slug: "which-program",
        title: "Which nursing program should I choose?",
        summary: "RGN, RM, RPN, or CHN — here is how to pick the right one.",
        category: "getting-started",
        content: `# Which nursing program should I choose?

Your **program** determines which courses you see on NursifyGH. Choose the one that matches your current enrollment at your nursing college.

## The four programs

### General Nursing (RGN)
The most common track. Leads to registration as a **Registered General Nurse**. You'll study medicine, surgery, maternal health, community health, and mental health across 3 years.

### Midwifery (RM)
Focused on **maternal and newborn care**. Leads to registration as a **Registered Midwife**. You'll take RMD-xxx courses alongside the general nursing curriculum.

### Psychiatric Nursing (RPN)
Focused on **mental health nursing**. Leads to registration as a **Registered Psychiatric Nurse**. You'll take NURS-343 and NURS-344 alongside the general curriculum.

### Community Health Nursing (CHN)
Focused on **community and public health**. Leads to registration as a **Registered Community Nurse**. You'll take PHN-322 and CBR-322 with extra emphasis on community diagnosis.

## I'm not sure which one

Ask your college's academic office — the program you're registered for is on your student record. If you're still unsure, [contact support](/contact) and we'll help.

## Can I change my program later?

Yes. Email [syntradigitalsolutions88@gmail.com](mailto:syntradigitalsolutions88@gmail.com) with your full name and the correct program, and we'll update it within 24 hours.`,
    },
    {
        slug: "which-level",
        title: "I chose the wrong level — can I change it?",
        summary: "Level 100, 200, or 300 — how to fix your choice.",
        category: "getting-started",
        content: `# I chose the wrong level

Your level determines which courses appear on your dashboard.

## If you just registered

Email [syntradigitalsolutions88@gmail.com](mailto:syntradigitalsolutions88@gmail.com) with your registered email and the correct level (100, 200, or 300). We'll update it within 24 hours.

## If you've been using the platform

Your level change takes effect immediately after we update it — your next visit to the dashboard will show the correct curriculum.

## Which level am I?

- **Level 100** — first year of your nursing diploma
- **Level 200** — second year
- **Level 300** — third (final) year

If you're a **university student** (BSc Nursing/Midwifery), our content is currently aligned to the NMC diploma curriculum. Your university's course codes may differ. [Contact support](/contact) for guidance.`,
    },

    // ---- Subscription ----
    {
        slug: "how-to-subscribe",
        title: "How to subscribe with Mobile Money",
        summary: "Pay GHS 30 with MTN MoMo, Vodafone Cash, or AirtelTigo Money.",
        category: "subscription",
        content: `# How to subscribe with Mobile Money

A **semester pass** costs **GHS 30** and gives you **120 days** of full access to all courses, quizzes, and care plans.

## Steps

1. Log in and click the **"Subscribe"** button on your dashboard (or sidebar).
2. The subscription page shows the price (GHS 30) and duration (120 days).
3. Click **"Pay GHS 30 with Paystack"**.
4. You'll be redirected to **Paystack's secure checkout** — this is where you complete the payment.
5. Select your Mobile Money provider:
   - **MTN MoMo** — most common
   - **Vodafone Cash**
   - **AirtelTigo Money**
   - Or use a **card** if you have one.
6. Enter your MoMo number and approve the payment on your phone (you'll receive a prompt).
7. Once payment succeeds, you'll be redirected back to NursifyGH and your subscription activates automatically.

## How do I know it worked?

- Your dashboard shows **"Active"** in green, with an expiry date 120 days from today.
- The **"Subscribe"** cards disappear from all pages.
- You can now open any course with content.

## My payment failed

- Check that your MoMo account has enough balance.
- Check that your number is entered correctly.
- Try a different provider.
- If the problem persists, email [syntradigitalsolutions88@gmail.com](mailto:syntradigitalsolutions88@gmail.com) with the date, time, and amount of your attempted payment.

## Can I get a refund?

Semester passes are non-refundable once activated. If you were charged twice or charged but not activated, [contact support](/contact) — we investigate every case.`,
    },
    {
        slug: "expiry",
        title: "My subscription expired — what happens?",
        summary: "What you lose, what stays, and how to renew.",
        category: "subscription",
        content: `# My subscription expired

Semester passes last **120 days**. When your pass expires:

## What you lose

- Access to courses and quizzes
- Access to care plan templates
- Ability to create new care plans

## What stays

- Your account and password
- **Your quiz history** — you can see past scores but cannot take new quizzes
- **Your saved care plans** — readable but not editable
- **Your profile and progress data**

## How to renew

Renewing is the same as subscribing the first time:

1. Log in.
2. Click **"Subscribe"**.
3. Complete the GHS 30 payment.
4. Your new 120-day period begins immediately.

## Renewing before expiry

If you renew while your pass is still active, the new 120 days are **added to the end** of your current pass, not stacked from today. So if you have 30 days left and renew, you get 150 days total.

## Need help?

[Contact support](/contact) — we respond within 24 hours.`,
    },
    {
        slug: "payment-security",
        title: "Is my payment information safe?",
        summary: "How we handle your money and your data.",
        category: "subscription",
        content: `# Is my payment information safe?

**Yes.** NursifyGH never handles or stores your card number, MoMo PIN, or bank details directly. All payments are processed by **Paystack**, a leading pan-african payment processor that is PCI-DSS Level 1 certified.

## How the flow works

1. You click "Pay with Paystack".
2. You're redirected to Paystack's secure servers.
3. You enter your payment details on **Paystack's** page.
4. Paystack processes the payment and sends us a **secure, signed confirmation**.
5. Only then do we activate your subscription.

## What we store

We store only:
- Your **reference number** (e.g., \`NSGH-xxxxx\`) — used to match the payment to your account.
- The **amount** (GHS 30).
- The **date** and **status** (success/failed).

We **never** store:
- Your card number
- Your MoMo PIN
- Your bank account details

## What if I see an unexpected charge?

Email [syntradigitalsolutions88@gmail.com](mailto:syntradigitalsolutions88@gmail.com) immediately with the date, amount, and last 4 digits of your MoMo number. We investigate within 24 hours.`,
    },

    // ---- Courses & Quizzes ----
    {
        slug: "courses-not-showing",
        title: "Why can't I see my courses?",
        summary: "The most common reasons courses are missing.",
        category: "courses-quizzes",
        content: `# Why can't I see my courses?

If your dashboard shows no courses, check these in order:

## 1. Is your subscription active?

Courses are behind a **GHS 30 semester pass**. Without an active subscription, you'll see a paywall:

> "Subscription required — You need an active semester pass to access courses and quizzes."

**Fix:** click "Subscribe" and complete the GHS 30 payment.

## 2. Is your level correct?

NursifyGH shows courses for **your level only**. If you registered as Level 100 but are in Level 200, you'll see the wrong courses.

**Fix:** check your profile. If the level is wrong, email [syntradigitalsolutions88@gmail.com](mailto:syntradigitalsolutions88@gmail.com).

## 3. Is your program correct?

Your program (General, Midwifery, Psychiatric, Community) determines which elective courses appear.

**Fix:** check your profile. If the program is wrong, email [syntradigitalsolutions88@gmail.com](mailto:syntradigitalsolutions88@gmail.com).

## 4. Are courses marked "Coming Soon"?

We're adding content to the full curriculum. Courses marked **"Soon"** have no questions yet. Courses with a green **"X q"** badge have questions you can practice.

**Fix:** practice what's available. More content is added weekly.

## 5. Technical issue

- Refresh the page.
- Log out and log back in.
- Clear your browser cache.

Still stuck? [Contact support](/contact).`,
    },
    {
        slug: "taking-quiz",
        title: "How to take a quiz",
        summary: "From course selection to final score.",
        category: "courses-quizzes",
        content: `# How to take a quiz

## Steps

1. Log in and click **"Courses"** in the sidebar.
2. Click a course with a green **"X q"** badge.
3. The quiz loads with all questions for that course.
4. For each question, **click your chosen answer** — it turns green to confirm selection.
5. You can change your answer before submitting.
6. Click **"Submit quiz"** at the bottom.
7. **Results page** shows:
   - Your score as a percentage
   - Every question with your answer, the correct answer, and the rationale.

## How does grading work?

- Each question has exactly one correct answer.
- **1 correct answer = 1 point.** Your score is (correct ÷ total) × 100.
- Unanswered questions are marked wrong.

## Can I retake a quiz?

Yes. From the results page, click **"Try again"** to retake. Each attempt is saved separately.

## Is there a time limit?

Not currently. Quizzes are untimed for now. **Timed mock exams are on the roadmap** — you'll see them once they launch.

## Do I see my answers after submitting?

Yes. Every question shows:
- **✓ correct** next to the correct answer
- **✗ your answer** next to your choice (if wrong)
- The **rationale** explaining why.`,
    },
    {
        slug: "understanding-rationale",
        title: "What is a rationale and why does it matter?",
        summary: "The explanations after each quiz question — and why they're worth reading.",
        category: "courses-quizzes",
        content: `# What is a rationale?

A **rationale** is the explanation of why a specific answer is correct (or incorrect) for a quiz question.

## Why rationales matter

NMC licensing exams and nursing college exams don't just test your memory — they test your **clinical reasoning**. Knowing "the answer is B" isn't enough. You need to know:

- **Why** B is correct
- **Why** A, C, and D are wrong
- **What** the underlying principle is

Rationales give you all of this.

## Where to find them

- **After each quiz** — every question on the results page has a rationale.
- **After the marked answer** — the "✓ correct" or "✗ your answer" badges help you see what to focus on.

## How to use them for studying

1. Take the quiz — don't worry about your score the first time.
2. Read **every rationale** on the results page — even for questions you got right.
3. Write down the ones that surprised you.
4. Retake the quiz a week later. Your score should improve significantly.

**Reading rationales is the single most efficient study method** for nursing exams. Our rationales are written by nursing educators to reflect Ghanaian clinical practice.`,
    },

    // ---- Care Plans ----
    {
        slug: "create-care-plan",
        title: "How to build a care plan",
        summary: "From diagnosis selection to shared link.",
        category: "care-plans",
        content: `# How to build a care plan

Nursing care plans (NCPs) are a core deliverable for clinical rotations. NursifyGH makes them structured, professional, and shareable.

## Steps

1. Click **"Care Plans"** in the sidebar.
2. Click **"+ New plan"**.
3. Fill in the form:
   - **Plan title** — a clear, specific name (e.g., "Post-caesarean — Risk for Infection").
   - **Patient scenario** — describe the patient (age, presentation, relevant findings).
   - **Primary NANDA diagnosis** — pick from the dropdown (grouped by domain).
   - **Make this plan public** — check if you want other students to be able to browse and learn from it.
4. Click **"Create plan"**.
5. On the plan detail page, click **"+ Add goal"** to add SMART goals, and **"+ Add intervention"** to add interventions.

## Writing a SMART goal

Each goal has **5 required fields**:

- **S — Specific:** What exactly will be achieved?
- **M — Measurable:** How will progress be measured?
- **A — Achievable:** Is this realistic given the patient's condition?
- **R — Relevant:** Why does this matter for this patient?
- **T — Time-bound:** By when?

Example:
> **S:** Patient will remain free from signs of infection
> **M:** Temperature <37.5°C, WBC <11.0, wound edges pink and dry
> **A:** Achievable with current antibiotic regimen and daily wound care
> **R:** Prevents progression to sepsis and re-admission
> **T:** Within 72 hours of admission

## Writing an intervention

Each intervention has **2 required fields**:

- **Nursing action** — what the nurse will do
- **Scientific rationale** — why (this is mandatory; it's what determines marks)

## Sharing with your clinical instructor

1. From the plan detail page, click **"Share"**.
2. You'll get a link like \`https://nursifygh.com/shared/abc123\`.
3. Copy the link and send it to your instructor via WhatsApp.
4. They open it — **no account needed** — and see your plan read-only.

## Making a plan public

Public plans appear in the **Community Library**, visible to other students. Toggle on when creating the plan, or change it later.`,
    },
    {
        slug: "share-with-instructor",
        title: "How to share a care plan with your instructor",
        summary: "One link — no account required for the instructor.",
        category: "care-plans",
        content: `# How to share a care plan with your instructor

Your clinical instructor probably doesn't want to create another account. That's why we built share links.

## Steps

1. Open your care plan.
2. Click **"Share"** in the top-right.
3. A **30-day link** is generated automatically and copied to your clipboard.
4. Paste it into WhatsApp, email, or SMS and send it to your instructor.

## What your instructor sees

They open the link on any device — phone, tablet, laptop — **without logging in**. The full plan displays read-only:
- Patient scenario
- NANDA diagnosis
- All SMART goals
- All interventions with rationales

## Link validity

- **Valid for 30 days** from creation.
- **Revocable** — if you need to remove access, [contact support](/contact).
- **Read-only** — the instructor cannot edit or delete anything.

## What if my instructor needs to give feedback?

They can reply to your WhatsApp message with comments. Or if they want to rate your plan, they can create a free NursifyGH account and use the rating feature (coming soon).

## Privacy

Only the plan you shared is visible via the link — your account, quiz history, and other plans stay private.`,
    },

    // ---- Account ----
    {
        slug: "reset-password",
        title: "How to reset your password",
        summary: "Forgot your password? Here's how to get back in.",
        category: "account",
        content: `# How to reset your password

## If you remember your password

Log in and go to **Profile** → **Change password**. Enter your current password, then your new one.

## If you forgot your password

Password reset via email is **coming soon**. Until then, email [syntradigitalsolutions88@gmail.com](mailto:syntradigitalsolutions88@gmail.com) from the email address you registered with, and we'll send you a temporary password within 24 hours.

Once you receive the temporary password:
1. Log in with it.
2. Go to **Profile** → **Change password**.
3. Set a new password.

## Password requirements

- At least **8 characters**
- Cannot be entirely numeric
- Cannot be too similar to your email or name
- Cannot be a commonly-used password

If a password fails, you'll see an error message explaining why.`,
    },
    {
        slug: "update-profile",
        title: "How to update your profile",
        summary: "Change your name, phone number, level, or institution.",
        category: "account",
        content: `# How to update your profile

## Self-service

You can update these fields yourself:

- **Full name** — via Profile → edit
- **Phone number** — via Profile → edit
- **Institution** — via Profile → edit

## Fields that need support

These require emailing [syntradigitalsolutions88@gmail.com](mailto:syntradigitalsolutions88@gmail.com) because they affect your curriculum access:

- **Email address** — used for login
- **Level** (100/200/300) — determines which courses you see
- **Program** (General/Midwifery/Psychiatric/Community) — determines which electives you see

For these, email us with your registered email, the change, and why. We'll update within 24 hours.

## Changing your password

Profile → **Change password**. Requires your current password.`,
    },
    {
        slug: "delete-account",
        title: "How to delete your account",
        summary: "What happens when you close your NursifyGH account.",
        category: "account",
        content: `# How to delete your account

Email [syntradigitalsolutions88@gmail.com](mailto:syntradigitalsolutions88@gmail.com) with the subject **"Delete my account"** from your registered email address.

## What happens next

Within 7 days:
- Your personal data is deleted (name, email, phone number, institution).
- Your account, quiz history, and care plans are permanently removed.
- Any active subscription is forfeited (no refund).

## What we keep

For 30 days after deletion, we retain anonymized logs for security and legal compliance. These contain no personal information.

## Recovering a deleted account

Not possible. Deletion is permanent.

## Deleting data only (keep account)

If you want to remove specific care plans but keep your account, delete them individually from the **Care Plans** page. If you want to remove quiz history, [contact support](/contact).`,
    },
]

export function getArticleBySlug(slug: string): HelpArticle | undefined {
    return HELP_ARTICLES.find((a) => a.slug === slug)
}

export function getArticlesByCategory(category: HelpCategory): HelpArticle[] {
    return HELP_ARTICLES.filter((a) => a.category === category)
}

export function searchArticles(query: string): HelpArticle[] {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return HELP_ARTICLES.filter(
        (a) =>
            a.title.toLowerCase().includes(q) ||
            a.summary.toLowerCase().includes(q) ||
            a.content.toLowerCase().includes(q),
    )
}