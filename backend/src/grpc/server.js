import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";
import { processHandler } from "./handlers/processHandler.js";

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load protobuf definition
const PROTO_PATH = path.join(__dirname, "../../proto/microservice.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const microservicePackage = protoDescriptor["microservice"]?.v1;

if (!microservicePackage || !microservicePackage.MicroserviceAPI) {
  console.error("[gRPC Server] Failed to load MicroserviceAPI from proto definition");
}

export function startGrpcServer() {
  const server = new grpc.Server();

  // Register service with Process handler
  server.addService(microservicePackage.MicroserviceAPI.service, {
    Process: processHandler,
  });

  const grpcPort = process.env.GRPC_PORT || "50051";
  const bindAddress = `0.0.0.0:${grpcPort}`;

  server.bindAsync(
    bindAddress,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error("[gRPC Server] Failed to bind:", err.message);
        return;
      }

      console.log(`[gRPC Server] Listening on ${bindAddress}`);
      server.start();
    }
  );

  return server;
}


