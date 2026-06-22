import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

FEEDBACK_PROMPT = """你是一位{subject}学科的教授，正在评估学生的解题过程。

题目: {question}

学生的解题过程（从白板书写数据中提取）:
{strokes_data}

请从以下维度评估：
1. 解题思路是否正确
2. 步骤是否完整
3. 有没有更优的解法
4. 知识掌握程度

请给出 1-10 分的评分，并用中文回复。回复格式：
评分: X/10
思路评估: ...
改进建议: ...
"""

INTERVIEW_PROMPT = """你是一位牛剑{subject}专业的面试官。正在面试申请{subject}专业的学生。

面试主题: {topic}
当前阶段: {stage}（warmup/technial/challenge）
已进行时间: {elapsed}秒

之前的对话记录:
{history}

请根据学生的回答，给出下一轮提问。规则：
1. 在 warmup 阶段，问一些基础的引导性问题
2. 在 technical 阶段，提出需要深入思考的数学/物理问题
3. 在 challenge 阶段，提出有挑战性的扩展问题
4. 每次回复先简短点评学生上一轮回答（如果有），再提出新问题
5. 用中文回复，语气专业但不失鼓励

请给出你的回复（包含对上一轮的简短评估 1-5分，以及下一个问题）:
"""


def _get_provider_config():
    """读取 AI provider 配置，返回 (provider, api_key, model)"""
    provider = os.environ.get("AI_PROVIDER", "poe").lower()

    if provider == "poe":
        api_key = os.environ.get("POE_API_KEY", "")
        model = os.environ.get("POE_MODEL", "claude-sonnet-4.6")
        return "poe", api_key, model

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    return "anthropic", api_key, "claude-sonnet-4-20250514"


def _call_poe_sync(messages: list, model: str, api_key: str, max_tokens: int = 1024) -> str:
    """通过 POE API（OpenAI 兼容格式）调用 AI（同步）"""
    with httpx.Client(trust_env=False, timeout=60) as client:
        response = client.post(
            "https://api.poe.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.7,
            },
        )
        if response.status_code == 200:
            data = response.json()
            return data["choices"][0]["message"]["content"]
        else:
            return f"AI 调用失败 (status: {response.status_code}, body: {response.text[:200]})"


def _call_anthropic_sync(prompt: str, api_key: str, max_tokens: int = 1024) -> str:
    """通过 Anthropic API 调用 Claude（同步）"""
    with httpx.Client(trust_env=False, timeout=60) as client:
        response = client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        if response.status_code == 200:
            data = response.json()
            return data["content"][0]["text"]
        else:
            return f"AI 调用失败 (status: {response.status_code})"


async def get_ai_feedback(question: str, strokes_data: str, subject: str) -> str:
    subject_name = "数学" if subject == "math" else "物理"
    prompt = FEEDBACK_PROMPT.format(
        subject=subject_name,
        question=question,
        strokes_data=strokes_data[:2000],
    )

    provider, api_key, model = _get_provider_config()

    if not api_key:
        return _mock_feedback(subject_name)

    try:
        if provider == "poe":
            result = await asyncio.to_thread(
                _call_poe_sync,
                messages=[{"role": "user", "content": prompt}],
                model=model,
                api_key=api_key,
            )
            return result
        else:
            result = await asyncio.to_thread(
                _call_anthropic_sync,
                prompt=prompt,
                api_key=api_key,
            )
            return result
    except Exception as e:
        return f"AI 评估出错: {str(e)}"


async def get_interview_response(subject: str, topic: str, history: list, stage: str, elapsed: int) -> str:
    subject_name = "数学" if subject == "math" else "物理"
    history_text = "\n".join([
        f"{'面试官' if h.get('role') == 'interviewer' else '学生'}: {h.get('text', '')}"
        for h in history[-6:]
    ])

    prompt = INTERVIEW_PROMPT.format(
        subject=subject_name,
        topic=topic,
        stage=stage,
        elapsed=elapsed,
        history=history_text or "（面试刚开始）",
    )

    provider, api_key, model = _get_provider_config()

    if not api_key:
        return _mock_interview(subject_name, topic)

    try:
        if provider == "poe":
            result = await asyncio.to_thread(
                _call_poe_sync,
                messages=[{"role": "user", "content": prompt}],
                model=model,
                api_key=api_key,
            )
            return result
        else:
            result = await asyncio.to_thread(
                _call_anthropic_sync,
                prompt=prompt,
                api_key=api_key,
            )
            return result
    except Exception as e:
        return f"面试官出错: {str(e)}"


def _mock_feedback(subject_name: str) -> str:
    return (
        f"评分: 7/10\n"
        f"思路评估: {subject_name}解题方向基本正确，步骤较为完整。\n"
        f"改进建议: 可以尝试更简洁的解法，注意书写规范。\n"
        f"（提示：设置 AI_PROVIDER=poe 和 POE_API_KEY 环境变量以启用真实 AI 评估）"
    )


def _mock_interview(subject_name: str, topic: str) -> str:
    return (
        f"你好，欢迎参加{subject_name}面试。\n"
        f"请先介绍一下自己，然后我们开始讨论 {topic} 相关的问题。\n"
        f"（提示：设置 AI_PROVIDER=poe 和 POE_API_KEY 环境变量以启用 AI 面试官）"
    )
