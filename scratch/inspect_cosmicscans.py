import urllib.request
import re

url = "https://lc8.cosmicscans.asia/"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
}

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as response:
        html = response.read().decode('utf-8', errors='ignore')
        print("Fetched successfully. Length:", len(html))
        
        # Look for theme links or generators
        generators = re.findall(r'<meta name="generator" content="([^"]+)"', html)
        print("Generators:", generators)
        
        # Look for style sheet links or common class names
        links = re.findall(r'href="([^"]+)"', html)
        themes = [l for l in links if 'themes/' in l]
        print("Themes:", themes[:5])
        
        # Print first 2000 chars of HTML
        print("\n=== HEAD HTML ===")
        print(html[:2000])
        
        # Print some interesting structural blocks (like latest updates or popular)
        print("\n=== BODY SEGMENT MATCHES ===")
        # Look for elements with class like "utao", "listupd", "manga", etc.
        body_classes = set(re.findall(r'class="([^"]+)"', html))
        relevant_classes = [c for c in body_classes if any(x in c for x in ['listupd', 'mng', 'mang', 'series', 'post', 'chapter', 'epxs'])]
        print("Relevant classes found:", relevant_classes[:15])
        
except Exception as e:
    print("Error fetching page:", e)
