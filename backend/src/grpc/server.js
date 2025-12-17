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

console.log("[gRPC Server] Loading proto file:", PROTO_PATH);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

// Verify package loaded correctly
if (!protoDescriptor.microservice) {
  throw new Error('[gRPC Server] ❌ Proto package "microservice" not found');
}

if (!protoDescriptor.microservice.v1) {
  throw new Error('[gRPC Server] ❌ Proto package version "v1" not found');
}

if (!protoDescriptor.microservice.v1.MicroserviceAPI) {
  throw new Error('[gRPC Server] ❌ Proto service "MicroserviceAPI" not found');
}

const microservicePackage = protoDescriptor.microservice.v1;

console.log("[gRPC Server] ✅ Proto loaded successfully");
console.log("[gRPC Server]   - Package: microservice.v1");
console.log("[gRPC Server]   - Service: MicroserviceAPI");
console.log("[gRPC Server]   - Methods:", Object.keys(microservicePackage.MicroserviceAPI.service || {}));

export function startGrpcServer() {
  console.log("[gRPC Server] 🚀 Starting gRPC server...");
  
  const server = new grpc.Server();

  // Register service with Process handler
  console.log("[gRPC Server] 📝 Registering Process handler...");
  server.addService(microservicePackage.MicroserviceAPI.service, {
    Process: processHandler,
  });
  console.log("[gRPC Server] ✅ Process handler registered");

  const grpcPort = process.env.GRPC_PORT || "50051";
  const bindAddress = `0.0.0.0:${grpcPort}`;

  console.log(`[gRPC Server] 🔌 Binding to ${bindAddress}...`);

  server.bindAsync(
    bindAddress,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error("[gRPC Server] ❌ Failed to bind:", err.message);
        console.error("[gRPC Server] ❌ Error details:", err);
        return;
      }

      console.log(`[gRPC Server] ✅ Successfully bound to ${bindAddress}`);
      console.log(`[gRPC Server] ✅ Server started on port ${port}`);
      console.log(`[gRPC Server] ✅ Ready to accept gRPC connections`);
      server.start();
    }
  );

  return server;
}


