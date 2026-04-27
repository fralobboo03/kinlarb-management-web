# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Run stage
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist/kinlarb-management-web ./dist/kinlarb-management-web
COPY package.json ./
# Since we are just running the built server.mjs, we don't strictly need node_modules for production
# But we may need it if there are server-only dependencies not bundled.
# Usually Angular SSR bundles everything needed into server.mjs, so running it directly works.
EXPOSE 4000
ENV PORT=4000
CMD ["node", "dist/kinlarb-management-web/server/server.mjs"]
