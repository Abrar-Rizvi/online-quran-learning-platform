"""Admission Agent chat endpoint backed by Groq native tool calling.

Plain custom implementation (no agent framework): the incoming message is
stored, conversation history is sent to Groq together with the six tool
schemas from ``backend.agent.tools``, and any tool calls Groq requests are
executed in a loop until a final natural-language reply is produced.
"""

import json

import groq
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..agent import tools as agent_tools
from ..agent.instructions import SYSTEM_PROMPT
from ..config import settings
from ..db import get_session
from ..models import Conversation, Message
from ..models.student import utcnow
from ..schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])

HISTORY_LIMIT = 20
MAX_TOOL_ROUNDS = 6

TOOL_FUNCTIONS = {
    "search_courses": agent_tools.search_courses,
    "get_course_details": agent_tools.get_course_details,
    "get_course_fee": agent_tools.get_course_fee,
    "get_trial_info": agent_tools.get_trial_info,
    "get_registration_link": agent_tools.get_registration_link,
    "route_to_whatsapp": agent_tools.route_to_whatsapp,
}


def _get_client() -> groq.Groq:
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured (missing GROQ_API_KEY).",
        )
    return groq.Groq(api_key=settings.groq_api_key)


def _history(session: Session, conversation_id: int) -> list[dict]:
    """Return the last few stored turns as Groq messages (no system prompt)."""
    rows = session.exec(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.id.desc())
        .limit(HISTORY_LIMIT)
    ).all()

    api_messages: list[dict] = []
    for message in reversed(rows):
        role = "assistant" if message.role == "agent" else message.role
        api_messages.append({"role": role, "content": message.content})
    return api_messages


def _run_tool_call(name: str, arguments: str, executed: list[str]) -> str:
    """Execute one requested tool call and return a string result."""
    fn = TOOL_FUNCTIONS.get(name)
    if fn is None:
        return json.dumps({"error": f"Unknown tool requested: {name}"})

    try:
        kwargs = json.loads(arguments or "{}")
    except json.JSONDecodeError:
        kwargs = {}

    try:
        result = fn(**kwargs)
    except Exception as exc:  # surface tool errors back to the model
        return json.dumps({"error": f"Tool '{name}' failed: {exc}"})

    executed.append(name)
    return str(result)


@router.post("", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    session: Session = Depends(get_session),
) -> ChatResponse:
    text = payload.message.strip()
    if not text:
        raise HTTPException(status_code=422, detail="message must not be blank")

    if payload.conversation_id is None:
        conversation = Conversation()
        session.add(conversation)
    else:
        conversation = session.get(Conversation, payload.conversation_id)
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")
    session.flush()

    session.add(
        Message(conversation_id=conversation.id, role="user", content=text)
    )

    api_messages: list[dict] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *_history(session, conversation.id),
    ]

    client = _get_client()
    executed_tools: list[str] = []
    final_reply = ""

    try:
        for _ in range(MAX_TOOL_ROUNDS):
            response = client.chat.completions.create(
                model=settings.groq_model,
                messages=api_messages,
                tools=agent_tools.TOOLS,
            )
            message = response.choices[0].message
            tool_calls = getattr(message, "tool_calls", None) or []

            if not tool_calls:
                final_reply = (message.content or "").strip()
                break

            api_messages.append(
                {
                    "role": "assistant",
                    "content": message.content,
                    "tool_calls": [
                        {
                            "id": call.id,
                            "type": "function",
                            "function": {
                                "name": call.function.name,
                                "arguments": call.function.arguments,
                            },
                        }
                        for call in tool_calls
                    ],
                }
            )
            for call in tool_calls:
                result = _run_tool_call(
                    call.function.name, call.function.arguments, executed_tools
                )
                api_messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.id,
                        "content": result,
                    }
                )
        else:
            # Exhausted MAX_TOOL_ROUNDS without a final reply.
            final_reply = (
                "I'm having trouble finishing my answer. Could you please "
                "ask again or contact us on WhatsApp for help?"
            )
    except groq.GroqError as exc:
        session.rollback()
        raise HTTPException(
            status_code=502,
            detail=f"AI service error, please try again: {exc}",
        )
    except HTTPException:
        session.rollback()
        raise
    except Exception as exc:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")

    if not final_reply:
        final_reply = (
            "I'm sorry, I couldn't generate a reply. Please try again."
        )

    tool_names = list(dict.fromkeys(executed_tools))

    session.add(
        Message(
            conversation_id=conversation.id,
            role="agent",
            content=final_reply,
            tool_called=", ".join(tool_names) if tool_names else None,
            registration_link_given="get_registration_link" in tool_names,
            routed_to_whatsapp="route_to_whatsapp" in tool_names,
        )
    )
    conversation.last_message_at = utcnow()
    session.commit()

    return ChatResponse(reply=final_reply, conversation_id=conversation.id)
