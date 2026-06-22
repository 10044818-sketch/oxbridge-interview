#!/usr/bin/env python3
import http.server
import socketserver
import urllib.request
import urllib.error
from pathlib import Path

FRONTEND_DIR = Path(__file__).parent / "frontend" / "dist"
BACKEND_URL = "http://127.0.0.1:8000"

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(FRONTEND_DIR), **kwargs)
    
    def do_POST(self):
        if self.path.startswith("/api/"):
            self._proxy_request("POST")
        else:
            self.send_error(404)
    
    def do_GET(self):
        if self.path.startswith("/api/"):
            self._proxy_request("GET")
        else:
            try:
                super().do_GET()
            except Exception:
                self._send_index()
    
    def _proxy_request(self, method):
        url = BACKEND_URL + self.path
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else b''
        
        req = urllib.request.Request(
            url,
            data=body,
            headers={
                'Content-Type': self.headers.get('Content-Type', 'application/json'),
                'Authorization': self.headers.get('Authorization', ''),
            },
            method=method
        )
        
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                self.send_response(response.status)
                for key, value in response.headers.items():
                    if key.lower() not in ['transfer-encoding', 'connection']:
                        self.send_header(key, value)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(response.read())
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_error(500, str(e))
    
    def _send_index(self):
        index_file = FRONTEND_DIR / "index.html"
        if index_file.exists():
            with open(index_file, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', len(content))
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_error(404)
    
    def end_headers(self):
        if not hasattr(self, '_headers_sent'):
            self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

if __name__ == "__main__":
    PORT = 8080
    
    if not FRONTEND_DIR.exists():
        print("前端构建目录不存在: " + str(FRONTEND_DIR))
        exit(1)
    
    print("=" * 60)
    print("牛剑面试辅导平台 - 统一服务器")
    print("=" * 60)
    print("前端目录: " + str(FRONTEND_DIR))
    print("后端代理: " + BACKEND_URL)
    print("=" * 60)
    
    with socketserver.TCPServer(("0.0.0.0", PORT), ProxyHandler) as httpd:
        try:
            print("服务器运行中... 按 Ctrl+C 停止")
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务器已停止")
