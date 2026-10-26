"""Auto-test : python scripts/test_rss_cache.py (assert, aucun appel réseau, fichiers dans un dossier temporaire)."""

import os
import tempfile
import time
from pathlib import Path

import build_user_wrapped as module

RSS = '<?xml version="1.0"?><rss version="2.0"><channel><title>t</title><item><title>Film, 2020 - ★★★</title></item></channel></rss>'
calls = []


class FakeResponse:
    status_code = 200
    text = RSS


module.requests.get = lambda url, timeout: (calls.append(url) or FakeResponse())

with tempfile.TemporaryDirectory() as tmp:
    module.OUTPUT_DIR = Path(tmp)
    module.LETTERBOXD_RATE_LIMIT_STATE_FILE = Path(tmp) / "state"
    module.MIN_LETTERBOXD_REQUEST_INTERVAL_SECONDS = 0

    module.fetch_rss("zz_test")
    module.fetch_rss("zz_test")
    assert len(calls) == 1, "le 2e appel doit relire le flux enregistré, pas retélécharger"
    assert (Path(tmp) / "zz_test_rss.xml").read_text(encoding="utf-8") == RSS
    assert not list(Path(tmp).glob("*.tmp")), "pas de fichier temporaire oublié"

    old = time.time() - 11 * 60
    os.utime(Path(tmp) / "zz_test_rss.xml", (old, old))
    module.fetch_rss("zz_test")
    assert len(calls) == 2, "un flux de plus de 10 minutes doit être retéléchargé"

    module.fetch_rss("zz_autre")
    assert len(calls) == 3, "le flux d'un autre pseudo ne doit jamais être réutilisé"

print("OK")
