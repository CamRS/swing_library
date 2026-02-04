import { config } from "./config";
import { buildApp } from "./app";

const app = await buildApp();

app.listen({ host: config.host, port: config.port }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
