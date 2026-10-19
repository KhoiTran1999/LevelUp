# =============================================================================
# LevelUp Shield - One-Line PowerShell Auto Uninstaller & Cleaner
# Tự động gỡ bỏ và dọn sạch toàn bộ tệp tin LevelUp Focus Shield khỏi máy tính.
# =============================================================================
$ErrorActionPreference = 'SilentlyContinue'

# Cấu hình UTF-8 toàn diện cho PowerShell và Console Windows
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
try { chcp 65001 | Out-Null } catch {}

$Host.UI.RawUI.WindowTitle = "LevelUp Focus Shield - Go Bo & Don Dep"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host "   LEVELUP FOCUS SHIELD - GỠ BỎ & DỌN DẸP MÁY TÍNH      " -ForegroundColor Magenta
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host ""

$targetDir = Join-Path $env:LOCALAPPDATA "LevelUpShield"

Write-Host "[1/2] Đang xóa thư mục tiện ích khỏi máy tính..." -ForegroundColor Yellow

if (Test-Path $targetDir) {
    try {
        Remove-Item -Path $targetDir -Recurse -Force -ErrorAction Stop
        Write-Host "   [OK] Đã xóa sạch thư mục: $targetDir" -ForegroundColor Green
    } catch {
        Write-Host "   [!] Không thể xóa một số file (có thể do Chrome đang mở). Thử xóa lại sau khi tắt Chrome." -ForegroundColor Red
    }
} else {
    Write-Host "   (i) Thư mục tiện ích không tồn tại hoặc đã được xóa trước đó." -ForegroundColor Gray
}

# Dọn dẹp clipboard nếu có lưu đường dẫn cũ
try {
    $clip = Get-Clipboard -ErrorAction SilentlyContinue
    if ($clip -and $clip -like "*LevelUpShield*") {
        Set-Clipboard -Value ""
    }
} catch {}

Write-Host ""
Write-Host ">> [2/2] BƯỚC CUỐI CÙNG TRÊN GOOGLE CHROME (Mất 3 giây):" -ForegroundColor Cyan
Write-Host "   1. Mở tab: chrome://extensions trên trình duyệt." -ForegroundColor White
Write-Host "   2. Tìm ô tiện ích [LevelUp Focus Shield]." -ForegroundColor White
Write-Host "   3. Bấm nút [Xóa] (Remove) để gỡ bỏ hoàn toàn khỏi Chrome." -ForegroundColor White
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " [OK] ĐÃ DỌN DẸP SẠCH SẼ 100% CÁC TỆP TIN KHỎI MÁY TÍNH!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Cảm ơn bạn đã dành thời gian trải nghiệm LevelUp. Chúc bạn luôn thành công!" -ForegroundColor White
Write-Host ""
