#!/usr/bin/env python3
"""Build a bounded server lookup projection from the authorized PMC catalog v0.1.
No network, PHI, inference, translated LOINC labels or patient reference ranges.
"""
import argparse,gzip,hashlib,json,pathlib,shutil
p=argparse.ArgumentParser();p.add_argument('--source',required=True);a=p.parse_args()
source=pathlib.Path(a.source);root=pathlib.Path(__file__).resolve().parents[2];out=root/'data/diagnostic-catalog';out.mkdir(parents=True,exist_ok=True)
manifest={'version':'pmc-catalog-2026-09-28-v0.1','sources':{'LOINC':{'version':'2.83','count':112405,'url':'https://clinicaltables.nlm.nih.gov/apidoc/loinc/v3/doc.html'},'GTR':{'version':'2026-09-27','count':64009,'url':'https://www.ncbi.nlm.nih.gov/gtr/docs/maintenance_use/'},'PMC_FAMILY':{'version':'v1','count':284}},'files':[],'clinicalValidation':False,'missingLoincAxes':['SYSTEM','TIME_ASPCT','SCALE_TYP','CLASS','STATUS'],'unitConversion':False,'sourceSha256':{}}
def ndjson(name):
 path=source/'data'/name;manifest['sourceSha256'][name]=hashlib.sha256(path.read_bytes()).hexdigest()
 with path.open() as f:
  for line in f:
   if line.strip():yield json.loads(line)
def save(name,rows,system):
 b=json.dumps(rows,ensure_ascii=False,separators=(',',':')).encode();compressed=gzip.compress(b,compresslevel=9,mtime=0);(out/name).write_bytes(compressed)
 manifest['files'].append({'path':name,'system':system,'records':len(rows),'sha256':hashlib.sha256(compressed).hexdigest(),'uncompressedBytes':len(b)})
def shards(system,rows,size=10000):
 seen=set();batch=[];i=0
 for row in rows:
  code=row.get('LOINC_NUM') or row.get('test_accession_ver') or row.get('id')
  if not code or code in seen:raise ValueError('Missing or duplicate code')
  seen.add(code);batch.append(row)
  if len(batch)==size:i+=1;save(f'{system.lower()}-{i:02}.json.gz',batch,system);batch=[]
 if batch:i+=1;save(f'{system.lower()}-{i:02}.json.gz',batch,system)
 assert len(seen)==manifest['sources'][system]['count'],(system,len(seen))
def loinc():
 keys=['LOINC_NUM','LONG_COMMON_NAME','SHORTNAME','PROPERTY','METHOD_TYP','EXTERNAL_COPYRIGHT_NOTICE','EXTERNAL_COPYRIGHT_LINK']
 for f in ['loinc_nlm_2.83.ndjson','loinc_external_rights_index.ndjson']:
  for row in ndjson(f):yield {k:row[k] for k in keys if k in row and row[k] is not None}
def gtr():
 keys=['test_accession_ver','lab_test_name','name_of_laboratory','facility_country','nexora_test_type']
 for row in ndjson('gtr_current_public_tests.ndjson'):yield {k:row[k] for k in keys}
shards('LOINC',loinc());shards('GTR',gtr());shards('PMC_FAMILY',[{k:r[k] for k in ['id','name_ru','name_en']} for r in json.loads((source/'data/pmc_examination_families.json').read_text())])
manifest['ucumCount']=759
save('ucum.json.gz',json.loads((source/'data/ucum_nlm.json').read_text()),'UCUM')
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(out/'licenses').mkdir(exist_ok=True)
for name in ['license.txt','LOINC_short_license.txt','ucum_license.txt','ATTRIBUTIONS.md']:shutil.copyfile(source/'licenses'/name,out/'licenses'/name)
attribution=out/'licenses/ATTRIBUTIONS.md'
attribution.write_text(attribution.read_text().replace('DICOM CID29/CID34: © 2026 NEMA. Official value set and its original copyright metadata are included in sources/dicom_cid29_valueset.json. https://dicom.nema.org/medical/dicom/current/output/chtml/part16/sect_CID_29.html. Codes identify acquisition modalities, not clinical validity or capability to interpret image content.', 'This server projection excludes the DICOM modality values, intake profiles and extended examination descriptions present in the full source package. No image decoding capability is supplied by this projection.'))
print(json.dumps({'files':len(manifest['files']),'compressedBytes':sum((out/f['path']).stat().st_size for f in manifest['files']),'counts':{s:x['count'] for s,x in manifest['sources'].items()}},indent=2))
