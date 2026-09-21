from flask import Flask, render_template, request, jsonify, make_response, send_from_directory
from flask_cors import CORS
from urllib.parse import quote
import datetime
import time
import webbrowser
import traceback
import base64
import urllib.error
import json
import requests
import os
import uuid
from config import ZHIPU_API_KEY, AGNES_API_KEY, AGNES_BASE_URL
from ginkgo_core import GinkgoAI
from conv_manager import ConvManager
from image_gen import generate_image, image_to_image
from video_gen import create_video, get_video_status

app = Flask(__name__)
CORS(app)

ai = GinkgoAI()
conv_mgr = ConvManager()
conv_mgr.current = None

TEXT_MODEL = "glm-4-flash"
VISION_MODEL = "agnes-2.0-flash"

UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def call_agnes_vision(image_base64, image_mime, user_text, deep=False):
    headers = {
        "Authorization": f"Bearer {AGNES_API_KEY}",
        "Content-Type": "application/json"
    }
    content = [
        {"type": "image_url", "image_url": {"url": f"data:{image_mime};base64,{image_base64}"}}
    ]
    if user_text:
        content.append({"type": "text", "text": user_text})
    else:
        content.append({"type": "text", "text": "请描述这张图片的内容。"})

    payload = {
        "model": VISION_MODEL,
        "messages": [{"role": "user", "content": content}],
        "max_tokens": 500,
        "temperature": 0.7
    }
    for attempt in range(3):
        try:
            resp = requests.post(f"{AGNES_BASE_URL}/v1/chat/completions", json=payload, headers=headers, timeout=30)
            if resp.status_code == 200:
                result = resp.json()
                return result["choices"][0]["message"]["content"]
            elif resp.status_code == 429:
                wait = (attempt + 1) * 2
                print(f"⚠️ Agnes 限流，等待 {wait} 秒后重试...")
                time.sleep(wait)
                continue
            else:
                raise Exception(f"Agnes API 错误: {resp.status_code} - {resp.text}")
        except requests.exceptions.RequestException as e:
            if attempt == 2:
                raise Exception(f"Agnes 请求失败: {str(e)}")
            time.sleep(1)
    raise Exception("Agnes 视觉模型调用失败")

def analyze_code_with_glm(code_content, filename, user_question=""):
    if not ZHIPU_API_KEY or not ZHIPU_API_KEY.strip():
        return "❌ 智谱API密钥未配置，无法进行代码分析。"
    
    system = "你是一个资深的代码审查专家，擅长分析各种编程语言的代码质量、潜在Bug、性能和安全问题。"
    prompt = f"请分析以下文件（{filename}）的代码：\n\n```\n{code_content}\n```\n"
    if user_question:
        prompt += f"\n用户的问题：{user_question}\n"
    else:
        prompt += "\n请从代码质量、潜在Bug、性能、安全性等方面给出详细的分析和改进建议。"
    
    messages = [{"role": "system", "content": system}, {"role": "user", "content": prompt}]
    try:
        req = urllib.request.Request(
            "https://open.bigmodel.cn/api/paas/v4/chat/completions",
            data=json.dumps({
                "model": "glm-4-flash",
                "messages": messages,
                "temperature": 0.5,
                "max_tokens": 4000
            }).encode(),
            headers={
                "Authorization": f"Bearer {ZHIPU_API_KEY}",
                "Content-Type": "application/json"
            }
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode())
            return data["choices"][0]["message"]["content"]
    except urllib.error.URLError as e:
        return f"🌐 网络错误：{str(e)}"
    except Exception as e:
        return f"⚠️ 代码分析失败：{str(e)}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/upload_image', methods=['POST'])
