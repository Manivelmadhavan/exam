FROM alpine:3.20
RUN apk add --no-cache g++ musl-dev && adduser -D -u 1000 -h /tmp runner
COPY run.sh /opt/run.sh
ENV HOME=/tmp
USER 1000:1000
WORKDIR /tmp
ENTRYPOINT ["/bin/sh", "/opt/run.sh"]
