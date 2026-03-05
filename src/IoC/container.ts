// src/ioc/container.ts
import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "@IoC/types";
import { FirebaseService } from "@infra/services/firebase.service";
import { SessionService } from "@infra/services/session.service";
import { QRProvider } from "@infra/providers/qr.provider";
// import { VSCodeScanner } from "@infra/providers/scanner/VSCodeScanner";

const container = new Container();

container.bind<FirebaseService>(TYPES.FirebaseService).to(FirebaseService).inSingletonScope();
container.bind<QRProvider>(TYPES.UIProvider).to(QRProvider).inSingletonScope();
container.bind<SessionService>(TYPES.SessionService).to(SessionService).inSingletonScope();

// Configuramos como Singletons (.inSingletonScope())
// container.bind(TYPES.Scanner).to(VSCodeScanner).inSingletonScope();

export { container };