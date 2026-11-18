FROM oven/bun:1.4.4
WORKDIR /app
USER root
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
RUN mkdir -p /data && chown -R bun:bun /app /data
USER bun
ENV HOST=0.0.0.0
ENV PORT=3160
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3160
ENV NODE_ENV=production
EXPOSE 3160
CMD ["bun", ".output/server/index.mjs"]
