# Submission

## What I Did
1.  **Refactored to Clean Architecture**:
    -   Moved all business logic to `libs/engine`.
    -   Implemented Domain Models (`Url`) and Ports (`UrlRepository`, `AnalyticsRepository`).
    -   Implemented Use Cases (`ShortenUrl`, `GetOriginalUrl`) to encapsulate logic.
    -   Implemented Prisma Adapters for persistence.

2.  **Database & Persistence**:
    -   Set up **Prisma** with **SQLite**.
    -   Created `Url` and `Visit` models.
    -   Implemented robust queries including visit counting.
    -   *Decision Point*: I initially tried Prisma 7.3.0 but encountered generation issues with the Docker/Workspace setup. I downgraded to **Prisma 5.22.0** (Stable) to ensure reliability within the time limit.

3.  **Core Logic**:
    -   Replaced the 9-code generator with `nanoid` (configured for URL-safety and 8 chars length) to ensure practically collision-free generation.
    -   Added collision handling loop in `ShortenUrlUseCase`.
    -   Added `UrlSchema` with **Zod** for validation.

4.  **Frontend (Web)**:
    -   Refactored `routes/_index.tsx` to list URLs with visit statistics.
    -   Refactored `routes/s.$code.tsx` to use the Engine for lookup and tracking.
    -   Improved UI using **ShadCN**-like components (Cards, Inputs, Buttons) and **Tailwind CSS**.
    -   Added loading states and error handling.
    -   Implemented copy-to-clipboard functionality.

5.  **Infrastructure**:
    -   Updated `Dockerfile` to ensure `prisma generate` runs during build and `prisma db push` runs on startup.
    -   Verified the engine runtime with a custom script (`libs/engine/scripts/test-db.ts`).
-   **E2E Testing (Playwright)**:
    - Implemented a complete E2E test suite in `applications/web/e2e/url-shortener.spec.ts`.
    - Added `data-testid` attributes to UI components for more resilient testing.
    - Verified URL shortening, redirection, statistics tracking, and local storage cleanup.
    - Added robust error handling UI for database connection failures.
    - Resolved E2E failures by enabling custom form validation (`noValidate`) and ensuring proper URL state synchronization when clearing local storage.

## What I Would Do With More Time
-   **Caching**: Implement Redis caching for `GetOriginalUrlUseCase` to reduce DB hits for popular links.
-   **Analytics**: Add more detailed analytics (location, referrer, graphs).
-   **API Layer**: Separate the API from the UI (e.g. `applications/api`) if the project scales.
-   **DevContainer**: Fix the DevContainer setup for easier collaboration.
-   **CI/CD**:
    -   **Automated Testing Pipeline**: Implement GitHub Actions to run Unit Tests (Vitest) and E2E (Playwright) on every Pull Request to ensure regression testing.
    -   **Linting & Style**: Enforce `eslint` and `prettier` checks in the pipeline to maintain code quality standards.
    -   **Docker Build Check**: Verify that the application containerizes correctly on every commit to prevent deployment issues.
-   **Security**:
    -   **Rate Limiting**: Implement IP-based rate limiting (using Redis or middleware) on the creation endpoint to prevent abuse and spam.
    -   **Bot Protection**: Add a lightweight CAPTCHA or Turnstile to the public submission form.

## AI Usage

I used Google Antigravity as my pair programmer.
-   **Scaffolding**: Used it to generate the initial domain models and repositories.
-   **Refactoring**: Used it to rewrite the frontend components.
-   **Debugging**: Used it to troubleshoot the Prisma generation issues (downgrading decision was mine but informed by AI error analysis).
-   **Verification**: Attempted to use browser automation, though environment limits required manual fallback/scripted verification.
### Frontend URL Validation & Feedback
- **Robust Validation**: Implemented a comprehensive `useUrlValidation` hook that checks for:
    - Empty/whitespace-only input.
    - Invalid URL formatting.
    - Protocol restrictions (HTTPS/HTTP).
    - Hostname presence.
    - Security: Blocking local/private network IPs (localhost, 127.0.0.1, etc.).
    - Length constraints (max 2048 characters).
- **UX Improvements**:
    - Real-time feedback as the user types (after the field is touched).
    - ARIA attributes for accessibility (`aria-invalid`, `aria-describedby`).
    - Input clearing and validation reset on successful shortening.
    - Micro-animations for error message appearance.
    - **Dialog Workflow**: Implemented a success modal for new short URLs that auto-copies to clipboard.
    - **Quick Actions**: Added "Copy" and "Go To" buttons on link cards with visual feedback.
- **Comprehensive Testing**: 37 unit tests covering all edge cases, ensuring reliable validation logic.

## Feedback
-   The default setup for Prisma in a monorepo with `pnpm` workspaces was slightly tricky with the new Prisma 7 version. Downgrading to 5 solved it.
-   The base project structure was good for separation of concerns.
