FROM node:8
EXPOSE 8080
WORKDIR /foreman-infoblox-proxy
ADD src /foreman-infoblox-proxy
RUN npm install
CMD [ "npm","start" ]