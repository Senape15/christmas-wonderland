# Genera le icone PWA di Christmas Wonderland (PNG, nessuna dipendenza esterna).
#
# Identità: albero di Natale stilizzato con stella d'oro su fondo pino, più
# neve e un vaso rosso. I colori sono gli stessi token di src/app/globals.css.
#
# Uso (dalla root del progetto):
#   powershell -ExecutionPolicy Bypass -File scripts/generate-pwa-icons.ps1
#
# Output in public/icons:
#   icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$outDir = Join-Path $PSScriptRoot "..\public\icons"
$outDir = [System.IO.Path]::GetFullPath($outDir)
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# Palette (tokens di globals.css)
$pine950 = [System.Drawing.ColorTranslator]::FromHtml("#041f12")
$pine900 = [System.Drawing.ColorTranslator]::FromHtml("#0b2e1a")
$pine700 = [System.Drawing.ColorTranslator]::FromHtml("#1a5c38")
$pine600 = [System.Drawing.ColorTranslator]::FromHtml("#1e7a4a")
$pine500 = [System.Drawing.ColorTranslator]::FromHtml("#22a05f")
$gold = [System.Drawing.ColorTranslator]::FromHtml("#d4a843")
$goldLight = [System.Drawing.ColorTranslator]::FromHtml("#f0d78c")
$red = [System.Drawing.ColorTranslator]::FromHtml("#c41e3a")
$redDark = [System.Drawing.ColorTranslator]::FromHtml("#9b1b30")
$cream = [System.Drawing.ColorTranslator]::FromHtml("#fdfbf7")
$snow = [System.Drawing.ColorTranslator]::FromHtml("#fafbfc")

$canvas = 1024

function New-StarPoints([double]$cx, [double]$cy, [double]$outer, [double]$inner) {
  $points = @()
  for ($i = 0; $i -lt 10; $i++) {
    $radius = if ($i % 2 -eq 0) { $outer } else { $inner }
    # -90° = punta verso l'alto
    $angle = (-90 + ($i * 36)) * [Math]::PI / 180
    $points += [System.Drawing.PointF]::new(
      [single]($cx + $radius * [Math]::Cos($angle)),
      [single]($cy + $radius * [Math]::Sin($angle))
    )
  }
  return $points
}

function New-Triangle([double]$cx, [double]$top, [double]$bottom, [double]$halfWidth) {
  return @(
    [System.Drawing.PointF]::new([single]$cx, [single]$top),
    [System.Drawing.PointF]::new([single]($cx - $halfWidth), [single]$bottom),
    [System.Drawing.PointF]::new([single]($cx + $halfWidth), [single]$bottom)
  )
}