def upload_image():
    try:
        data = request.json
        image_data = data.get('image_data')
        image_mime = data.get('image_mime', 'image/jpeg')
        if not image_data:
            return jsonify({'error': '缺少图片数据'}), 400

        if image_data.startswith('data:image'):
            header, base64_str = image_data.split(',', 1)
        else:
            base64_str = image_data

        ext = image_mime.split('/')[1] if '/' in image_mime else 'jpg'
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)

        with open(filepath, 'wb') as f:
            f.write(base64.b64decode(base64_str))

        url = f"/static/uploads/{filename}"
        return jsonify({'url': url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/static/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/api/send', methods=['POST'])
def send():
    try:
        data = request.json
        msg = data.get('msg', '')
        cid = data.get('cid', conv_mgr.current)
        deep = data.get('deep', False)
        image_data = data.get('image_data')
        image_mime = data.get('image_mime', 'image/jpeg')
        file_name = data.get('file_name')
        file_content = data.get('file_content')
        file_lang = data.get('file_lang', 'Code')
        file_size = data.get('file_size', 0)

        if not cid or cid not in conv_mgr.data:
            cid = conv_mgr.new()

        history = conv_mgr.msgs(cid)

        if image_data and not file_content:
            reply = call_agnes_vision(image_data, image_mime, msg, deep)
            searched = False
            elapsed = 0
            think = None
            answer = reply
        elif file_content:
            start = time.time()
            analysis = analyze_code_with_glm(file_content, file_name, msg)
            elapsed = time.time() - start
            reply = analysis
            searched = False
            think = None
            answer = analysis
        else:
            start = time.time()
            result = ai.handle_input(msg, deep=deep, history=history)
            elapsed = time.time() - start
            reply = result.get('reply')
            searched = result.get('searched', False)
            if deep and isinstance(reply, dict):
                think = reply.get('think', '')
                answer = reply.get('answer', '')
            else:
                think = None
                answer = reply

        if image_data:
            conv_mgr.add_msg(cid, "user", msg or "（图片）", image_data=image_data, image_mime=image_mime)
        elif file_content:
            conv_mgr.add_msg(cid, "user", msg or "（代码文件）", file_name=file_name, file_lang=file_lang, file_size=file_size)
        else:
            conv_mgr.add_msg(cid, "user", msg)

        if deep and think is not None:
            conv_mgr.add_msg(cid, "ai", answer, think=think)
            return jsonify({
                'reply': answer,
                'think': think,
                'cid': cid,
                'title': conv_mgr.title(cid),
                'time_elapsed': round(elapsed, 2),
                'searched': searched
            })
        else:
            conv_mgr.add_msg(cid, "ai", answer)
            return jsonify({
                'reply': answer,
                'cid': cid,
                'title': conv_mgr.title(cid),
                'time_elapsed': round(elapsed, 2) if deep else None,
                'searched': searched
            })

    except Exception as e:
        error_detail = traceback.format_exc()
        print("="*60)
        print("❌ 后端错误：")
        print(error_detail)
        print("="*60)
        return jsonify({
            'error': True,
            'message': str(e),
            'detail': error_detail
        })

@app.route('/api/generate_image', methods=['POST'])
def generate_image_api():
    try:
        data = request.json
        prompt = data.get('prompt', '')
        cid = data.get('cid', conv_mgr.current)
        mode = data.get('mode', 'text')
        image_data = data.get('image_data')
        image_mime = data.get('image_mime', 'image/jpeg')

        if not prompt:
            return jsonify({'error': '请输入图像描述'}), 400
        if not cid or cid not in conv_mgr.data:
            cid = conv_mgr.new()

        if image_data:
            conv_mgr.add_msg(cid, "user", prompt, image_data=image_data, image_mime=image_mime)
        else:
            conv_mgr.add_msg(cid, "user", prompt)

        if mode == 'image':
            if not image_data:
                return jsonify({'error': '图生图模式需要上传图片'}), 400
            image_uri = f"data:{image_mime};base64,{image_data}"
            result = image_to_image(prompt, image_uri)
        else:
            result = generate_image(prompt)

        if isinstance(result, dict) and "error" in result:
            return jsonify({'error': result['error']}), 500

        conv_mgr.add_msg(cid, "ai", f"🎨 生成图片：{prompt}", image_url=result)

        return jsonify({
            'image_url': result,
            'prompt': prompt,
            'cid': cid,
            'title': conv_mgr.title(cid)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate_video', methods=['POST'])
def generate_video_api():
    try:
        data = request.json
        prompt = data.get('prompt', '')
        cid = data.get('cid', conv_mgr.current)
        mode = data.get('mode', 'video_text')
        image_data = data.get('image_data')
        image_mime = data.get('image_mime', 'image/jpeg')
        num_frames = data.get('num_frames', 121)

        if not prompt:
            return jsonify({'error': '请输入视频描述'}), 400
        if not cid or cid not in conv_mgr.data:
            cid = conv_mgr.new()

        if image_data:
            conv_mgr.add_msg(cid, "user", prompt, image_data=image_data, image_mime=image_mime)
        else:
            conv_mgr.add_msg(cid, "user", prompt)

        image_url = None
        if image_data:
            try:
                upload_resp = requests.post(
                    f"{request.host_url}api/upload_image",
                    json={'image_data': image_data, 'image_mime': image_mime}
                )
                if upload_resp.status_code == 200:
                    image_url = upload_resp.json().get('url')
                    image_url = request.host_url.rstrip('/') + image_url
                else:
                    return jsonify({'error': '图片上传失败'}), 500
            except Exception as e:
                return jsonify({'error': f'图片处理失败: {str(e)}'}), 500

        host = request.host_url
        if '127.0.0.1' in host or 'localhost' in host:
            if mode == 'video_image' and image_url:
                return jsonify({
                    'error': '当前为本地开发环境，图生视频需要公网可访问的图片地址。请改用文生视频，或使用内网穿透工具（如ngrok）将本地服务暴露到公网后重试。',
                    'code': 'LOCAL_ENV_LIMIT'
                }), 400

        if mode == 'video_image':
            if not image_url:
                return jsonify({'error': '图生视频需要图片'}), 400
            result = create_video(prompt, image=image_url, num_frames=num_frames)
        else:
            result = create_video(prompt, num_frames=num_frames)

        if 'error' in result:
            return jsonify({'error': result['error']}), 500

        return jsonify({
            'task_id': result.get('task_id'),
            'video_id': result.get('video_id'),
            'status': result.get('status'),
            'cid': cid,
            'title': conv_mgr.title(cid)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/video_status', methods=['GET'])
def video_status():
    video_id = request.args.get('video_id')
    if not video_id:
        return jsonify({'error': '缺少 video_id'}), 200
    try:
        result = get_video_status(video_id)
        if isinstance(result, dict) and 'error' in result:
            return jsonify(result), 200
        return jsonify(result), 200
    except Exception as e:
        print(f"❌ 视频状态查询异常: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'查询异常: {str(e)}'}), 200

@app.route('/api/add_media_msg', methods=['POST'])
def add_media_msg():
    data = request.json
    cid = data.get('cid')
    role = data.get('role')
    content = data.get('content', '')
    image_data = data.get('image_data')
    image_mime = data.get('image_mime')
    image_url = data.get('image_url')
    file_name = data.get('file_name')
    file_lang = data.get('file_lang')
    file_size = data.get('file_size')
    if not cid or cid not in conv_mgr.data:
        return jsonify({'error': 'invalid cid'}), 400
    conv_mgr.add_msg(cid, role, content, image_data=image_data, image_mime=image_mime, image_url=image_url,
                     file_name=file_name, file_lang=file_lang, file_size=file_size)
    return jsonify({'success': True})

@app.route('/api/history', methods=['GET'])
def history():
    history_list = [{'cid': cid, 'title': conv_mgr.title(cid), 'time': conv_mgr.data[cid]['time']} for cid in conv_mgr.ids()]
    return jsonify({'history': history_list, 'current': conv_mgr.current})

@app.route('/api/load', methods=['POST'])
def load():
    cid = request.json.get('cid')
    if cid not in conv_mgr.data:
        return jsonify({'error': 'not found'}), 404
    conv_mgr.current = cid
    return jsonify({'messages': conv_mgr.msgs(cid), 'cid': cid})

@app.route('/api/new', methods=['POST'])
def new():
    cid = conv_mgr.new()
    return jsonify({'cid': cid})

@app.route('/api/rename', methods=['POST'])
def rename():
    cid = request.json.get('cid')
    title = request.json.get('title')
    if cid and title:
        conv_mgr.rename(cid, title)
        return jsonify({'success': True})
    return jsonify({'error': 'invalid'}), 400

@app.route('/api/delete', methods=['POST'])
def delete():
    cid = request.json.get('cid')
    if cid:
        conv_mgr.delete(cid)
        remaining = conv_mgr.ids()
        new_current = remaining[0] if remaining else None
        conv_mgr.current = new_current
        return jsonify({'success': True, 'current': new_current})
    return jsonify({'error': 'no cid'}), 400

@app.route('/api/export', methods=['POST'])
def export():
    cid = request.json.get('cid')
    if not cid or cid not in conv_mgr.data:
        return jsonify({'error': 'invalid'}), 400
    msgs = conv_mgr.msgs(cid)
    title = conv_mgr.title(cid)
    export_text = f"对话导出：{title}\n时间：{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    for msg in msgs:
        role = "用户" if msg['role'] == 'user' else "银杏AI"
        content = msg['content']
        if 'image_data' in msg:
            content += " [图片]"
        if 'image_url' in msg:
            content += " [生成的媒体]"
        if 'file_name' in msg:
            content += f" [文件: {msg['file_name']}]"
        export_text += f"[{role}] {content}\n\n"
    resp = make_response(export_text)
    encoded = quote(f"{title}.txt", encoding='utf-8')
    resp.headers['Content-Disposition'] = f"attachment; filename*=UTF-8''{encoded}"
    resp.mimetype = 'text/plain; charset=utf-8'
    return resp

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/terms')
def terms():
    return render_template('terms.html')

@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

if __name__ == '__main__':
    webbrowser.open('http://127.0.0.1:5000')
    app.run(debug=True, port=5000)
