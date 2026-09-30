# skills

Personal Hermes skill pack. Clone on any machine, run `./install.sh`, done.

## artifact-* pack

Self-contained HTML artifacts (deck, doc, dashboard, prototype, tool, board, one-pager) built from a shared React + Tailwind + shadcn kit. `artifact-build` owns the toolchain and visual system; each `artifact-<format>` skill owns the rules of one format and calls the build CLI.

    ./install.sh              links skills into Hermes, installs ~/.artifact-kit (node 20+, pnpm required)
    ./install.sh --no-browser same, without Chromium for screenshots

Manual use of the CLI:

    node artifact-build/scripts/artifact.mjs list
    node artifact-build/scripts/artifact.mjs init demo --format deck --theme shakers
    node artifact-build/scripts/artifact.mjs build demo --out /abs/path/demo.html

Themes live in `artifact-build/templates/kit/src/tokens/*.css`. Add a file there, rerun `setup`, and `--theme <name>` works.

## checkout-sentry pack

Claude Code skills for the Checkout Sentry reports. Copy each folder into `.claude/skills/` of the project.

- `coletar-checkouts-sentry`: collects the full checkouts JSON through the user's authenticated Chrome.
- `gerar-relatorio-checkout-sentry-json`: computes KPIs from that JSON export; the delivery format is up to the agent.
