FROM node:8
EXPOSE 8080
WORKDIR /foreman-infoblox-proxy
ADD src /foreman-infoblox-proxy
RUN ls -la /foreman-infoblox-proxy
ARG https_proxy=''
RUN if [ "$https_proxy" != '' ]; then echo npm proxy set to $https_proxy;npm config set https-proxy $https_proxy; fi
RUN npm install
CMD npm start