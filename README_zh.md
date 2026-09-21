<div align="center">

# 🌿 GinkgoAI

### 全栈多模态 AI 助手平台

**基于智谱 GLM-4-Flash 与 Agnes 多模态引擎**

---

![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0-brightgreen)
![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=flat&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=flat&logo=flask&logoColor=white)

</div>

---

## 关于

GinkgoAI 是一个完全自主设计的多模态 AI 助手平台。它将智谱 GLM-4-Flash 大语言模型的强大能力与 Agnes 多模态引擎相结合，支持视觉识别、图像生成和视频创作。基于 Python/Flask 构建，提供完整的聊天界面，集成智能联网搜索、12+ 内置工具和完整的会话管理功能。

---

## 功能一览

| 分类 | 亮点 |
|------|------|
| **对话** | 多轮对话、深度思考模式、128K 超长上下文 |
| **视觉** | 通过 Agnes-2.0-Flash 进行图像识别与分析 |
| **图像生成** | 通过 Agnes-Image-2.1-Flash 实现文生图和图生图 |
| **视频生成** | 通过 Agnes-Video-V2.0 实现文生视频和图生视频 |
| **搜索** | AI 自动判断是否需要搜索、DuckDuckGo 集成 |
| **工具** | 时间、日期、天气、计算、密码生成、倒计时 |
| **会话** | 多会话管理、历史浏览、重命名、导出为 TXT |
| **国际化** | 中文 / 英文界面 |

---

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/kksjkk/GinkgoAI.git
cd GinkgoAI

# 安装依赖
pip install flask flask-cors requests

# 在 config.py 中配置 API 密钥
ZHIPU_API_KEY = "你的智谱密钥"
AGNES_API_KEY = "你的Agnes密钥"
AGNES_BASE_URL = "https://apihub.agnes-ai.cn"

# 运行应用
python app.py
# 浏览器自动打开 http://127.0.0.1:5000
```

---

## 内置工具

| 命令 | 说明 |
|------|------|
| `时间` | 获取当前时间 |
| `日期` | 获取当前日期 |
| `天气 北京` | 查询城市天气 |
| `计算 2+3*4` | 数学计算器 |
| `密码 16` | 生成安全密码 |
| `倒计时 2026-12-31` | 日期倒计时 |
| `笑话` | 讲个笑话 |
| `系统信息` | 系统信息 |

---

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/send` | POST | 发送消息获取AI回复 |
| `/api/history` | GET | 列出所有会话 |
| `/api/load` | POST | 加载会话消息 |
| `/api/new` | POST | 创建新会话 |
| `/api/rename` | POST | 重命名会话 |
| `/api/delete` | POST | 删除会话 |
| `/api/export` | POST | 导出会话为TXT |
| `/api/upload_image` | POST | 上传图片 |
| `/api/generate_image` | POST | 生成图像 |
| `/api/generate_video` | POST | 生成视频 |
| `/api/video_status` | GET | 查询视频状态 |

---

## 配置说明

编辑 `config.py`：

```python
ZHIPU_API_KEY = "你的智谱API密钥"      # 智谱AI GLM-4-Flash
AGNES_API_KEY = "你的Agnes API密钥"    # Agnes 视觉/图像/视频
AGNES_BASE_URL = "https://apihub.agnes-ai.cn"
```

---

## 项目结构

```
GinkgoAI/
├── app.py              # Flask应用 & API路由
├── ginkgo_core.py      # GinkgoAI引擎、意图识别
├── config.py           # API密钥配置
├── image_gen.py        # 图像生成（Agnes Image API）
├── video_gen.py        # 视频生成（Agnes Video API）
├── web_search.py       # DuckDuckGo搜索集成
├── conv_manager.py     # 对话会话管理
├── static/             # 静态资源
│   └── uploads/        # 上传图片存储
└── templates/          # HTML模板
    ├── index.html      # 主聊天界面
    ├── about.html      # 关于页面
    ├── terms.html      # 服务条款
    └── privacy.html    # 隐私政策
```

---

## 技术栈

- **语言：** Python 3.8+
- **Web 框架：** Flask
- **大语言模型：** 智谱 GLM-4-Flash（128K 上下文）
- **视觉模型：** Agnes-2.0-Flash
- **图像生成：** Agnes-Image-2.1-Flash
- **视频生成：** Agnes-Video-V2.0
- **搜索：** DuckDuckGo API
- **天气：** wttr.in

---

## 许可证

本项目基于 **MIT 许可证** 开源。详见 [LICENSE](LICENSE)。

---

<div align="center">

**[← 点击此处查看英文版 / Click here for the English version →](README.md)**

</div>
