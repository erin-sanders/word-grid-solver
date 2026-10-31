"""Export a pinned ESDB database without converting names to common words."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import subprocess

REVISION = "1e5b7d3a72f47a71da5d28686c1dd4b397178485"
SIZE = 80
EXCLUDED_CLASSES = (
    "person", "surname", "place", "name", "name?", "upper", "upper?",
    "abbr", "abbr?", "trademark",
)
QUERY = """
SELECT DISTINCT s.word, lemma.word AS lemma, s.base_pos, s.pos_class
FROM scowl_ s
JOIN words lemma ON lemma.word_id = s.lemma_id
WHERE s.size <= 80
  AND s.spelling IN ('_', 'A', 'B', 'Z')
  AND s.region IN ('', 'US', 'GB')
  AND s.variant_level <= 5
  AND s.base_pos NOT IN ('abbr', 'x', 'pre', 'suf', 'wp', 'we')
  AND s.pos_class NOT IN ({})
""".format(",".join("?" for _ in EXCLUDED_CLASSES))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="Checkout of the pinned en-wl/wordlist revision")
    args = parser.parse_args()
    revision = subprocess.check_output(
        ["git", "-C", str(args.source), "rev-parse", "HEAD"], text=True
    ).strip()
    if revision != REVISION:
        raise ValueError(f"Expected ESDB revision {REVISION}, got {revision}")
    if subprocess.check_output(
        ["git", "-C", str(args.source), "status", "--porcelain"], text=True
    ).strip():
        raise ValueError("ESDB source checkout must be clean")
    database = args.source / "scowl.db"
    if not database.is_file():
        raise ValueError("Run python -X utf8 combine.py create-db scowl.db in the source checkout first")
    with sqlite3.connect(database) as conn:
        rows = conn.execute(QUERY, EXCLUDED_CLASSES).fetchall()
        accepted = [
            row for row in rows
            if re.fullmatch("[a-z]+", row[0]) and re.fullmatch("[a-z]+", row[1])
        ]
        words = sorted({row[0] for row in accepted})
        # Independent common-word senses must survive the removal of name senses.
        included = ["rose", "roses", "mark", "marks", "will", "wills", "bill", "bills",
                    "running", "walked", "cats", "color", "colour", "organize", "organise", "quite",
                    "zyzzyva", "zaxes", "qat", "qats", "abaser", "abasers"]
        excluded = ["london", "mary", "james", "september", "monday", "nasa", "fbi", "etc",
                    "can't", "mother-in-law"]
        for word in included:
            if word not in words:
                raise ValueError(f"Missing required dictionary probe: {word}")
        for word in excluded:
            if word in words:
                raise ValueError(f"Unexpected proper-name/abbreviation/punctuation probe: {word}")
        source_probes = {
            probe: conn.execute(
                "SELECT DISTINCT word, base_pos, pos_class FROM scowl_v0 "
                "WHERE lower(word) = ? AND size <= ? ORDER BY word, base_pos, pos_class", (probe, SIZE)
            ).fetchall()
            for probe in ["rose", "mark", "will", "london", "mary", "september", "nasa", "etc",
                          "zyzzyva", "zaxes", "qat", "qats", "abaser", "abasers"]
        }
    destination = Path(__file__).resolve().parents[1] / "public"
    destination.mkdir(exist_ok=True)
    content = ("\n".join(words) + "\n").encode("ascii")
    (destination / "words.txt").write_bytes(content)
    copyright_content = subprocess.check_output(
        ["git", "-C", str(args.source), "show", "HEAD:Copyright"]
    )
    (destination / "dictionary-license.txt").write_bytes(copyright_content)
    metadata = {
        "source": "https://github.com/en-wl/wordlist",
        "revision": revision,
        "size": SIZE,
        "spellings": ["_", "A", "B", "Z"],
        "regions": ["", "US", "GB"],
        "maximum_variant_level": 5,
        "word_count": len(words),
        "sha256": hashlib.sha256(content).hexdigest(),
        "copyright_sha256": hashlib.sha256(copyright_content).hexdigest(),
        "excluded_pos_classes": EXCLUDED_CLASSES,
        "filter": "ASCII lowercase word AND lemma; no lowercasing or deaccenting; exclude abbreviation/nonword/affix/multiword POS",
        "included_probes": included,
        "excluded_probes": excluded,
        "source_probes": source_probes,
        "query": QUERY,
    }
    (destination / "dictionary-metadata.json").write_text(
        json.dumps(metadata, indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    print(f"Exported {len(words):,} words; SHA-256 {metadata['sha256']}")


if __name__ == "__main__":
    main()
