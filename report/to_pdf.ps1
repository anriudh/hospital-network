# Export the report .docx to PDF with Microsoft Word (no other tools needed).
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$docx = Join-Path $here "Hospital_Network_Report.docx"
$pdf = Join-Path $here "Hospital_Network_Report.pdf"
$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $doc = $word.Documents.Open($docx, $false, $true)
    $doc.Fields.Update() | Out-Null
    $doc.ExportAsFixedFormat([string]$pdf, 17)   # 17 = wdExportFormatPDF
    $doc.Close([ref]0)
    Write-Output "wrote $pdf"
} finally {
    $word.Quit()
}
