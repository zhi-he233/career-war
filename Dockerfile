FROM node:20-bookworm-slim

WORKDIR /app

RUN sed -i \
  -e 's|http://deb.debian.org/debian|http://mirrors.cloud.tencent.com/debian|g' \
  -e 's|http://deb.debian.org/debian-security|http://mirrors.cloud.tencent.com/debian-security|g' \
  -e 's|http://security.debian.org/debian-security|http://mirrors.cloud.tencent.com/debian-security|g' \
  -e 's|https://deb.debian.org/debian|http://mirrors.cloud.tencent.com/debian|g' \
  -e 's|https://deb.debian.org/debian-security|http://mirrors.cloud.tencent.com/debian-security|g' \
  -e 's|https://security.debian.org/debian-security|http://mirrors.cloud.tencent.com/debian-security|g' \
  /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json

RUN npm config set registry https://registry.npmmirror.com

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
