@echo off
chcp 65001 >nul
title 气象观测台 App 服务器
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 未找到 node，请先安装 Node.js 后再运行本脚本。
  pause
  exit /b 1
)
node server.js
pause
