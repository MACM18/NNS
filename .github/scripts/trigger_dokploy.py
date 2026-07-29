#!/usr/bin/env python3
"""Send a simple POST request to a deployment webhook."""

from __future__ import annotations

import argparse
import sys
import urllib.error
import urllib.request


def trigger_webhook(url: str, timeout: int = 30) -> int:
    request = urllib.request.Request(
        url,
        data=b"",
        method="POST",
        headers={
            "User-Agent": "resume-ci-webhook/1.0",
            "Accept": "application/json, text/plain, */*",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            sys.stdout.write(f"Webhook triggered successfully: {response.status}\n")
            return 0
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        sys.stderr.write(f"Webhook request failed: HTTP {exc.code}\n")
        if body:
            sys.stderr.write(body + "\n")
        return 1
    except urllib.error.URLError as exc:
        sys.stderr.write(f"Webhook request failed: {exc.reason}\n")
        return 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", help="Deployment webhook URL")
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="Request timeout in seconds (default: 30)",
    )
    args = parser.parse_args()
    return trigger_webhook(args.url, timeout=args.timeout)


if __name__ == "__main__":
    raise SystemExit(main())
