"""One-time TabPFN licence acceptance without an interactive terminal.

TabPFN's own login (tabpfn.browser_auth.try_browser_login) gives up when stdin is not a TTY, which is the
case under IDE agents and CI runners. This runs the same browser-callback flow: it opens the Prior Labs login
page, waits for the redirect with the API key, verifies it, and caches it where TabPFN looks for it.

Run:  python scripts/tabpfn_login.py [--repos tabpfn_3_5 tabpfn_2_6 ...] [--timeout 900]
"""

from __future__ import annotations

import argparse
import sys
import threading
import time
import webbrowser
from urllib.parse import quote

from tabpfn import browser_auth as ba
from tabpfn.settings import settings

DEFAULT_REPO = "tabpfn_3_5"  # licence repo of the default model (ModelVersion.V3_5); others: tabpfn_2_5/2_6/3


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repos", nargs="*", default=[DEFAULT_REPO], help="checkpoint licence repos to accept")
    ap.add_argument("--timeout", type=int, default=900, help="seconds to wait for each browser login")
    args = ap.parse_args()
    return max(accept(repo, args.timeout) for repo in args.repos)


def accept(repo: str, timeout: int) -> int:
    gui, api = settings.tabpfn.auth_gui_url, settings.tabpfn.auth_api_url
    licence = ba._get_license_name(repo)

    token = ba.get_cached_token()
    if token and ba.verify_token(token, api) and ba.check_license_accepted(token, api, licence):
        print(f"{repo}: licence already accepted; token cached.", flush=True)
        return 0

    event, received = threading.Event(), [None]
    httpd, port = ba._create_callback_server(gui, event, received)
    threading.Thread(target=ba._serve_until_event, args=(httpd, event), daemon=True).start()
    url = f"{gui}/login?callback={quote(f'http://localhost:{port}')}&hf_repo_id={quote(repo)}"
    webbrowser.open(url)
    print(f"Opened the TabPFN login page. If no browser tab appeared, open:\n  {url}", flush=True)

    deadline = time.time() + timeout
    while not event.is_set() and time.time() < deadline:
        time.sleep(1)
    httpd.server_close()
    token = received[0]
    if not token:
        print("Timed out waiting for the browser login.", file=sys.stderr)
        return 1
    if ba.verify_token(token, api) is False:
        print("The API key from the browser was rejected.", file=sys.stderr)
        return 1
    ba.save_token(token)
    if ba.check_license_accepted(token, api, licence):
        print(f"{repo}: licence accepted; token cached for future runs.", flush=True)
        return 0
    print(f"Logged in, but the licence is not accepted yet. Accept it at:\n  {gui}/accept-license?hf_repo_id={repo}",
          file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
