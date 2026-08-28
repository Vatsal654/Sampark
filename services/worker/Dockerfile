# Purpose: Production container build for the Sampark background worker.
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared-config/package.json packages/shared-config/package.json
COPY packages/shared-security/package.json packages/shared-security/package.json
COPY packages/api-contracts/package.json packages/api-contracts/package.json
COPY services/worker/package.json services/worker/package.json
RUN npm ci
COPY packages packages
COPY services/worker services/worker
COPY tsconfig.base.json tsconfig.base.json
RUN npm run build --workspace @sampark/shared-config \
  && npm run build --workspace @sampark/shared-security \
  && npm run build --workspace @sampark/api-contracts \
  && npm run build --workspace @sampark/worker

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json package.json
COPY --from=build /app/packages packages
COPY --from=build /app/services/worker/dist services/worker/dist
COPY --from=build /app/services/worker/package.json services/worker/package.json
CMD ["node", "services/worker/dist/main.js"]
