# One-time Metrics setup

The profile README expects `github-metrics.svg`. GitHub Actions generates and refreshes that file from `.github/workflows/metrics.yml`.

## 1. Create a fine-grained personal access token

Create a token dedicated to profile metrics. Use the shortest practical expiry and grant read-only access.

For **public repositories only**, do not grant access to private repositories.

To include aggregate language and activity data from private repositories, the token must be allowed to read those repositories. Do this only if you are comfortable sending repository metadata to the third-party `lowlighter/metrics` action. The workflow publishes aggregated output, not source code, but the action necessarily reads the data used to create it.

## 2. Add the repository secret

In the `DhiranReddy/DhiranReddy` repository:

1. Open **Settings → Secrets and variables → Actions**.
2. Create a repository secret named `METRICS_TOKEN`.
3. Paste the dedicated token as its value.

Never place the token directly in the workflow or README.

## 3. Run the workflow

Open **Actions → Generate profile metrics → Run workflow**.

The action will create `github-metrics.svg` on the `main` branch. The README dashboard will appear after that commit is generated.

## 4. Verify the output

Confirm that:

- No private repository names appear unexpectedly.
- Language percentages look plausible.
- The PageSpeed URL is `https://dhiranreddy.cyou`.
- The generated image has no empty or failed plugin sections.
- The workflow has only `contents: write` repository permission.

The workflow runs every Monday and can also be triggered manually.
