Add-Type -AssemblyName System.Drawing

$srcFile = "artifacts\oxel-house-villa\public\tmpfav-src.jpg"
$pngFile = "artifacts\oxel-house-villa\public\apple-touch-icon.png"
$icoFile = "artifacts\oxel-house-villa\public\favicon.ico"
$outSize  = 512

# --- 1. let the user pick the wide jpeg on the first run ---
Add-Type -AssemblyName System.Windows.Forms
$fp = New-Object System.Windows.Forms.OpenFileDialog
$fp.Title  = "choose the wide jpeg to crop into the favicon (1024px-ish)"
$fp.Filter = "JPEG files (*.jpg, *.jpeg)|*.jpg;*.jpeg"
$fp.Multiselect = $false
$fp.CheckFileExists = $true
$fp.InitialDirectory = Split-Path $srcFile -Parent
$res = $fp.ShowDialog()

if ($res -ne [System.Windows.Forms.DialogResult]::OK) {
    Write-Output "cancelled by user"
    exit 0
}

Copy-Item -LiteralPath $fp.FileName -Destination $srcFile -Force

# --- 2. crop a centered square and write both formats ---
$bmp = [System.Drawing.Image]::FromFile((Resolve-Path $srcFile).Path)
try {
    $w = $bmp.Width
    $h = $bmp.Height
    $side = [Math]::Min($w, $h)
    $x = [Math]::Floor(($w - $side) / 2)
    $y = [Math]::Floor(($h - $side) / 2)

    $sq = New-Object System.Drawing.Bitmap($outSize, $outSize)
    $g  = [System.Drawing.Graphics]::FromImage($sq)
    try {
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.DrawImage($bmp, (0), (0), $outSize, $outSize, $x, $y, $side, $side)
    } finally {
        $g.Dispose()
    }

    # apple-touch-icon.png : 180x180 RGBA png
    $apple = New-Object System.Drawing.Bitmap(180, 180)
    $ag    = [System.Drawing.Graphics]::FromImage($apple)
    try {
        $ag.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $ag.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $ag.DrawImage($sq, 0, 0, 180, 180)
    } finally {
        $ag.Dispose()
    }
    $apple.Save($pngFile, [System.Drawing.Imaging.ImageFormat]::Png)

    # favicon.ico : 512x512 (Window writes an ICO from a 512px bitmap; .ico keeps transparency)
    $sq.Save($icoFile, [System.Drawing.Imaging.ImageFormat]::Icon)
} finally {
    $bmp.Dispose()
    $sq.Dispose()
}

Write-Output "wrote $icoFile ($(Get-Item -LiteralPath $icoFile | Measure-Object -Property Length -Sum).Sum bytes) and $pngFile ($(Get-Item -LiteralPath $pngFile | Measure-Object -Property Length -Sum).Sum bytes) from $srcFile"
