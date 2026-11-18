FROM oven/bun:1.4.4
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build && mkdir -p /data && chown bun:bun /data
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh
ENV PORT=3299
ENV HOST=0.0.0.0
ENV NODE_ENV=production
EXPOSE 3299
ENTRYPOINT ["/entrypoint.sh"]
CMD ["bun", "scripts/start.ts"]
