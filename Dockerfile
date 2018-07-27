FROM node:8
EXPOSE 8080
WORKDIR /
RUN npm install
COPY . .
CMD [ "npm","start" ]