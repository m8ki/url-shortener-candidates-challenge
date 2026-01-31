This is a coding challenge. Requirements can be found in the `CHALLENGE_DESCRIPTION.md` file.

I want you to act as a senior software engineer and help me build this project. Focused on SOLID principles, clean code, and best practices. Testing for important parts of the application is a must.

## Technical Constraints & Stack
- **Stack**: React Router v7 (Full Stack), Vite, TailwindCSS v4.
- **Architecture**:
    - Core domain logic MUST reside in the `@url-shortener/engine` (libs/engine) workspace.
    - `applications/web` should only handle UI and HTTP/Routing concerns.
- **Database**: Use **Prisma** with SQLite (for easy Docker deployment).
- **Testing**: Use **Vitest** for unit testing domain logic in `libs/engine`.

## Strategy
- **Prioritize**: Core Logic (Engine) > Database Persistence > Basic UI > Polish.
- **Time Management**: This is a 2-hour challenge. Do not overengineer. Focus on a working MVP that demonstrates good architecture.

I want you to document your decisions and reasoning in the `CHALLENGE_SUBMISSION.md` file. Make it meaningful and well-structured. Keep your prompts and resolutions in a `prompts.md` file to help you with the context. Explain what you did, why you did it, and what you would do differently if you had more time. Also document the AI tools you used and how you used them.

Application should be dockerized and instructions should be in the `README.md` file. Also verify that it works correctly.

Please do not recommend further features. Just implement what is required. I will ask for more features if needed.