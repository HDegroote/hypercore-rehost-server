FROM node:18
ARG TAG=passAsBuildArg

ENV SWARM_PORT=48200
ENV PORT=8080
ENV LOG_LEVEL=info
ENV HOST=0.0.0.0
ENV MIN_LOG_SUMMARY_INTERVAL=60
ENV CORESTORE_LOC=/home/rehoster/store

RUN useradd --create-home rehoster

# USER rehoster
# Ensure correct permissions on corestore dir by already creating it
# (relevant when using volumes)
RUN mkdir $CORESTORE_LOC

# RUN npm i -g hypercore-rehost-server@${TAG}
COPY package-lock.json /home/rehoster/package-lock.json
COPY node_modules /home/rehoster/node_modules
COPY lib /home/rehoster/lib
COPY package.json /home/rehoster/package.json
COPY run.js /home/rehoster/run.js
COPY index.js /home/rehoster/index.js
RUN npm i -g node-gyp
WORKDIR /home/rehoster/node_modules/heapdump
RUN node-gyp configure build


ENTRYPOINT ["node", "/home/rehoster/run.js"]
