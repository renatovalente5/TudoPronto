import json, urllib.request, urllib.parse, concurrent.futures as cf, time, sys

nomes = json.load(open('/tmp/mun2.json'))
out = {}
falhas = []

def puxa(n):
    u = 'https://geoapi.pt/municipio/' + urllib.parse.quote(n) + '?json=1'
    for tentativa in range(3):
        try:
            with urllib.request.urlopen(u, timeout=45) as r:
                d = json.load(r)
            c = d.get('geojson', {}).get('properties', {}).get('centros', {})
            pt = c.get('centroide') or c.get('centro') or c.get('centroDeMassa')
            if not pt: return n, None
            return n, {
                'nome': d.get('nome', n),
                'distrito': d.get('distrito') or d.get('distrito_ilha') or '',
                'ine': d.get('codigoine', ''),
                'lon': round(float(pt[0]), 5),
                'lat': round(float(pt[1]), 5),
            }
        except Exception as e:
            if tentativa == 2: return n, ('erro: ' + str(e)[:60])
            time.sleep(1.5 * (tentativa + 1))

with cf.ThreadPoolExecutor(max_workers=6) as ex:
    for i, (n, r) in enumerate(ex.map(puxa, nomes)):
        if isinstance(r, dict): out[n] = r
        else: falhas.append((n, r))
        if (i+1) % 50 == 0: print(f'{i+1}/{len(nomes)}', flush=True)

print('obtidos:', len(out), 'falhas:', len(falhas))
if falhas: print(falhas[:10])
json.dump(out, open('/tmp/concelhos.json','w'), ensure_ascii=False)
