$content = Get-Content -Raw -Encoding UTF8 'd:/PROJETS/eglise-saas/src/lib/demo-customers.ts'; 
$newContent =  -replace 'donnee[s]? de demonstration', 'données de démonstration'; 
$newContent =  -replace 'donnee[s]?', 'données'; 
$newContent =  -replace 'cree', 'créé'; 
$newContent =  -replace 'depense[s]?', 'dépenses'; 
Set-Content -Path 'd:/PROJETS/eglise-saas/src/lib/demo-customers.ts' -Value  -Encoding UTF8; 
(Get-Content -Raw -Encoding UTF8 'd:/PROJETS/eglise-saas/src/lib/demo-customers.ts')
