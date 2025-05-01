FROM node:21-alpine

WORKDIR /app

COPY package.json .

RUN apk add --no-cache python3 py3-pip

COPY scripts/ ./scripts/


RUN python3 -m venv /pyenv \
    && source /pyenv/bin/activate \
    && pip install --upgrade pip \
    && pip install -r ./scripts/requirements.txt


RUN npm install 

COPY . .

RUN npx prisma generate

EXPOSE 8080

CMD ["npm", "start"]