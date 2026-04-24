import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '@IoC/types';

import { FirebaseService } from '@infra/services/firebase.service';
import { SessionService } from '@infra/services/session.service';
import { GithubService } from '@infra/services/github.service';
import { GeminiService } from '@infra/services/gemini.service';
import { VSCodeLoggerService } from '@infra/services/vs-code-logger.service';

import { QRProvider } from '@infra/providers/qr.provider';
import { AIProposalProvider } from '@infra/providers/ai-proposal.provider';
import { VSCodeScannerProvider } from '@infra/providers/vs-code-scanner.provider';
import { ContextSelectorProvider } from '@infra/providers/context-selector.provider';

import { GetPracticesSkill } from '@core/skills/get-practices.skill';

import { IntegrationUseCase } from '@core/use-cases/integration.use-case';

const container = new Container();

container.bind<FirebaseService>(TYPES.FirebaseService).to(FirebaseService).inSingletonScope();
container.bind<SessionService>(TYPES.SessionService).to(SessionService).inSingletonScope();
container.bind<GithubService>(TYPES.GithubService).to(GithubService).inSingletonScope();
container.bind<GeminiService>(TYPES.GeminiService).to(GeminiService).inSingletonScope();
container.bind<VSCodeLoggerService>(TYPES.VSCodeLoggerService).to(VSCodeLoggerService).inSingletonScope();

container.bind<QRProvider>(TYPES.UIProvider).to(QRProvider).inSingletonScope();
container.bind<AIProposalProvider>(TYPES.AIProposalProvider).to(AIProposalProvider).inSingletonScope();
container.bind<VSCodeScannerProvider>(TYPES.VSCodeScannerProvider).to(VSCodeScannerProvider).inSingletonScope();
container.bind<ContextSelectorProvider>(TYPES.ContextSelectorProvider).to(ContextSelectorProvider).inSingletonScope();

container.bind<GetPracticesSkill>(TYPES.GetPracticesSkill).to(GetPracticesSkill).inSingletonScope();

container.bind<IntegrationUseCase>(TYPES.IntegrationUseCase).to(IntegrationUseCase).inSingletonScope();

export { container };
