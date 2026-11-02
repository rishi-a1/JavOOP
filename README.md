# OOP Practice – Java & C++

A lightweight, static **LeetCode‑style** practice platform that lets users work through OOP questions in **Java** and **C++**.

## What’s inside?

- **`oop-practice/`** – static front‑end built with vanilla HTML/JS and the Monaco editor.
  - `index.html` – UI with Bootstrap styling.
  - `app.js` – loads questions, runs code via JDoodle, and shows hidden solutions.
  - `style.css` – minimal custom styling.
  - `questions/`
    - `java.json` – 25 Java OOP questions (each with `starterCode` and `solution`).
    - `cpp.json` – matching C++ questions.
- **`oop-questions/questions.json`** – placeholder for future consolidated question sets.

All unrelated **SignVue** files have been removed.

## How to run locally

1. Open `oop-practice/index.html` in a browser (no server required).  
2. The page uses the **Monaco** editor loaded from a CDN and calls the **JDoodle** API for compilation/execution.  
   - You’ll need to replace `YOUR_JDOODLE_CLIENT_ID` and `YOUR_JDOODLE_CLIENT_SECRET` in `app.js` with your own JDoodle credentials if you want to run code.
3. The UI is fully functional without any build step.

## Deploy to GitHub Pages

1. **Make sure the repository is pushed** (already done).
2. In the GitHub web UI:
   - Go to **Settings → Pages**.
   - Under **Source**, select **Branch: `main`** and **Root** (or `/ (root)`).
   - Click **Save**. GitHub will publish the contents of the `main` branch.
3. After a few seconds, GitHub will provide a URL like `https://rishi-a1.github.io/JavOOP/`.  
   - Visiting that URL will show the OOP practice site.

## Customisation

- Add more questions by editing `oop-practice/questions/java.json` or `cpp.json` – follow the existing structure (`id`, `title`, `description`, `starterCode`, `solution`).
- Change the look & feel by editing `style.css` or swapping the Bootstrap version in `index.html`.
- To host the site on a custom domain, configure the **Custom domain** field in the Pages settings.

---

*This repository was cleaned up to contain only the OOP practice site. All previous SignVue‑related files have been removed.*
