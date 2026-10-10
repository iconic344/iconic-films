#!/usr/bin/env python3
"""Read-only deployment smoke test. Reports actual HTTP status, no DB writes."""
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = 'https://viiviisara.com'
USER_AGENT = 'VIIVII-PRODUCTION-VERIFICATION/1.0'
def fetch(path, *, byte_range=None, max_bytes=1_400_000):
    headers = {'User-Agent': USER_AGENT, 'Cache-Control': 'no-cache'}
    if byte_range:
        headers['Range'] = byte_range
    request = urllib.request.Request(BASE + path, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=17) as res:
            body = res.read(max_bytes)
            return {'status': res.status, 'type': res.headers.get('Content-Type',''), 'headers': dict(res.headers), 'body': body}
    except urllib.error.HTTPError as error:
        body = error.read(800)
        return {'status': error.code, 'type': error.headers.get('Content-Type',''), 'headers': dict(error.headers), 'body': body}
    except Exception as error:
        return {'status': 0, 'type': '', 'headers': {}, 'body': str(error).encode()}

def report(name, r):
    print(f"{name}: HTTP {r['status']} type={r['type']!r} detail={r['body'][:150]!r}", flush=True)

results={}
for attempt in range(4):
    page=fetch('/')
    if page['status']==200:
        break
    print('Production page probe retry', attempt+1, flush=True)
    time.sleep(3)
report('Home', page)
results['home']=page['status']==200 and b'<html' in page['body'].lower()
if results['home']:
    # Vite may inline CSS or provide a link to a built CSS file.
    document=page['body'].decode('utf-8','replace')
    css_matches=re.findall(r'<link[^>]+href=["\\']([^"\\']+\.css(?:\?[^"\\']*)?)', document)
    style_sources=[document]
    for url in css_matches[:3]:
        asset=fetch(urllib.parse.urlparse(urllib.parse.urljoin(BASE,url)).path, max_bytes=2_000_000)
        report('CSS asset', asset)
        if asset['status']==200:
            style_sources.append(asset['body'].decode('utf-8','replace'))
    results['hero_crop_fix_deployed']=any('is-pre-nas-showreel' in asset for asset in style_sources)
    print('Hero no-crop rule present:', results['hero_crop_fix_deployed'], flush=True)
else:
    results['hero_crop_fix_deployed']=False

media=fetch('/media/viivii-hero-777.mp4',byte_range='bytes=0-2047',max_bytes=2048)
report('Opening showreel',media)
results['showreel']=media['status'] in (200,206) and 'video' in media['type'].lower() and media['body'][4:8]==b'ftyp'
print('Showreel range/content-range:',media['headers'].get('Content-Range'),flush=True)
results['seekable']=media['status']==206

api=fetch('/api/config?verify=project10')
report('Public config API',api)
if api['status']==200:
    try:
        payload=json.loads(api['body'])
        config=payload.get('config')
        results['api']=isinstance(config,dict) and isinstance(config.get('works'),list) and isinstance(config.get('teamMembers'),list)
        print('Config source=',payload.get('source'),'title=',config.get('name') if isinstance(config,dict) else None,flush=True)
    except (json.JSONDecodeError,TypeError) as e:
        print('Config JSON error:',e,flush=True)
        results['api']=False
else:
    results['api']=False

auth=fetch('/api/auth')
report('Public auth status',auth)
results['auth']=auth['status']==200
if results['auth']:
    try:
        results['auth']=json.loads(auth['body']).get('authenticated') is False
    except (ValueError,TypeError):
        results['auth']=False
print('VERIFICATION SUMMARY',json.dumps(results,ensure_ascii=False),flush=True)
sys.exit(0 if all(results.values()) else 1)
