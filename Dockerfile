FROM node:18-slim
ARG TAG=passAsBuildArg

ENV SWARM_PORT=48200
ENV PORT=8080
ENV LOG_LEVEL=info
ENV HOST=0.0.0.0
ENV MIN_LOG_SUMMARY_INTERVAL=60

RUN npm i -g hypercore-rehost-server@${TAG}

ENTRYPOINT rehost-server
