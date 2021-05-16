FROM ubuntu:20.04
WORKDIR /usr/src/app
COPY package*.json ./
COPY *.js ./
COPY lib /usr/src/app/lib
RUN export DEBIAN_FRONTEND=noninteractive && \
    apt-get update -y && \
    apt-get install -y tzdata && \
    ln -fs /usr/share/zoneinfo/Europe/Madrid /etc/localtime &&\
    dpkg-reconfigure --frontend noninteractive tzdata &&\
    apt-get install -y nodejs && \
    apt-get install -y npm && \
    apt-get install -y astrometry.net && \
    apt-get install -y astrometry-data-tycho2 && \
    npm install && \
    mkdir upload && \
    mkdir output
EXPOSE 8080
CMD [ "npm", "start" ]