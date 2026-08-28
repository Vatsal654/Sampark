# Purpose: Production container build for the Sampark backend API.
# Multi-stage: build with full devDependencies, ship a minimal runtime image.

FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared-config/package.json packages/shared-config/package.json
COPY packages/shared-security/package.json packages/shared-security/package.json
COPY packages/api-contracts/package.json packages/api-contracts/package.json
COPY services/api/package.json services/api/package.json
RUN npm ci
COPY packages packages
COPY services/api services/api
COPY tsconfig.base.json tsconfig.base.json
RUN npm run build --workspace @sampark/shared-config \
  && npm run build --workspace @sampark/shared-security \
  && npm run build --workspace @sampark/api-contracts \
  && npm run build --workspace @sampark/api

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json package.json
COPY --from=build /app/packages packages
COPY --from=build /app/services/api/dist services/api/dist
COPY --from=build /app/services/api/package.json services/api/package.json
EXPOSE 3001
CMD ["node", "services/api/dist/main.js"]