# Disegna il soggetto su fondo trasparente. `scale` riduce l'arte per lasciare
# il margine di sicurezza richiesto dalle icone maskable.
function New-ArtBitmap([double]$scale) {
  $art = New-Object System.Drawing.Bitmap $canvas, $canvas
  $g = [System.Drawing.Graphics]::FromImage($art)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  $g.TranslateTransform([single]($canvas / 2), [single]($canvas / 2))
  $g.ScaleTransform([single]$scale, [single]$scale)
  $g.TranslateTransform([single](-$canvas / 2), [single](-$canvas / 2))

  $cx = $canvas / 2

  # Bagliore caldo dietro l'albero
  $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $glowPath.AddEllipse([single]($cx - 330), [single](190), 660, 660)
  $glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush $glowPath
  $glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(70, $gold)
  $glowBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, $gold))
  $g.FillPath($glowBrush, $glowPath)

  # Neve
  $rnd = New-Object System.Random 20261225
  for ($i = 0; $i -lt 46; $i++) {
    $x = $rnd.Next(70, 954)
    $y = $rnd.Next(70, 954)
    # Evita la zona centrale dell'albero
    if ([Math]::Abs($x - $cx) -lt 190 -and $y -gt 220 -and $y -lt 850) { continue }
    $r = $rnd.Next(3, 9)
    $alpha = $rnd.Next(80, 190)
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($alpha, $snow))
    $g.FillEllipse($brush, [single]($x - $r), [single]($y - $r), [single]($r * 2), [single]($r * 2))
    $brush.Dispose()
  }

  # Tronco
  $trunk = New-Object System.Drawing.SolidBrush $redDark
  $g.FillRectangle($trunk, [single]($cx - 34), [single]720, 68, 96)
  $trunk.Dispose()

  # Tre livelli dell'albero
  $tiers = @(
    @{ top = 250; bottom = 470; half = 150; color = $pine500 },
    @{ top = 390; bottom = 640; half = 210; color = $pine600 },
    @{ top = 540; bottom = 790; half = 270; color = $pine700 }
  )
  foreach ($tier in $tiers) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddPolygon((New-Triangle $cx $tier.top $tier.bottom $tier.half))
    $brush = New-Object System.Drawing.SolidBrush $tier.color
    $g.FillPath($brush, $path)
    # Bordo luminoso sul lato sinistro per dare volume
    $edge = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(90, $goldLight)), 6
    $edge.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $edge.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($edge, [single]$cx, [single]$tier.top, [single]($cx - $tier.half), [single]$tier.bottom)
    $edge.Dispose()
    $brush.Dispose()
    $path.Dispose()
  }

  # Vaso rosso
  $potPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $potPath.AddPolygon(@(
    [System.Drawing.PointF]::new([single]($cx - 96), [single]812),
    [System.Drawing.PointF]::new([single]($cx + 96), [single]812),
    [System.Drawing.PointF]::new([single]($cx + 70), [single]892),
    [System.Drawing.PointF]::new([single]($cx - 70), [single]892)
  ))
  $pot = New-Object System.Drawing.SolidBrush $red
  $g.FillPath($pot, $potPath)
  $pot.Dispose()
  $potPath.Dispose()

  # Fiocco rosso
  $ribbon = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, $gold))
  $g.FillRectangle($ribbon, [single]($cx - 100), [single]802, 200, 18)
  $ribbon.Dispose()

  # Palline dorate sull'albero
  $ornaments = @(
    @{ x = $cx - 96; y = 470; r = 14 },
    @{ x = $cx + 88; y = 520; r = 12 },
    @{ x = $cx - 150; y = 640; r = 16 },
    @{ x = $cx + 132; y = 690; r = 14 },
    @{ x = $cx - 40; y = 610; r = 11 }
  )
  foreach ($ornament in $ornaments) {
    $brush = New-Object System.Drawing.SolidBrush $goldLight
    $g.FillEllipse($brush, [single]($ornament.x - $ornament.r), [single]($ornament.y - $ornament.r), [single]($ornament.r * 2), [single]($ornament.r * 2))
    $brush.Dispose()
  }

  # Stella
  $starOuter = 92
  $starInner = 38
  $starPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $starPath.AddPolygon((New-StarPoints $cx 200 $starOuter $starInner))
  $starBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.PointF]::new([single]($cx - $starOuter), [single](200 - $starOuter)),
    [System.Drawing.PointF]::new([single]($cx + $starOuter), [single](200 + $starOuter)),
    $goldLight,
    $gold
  )
  $g.FillPath($starBrush, $starPath)
  $starPen = New-Object System.Drawing.Pen $gold, 4
  $g.DrawPath($starPen, $starPath)
  $starPen.Dispose()
  $starBrush.Dispose()
  $starPath.Dispose()

  $g.Dispose()
  return $art
}

function New-IconBitmap([System.Drawing.Bitmap]$art, [double]$artScale) {
  $bmp = New-Object System.Drawing.Bitmap $canvas, $canvas
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    [System.Drawing.PointF]::new(0, 0),
    [System.Drawing.PointF]::new($canvas, $canvas),
    $pine900,
    $pine950
  )
  $g.FillRectangle($bg, 0, 0, $canvas, $canvas)
  $bg.Dispose()

  # Alone centrale: mantiene leggibile l'icona su qualsiasi launcher
  $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $glowPath.AddEllipse([single]($canvas / 2 - 400), [single]($canvas / 2 - 400), 800, 800)
  $glow = New-Object System.Drawing.Drawing2D.PathGradientBrush $glowPath
  $glow.CenterColor = [System.Drawing.Color]::FromArgb(70, $pine700)
  $glow.SurroundColors = @([System.Drawing.Color]::FromArgb(0, $pine700))
  $g.FillPath($glow, $glowPath)
  $glow.Dispose()
  $glowPath.Dispose()

  $g.TranslateTransform([single]($canvas / 2), [single]($canvas / 2))
  $g.ScaleTransform([single]$artScale, [single]$artScale)
  $g.TranslateTransform([single](-$canvas / 2), [single](-$canvas / 2))
  $g.DrawImage($art, 0, 0, $canvas, $canvas)

  $g.Dispose()
  return $bmp
}

function Save-Png([System.Drawing.Bitmap]$source, [int]$size, [string]$path) {
  $target = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($target)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($source, 0, 0, $size, $size)
  $g.Dispose()
  $target.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $target.Dispose()
  Write-Host "creato $path"
}

# Icona standard: l'arte riempie ~86% del canvas, resta margine per i launcher.
$standardArt = New-ArtBitmap 0.86
$standard = New-IconBitmap $standardArt 1.0
Save-Png $standard 192 (Join-Path $outDir "icon-192.png")
Save-Png $standard 512 (Join-Path $outDir "icon-512.png")
Save-Png $standard 180 (Join-Path $outDir "apple-touch-icon.png")

# Maskable: il soggetto resta dentro il 60% centrale, il fondo copre tutto.
$maskArt = New-ArtBitmap 0.62
$maskable = New-IconBitmap $maskArt 1.0
Save-Png $maskable 512 (Join-Path $outDir "maskable-512.png")

$standard.Dispose()
$maskable.Dispose()
$standardArt.Dispose()
$maskArt.Dispose()

Write-Host "Icone PWA generate in $outDir"
