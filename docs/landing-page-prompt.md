# Landing page prompt

Prompt for generating the Aharya one-page marketing site. Before publishing, fill in the
placeholders: `[DOMAIN]`, the contact email, and pricing once it's decided.

```text
Build a single-page marketing website for "Aharya", an Indian health app. Deliver one
self-contained, responsive HTML file (inline CSS and minimal vanilla JS, no frameworks,
no build step). It must look calm, premium and clinically trustworthy, like a modern
health brand, not a fitness-bro or diet-fad site.

## The product
Aharya turns your blood test report into a personalised Indian meal plan and a weekly
grocery list. The user uploads a blood report (required), and optionally a urine report
and a body-composition (InBody) scan. Aharya reads the reports, flags what matters (for
example cholesterol, blood sugar, haemoglobin, belly fat), works out daily calorie and
protein targets, and gives a 1 to 4 week meal plan built from everyday Indian home food,
plus a grocery list for each week.

The name comes from "ahara", the Sanskrit word for food and nourishment.

Audience: Indian adults aged 30 to 55, especially men who have quietly developed a belly,
borderline sugar or high cholesterol and are not doing anything about it. Also their
spouses and children, who often push them to get healthy. They are busy, not
nutrition-savvy, eat home-cooked Indian food, and distrust generic Western diet apps
that suggest quinoa and kale.

Status: pre-launch. The page's goal is to collect waitlist sign-ups.

## Brand and visual direction
- Mood: calm, warm, clinical-but-human. Think of a well-designed Indian wellness clinic,
  not a gym.
- Colours (define them as CSS variables):
  - Primary: deep green #1F4D3A (trust, health, leaves)
  - Accent: turmeric yellow #E3A72F (Indian kitchen, warmth), used sparingly for
    highlights and the main CTA only
  - Background: warm off-white #FAF7F0; surfaces: #FFFFFF
  - Text: near-black green #14241C; muted text: #5B6B62
  - Status colours for the sample report: normal #2E7D5B, attention #C98A1B,
    see-a-doctor #B4483C
  - Avoid hospital blue and neon gradients.
- Typography: a refined serif for headings (e.g. "Fraunces" or "Instrument Serif" from
  Google Fonts) and a clean sans-serif for body text (e.g. "Inter" or "DM Sans").
  Generous line height, body text at least 17px.
- Layout: lots of white space, a max content width of about 1120px, soft 16 to 20px
  rounded corners, subtle shadows, thin 1px borders. No stock photos of people.
- Imagery: build the visuals in HTML/CSS/inline SVG, with no external images:
  - a stylised lab report card with a few biomarker rows and coloured flags
  - an arrow or flow into a meal-plan card showing one day of Indian meals
  - a grocery-list card with checkboxes grouped by category (dal and grains, vegetables,
    dairy, fruits)
  - simple line icons drawn in inline SVG
- Logo: an inline SVG wordmark "Aharya" in the heading serif, with a small mark: a
  circle (a thali seen from above) with a single leaf inside it, in deep green with a
  turmeric dot. Use it in the nav and footer, and as an SVG favicon.
- Motion: subtle only. Fade and slide-up on scroll using IntersectionObserver, and gentle
  hover lifts on cards. Respect prefers-reduced-motion. No parallax, carousels or
  autoplay.
- Support dark mode via prefers-color-scheme, with a deep green-black background and the
  same accent colours.

## Page sections, in order

1. Sticky top navigation
   Logo on the left. Links: How it works, What you get, Privacy, FAQ. A "Join the
   waitlist" button on the right in turmeric. On mobile it collapses to a menu button.

2. Hero
   - Eyebrow: "Made for Indian kitchens"
   - Headline: "Your blood report, turned into a meal plan you'll actually eat."
   - Subhead: "Upload your lab report. Aharya reads it, spots what needs attention, and
     builds a week of home-style Indian meals with a ready grocery list. No quinoa.
     No kale. Just dal, sabzi and roti, done right."
   - Primary CTA: "Join the waitlist" (scrolls to the form). Secondary CTA:
     "See how it works" (text link).
   - A small trust line under the CTAs: "Your reports stay private. Delete them any time."
   - Right side (stacked below on mobile): the report → meal plan visual. Show a lab
     report card with rows such as "LDL Cholesterol 148 mg/dL" flagged amber, "Fasting
     sugar 112 mg/dL" flagged amber and "Haemoglobin 14.2 g/dL" flagged green. Next to
     it, a meal card for "Day 1" with breakfast "Moong dal chilla with curd", lunch
     "Jowar bhakri, pitla and salad", and dinner "Bajra roti with lauki-chana dal", plus
     a small "1,600 kcal · 86 g protein" summary.

3. The problem (short, empathetic)
   Heading: "Most of us get the report, read the red numbers, and do nothing."
   Three short cards:
   - "Reports are confusing": ranges, units and medical terms nobody explains.
   - "Diet advice isn't Indian": generic plans don't fit a home that cooks dal-chawal.
   - "The belly creeps up": quietly, year after year, until sugar and cholesterol
     follow.

4. How it works (3 numbered steps with icons)
   1. "Upload your reports": a blood report, plus a urine report or InBody scan if you
      have them. PDF or a photo from your phone.
   2. "We read and flag": Aharya pulls out every value, checks it against healthy
      ranges for Indians, and explains what needs attention in plain language.
   3. "Get your plan": daily calorie and protein targets, a 1 to 4 week meal plan and a
      grocery list for each week.

5. What you get (feature grid, 6 cards with an icon, title and one line each)
   - "Plain-language findings": what's high, what's low and why it matters.
   - "Indian-first meal plans": North, South, West or East Indian home food.
   - "Fits how you eat": vegetarian, eggetarian, non-veg, Jain or vegan, and your
     allergies.
   - "Weekly grocery list": quantities for the week, grouped the way you shop at the
     kirana and sabzi mandi.
   - "Built on Indian standards": BMI and waist cut-offs for Indian bodies, not Western
     ones.
   - "Knows when to say see a doctor": urgent values are flagged and no plan is given
     until you've seen a doctor.

6. Sample output showcase
   Heading: "What your plan looks like"
   A tabbed or toggle card that switches between three panels (accessible tabs with
   ARIA roles and keyboard support):
   - "Findings": 3 to 4 finding chips with severity colours, e.g. "Cholesterol needs
     attention", "Blood sugar slightly high", "Fat around the belly".
   - "Meal plan": one full day with 5 meals (breakfast, mid-morning, lunch, evening
     snack, dinner), each with a portion in household measures such as katori or phulka,
     and kcal.
   - "Grocery list": a checklist grouped by category with weekly quantities.
   Label it clearly as "Sample plan".

7. Who it's for
   Heading: "For anyone who's been told to 'watch their diet'"
   Short list with check icons: people with borderline sugar or prediabetes, high
   cholesterol or triglycerides, a growing waistline, low haemoglobin, and families
   who want to help a parent eat better.
   Include a line aimed at the people who share it: "Getting this for your father?
   He just needs his last blood report."

8. Privacy and safety (a dedicated, visually distinct section on a deep-green
   background with light text)
   Heading: "Your health data is yours"
   Four points with icons:
   - "Consent first": we only process your reports after you agree.
   - "Delete any time": remove your reports and plan with one request.
   - "Never sold or shared": your reports are not used for advertising.
   - "Not a replacement for your doctor": Aharya gives nutrition guidance, not diagnosis
     or treatment.
   Mention that the service is designed around India's Digital Personal Data Protection
   Act, 2023.

9. Pricing placeholder
   A single centred card: "Early access pricing will be announced soon. Join the
   waitlist for a founding-member discount." Do not invent prices.

10. FAQ (accessible accordion using <details>/<summary>)
    - Which reports can I upload? Blood test PDFs or photos from any Indian lab. A urine
      report and an InBody body-composition scan are optional.
    - What if my report only has a few tests? We work with what you have and tell you
      which tests would make the plan more accurate.
    - Is this medical advice? No. Aharya gives general nutrition guidance. If something
      in your report needs a doctor, we tell you clearly.
    - I'm vegetarian / Jain. Will it work for me? Yes. Plans follow your diet type and
      skip anything you're allergic to.
    - Will I have to cook special food? No. Plans use everyday home-style dishes and
      ingredients from your local kirana and sabzi mandi.
    - What happens to my reports? They are used only to make your plan, and you can
      delete them at any time.
    - Which languages? English at launch; Hindi and more coming.

11. Waitlist form (section id "waitlist")
    Heading: "Be among the first to try Aharya"
    Fields: full name, email, mobile number (with a fixed "+91" prefix), age range
    (select: 20–29, 30–39, 40–49, 50–60, 60+), and "Who is this for?" (Myself / A parent
    / My partner / Someone else). A required consent checkbox: "I agree to be contacted
    about Aharya's launch." Submit button: "Join the waitlist".
    Client-side validation with inline, friendly error messages: valid email, and a
    10-digit Indian mobile number starting with 6 to 9. On success, replace the form
    with a thank-you message. Leave a clearly marked // TODO where the form should POST
    to the backend endpoint; for now just show the success state. No third-party form
    services.

12. Footer
    Logo, one-line tagline "Food that fits your reports.", links (Privacy policy, Terms,
    Contact), contact email placeholder hello@[DOMAIN], and copyright "© 2026 Aharya".
    Include a small-print disclaimer: "Aharya provides general nutrition guidance based
    on the reports you share. It is not a medical device and does not diagnose, treat or
    prevent any disease. Always consult a qualified doctor about medical concerns."

## Content rules
- Tone: warm, direct, reassuring. Short sentences. Talk like a sensible family doctor
  who also cooks, not like a marketer. Use Indian English and food names (dal, sabzi,
  roti, phulka, katori, kirana) naturally.
- Do not invent testimonials, user counts, ratings, press logos, doctor endorsements or
  statistics. Do not claim the product cures, reverses or treats any condition, and do
  not promise weight-loss amounts or timelines.
- Use "may", "helps" and "guidance" rather than medical promises.

## Technical requirements
- Semantic HTML5 landmarks (header, nav, main, section, footer), one h1, a logical
  heading order.
- Accessibility: WCAG AA contrast in both themes, visible focus states, labelled form
  fields, aria-live for form errors and success, keyboard-operable tabs, menu and
  accordion, and alt text or aria-labels for the SVG visuals.
- Responsive from 360px to wide desktop, with no horizontal scroll on mobile. The hero
  visual stacks below the text on small screens.
- SEO: a title of "Aharya: Your blood report, turned into an Indian meal plan", a meta
  description, Open Graph and Twitter tags, a canonical URL placeholder
  https://[DOMAIN]/, an inline SVG favicon, and JSON-LD for Organization and FAQPage.
- Performance: only Google Fonts as an external request (with preconnect and
  display=swap), no other libraries, lightweight inline SVGs.
- Smooth scrolling for anchor links, with offsets so the sticky nav doesn't cover
  section headings.
- Keep the CSS organised with comments per section so it's easy to edit later.
```
