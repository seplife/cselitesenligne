# Construit le frontend puis le sert avec nginx.
# L'URL de l'API est injectée au moment du build via VITE_API_URL
# (docker-compose la passe automatiquement — voir docker-compose.yml).

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
