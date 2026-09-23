FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["Sistema Academico Integrado.csproj", "./"]
RUN dotnet restore "Sistema Academico Integrado.csproj"

COPY . .
RUN dotnet publish "Sistema Academico Integrado.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Sistema Academico Integrado.dll"]
