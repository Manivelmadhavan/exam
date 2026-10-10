FROM python:3.12-alpine
RUN adduser -D -u 1000 -h /tmp runner
COPY run.sh /opt/run.sh
ENV HOME=/tmp PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
USER 1000:1000
WORKDIR /tmp
ENTRYPOINT ["/bin/sh", "/opt/run.sh"]
