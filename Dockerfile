FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_URL=""
ARG VITE_APP_ENV=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_ENV=$VITE_APP_ENV

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# normally 80, but we want to avoid conflicts with other services
# EXPOSE 81 
CMD ["nginx", "-g", "daemon off;"]
