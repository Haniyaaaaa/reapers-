Add-Type -AssemblyName System.IO.Compression.FileSystem
$tmp = Join-Path $env:TEMP 'reapers-docx'
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
[System.IO.Compression.ZipFile]::ExtractToDirectory('c:\Users\jhone\Downloads\Reapers_Frontend_Functional_Requirements.docx', $tmp)
[xml]$xml = Get-Content (Join-Path $tmp 'word\document.xml')
$ns = @{w='http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
$paras = Select-Xml -Xml $xml -XPath '//w:p' -Namespace $ns
foreach ($p in $paras) {
  $texts = Select-Xml -Xml $p.Node -XPath './/w:t' -Namespace $ns
  $line = ($texts | ForEach-Object { $_.Node.InnerText }) -join ''
  Write-Output $line
}
