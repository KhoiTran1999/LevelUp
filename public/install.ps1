# =============================================================================
# LevelUp Shield — One-Line PowerShell Auto Installer & Updater
# Tự động tải, giải nén và nạp/làm mới Khiên Kỷ Luật vào Chrome chỉ với 1 dòng lệnh.
# =============================================================================
$ErrorActionPreference = 'Stop'

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "LevelUp Focus Shield — Auto Installer"

Write-Host ""
Write-Host "⚔️  ========================================================" -ForegroundColor Cyan
Write-Host "🛡️   LEVELUP FOCUS SHIELD — TỰ ĐỘNG CÀI ĐẶT & CẬP NHẬT" -ForegroundColor Cyan
Write-Host "⚔️  ========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Thư mục cài đặt cố định chuẩn Windows (Không cần người dùng chọn nơi lưu)
$targetDir = Join-Path $env:LOCALAPPDATA "LevelUpShield"
if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

# 2. Xác định URL tải (ưu tiên tham số hoặc mặc định production)
$baseUrl = "https://level-up-seven-blue.vercel.app"
if ($args.Count -gt 0 -and $args[0]) {
    $baseUrl = $args[0].TrimEnd('/')
}

$zipUrl = "$baseUrl/download/levelup-shield.zip"
$tempZip = Join-Path $targetDir "shield_temp.zip"

Write-Host "📥 [1/3] Đang tải gói tiện ích mới nhất từ máy chủ..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $zipUrl -OutFile $tempZip -UseBasicParsing

Write-Host "📦 [2/3] Đang giải nén vào $targetDir..." -ForegroundColor Yellow
Expand-Archive -Path $tempZip -DestinationPath $targetDir -Force
if (Test-Path $tempZip) {
    Remove-Item -Path $tempZip -Force
}

# 3. Kích hoạt và nạp vào Google Chrome
Write-Host "🚀 [3/3] Đang kích hoạt tiện ích vào Google Chrome..." -ForegroundColor Yellow

$chromePrefPath = Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data\Default\Preferences"
$isAlreadyInstalled = $false
if (Test-Path $chromePrefPath) {
    try {
        $isAlreadyInstalled = Select-String -Path $chromePrefPath -Pattern "LevelUp" -Quiet -ErrorAction SilentlyContinue
    } catch {}
}

$chromeRunning = Get-Process chrome -ErrorAction SilentlyContinue

if ($isAlreadyInstalled) {
    # Trường hợp CẬP NHẬT: Extension đã từng được nạp trong Chrome
    # Gửi tín hiệu reload tự động thông qua query parameter trigger
    Start-Process chrome.exe "$baseUrl/?reload_shield=1"
    Write-Host ""
    Write-Host "🎉 HOÀN TẤT CẬP NHẬT! Tiện ích LevelUp Shield đã tự động làm mới lên bản mới nhất." -ForegroundColor Green
    Write-Host "👉 Bạn có thể quay lại trình duyệt và tiếp tục phiên làm việc ngay lập tức!" -ForegroundColor Cyan
} else {
    # Trường hợp CÀI MỚI LẦN ĐẦU
    if (-not $chromeRunning) {
        # Nếu Chrome chưa mở -> Mở thẳng Chrome với cờ load-extension nạp sẵn luôn
        Start-Process chrome.exe -ArgumentList "--load-extension=`"$targetDir`"", "$baseUrl"
        Write-Host ""
        Write-Host "🎉 HOÀN TẤT CÀI ĐẶT! Chrome đã mở cùng Khiên Kỷ Luật sẵn sàng." -ForegroundColor Green
    } else {
        # Nếu Chrome đang mở -> Đưa đường dẫn vào clipboard và mở trang extensions
        try {
            Set-Clipboard -Value $targetDir
        } catch {}
        Start-Process chrome.exe "chrome://extensions"
        Start-Process chrome.exe "$baseUrl"
        Write-Host ""
        Write-Host "📋 ĐÃ TỰ ĐỘNG COPY ĐƯỜNG DẪN FOLDER VÀO BỘ NHỚ TẠM (CLIPBOARD)!" -ForegroundColor Green
        Write-Host "👉 Trên tab chrome://extensions vừa mở trong Chrome:" -ForegroundColor Yellow
        Write-Host "   1. Bật công tắc [Chế độ cho nhà phát triển / Developer mode] ở góc trên bên phải." -ForegroundColor White
        Write-Host "   2. Bấm nút [Tải tiện ích đã giải nén] (Load unpacked) ở góc trên bên trái." -ForegroundColor White
        Write-Host "   3. Chỉ cần bấm Ctrl+V và nhấn Enter (vì script đã copy sẵn đường dẫn cho bạn)!" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "💡 LƯU Ý: Bạn chỉ cần làm bước này đúng 1 LẦN DUY NHẤT." -ForegroundColor Gray
        Write-Host "   Từ các lần sau khi có bản cập nhật mới, chỉ cần chạy lại dòng lệnh terminal này là TỰ ĐỘNG 100%!" -ForegroundColor Gray
    }
}
Write-Host ""
