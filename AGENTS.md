# Starlit Repository Rules

- All human commits, pushes, pull requests, releases, and GitHub writes must use `ansible-starlight-space`.
- Commit author and committer must be `ansible-starlight-space <46233501+ansible-starlight-space@users.noreply.github.com>`.
- Verify `git var GIT_AUTHOR_IDENT`, `git var GIT_COMMITTER_IDENT`, and `gh api user --jq .login` before remote writes.
- Preserve the existing initial commit; do not rewrite published history.
- Use functional TypeScript, `type` declarations, explicit return types, relative imports, and no `any`.
- `@fleetia/lagrange` is the only design-system dependency. Do not add source aliases or workspace/file/link fallbacks.
