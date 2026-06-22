#!/bin/bash
# 牛剑面试辅导平台 - 一键启动脚本

echo "===== 牛剑面试辅导平台 - 启动脚本 ====="
echo ""

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 Python，请先安装 Python 3.9+"
    exit 1
fi
echo "✅ Python: $(python3 --version)"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装 Node.js 18+"
    exit 1
fi
echo "✅ Node.js: $(node --version)"

# 创建项目目录
PROJECT_DIR="$HOME/oxbridge-interview"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"
echo "📁 项目目录: $PROJECT_DIR"

# ===== 1. 创建后端 =====
echo ""
echo "===== 1. 创建后端 ====="
mkdir -p backend

# 创建虚拟环境
if [ ! -d "backend/venv" ]; then
    echo "创建 Python 虚拟环境..."
    python3 -m venv backend/venv
fi

# 激活虚拟环境
source backend/venv/bin/activate

# 安装依赖
echo "安装 Python 依赖..."
pip install fastapi uvicorn sqlalchemy "python-jose[cryptography]" python-multipart websockets httpx python-dotenv > /dev/null 2>&1

# 创建后端文件（这里需要你手动创建，或者从压缩包解压）
echo "⚠️  请先将后端代码文件复制到 $PROJECT_DIR/backend/"
echo "   需要的文件: main.py, models.py, database.py, auth.py, ai.py, websocket.py, seed.py, .env"

# ===== 2. 创建前端 =====
echo ""
echo "===== 2. 创建前端 ====="
if [ ! -d "frontend" ]; then
    echo "创建 Vite React TypeScript 项目..."
    npm create vite@latest frontend -- --template react-ts > /dev/null 2>&1
fi

cd frontend

# 安装依赖
echo "安装前端依赖..."
npm install react-router-dom > /dev/null 2>&1

# 创建前端文件（这里需要你手动创建，或者从压缩包解压）
echo "⚠️  请先将前端代码文件复制到 $PROJECT_DIR/frontend/src/"

cd ..

echo ""
echo "===== 启动说明 ====="
echo ""
echo "1. 配置后端 API Key:"
echo "   cd $PROJECT_DIR/backend"
echo "   cp .env.example .env"
echo "   # 编辑 .env，填入你的 POE_API_KEY"
echo ""
echo "2. 启动后端:"
echo "   cd $PROJECT_DIR/backend"
echo "   source venv/bin/activate"
echo "   python -m uvicorn main:app --host 0.0.0.0 --port 8000"
echo ""
echo "3. 启动前端 (新终端):"
echo "   cd $PROJECT_DIR/frontend"
echo "   npm run dev"
echo ""
echo "4. 访问: http://localhost:5173"
echo "   登录账号: PennyPan / sisu2026"
echo ""
echo "===== 脚本执行完成 ====="
