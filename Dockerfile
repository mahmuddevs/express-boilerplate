FROM oven/bun:latest

WORKDIR /express-boilerplate

COPY package.json bun.lock ./

RUN bun install

COPY . .

RUN bun run build

CMD ["bun", "start"]