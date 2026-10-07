# wwwroot/ fica commitado no repo pra quem roda so o backend localmente sem
# Node instalado, mas nenhuma imagem de deploy deve confiar nesse build
# manual - esse estagio builda o frontend a partir do codigo-fonte e
# sobrescreve o wwwroot/ commitado antes do dotnet publish, garantindo que a
# imagem publicada reflete o frontend/src atual, nao o ultimo commit manual.
FROM node:22-alpine AS frontend-build
WORKDIR /src
COPY frontend/package*.json frontend/
RUN npm ci --prefix frontend
COPY frontend/ frontend/
COPY shared/ shared/
RUN npm run build --prefix frontend

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["Sistema Academico Integrado.csproj", "./"]
RUN dotnet restore "Sistema Academico Integrado.csproj"

COPY . .
COPY --from=frontend-build /src/wwwroot ./wwwroot
RUN dotnet publish "Sistema Academico Integrado.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Sistema Academico Integrado.dll"]
