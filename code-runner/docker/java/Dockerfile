FROM eclipse-temurin:21-jdk-alpine
RUN adduser -D -u 1000 -h /tmp runner
COPY run.sh /opt/run.sh
ENV HOME=/tmp
USER 1000:1000
WORKDIR /tmp
ENTRYPOINT ["/bin/sh", "/opt/run.sh"]
