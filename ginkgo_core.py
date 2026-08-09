import json
import re
import os
import datetime
import webbrowser
import urllib.parse
import urllib.request
import random
import platform
import string
import ssl
from config import ZHIPU_API_KEY
from web_search import duckduckgo_search, format_search_results
from image_gen import generate_image
from video_gen import create_video

class GinkgoAI:
    def __init__(self):
        self.memory = []
        self.name = "银杏"
        self.user_name = "用户"
        self.zhipu_available = bool(ZHIPU_API_KEY and ZHIPU_API_KEY.strip())

        self.tools = {
            "time": self.get_time,
            "date": self.get_date,
            "calc": self.calculate,
            "weather": self.get_weather,
            "system": self.system_info,
            "help": self.show_help,
            "guide": self.show_guide,
            "joke": self.tell_joke,
            "password": self.generate_password,
            "countdown": self.countdown_days,
            "date_diff": self.date_diff,
            "画图": self.generate_image_tool,
            "生成视频": self.generate_video_tool,
        }

    def zhipu_chat(self, prompt, deep=False, history=None):
        if not self.zhipu_available:
            return self.rule_response(prompt)

        try:
            base_system = """你是银杏AI，一个基于智谱GLM-4-Flash模型驱动的智能助手，运行在银杏框架中。

【关于你的身份和模型】
当用户问你“你是什么模型”、“你是谁”、“你是哪个AI”时，你必须第一句话回答：
“我是银杏AI，基于智谱GLM-4-Flash模型。”

【关于你的视觉和图像生成能力（非常重要！）】
你虽然基础模型是文本模型，但**系统已为你集成了Agnes多模态扩展能力**。
当用户问你“你有视觉吗”、“你能看图吗”、“你能画图吗”、“你有什么功能”时，
你必须明确回答：“我有视觉识别、图像生成和视频生成能力。你可以上传图片让我识别，也可以使用‘画图’生成图片，或使用‘生成视频’指令创作视频。”

【核心功能完整列表（必须烂熟于心）】
- 文本对话与深度思考
- 视觉识别（用户上传图片时自动触发Agnes视觉模型）
- 图像生成（文生图 & 图生图，通过“画图”或“生成图片”指令触发）
- 视频生成（文生视频 & 图生视频，通过“生成视频”或“制作视频”指令触发）
- 实时联网搜索（DuckDuckGo）
- 实用工具：时间、日期、天气、计算、密码生成、倒计时、日期差
- 对话历史管理与导出

【回答纪律】
当用户明确要求“生成视频”、“制作视频”、“生成XXX的视频”时，你必须直接调用视频生成工具，而不是建议用户使用其他平台。生成过程中，先告知用户“好的，正在使用Agnes-Video-V2.0为您创作，预计需要1-3分钟，生成好后，我会主动发送给您。”
"""

            token_keywords = ["token", "Token", "上下文", "最大长度", "生成长度"]
            if any(kw in prompt for kw in token_keywords):
                token_info = """
关于模型技术参数：
- 上下文长度：128K tokens（约 128,000 个汉字/符号，可处理长文本）。
- 单次生成最大长度：512 tokens（每次回答的最大输出长度）。
请根据用户的提问，准确提供这些信息。
"""
                base_system += token_info

            if deep:
                system_prompt = base_system + """
【重要格式要求】
请严格按照以下格式回答，不得省略：
首先输出「思考：」然后是你的详细推理过程（展示你是如何分析问题的），
接着换行输出「回答：」然后是你的最终答案。
必须同时包含「思考：」和「回答：」两个部分。
"""
            else:
                system_prompt = base_system

            messages = [{"role": "system", "content": system_prompt}]

            if history:
                for msg in history:
                    role = "user" if msg["role"] == "user" else "assistant"
                    content = msg.get("content", "")
                    if isinstance(content, dict):
                        content = content.get("answer", str(content))
                    messages.append({"role": role, "content": content})

            messages.append({"role": "user", "content": prompt})

            req = urllib.request.Request(
                "https://open.bigmodel.cn/api/paas/v4/chat/completions",
                data=json.dumps({
                    "model": "glm-4-flash",
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 4000
                }).encode(),
                headers={
                    "Authorization": f"Bearer {ZHIPU_API_KEY}",
                    "Content-Type": "application/json"
                }
            )

            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode())
                content = data["choices"][0]["message"]["content"]

                if deep:
                    think_match = re.search(r'思考[：:]\s*(.*?)\s*回答[：:]', content, re.DOTALL)
                    answer_match = re.search(r'回答[：:]\s*(.*?)$', content, re.DOTALL)
                    if think_match and answer_match:
                        return {
                            "think": think_match.group(1).strip(),
                            "answer": answer_match.group(1).strip()
                        }
                    else:
                        parts = content.split('\n', 1)
                        if len(parts) == 2:
                            return {
                                "think": parts[0].strip(),
                                "answer": parts[1].strip()
                            }
                        return {
                            "think": "（思考过程未按格式输出）",
                            "answer": content
                        }
                return content

        except urllib.error.URLError as e:
            if "timed out" in str(e).lower():
                return "⏳ 请求超时了，请简化问题或稍后再试。"
            return f"🌐 网络错误：{e}"
        except Exception as e:
            return f"⚠️ 智谱API错误：{str(e)}"

    def rule_response(self, user_input):
        text = user_input.lower()
        if any(w in text for w in ["你好", "hi", "hello"]):
            return f"嗨，{self.user_name}！"
        if any(w in text for w in ["你是谁", "你叫什么"]):
            return f"我是{self.name}，你的 AI 助手。"
        if any(w in text for w in ["谢谢", "感谢"]):
            return "不客气 😊"
        return random.choice(["嗯，我在思考...", "这个问题有点意思。", "能再详细描述一下吗？"])

    def get_time(self, _=None):
        return datetime.datetime.now().strftime("现在时间：%H:%M:%S")

    def get_date(self, _=None):
        return f"今天是 {datetime.datetime.now().strftime('%Y年%m月%d日')}"

    def calculate(self, expr):
        try:
            safe = re.sub(r'[^0-9+\-*/.()% ]', '', expr)
            return f"计算结果：{eval(safe)}"
        except:
            return "计算错误，请检查算式格式"

    def get_weather(self, city):
        if not city:
            city = "北京"
        try:
            url = f"https://wttr.in/{urllib.parse.quote(city)}?format=%l:+%c+%t+%w"
            req = urllib.request.Request(url, headers={"User-Agent": "curl/7.68.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = resp.read().decode('utf-8').strip()
                return f"🌤️ {city}天气：{result}"
        except:
            return f"🌤️ {city}天气查询暂时不可用，请稍后再试。"

    def system_info(self, _=None):
        return f"💻 系统信息：{platform.system()} {platform.version()}"

    def tell_joke(self, _=None):
        jokes = [
            "程序员为什么喜欢用命令行？因为图形界面会打断思路。",
            "一个 SQL 语句走进酒吧，问：我能 JOIN 你们吗？",
            "为什么程序员总是分不清万圣节和圣诞节？因为 Oct 31 = Dec 25。",
            "编程就像写作：都是从一个空白屏幕开始，然后填满奇迹。",
        ]
        return random.choice(jokes)

    def countdown_days(self, date_str):
        try:
            target = datetime.datetime.strptime(date_str.strip(), "%Y-%m-%d")
            days = (target - datetime.datetime.now()).days
            if days >= 0:
                return f"📅 距离 {date_str} 还有 {days} 天"
            else:
                return f"📅 {date_str} 已过去 {abs(days)} 天"
        except:
            return "日期格式错误，请用 YYYY-MM-DD 格式"

    def date_diff(self, dates):
        parts = dates.strip().split()
        if len(parts) != 2:
            return "请提供两个日期，用空格分开（格式：YYYY-MM-DD YYYY-MM-DD）"
        try:
            d1 = datetime.datetime.strptime(parts[0], "%Y-%m-%d")
            d2 = datetime.datetime.strptime(parts[1], "%Y-%m-%d")
            return f"📅 两个日期相差 {abs((d2-d1).days)} 天"
        except:
            return "日期格式错误，请用 YYYY-MM-DD 格式"

    def generate_password(self, length_str=None):
        length = 16
        if length_str:
            try:
                length = int(length_str)
            except:
                pass
        length = max(8, min(64, length))
        chars = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(random.choices(chars, k=length))
        return f"🔐 生成的{length}位密码：{password}"

    def generate_image_tool(self, prompt):
        if not prompt:
            return "请描述你想要生成的图像。"
        enhanced = f"{prompt}, high quality, detailed, cinematic lighting, 4k"
        result = generate_image(enhanced)
        if isinstance(result, dict) and "error" in result:
            return f"❌ {result['error']}"
        return {
            "type": "image",
            "url": result,
            "prompt": prompt,
            "description": f"🎨 生成图片：{prompt}"
        }

    def generate_video_tool(self, prompt):
        if not prompt:
            return "请描述你想要生成的视频。"
        result = create_video(prompt)
        if isinstance(result, dict) and "error" in result:
            return f"❌ {result['error']}"
        return {
            "type": "video",
            "task_id": result.get("task_id"),
            "video_id": result.get("video_id"),
            "prompt": prompt,
            "status": result.get("status"),
            "description": f"🎬 生成视频：{prompt}"
        }

    def show_help(self, _=None):
        return "输入 /guide 查看完整功能指南"

    def show_guide(self, _=None):
        return """
🍃 银杏AI 功能指南

【基础查询】
• 时间 - 查看当前时间
• 日期 - 查看今天日期
• 天气 城市名 - 查询天气（如：天气 北京）
• 计算 算式 - 计算器（如：计算 2+3*4）

【实用工具】
• 笑话 - 讲个笑话
• 密码 位数 - 生成随机密码（如：密码 16）
• 倒计时 日期 - 倒计时（如：倒计时 2026-12-31）
• 日期差 日期1 日期2 - 计算两个日期相差天数

【AI对话】
• 直接输入问题即可与AI对话
• 开启「深度思考」可查看AI的推理过程
• 遇到不确定的信息，AI会自动联网搜索

【图像生成】
• 点击「AI创作」→「AI生图」进入生图模式，输入描述生成图片
• 或直接输入「画图 描述」快速生成

【视频生成】
• 点击「AI创作」→「AI视频」进入视频模式，输入描述生成视频
• 或直接输入「生成视频 描述」快速生成
• 视频生成是异步任务，约需1-3分钟，完成后会自动发送给你

【命令】
• /help - 显示帮助
• /guide - 显示完整指南
• /clear - 清空对话记忆
"""

    def recognize_intent(self, user_input):
        text = user_input.strip()
        lower = text.lower()

        commands = {
            "时间": "time",
            "几点了": "time",
            "现在几点": "time",
            "日期": "date",
            "今天几号": "date",
            "笑话": "joke",
            "讲个笑话": "joke",
            "系统": "system",
            "系统信息": "system",
            "画图": "画图",
            "生成图片": "画图",
            "生成视频": "生成视频",
            "制作视频": "生成视频",
        }
        if lower in commands:
            return commands[lower], None

        weather_patterns = [
            (r'^天气\s+(.+)$', 'weather'),
            (r'^(.+?)天气怎么样$', 'weather'),
            (r'^(.+?)的天气$', 'weather'),
            (r'^今天(.+?)天气', 'weather'),
            (r'^(.+?)今天天气', 'weather'),
            (r'^查一下(.+?)天气', 'weather'),
        ]
        for pattern, intent in weather_patterns:
            match = re.match(pattern, lower)
            if match:
                city = match.group(1).strip()
                if city:
                    return intent, city

        calc_patterns = [
            (r'^计算\s+(.+)$', 'calc'),
            (r'^帮我算一下(.+)$', 'calc'),
            (r'^(.+?)等于多少$', 'calc'),
        ]
        for pattern, intent in calc_patterns:
            match = re.match(pattern, lower)
            if match:
                expr = match.group(1).strip()
                if expr:
                    return intent, expr

        password_patterns = [
            (r'^密码\s+(.+)$', 'password'),
            (r'^生成(.+?)位密码', 'password'),
        ]
        for pattern, intent in password_patterns:
            match = re.match(pattern, lower)
            if match:
                length = match.group(1).strip()
                if length:
                    return intent, length

        countdown_patterns = [
            (r'^倒计时\s+(.+)$', 'countdown'),
            (r'^距离(.+?)还有多少天', 'countdown'),
        ]
        for pattern, intent in countdown_patterns:
            match = re.match(pattern, lower)
            if match:
                date_str = match.group(1).strip()
                if date_str:
                    return intent, date_str

        if lower.startswith("画图 ") or lower.startswith("生成图片 "):
            return "画图", text[3:] if lower.startswith("画图 ") else text[5:]

        video_patterns = [
            (r'^生成(.+?)的视频$', '生成视频'),
            (r'^制作(.+?)的视频$', '生成视频'),
            (r'^生成视频\s+(.+)$', '生成视频'),
            (r'^制作视频\s+(.+)$', '生成视频'),
        ]
        for pattern, intent in video_patterns:
            match = re.match(pattern, lower)
            if match:
                desc = match.group(1).strip()
                if desc:
                    return intent, desc

        return "chat", None

    def _should_search(self, prompt):
        if not self.zhipu_available:
            return False, None

        quick_keywords = ["搜索", "查一下", "最新", "实时", "今天", "现在", "天气", "新闻", "事件"]
        if any(kw in prompt.lower() for kw in quick_keywords):
            return True, prompt

        judge_prompt = f"""你是一个智能助手，需要判断用户的问题是否需要联网搜索来获取最新信息。
用户问题：{prompt}
请回答“是”或“否”，如果回答“是”，请同时提取出最适合搜索的关键词（不超过10个字）。
格式如下：
是：关键词
或
否
"""

        try:
            req = urllib.request.Request(
                "https://open.bigmodel.cn/api/paas/v4/chat/completions",
                data=json.dumps({
                    "model": "glm-4-flash",
                    "messages": [{"role": "user", "content": judge_prompt}],
                    "temperature": 0.1,
                    "max_tokens": 50
                }).encode(),
                headers={
                    "Authorization": f"Bearer {ZHIPU_API_KEY}",
                    "Content-Type": "application/json"
                }
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                answer = data["choices"][0]["message"]["content"].strip()

                if answer.startswith("是"):
                    parts = answer.split("：")
                    if len(parts) > 1:
                        keyword = parts[1].strip()
                    else:
                        keyword = prompt
                    return True, keyword
                else:
                    return False, None
        except Exception:
            return False, None

    def handle_input(self, user_input, deep=False, history=None, skip_search=False):
        if not user_input.strip():
            return {'reply': "请输入内容", 'searched': False}

        if user_input == "/clear":
            self.memory.clear()
            return {'reply': "记忆已清空", 'searched': False}

        if user_input == "/help":
            return {'reply': self.show_help(), 'searched': False}

        if user_input == "/guide":
            return {'reply': self.show_guide(), 'searched': False}

        intent, param = self.recognize_intent(user_input)
        if intent in self.tools:
            try:
                result = self.tools[intent](param)
                if isinstance(result, dict) and result.get("type") == "image":
                    return {'reply': result, 'searched': False}
                if isinstance(result, dict) and result.get("type") == "video":
                    return {'reply': result, 'searched': False}
                return {'reply': result, 'searched': False}
            except Exception as e:
                return {'reply': f"工具执行出错：{e}", 'searched': False}

        if not skip_search and self.zhipu_available:
            need_search, keyword = self._should_search(user_input)
            if need_search and keyword:
                search_results = duckduckgo_search(keyword)
                if not isinstance(search_results, dict) or "error" not in search_results:
                    search_info = format_search_results(search_results)
                    context_prompt = f"""用户问题：{user_input}
以下是根据关键词搜索到的相关信息：
{search_info}

请基于以上信息回答用户的问题。如果信息不足，请诚实说明。"""
                    try:
                        messages = [{"role": "system", "content": "你是银杏助手，根据搜索结果回答问题。"}]
                        if history:
                            for msg in history:
                                role = "user" if msg["role"] == "user" else "assistant"
                                content = msg.get("content", "")
                                if isinstance(content, dict):
                                    content = content.get("answer", str(content))
                                messages.append({"role": role, "content": content})
                        messages.append({"role": "user", "content": context_prompt})
                        req = urllib.request.Request(
                            "https://open.bigmodel.cn/api/paas/v4/chat/completions",
                            data=json.dumps({
                                "model": "glm-4-flash",
                                "messages": messages,
                                "temperature": 0.7,
                                "max_tokens": 4000
                            }).encode(),
                            headers={
                                "Authorization": f"Bearer {ZHIPU_API_KEY}",
                                "Content-Type": "application/json"
                            }
                        )
                        with urllib.request.urlopen(req, timeout=120) as resp:
                            data = json.loads(resp.read().decode())
                            reply = data["choices"][0]["message"]["content"]
                            return {'reply': reply, 'searched': True}
                    except Exception:
                        pass

        if self.zhipu_available:
            reply = self.zhipu_chat(user_input, deep=deep, history=history)
            return {'reply': reply, 'searched': False}
        else:
            return {'reply': self.rule_response(user_input), 'searched': False}
