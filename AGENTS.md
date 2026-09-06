# DRP OS project conventions

## Product direction

- This portfolio is **DRP OS**, a fictional personal workstation inspired by Windows 95/98.
- Preserve the desktop metaphor: icons, overlapping application windows, taskbar, Start menu and classic controls.
- Do not rebuild it as a conventional landing page, hero, card grid or long scroll.
- Visual references define composition and mood only. Never copy professional claims from an image.
- Use original CSS artwork and familiar computing metaphors; do not copy proprietary Windows assets.
- There is no standalone Tech Stack application. Technologies belong in **Sobre mí / System Properties**.

## Source of truth

- `docs/CV.pdf` is the only source of truth for professional facts.
- Do not add companies, dates, roles, studies, technologies, certifications, metrics, responsibilities or achievements not supported by the CV.
- Keep `frontend/public/CV.pdf` byte-for-byte synchronized with `docs/CV.pdf` when the source changes.
- Technologies are explicit CV claims and use `evidenceType: EXPLICIT`.
- Competencies may be reasonably inferred from described work, use `evidenceType: DERIVED`, and include a concrete evidence sentence.
- Preserve Spanish copy and UTF-8 encoding.

## Repository and code language

- `https://github.com/Dani-Moriarty/drp-os` is the canonical repository. The former `Dani-Moriarty/portfolio` repository is historical and must not receive normal development commits.
- Preserve the normal accumulating history on `main`; do not rebuild releases as snapshot repositories or force-push away later development.
- Write identifiers owned by DRP OS in natural Spanish by default: variables, functions, methods, types, interfaces, classes, constants, comments and internal documentation.
- Keep names imposed by Angular, TypeScript, Java, Spring, the DOM, HTTP, JSON, SQL, libraries and external contracts exactly as required.
- Use ASCII in technical identifiers (`tamano`, not `tamaño`) and correct Spanish spelling in comments, documentation and visible copy.
- Comment decisions, exceptions and delicate behavior when the reason is useful. Avoid comments that repeat the code, artificial TODO quotas and dead code added only for style.
- Prefer clear, maintainable code with natural variation between files. Never trade types, security, tests, accessibility or architecture for an appearance of human authorship.

## Frontend architecture

- Use Angular standalone components, strict TypeScript, signals for local UI state and SCSS per component.
- Keep application metadata in `frontend/src/app/desktop/config/desktop-applications.ts`.
- Route all window lifecycle changes through `GestorVentanas`: abrir, enfocar, z-index, minimizar, restaurar, cerrar and position.
- Keep icon persistence in `DistribucionEscritorio`; localStorage schema changes must be versioned and backward-safe.
- Application components render content. They must not duplicate window-management behavior.
- Use Pointer Events for drag behavior and keep windows recoverable inside the workspace.
- At `640px` or less, use the mobile icon grid, disable drag and keep application content scrollable.
- Do not add a UI framework or state-management library for this portfolio.
- Configure the real repository URL only in `frontend/src/app/desktop/config/source-code.config.ts`; never invent one.

## Application metaphors

- Welcome: initial overview and recruiter shortcuts.
- Sobre mí: System Properties tabs for profile, technologies and contact.
- Work Experience: Explorer folder containing one TXT per experience.
- Experience and Education: Notepad-style readers.
- CV: embedded PDF viewer plus download action.
- LinkedIn and Source Code: real, safe external shortcuts.
- Terminal and Recycle Bin: honest minimal states, not fake functionality.
- Contratar: a compact reverse job-application wizard integrated into the desktop and kept visually consistent with Windows 95/98.
- Solitaire: a playable Klondike game integrated through the normal application registry, window manager, taskbar and restart lifecycle.
- Minesweeper: a playable, first-click-safe implementation with classic difficulty presets, flags and timer, integrated through the normal desktop lifecycle.
- Task Manager: a live DRP OS utility backed by `GestorVentanas` and `ActividadSistema`; show real session windows, HTTP activity and errors, never invented host CPU/RAM/process data.
- Message Board: one public guestbook-style conversation backed by SQL Server, with a permanent administrator message, no visitor edit/delete controls, and right-click moderation only for a verified Daniel browser session.

## Backend architecture

- Use Spring Boot REST with conventional `controller`, `service`, `repository`, `domain`, `dto` and `config` packages.
- SQL Server is the runtime database. H2 is test-only.
- Keep the API read-only unless the product scope explicitly changes.
- Do not add authentication, users or an admin panel without a concrete requirement.
- Never expose JPA entities directly; controllers return DTOs.
- Update `CargaDatosPortfolio` only after checking the CV, and associate technologies and derived competencies with the experience supporting them.
- Never expose mail credentials, provider tokens or the configured recipient in frontend code.
- Job-offer submissions are validated, emailed and discarded; do not persist recruiter contact data or messages unless the product scope explicitly changes.
- Keep the job-offer recipient fixed in backend configuration and set `Reply-To` only from the validated recruiter email.
- Preserve the existing Windows 95/98 visual language in the Contratar form and its success/error message boxes.
- Message Board posts are the deliberate exception to the generally read-only API: validate and persist them globally, keep message `#1` permanent, and enforce moderation in the backend. The root secret stays local; browser administration uses short-lived one-time activation plus a signed `HttpOnly`, `Secure`, `SameSite=Strict` cookie.

## Deployment architecture

- The public Angular desktop is a static Cloudflare Pages site and must remain usable when the local backend is offline.
- Keep the versioned portfolio snapshot in `frontend/public/data/portfolio.json` synchronized with CV-verified backend data.
- Configure the public API origin only through `frontend/public/runtime-config.js`; it is public configuration and must never contain secrets.
- Production Spring Boot runs on `127.0.0.1` behind Cloudflare Tunnel. Never expose its port or SQL Server port through the router.
- SQL Server Express remains local. Back up and verify before migration; never remove the preserved Developer volume until Daniel explicitly approves it.
- Tunnel tokens, credential JSON files, private recipients and mail credentials stay outside Git.

## Commands

Run from `frontend/`:

- Install: `pnpm install`
- Develop: `pnpm start`
- Test once: `pnpm test:ci`
- Lint: `pnpm lint`
- Production build: `pnpm build`

Run from `backend/`:

- Test: `./mvnw test` (`mvnw.cmd test` on Windows)
- Develop: `./mvnw spring-boot:run`
- Package: `./mvnw clean package`

Run from the repository root:

- Start SQL Server: `docker compose up -d database database-init`
- Stop services: `docker compose down`

## Completion checklist

- Run frontend lint, tests and production build.
- Run backend tests and package build.
- Exercise every desktop application and external-link fallback.
- Verify window focus, z-index, minimize/restore, close, drag and taskbar behavior.
- Verify icon drag persistence, reload and Start-menu reset.
- Check desktop and mobile widths, including loading and error states.
- Verify every professional claim against `docs/CV.pdf`.
- Update `README.md` whenever setup, versions, environment variables, commands or architecture change.
