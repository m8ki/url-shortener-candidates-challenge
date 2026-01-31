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

## What I Would Do With More Time
-   **Testing**: Add Integration tests for the Web API (End-to-End). Currently, I manually verified the Engine runtime.
-   **Caching**: Implement Redis caching for `GetOriginalUrlUseCase` to reduce DB hits for popular links.
-   **Analytics**: Add more detailed analytics (location, referrer, graphs).
-   **API Layer**: Separate the API from the UI (e.g. `applications/api`) if the project scales.
-   **DevContainer**: Fix the DevContainer setup for easier collaboration.

## AI Usage

I used Google Antigravity as my pair programmer.
-   **Scaffolding**: Used it to generate the initial domain models and repositories.
-   **Refactoring**: Used it to rewrite the frontend components.
-   **Debugging**: Used it to troubleshoot the Prisma generation issues (downgrading decision was mine but informed by AI error analysis).
-   **Verification**: Attempted to use browser automation, though environment limits required manual fallback/scripted verification.

## Feedback
-   The default setup for Prisma in a monorepo with `pnpm` workspaces was slightly tricky with the new Prisma 7 version. Downgrading to 5 solved it.
-   The base project structure was good for separation of concerns.
