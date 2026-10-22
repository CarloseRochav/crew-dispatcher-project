# AI log

One line each time Claude Code got something wrong and I caught it. This feeds the README section "What I verified".

Format: **Step N** | what it did | how I noticed | what I changed

- **Step 1** | Flagged the `cn` package in `lib/utils.ts` as an unexplained third-party dependency and proposed replacing it with `clsx` + `tailwind-merge`, based on outdated knowledge of the shadcn setup | While planning the cleanup, Claude read `node_modules/cn/package.json` and `npm ls`: `cn` is shadcn's own package (repo `shadcn-ui/cn`) and the shadcn CLI depends on it | Cancelled the cleanup; kept `cn` and `shadcn` as installed. Lesson: check the installed package before calling a dependency suspicious
