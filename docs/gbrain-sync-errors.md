# gbrain-sync error lookup

Every error message `cavestack-brain-*` can print, with problem, cause, and fix.

Search this file by the prefix after `BRAIN_SYNC:` or by the binary name in
the command output.

---

## `BRAIN_SYNC: brain repo detected: <url>`

**Problem.** You're on a machine that has `~/.cavestack-artifacts-remote.txt`
(or the legacy `~/.cavestack-brain-remote.txt`, copied from another machine) but
no local git repo at `~/.cavestack/.git`.

**Cause.** You've set up GBrain sync elsewhere and your cavestack hasn't been
restored on this machine yet.

**Fix.**
```bash
cavestack-brain-restore
```
This pulls the repo into `~/.cavestack/` and re-registers merge drivers.

If you don't want to restore here, dismiss the hint with:
```bash
cavestack-config set artifacts_sync_mode_prompted true
```

---

## `BRAIN_SYNC: blocked: <pattern-family>:<snippet>`

**Problem.** Sync stopped because the secret scanner detected credential-shaped
content in a staged file. The queue is preserved; nothing was pushed.

**Cause.** One of the pre-commit secret patterns matched the file contents —
likely an AWS key, GitHub token, OpenAI key, PEM block, JWT, or bearer token
embedded in JSON.

**Fix (three options).**

1. **If it's a real secret**: edit the offending file to remove the secret,
   then re-run any skill to retry sync.

2. **If the pattern is a false positive** (e.g., your learning contains a
   GitHub token pattern in an example string that you *want* to publish):
   ```bash
   cavestack-brain-sync --skip-file <path>
   ```
   This permanently excludes the path from future syncs.

3. **If you want to abandon this sync batch entirely** (start fresh):
   ```bash
   cavestack-brain-sync --drop-queue --yes
   ```
   This clears the queue without committing. Future writes will re-populate
   it normally.

---

## `BRAIN_SYNC: push failed: auth.`

**Problem.** Git push was rejected because your auth with the remote expired
or is missing.

**Cause.** The remote is unreachable with current credentials.

**Fix.** Refresh auth based on your remote:

- **GitHub**: `gh auth status` (then `gh auth refresh` if needed)
- **GitLab**: `glab auth status`
- **Other**: `git remote -v` + check SSH keys or credential helper

After fixing auth, run any skill to retry sync automatically.

---

## `BRAIN_SYNC: push failed: <first-line-of-error>`

**Problem.** Push failed for a reason other than auth. The first line of
git's error appears after the colon.

**Cause.** Could be network issue, rejected push (remote ahead), server 500,
or repo access revoked.

**Fix.** Look at `~/.cavestack/.brain-sync-status.json` for more detail, or run:
```bash
cd ~/.cavestack && git status && git push origin HEAD
```
to see git's full error. The queue is cleared after any push attempt, but
your local commit still exists — the next skill run will retry the push.

---

## `cavestack: brain-sync push NOT sent — the egress receipt could not be written`

**Problem.** The push was refused before anything left your machine. Every
brain-sync push writes a tamper-evident receipt to the egress ledger
(`~/.cavestack/security/egress.jsonl`) before sending, fail-closed. The
receipt could not be written, so nothing was sent, no local commit was
made, and the queue is preserved — the next run retries the whole drain.
`cavestack-brain-sync --status` shows `EGRESS_RECEIPT_FAILED` as the failure
detail.

**Cause.** `~/.cavestack/security/` is not writable (the receipt writer creates
it when missing, so absence alone is not the cause), the disk is full, or
`CAVESTACK_HOME` points at a read-only location.

**Fix.**
```bash
mkdir -p ~/.cavestack/security && chmod -R u+w ~/.cavestack/security
```
Then run any skill (or `cavestack-brain-sync --once`) to retry. Inspect the
ledger with `cavestack-egress list`; verify its hash chain with
`cavestack-egress verify`.

---

## `cavestack-artifacts-init: ~/.cavestack/ is already a git repo pointing at: <url>`

**Problem.** You tried to init with a remote URL that doesn't match the
existing one. The command refuses to overwrite.

**Cause.** You already ran `cavestack-artifacts-init` with a different remote.

**Fix.** Either:

- Use the existing remote: run `cavestack-artifacts-init` without `--remote`, or
  with the matching URL.
- Switch remotes: `git -C ~/.cavestack remote set-url origin <url>` (the
  command's own suggestion), or `cavestack-brain-uninstall` first, then re-init
  with the new URL. Neither deletes your data.

---

## `Remote not reachable via SSH: <url>`

**Problem.** Init couldn't reach the git remote to verify connectivity.

**Cause.** Wrong URL, missing auth, network issue.

**Fix.** Test manually:
```bash
git ls-remote <url>
```
If that fails, check:
- URL spelling
- GitHub: `gh auth status`
- GitLab: `glab auth status`
- Private network / VPN / DNS

---

## `Failed to create or find '<name>'. Try --remote <url>.`

**Problem.** Auto-repo-creation via `gh repo create` failed and the repo
isn't discoverable via `gh repo view` either.

**Cause.** `gh` is unauthenticated, a repo with that name already exists
owned by someone else, or your GitHub account hit a quota.

**Fix.**
```bash
gh auth status
```
If unauth'd, run `gh auth login`. If the repo name collides, pass a different
name:
```bash
cavestack-artifacts-init --remote git@github.com:YOURUSER/custom-name.git
```

---

## `cavestack-brain-restore: ~/.cavestack/.git already points at <url>`

**Problem.** You tried to restore from a URL that doesn't match the existing
git config.

**Cause.** Stale `.git` from a previous init with a different remote.

**Fix.** `cavestack-brain-uninstall`, then re-run `cavestack-brain-restore <url>`.

---

## `cavestack-brain-restore: ~/.cavestack/ has existing allowlisted files that would be clobbered`

**Problem.** You're trying to restore, but `~/.cavestack/` already contains
learnings or plans that would be overwritten.

**Cause.** Either (a) this machine has accumulated state from a pre-sync
cavestack session, or (b) a previous failed restore left partial state.

**Fix (three options).**

1. **If this machine's state should become the new truth**: run
   `cavestack-artifacts-init` instead of restore — this creates a brand-new brain
   repo from this machine's state.

2. **If you want to adopt the remote and discard this machine's state**:
   back up `~/.cavestack/projects/` first, then remove the offending files and
   re-run restore.

3. **If you want to merge**: there's no automatic merge for this. Manually
   copy learnings from `~/.cavestack/` into your running cavestack on a machine
   with sync already on, then restore here.

---

## `cavestack-brain-restore: <url> does not look like a cavestack-brain repo`

**Problem.** The clone succeeded but the repo is missing `.brain-allowlist`
and `.gitattributes`.

**Cause.** You pointed restore at a random git repo, or someone deleted the
canonical config files from the brain repo.

**Fix.** Verify the URL. If it's correct, run `cavestack-artifacts-init --remote
<url>` to re-seed the canonical config.

---

## Nothing is syncing but I expect it to

**Not an error, but a common gotcha.** Check in order:

1. `cavestack-brain-sync --status` — is mode `off`?
2. `~/.cavestack/.git` exists?
3. `cavestack-config get artifacts_sync_mode` — should be `full` or `artifacts-only`.
4. The file you expect to sync — is it in the allowlist?
   `cat ~/.cavestack/.brain-allowlist`
5. Privacy class filter — if mode is `artifacts-only`, behavioral files
   (timelines, developer-profile) are intentionally skipped.

If all those look right, run:
```bash
cavestack-brain-sync --discover-new
cavestack-brain-sync --once
```
to force a drain.
