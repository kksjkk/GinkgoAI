<div align="center">

# 🌿 GinkgoAI

### All-in-One Multimodal AI Assistant Platform

**Powered by Zhipu GLM-4-Flash & Agnes Multimodal Engine**

---

![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0-brightgreen)
![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=flat&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=flat&logo=flask&logoColor=white)

</div>

---

## About

GinkgoAI is a fully self-designed multimodal AI assistant platform. It combines the power of Zhipu GLM-4-Flash large language model with Agnes multimodal engine for vision recognition, image generation, and video creation. Built with Python/Flask, it provides a complete chat interface with smart web search, 12+ built-in tools, and full session management.

---

## Features

| Category | Highlights |
|----------|-----------|
| **Chat** | Multi-turn conversation, deep thinking mode, 128K context |
| **Vision** | Image recognition & analysis via Agnes-2.0-Flash |
| **Image Gen** | Text-to-image & image-to-image via Agnes-Image-2.1-Flash |
| **Video Gen** | Text-to-video & image-to-video via Agnes-Video-V2.0 |
| **Search** | Smart auto-detection, DuckDuckGo integration |
| **Tools** | Time, date, weather, calculator, password generator, countdown |
| **Sessions** | Multi-session, history browsing, rename, export to TXT |
| **i18n** | Chinese / English interface |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/kksjkk/GinkgoAI.git
cd GinkgoAI

# Install dependencies
pip install flask flask-cors requests

# Configure API keys in config.py
ZHIPU_API_KEY = "your-zhipu-key"
AGNES_API_KEY = "your-agnes-key"
AGNES_BASE_URL = "https://apihub.agnes-ai.cn"

# Run the application
python app.py
# Browser opens at http://127.0.0.1:5000
```

---

## Built-in Tools

| Command | Description |
|---------|-------------|
| `time` | Get current time |
| `date` | Get current date |
| `weather Beijing` | Query city weather |
| `calc 2+3*4` | Math calculator |
| `password 16` | Generate secure password |
| `countdown 2026-12-31` | Countdown to date |
| `joke` | Tell a joke |
| `system` | System information |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/send` | POST | Send message & get AI response |
| `/api/history` | GET | List all sessions |
| `/api/load` | POST | Load session messages |
| `/api/new` | POST | Create new session |
| `/api/rename` | POST | Rename session |
| `/api/delete` | POST | Delete session |
| `/api/export` | POST | Export session as TXT |
| `/api/upload_image` | POST | Upload image |
| `/api/generate_image` | POST | Generate image |
| `/api/generate_video` | POST | Generate video |
| `/api/video_status` | GET | Query video status |

---

## Configuration

Edit `config.py`:

```python
ZHIPU_API_KEY = "your-zhipu-api-key"      # Zhipu AI GLM-4-Flash
AGNES_API_KEY = "your-agnes-api-key"      # Agnes Vision/Image/Video
AGNES_BASE_URL = "https://apihub.agnes-ai.cn"
```

---

## Project Structure

```
GinkgoAI/
├── app.py              # Flask application & API routes
├── ginkgo_core.py      # GinkgoAI engine, intent recognition
├── config.py           # API keys configuration
├── image_gen.py        # Image generation (Agnes Image API)
├── video_gen.py        # Video generation (Agnes Video API)
├── web_search.py       # DuckDuckGo search integration
├── conv_manager.py     # Conversation session management
├── static/             # Static assets
│   └── uploads/        # Uploaded images storage
└── templates/          # HTML templates
    ├── index.html      # Main chat interface
    ├── about.html      # About page
    ├── terms.html      # Terms of service
    └── privacy.html    # Privacy policy
```

---

## Tech Stack

- **Language:** Python 3.8+
- **Web Framework:** Flask
- **LLM:** Zhipu GLM-4-Flash (128K context)
- **Vision:** Agnes-2.0-Flash
- **Image Gen:** Agnes-Image-2.1-Flash
- **Video Gen:** Agnes-Video-V2.0
- **Search:** DuckDuckGo API
- **Weather:** wttr.in

---

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<div align="center">

**[← 点击此处查看中文版 / Click here for the Chinese version →](README_zh.md)**

</div>
