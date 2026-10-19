# =============================================================================
# LevelUp Shield — One-Line PowerShell Auto Installer & Updater
# Tự động tải, giải nén và chuẩn bị tiện ích LevelUp Focus Shield cho Google Chrome.
# =============================================================================
$ErrorActionPreference = 'Stop'

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "LevelUp Focus Shield — Auto Installer & Updater"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   LEVELUP FOCUS SHIELD — TỰ ĐỘNG CÀI ĐẶT & CẬP NHẬT   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Thư mục cài đặt cố định chuẩn Windows
$targetDir = Join-Path $env:LOCALAPPDATA "LevelUpShield"
if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

# 2. Xác định URL tải
$baseUrl = "https://level-up-seven-blue.vercel.app"
if ($args.Count -gt 0 -and $args[0]) {
    $baseUrl = $args[0].TrimEnd('/')
}

$zipUrl = "$baseUrl/download/levelup-shield.zip"
$tempZip = Join-Path $targetDir "shield_temp.zip"

Write-Host "[1/2] Đang tải gói tiện ích mới nhất từ máy chủ..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $zipUrl -OutFile $tempZip -UseBasicParsing

Write-Host "[2/2] Đang giải nén vào thư mục:" -ForegroundColor Yellow
Write-Host "      $targetDir" -ForegroundColor Cyan
Expand-Archive -Path $tempZip -DestinationPath $targetDir -Force
if (Test-Path $tempZip) {
    Remove-Item -Path $tempZip -Force
}

# Tự động sao chép đường dẫn thư mục vào Clipboard để người dùng dán nhanh
try {
    Set-Clipboard -Value $targetDir
} catch {}

# Kiểm tra xem extension đã từng được nạp trong bất kỳ profile nào của Chrome chưa
$chromeUserData = Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data"
$isAlreadyInstalled = $false
if (Test-Path $chromeUserData) {
    try {
        $prefFiles = Get-ChildItem -Path $chromeUserData -Filter "Preferences" -Recurse -Depth 2 -ErrorAction SilentlyContinue
        foreach ($pref in $prefFiles) {
            if (Select-String -Path $pref.FullName -Pattern "LevelUp" -Quiet -ErrorAction SilentlyContinue) {
                $isAlreadyInstalled = $true
                break
            }
        }
    } catch {}
}

Write-Host ""
if ($isAlreadyInstalled) {
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host " HOÀN TẤT CẬP NHẬT THÀNH CÔNG!" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "Toàn bộ file tiện ích trong thư mục đã được cập nhật bản mới nhất." -ForegroundColor White
    Write-Host "👉 Bạn chỉ cần quay lại tab LevelUp trên Chrome và F5 (reload) là xong!" -ForegroundColor Yellow
} else {
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host " ĐÃ TẢI TIỆN ÍCH VÀO MÁY THÀNH CÔNG!" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "Đường dẫn thư mục đã được copy sẵn vào bộ nhớ tạm (Clipboard)." -ForegroundColor White
    Write-Host ""
    Write-Host "👉 CHỈ CÒN 1 BƯỚC NẠP VÀO CHROME (Mất 5 giây - Chỉ làm 1 lần duy nhất):" -ForegroundColor Yellow
    Write-Host "   1. Mở tab mới trên Google Chrome, gõ: chrome://extensions" -ForegroundColor White
    Write-Host "   2. Bật công tắc [Chế độ cho nhà phát triển] (Developer mode) ở góc trên bên phải." -ForegroundColor White
    Write-Host "   3. Bấm nút [Tải tiện ích đã giải nén] (Load unpacked) ở góc trên bên trái." -ForegroundColor White
    Write-Host "   4. Bấm Ctrl + V rồi nhấn Enter để chọn thư mục LevelUpShield -> Bấm Select Folder." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🎉 Tab LevelUp sẽ TỰ ĐỘNG nhận diện và mở khóa ngay lập tức!" -ForegroundColor Green
    Write-Host "💡 Từ các lần cập nhật sau, chỉ cần chạy lại lệnh này là tự động 100%!" -ForegroundColor Gray
}
Write-Host ""
