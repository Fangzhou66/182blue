
# ExtraCredit

Tools for fetching + processing CS 182/282A Ed threads into a static website (Special Participation A LLM evaluation directory).

## Setup

1. Create an Ed API token: https://edstem.org/us/settings/api-tokens
2. Add a `.env` file in the repo root:

```bash
ED_API_TOKEN=...
```

## Python Environment

**Recommended: `uv`**

```bash
uv sync
uv run python fetch_all_resources.py
uv run python process_threads.py
```

**Alternative: conda**

```bash
conda create -n extracredit python=3.10 -y
conda activate extracredit
pip install -r requirements.txt
python fetch_all_resources.py
python process_threads.py
```

## Serve the Website

```bash
cd website
python -m http.server 8080
# open http://localhost:8080
```
