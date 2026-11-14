FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY python-bot/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY python-bot/ ./

CMD ["python", "-m", "bot.main"]
