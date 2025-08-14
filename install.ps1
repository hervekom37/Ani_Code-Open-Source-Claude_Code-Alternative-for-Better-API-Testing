Write-Host "🚀 Installing Ani Code is Coding..." -ForegroundColor Blue
Write-Host "──────────────────────────────────────────────" -ForegroundColor DarkGray

# 1. Check if Node.js is installed
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install Node.js (>=16) first." -ForegroundColor Red
    Write-Host "💡 You can install it from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check Node.js version
$nodeVersion = (node --version).Substring(1)
$requiredVersion = [Version]"16.0.0"
$currentVersion = [Version]$nodeVersion

if ($currentVersion -lt $requiredVersion) {
    Write-Host "❌ Node.js version $nodeVersion is too old. Please install Node.js >= 16." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green

# 2. Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install --no-audit

# 3. Build project
Write-Host "🔨 Building project..." -ForegroundColor Yellow
npm run build

# 4. Link globally
Write-Host "🔗 Setting up global command..." -ForegroundColor Yellow
npm link --force

# 5. Success message
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host "──────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "🎉 Ani Code is Coding is now available globally!" -ForegroundColor Blue
Write-Host "💡 Type 'ani' in any directory to start using it." -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 Need help? Run 'ani --help' or type '/help' in the CLI." -ForegroundColor Blue

# 6. Launch CLI if requested
if ($args[0] -eq "--launch") {
    Write-Host "🚀 Launching Ani Code is Coding..." -ForegroundColor Yellow
    ani
}