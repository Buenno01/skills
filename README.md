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

- `checkout-sentry-collect-from-browser`: collects the full checkouts JSON through the user's authenticated Chrome; the browser downloads the file.
- `checkout-sentry-data-extract`: computes the numbers from the CSV export or the collected JSON, crossed with the Shopify customers export. Single entry point `scripts/extract.py` routes to the CSV or JSON flow.
- `checkout-sentry-generate-report`: builds the Raio-X do checkout page from a component kit, with a suggested full-report composition and a gallery of charts and tables.
