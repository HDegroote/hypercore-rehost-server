FROM node:18-slim
ARG TAG=passAsBuildArg

ENV SWARM_PORT=48200
ENV PORT=8080
ENV LOG_LEVEL=info
ENV HOST=0.0.0.0
ENV MIN_LOG_SUMMARY_INTERVAL=60
ENV CORESTORE_LOC=/home/rehoster/store

RUN npm i -g hypercore-rehost-server@${TAG}

RUN useradd --create-home rehoster
USER rehoster
# Ensure correct permissions on corestore dir by alraedy creating it
# (relevant when using volumes)
RUN mkdir $CORESTORE_LOC

ENTRYPOINT ["rehost-server"]
