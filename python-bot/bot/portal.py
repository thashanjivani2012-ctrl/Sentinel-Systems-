from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import random
import time
from typing import Any

import aiohttp

MAX_BODY_BYTES = 64 * 1024


def sign(secret: str, timestamp: str, body: bytes) -> str:
    """HMAC-SHA256(secret, f"{timestamp}.{rawBody}") as lowercase hex."""
    message = timestamp.encode("ascii") + b"." + body
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


class PortalEvents:
    """Queues portal events and delivers them with a signed POST."""

    def __init__(
        self,
        url: str,
        secret: str,
        *,
        timeout: float = 10.0,
        max_attempts: int = 5,
        retry_base: float = 1.0,
        queue_size: int = 500,
        session: aiohttp.ClientSession | None = None,
    ) -> None:
        self.url = url.strip()
        self.secret = secret.strip()
        self.timeout = timeout
        self.max_attempts = max_attempts
        self.retry_base = retry_base
        self._queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=queue_size)
        self._session = session
        self._owns_session = session is None
        self._worker: asyncio.Task[None] | None = None

    @property
    def enabled(self) -> bool:
        return bool(self.url and self.secret)

    async def start(self) -> None:
        if not self.enabled:
            logging.info(
                "Portal events disabled: set BOT_EVENTS_SECRET to enable delivery"
            )
            return
        if self._session is None:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            )
        self._worker = asyncio.create_task(self._run(), name="portal-events")
        logging.info("Portal events worker started for %s", self.url)

    def emit(
        self,
        event_type: str,
        guild_id: int | None,
        data: dict[str, Any],
        *,
        event_id: str | None = None,
    ) -> None:
        if not self.enabled:
            return

        identifier = event_id or f"{event_type}:{guild_id}:{int(time.time() * 1000)}"
        event = {
            "event_id": identifier[:120],
            "type": event_type,
            "guild_id": str(guild_id) if guild_id is not None else None,
            "data": data,
        }
        try:
            self._queue.put_nowait(event)
        except asyncio.QueueFull:
            logging.warning("Portal queue full; dropping event %s", event["event_id"])

    async def close(self) -> None:
        if self._worker is not None:
            self._worker.cancel()
            try:
                await self._worker
            except asyncio.CancelledError:
                pass
            self._worker = None
        if self._owns_session and self._session is not None:
            await self._session.close()
            self._session = None

    async def _run(self) -> None:
        while True:
            event = await self._queue.get()
            try:
                await self._send(event)
            except asyncio.CancelledError:
                raise
            except Exception:
                logging.exception("Portal worker failed on %s", event.get("event_id"))
            finally:
                self._queue.task_done()

    async def _send(self, event: dict[str, Any]) -> None:
        body = json.dumps(
            event, separators=(",", ":"), ensure_ascii=False, default=str
        ).encode("utf-8")
        if len(body) > MAX_BODY_BYTES:
            logging.warning(
                "Dropping portal event %s: %d bytes exceeds the 64 KB limit",
                event.get("event_id"),
                len(body),
            )
            return

        for attempt in range(1, self.max_attempts + 1):
            timestamp = str(int(time.time()))
            headers = {
                "Content-Type": "application/json",
                "X-FSRP-Timestamp": timestamp,
                "X-FSRP-Signature": sign(self.secret, timestamp, body),
            }
            retry_after: float | None = None

            try:
                async with self._session.post(
                    self.url, data=body, headers=headers
                ) as response:
                    if 200 <= response.status < 300:
                        return
                    detail = (await response.text())[:300]
                    if response.status in (400, 401):
                        # Bad schema or signature: retrying cannot help.
                        logging.error(
                            "Portal rejected event %s (%s): %s",
                            event.get("event_id"),
                            response.status,
                            detail,
                        )
                        return
                    if response.status == 429:
                        header = response.headers.get("Retry-After")
                        try:
                            retry_after = float(header) if header else None
                        except ValueError:
                            retry_after = None
                    logging.warning(
                        "Portal event %s failed (%s), attempt %s/%s: %s",
                        event.get("event_id"),
                        response.status,
                        attempt,
                        self.max_attempts,
                        detail,
                    )
            except (aiohttp.ClientError, asyncio.TimeoutError) as error:
                logging.warning(
                    "Portal event %s network error, attempt %s/%s: %s",
                    event.get("event_id"),
                    attempt,
                    self.max_attempts,
                    error,
                )

            if attempt < self.max_attempts:
                await asyncio.sleep(self._delay(attempt, retry_after))

        logging.error(
            "Dropping portal event %s after %s attempts",
            event.get("event_id"),
            self.max_attempts,
        )

    def _delay(self, attempt: int, retry_after: float | None) -> float:
        if retry_after is not None:
            return max(0.0, retry_after)
        return self.retry_base * (2 ** (attempt - 1)) + random.uniform(0, 0.25)
