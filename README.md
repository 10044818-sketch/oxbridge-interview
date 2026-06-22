# 牛剑面试辅导平台 — 运行说明

## 项目结构

```
oxbridge-interview/
├── backend/          # Python FastAPI 后端
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   ├── auth.py
│   ├── ai.py
│   ├── websocket.py
│   ├── seed.py
│   └── requirements.txt
└── frontend/         # React 前端
    ├── dist/          # 构建产物（已构建好）
    ├── src/
    ├── package.json
    ├── vite.config.ts
    └── tsconfig.json
```

## 快速启动

### 1. 后端

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. 前端（开发模式，带 API 代理）

```bash
cd frontend
npm install
npm run dev
```

然后访问 http://localhost:5173

### 3. 前端（静态文件）

```bash
cd frontend/dist
python3 -m http.server 8080
```

然后访问 http://localhost:8080
（注意：静态文件模式需要浏览器允许跨域请求，或直接用开发模式）

## 登录账号

- 用户名：`PennyPan`
- 密码：`sisu2026`

## 功能说明

| 页面 | 路径 | 功能 |
|------|------|------|
| 登录 | `/` | JWT 认证登录 |
| 模式选择 | `/` (登录后) | 选择学科和训练类型 |
| 思维训练 | `/training` | Canvas 白板解题 |
| 模拟面试 | `/interview` | 语音面试模拟 |
| 训练报告 | `/report` | AI 评估报告 |
| 历史记录 | `/history` | 训练记录查询 |
| 账号管理 | `/admin` | 管理员功能 |

## 注意事项

- 后端需要 Python 3.9+
- 前端需要 Node.js 16+
- AI 功能（`ai.py`）当前为模拟回复，需接入真实 Claude/GPT API
- WebSocket 实时功能需在 `websocket.py` 中完善
