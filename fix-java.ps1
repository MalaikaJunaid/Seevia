# Fix Java configuration to use JDK 17 instead of non-existent JDK 21

Write-Host "Fixing Java configuration..." -ForegroundColor Green

# Set JAVA_HOME to JDK 17
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Java\jdk-17", "User")

# Get current PATH and add JDK 17 bin if not present
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Java\jdk-17", "Machine")

Write-Host "JAVA_HOME set to: C:\Program Files\Java\jdk-17" -ForegroundColor Green

# Verify Java is working
Write-Host "`nVerifying Java installation:" -ForegroundColor Yellow
java -version

Write-Host "`nJava fixed successfully!" -ForegroundColor Green
