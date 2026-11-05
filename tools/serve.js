const { startServer } = require("../server/server");

const port = Number(process.env.PORT) || 4173;
startServer(port);
