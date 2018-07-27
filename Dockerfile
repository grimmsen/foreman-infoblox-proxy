FROM node:4
ADD ./src /foreman-infoblox-proxy
WORKDIR /foreman-infoblox-proxy
RUN npm install
CMD [ "npm","start" ]