import json
from typing import Any
from urllib.parse import urlencode


async def asgi_get(
    application: Any,
    path: str,
    query: dict[str, str] | None = None,
) -> tuple[int, Any]:
    messages: list[dict[str, Any]] = []
    request_received = False

    async def receive() -> dict[str, Any]:
        nonlocal request_received
        if request_received:
            return {"type": "http.disconnect"}
        request_received = True
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message: dict[str, Any]) -> None:
        messages.append(message)

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": path,
        "raw_path": path.encode("ascii"),
        "query_string": urlencode(query or {}).encode("ascii"),
        "root_path": "",
        "headers": [],
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
        "app": application,
    }
    await application(scope, receive, send)

    response_start = next(
        message for message in messages if message["type"] == "http.response.start"
    )
    response_body = b"".join(
        message.get("body", b"")
        for message in messages
        if message["type"] == "http.response.body"
    )
    return response_start["status"], json.loads(response_body)