// src/ioc/container.ts
import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "@IoC/types";
import { FirebaseService } from "@infra/services/firebase.service";
import { SessionService } from "@infra/services/session.service";
import { GithubService } from "@infra/services/github.service";
import { GeminiService } from "@infra/services/gemini.service";
import { QRProvider } from "@infra/providers/qr.provider";
import { VSCodeScannerProvider } from "@infra/providers/vs-code-scanner.provider";
import { VSCodeLoggerService } from "@infra/services/vs-code-logger.service";
import { AIProposalProvider } from "@infra/providers/ai-proposal.provider";

const container = new Container();

container.bind<FirebaseService>(TYPES.FirebaseService).to(FirebaseService).inSingletonScope();
container.bind<QRProvider>(TYPES.UIProvider).to(QRProvider).inSingletonScope();
container.bind<AIProposalProvider>(TYPES.AIProposalProvider).to(AIProposalProvider).inSingletonScope();
container.bind<VSCodeScannerProvider>(TYPES.VSCodeScannerProvider).to(VSCodeScannerProvider).inSingletonScope();
container.bind<SessionService>(TYPES.SessionService).to(SessionService).inSingletonScope();
container.bind<GithubService>(TYPES.GithubService).to(GithubService).inSingletonScope();
container.bind<GeminiService>(TYPES.GeminiService).to(GeminiService).inSingletonScope();
container.bind<VSCodeLoggerService>(TYPES.VSCodeLoggerService).to(VSCodeLoggerService).inSingletonScope();

export { container };