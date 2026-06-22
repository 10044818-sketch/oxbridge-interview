import os

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
当前阶段: {stage}（warmup/technical/challenge）
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


async def get_ai_feedback(question: str, strokes_data: str, subject: str) -> str:
    subject_name = "数学" if subject == "math" else "物理"
    prompt = FEEDBACK_PROMPT.format(
        subject=subject_name,
        question=question,
        strokes_data=strokes_data[:2000],
    )
    
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if api_key:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 1024,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    return data["content"][0]["text"]
                return f"AI 评估暂时不可用 (status: {response.status_code})"
        except Exception as e:
            return f"AI 评估出错: {str(e)}"
    
    return f"评分: 7/10\n思路评估: 解题方向基本正确，步骤较为完整。\n改进建议: 可以尝试更简洁的解法，注意书写规范。（提示：设置 ANTHROPIC_API_KEY 环境变量以启用真实 AI 评估）"


async def get_interview_response(subject: str, topic: str, history: list, stage: str, elapsed: int) -> str:
    subject_name = "数学" if subject == "math" else "物理"
    history_text = "\n".join([f"{'面试官' if h.get('role')=='interviewer' else '学生'}: {h.get('text','')}" for h in history[-6:]])
    
    prompt = INTERVIEW_PROMPT.format(
        subject=subject_name,
        topic=topic,
        stage=stage,
        elapsed=elapsed,
        history=history_text or "（面试刚开始）",
    )
    
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if api_key:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 1024,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    return data["content"][0]["text"]
                return f"面试官暂时离线 (status: {response.status_code})"
        except Exception as e:
            return f"面试官出错: {str(e)}"
    
    return f"你好，欢迎参加{subject_name}面试。请先介绍一下自己，然后我们开始讨论 {topic} 相关的问题。（提示：设置 ANTHROPIC_API_KEY 环境变量以启用 AI 面试官）"
