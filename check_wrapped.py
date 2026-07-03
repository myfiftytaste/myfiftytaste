import json

with open('data/output/tanguytare_wrapped.json') as f:
    data = json.load(f)

# Count films by source
sources = {}
for film in data['films']:
    source = film.get('source', 'unknown')
    sources[source] = sources.get(source, 0) + 1

print('=== Films by source ===')
for source, count in sorted(sources.items()):
    print(f'{source}: {count}')

print('\n=== Films with supplemental source ===')
for film in data['films']:
    if film.get('source') == 'supplemental':
        print(f"- {film.get('rss_title')} (slug: {film.get('letterboxd_slug')}) - has_social_stats: {film.get('has_social_stats')}, has_metadata: {film.get('has_metadata')}")

print('\n=== Sample film with metadata from supplemental ===')
for film in data['films']:
    if film.get('source') == 'supplemental' and film.get('genres'):
        print(f"- {film.get('rss_title')}: genres={film.get('genres')}, runtime={film.get('runtime')}")
        break
