FROM oven/bun:1.2.19-alpine AS base
WORKDIR /usr/src/app

ENV PRISMA_HIDE_UPDATE_MESSAGE=1

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock prisma.config.ts /temp/dev/
COPY prisma /temp/dev/prisma
RUN cd /temp/dev && bun ci && bunx prisma generate

RUN mkdir -p /temp/prod
COPY package.json bun.lock prisma.config.ts /temp/prod/
COPY prisma /temp/prod/prisma
RUN cd /temp/prod && bun ci --production && bunx prisma generate

FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production
RUN bun run build

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=install /temp/dev/node_modules/.prisma/client  node_modules/.prisma/client
COPY --from=prerelease /usr/src/app/dist dist
COPY --from=prerelease /usr/src/app/prisma prisma
COPY --from=prerelease /usr/src/app/package.json .
COPY --from=prerelease /usr/src/app/docker-entrypoint.sh .

USER bun
EXPOSE 3000/tcp

ENTRYPOINT [ "/bin/sh", "docker-entrypoint.sh" ]

CMD [ "bun", "run", "dist/main.js" ]
