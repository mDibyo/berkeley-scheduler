FROM python:3
MAINTAINER Dibyo Majumdar <dibyo.majumdar@gmail.com>


RUN wget -qO- https://deb.nodesource.com/setup_6.x | bash - \
    && apt-get install -y nodejs

RUN git clone https://github.com/mDibyo/berkeley-scheduler
WORKDIR berkeley-scheduler

RUN npm install --production
