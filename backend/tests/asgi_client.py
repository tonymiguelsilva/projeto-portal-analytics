import json
from typing import Any
from urllib.parse import urlencode


async def asgi_request(
    application: Any,
    method: str,
    path: str,
    query: dict[str, str] | None = None,
    headers: dict[str, str] | None = None,
    json_body: object | None = None,
) -> tuple[int, bytes, dict[str, str]]:
    messages: list[dict[str, Any]] = []
    request_received = False
    body = b"" if json_body is None else json.dumps(json_body).encode("utf-8")

    async def receive() -> dict[str, Any]:
        nonlocal request_received
        if request_received:
            return {"type": "http.disconnect"}
        request_received = True
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(message: dict[str, Any]) -> None:
        messages.append(message)

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": path,
        "raw_path": path.encode("ascii"),
        "query_string": urlencode(query or {}).encode("ascii"),
        "root_path": "",
        "headers": [
            (name.lower().encode("ascii"), value.encode("latin-1"))
            for name, value in (headers or {}).items()
        ]
        + ([(b"content-type", b"application/json")] if json_body is not None else []),
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
    response_headers = {
        name.decode("latin-1").lower(): value.decode("latin-1")
        for name, value in response_start.get("headers", [])
    }
    return response_start["status"], response_body, response_headers


async def asgi_get(
    application: Any,
    path: str,
    query: dict[str, str] | None = None,
    headers: dict[str, str] | None = None,
) -> tuple[int, Any]:
    status, body, _ = await asgi_request(
        application, "GET", path, query=query, headers=headers
    )
    return status, json.loads(body) if body else None