from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging

try:
    import google.generativeai as genai
except ImportError:
    genai = None

from app.config import settings
from app.core.registry import active_processors

router = APIRouter()
logger = logging.getLogger(__name__)

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    
class ChatResponse(BaseModel):
    response: str

if genai and settings.GEMINI_API_KEY:
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.5-flash')
    except Exception as e:
        logger.error(f"Failed to configure Gemini API for Copilot: {e}")
        model = None
else:
    model = None

@router.post("/chat", response_model=ChatResponse)
async def chat_with_copilot(request: ChatRequest):
    if not model:
        raise HTTPException(status_code=503, detail="Gemini Copilot is not configured. Please add GEMINI_API_KEY to your environment variables.")
        
    # Gather live simulation context
    processor = active_processors.get("cam_uploaded") or active_processors.get("simulated")
    
    context_str = "Simulation Context (Live State): \n"
    if processor:
        with processor.lock:
            analytics = processor.shared_analytics
            health_score = analytics.get("health_score", 100)
            congestion = analytics.get("congestion_score", 0.0)
            total = analytics.get("total_count", 0)
            lanes = analytics.get("lane_utilization", {})
            recs = processor.shared_recommendations
            emergency = processor.shared_emergency_detected
            emergency_type = processor.shared_emergency_type
            
        context_str += f"- Traffic Health Score: {health_score}/100\n"
        context_str += f"- Congestion: {congestion*100}%\n"
        context_str += f"- Total Vehicles Detected: {total}\n"
        context_str += f"- Lane Utilization: {lanes}\n"
        context_str += f"- Emergency Detected: {emergency} (Type: {emergency_type})\n"
        if recs:
            context_str += f"- Latest AI Recommendation: {recs[0].get('title')} ({recs[0].get('severity')}) - {recs[0].get('reason')}\n"
    else:
        context_str += "No active simulation data currently available.\n"
        
    system_prompt = f"""You are the FlowPulse AI Traffic Copilot, an expert smart city traffic controller assistant.
Your goal is to assist the human operator in managing intersection traffic.
    
{context_str}

Guidelines:
1. Explain AI decisions in natural language.
2. Analyze live traffic conditions based on the simulation context above.
3. Summarize congestion causes.
4. Recommend signal optimization.
5. Explain Traffic Health Score changes.
6. Generate emergency response plans if an emergency is active.
7. Produce end-of-session traffic reports if requested.
8. Answer operator questions strictly using the current simulation data provided.
9. Suggest improvements for detected congestion.
10. Predict the impact of hypothetical scenarios such as road closures, accidents, or weather changes.

Be highly contextual, concise, professional, and act as an experienced traffic control operator. 
Do not act like a generic AI chatbot. You are fully integrated into FlowPulse AI. Use markdown for readability (bullet points, bold text)."""

    formatted_history = []
    recent_messages = request.messages[-6:] 
    
    prompt = system_prompt + "\n\nConversation History:\n"
    for msg in recent_messages[:-1]:
        role = "Operator" if msg.role == "user" else "Copilot"
        prompt += f"{role}: {msg.content}\n"
        
    last_msg = recent_messages[-1].content
    prompt += f"\nOperator: {last_msg}\nCopilot:"
    
    try:
        response = model.generate_content(prompt)
        return ChatResponse(response=response.text.strip())
    except Exception as e:
        logger.error(f"Gemini API error during chat: {e}")
        raise HTTPException(status_code=500, detail="Error communicating with Gemini Copilot.")
