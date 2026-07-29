import os
import sys
import urllib.request
import urllib.error

def trigger_webhook():
    webhook_url = os.environ.get("DOKPLOY_WEBHOOK_URL")
    if not webhook_url:
        print("DOKPLOY_WEBHOOK_URL secret is not set, skipping redeploy trigger.")
        sys.exit(0)

    print("Triggering Dokploy redeploy via Python...")
    req = urllib.request.Request(webhook_url, method="POST")
    
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Status Code: {response.status}")
            print(f"Response: {response.read().decode('utf-8')}")
            print("Successfully triggered Dokploy deployment.")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error occurred: {e.code} - {e.reason}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"URL Error occurred: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    trigger_webhook()
