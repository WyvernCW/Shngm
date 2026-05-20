import urllib.request
import re

# Let's search for a popular manga or load a known page from cosmicscans
# Since we fetched the homepage earlier, let's extract a few manga urls from the HTML
# or fetch the search results page for "bully" or "barbarian" or something similar

url = "https://lc8.cosmicscans.asia/?s=bully"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
}

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as response:
        html = response.read().decode('utf-8', errors='ignore')
        print("Search results length:", len(html))
        
        # Let's find links inside search results
        # In Themesia/MangaStream, search results are in elements inside '.listupd'
        # e.g., class="bs" or class="bsx"
        matches = re.findall(r'<div class="bsx">.*?href="([^"]+)".*?title="([^"]+)"', html, re.DOTALL)
        print("Found search result titles & urls:", matches[:5])
        
        if matches:
            # Let's inspect the first search result detail page!
            detail_url = matches[0][0]
            print("\nFetching detail page:", detail_url)
            d_req = urllib.request.Request(detail_url, headers=headers)
            with urllib.request.urlopen(d_req, timeout=10) as d_resp:
                d_html = d_resp.read().decode('utf-8', errors='ignore')
                print("Detail HTML length:", len(d_html))
                
                # Extract Title
                title = re.search(r'<h1 class="entry-title"[^>]*>(.*?)</h1>', d_html)
                if title:
                    print("Detail Title:", title.group(1).strip())
                
                # Extract Cover
                cover = re.search(r'<div class="thumb"[^>]*>.*?<img[^>]*src="([^"]+)"', d_html, re.DOTALL)
                if cover:
                    print("Detail Cover:", cover.group(1).strip())
                else:
                    cover_alt = re.search(r'class="wp-post-image"[^>]*src="([^"]+)"', d_html)
                    if cover_alt:
                        print("Detail Cover (Alt):", cover_alt.group(1).strip())
                
                # Extract Genres
                genres = re.findall(r'<span class="mgen">.*?<a[^>]*>(.*?)</a>', d_html, re.DOTALL)
                print("Detail Genres:", genres)
                
                # Extract Chapters
                # In Themesia, chapters are listed inside a list class like <ul class="clist"> or id="chapterlist"
                chapters = re.findall(r'<li[^>]*data-num="([^"]*)".*?<a href="([^"]+)".*?<span class="chapternum">([^<]+)</span>.*?<span class="chapterdate">([^<]+)</span>', d_html, re.DOTALL)
                if not chapters:
                    # Alternative regex for chapters
                    chapters = re.findall(r'<a href="([^"]+)".*?<span class="chapternum">([^<]+)</span>.*?<span class="chapterdate">([^<]+)</span>', d_html, re.DOTALL)
                print(f"Found {len(chapters)} chapters. Samples:")
                for ch in chapters[:3]:
                    print(ch)
                    
                if chapters:
                    # Let's fetch one of the chapters to see the reader image structure!
                    # The last item in the list or the first item (let's pick the last index for chapter page, e.g. chapter 1)
                    ch_url = chapters[-1][0] if len(chapters[0]) == 3 else chapters[-1][1]
                    print("\nFetching chapter page:", ch_url)
                    ch_req = urllib.request.Request(ch_url, headers=headers)
                    with urllib.request.urlopen(ch_req, timeout=10) as ch_resp:
                        ch_html = ch_resp.read().decode('utf-8', errors='ignore')
                        print("Chapter HTML length:", len(ch_html))
                        
                        # In Themesia/MangaStream, chapter pages usually have a JSON block or element structure:
                        # ts_reader.run({ ... "sources":[{"url":...}] }) or a list of images inside #readerarea
                        ts_reader = re.search(r'ts_reader\.run\((.*?)\);', ch_html)
                        if ts_reader:
                            print("Found ts_reader.run JSON!")
                            print(ts_reader.group(1)[:500])
                        else:
                            # Try finding image tags in readerarea
                            images = re.findall(r'<div id="readerarea".*?</div>', ch_html, re.DOTALL)
                            if images:
                                print("Found readerarea block! Length:", len(images[0]))
                                img_srcs = re.findall(r'<img[^>]*src="([^"]+)"', images[0])
                                print("Images in readerarea:", img_srcs[:5])
                            else:
                                print("No readerarea found. Trying standard img regex:")
                                all_imgs = re.findall(r'<img[^>]*src="([^"]+)"', ch_html)
                                print("All images on page count:", len(all_imgs))
        
except Exception as e:
    print("Error:", e)
