import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import * as QRCode from 'qrcode';
import { TYPES } from '@IoC/types';
import { FirebaseService } from '@infra/services/firebase.service';
import { SessionService } from '@infra/services/session.service';
import { VSCodeLoggerService } from '@infra/services/vs-code-logger.service';
import { IntegrationUseCase } from '@core/use-cases/integration.use-case';
import { QodeSession } from '@entities/qode-session.entity';

@injectable()
export class QRProvider {

	public constructor(
		@inject(TYPES.FirebaseService) private readonly firebase: FirebaseService,
		@inject(TYPES.SessionService) private readonly sessionService: SessionService,
		@inject(TYPES.VSCodeLoggerService) private readonly logger: VSCodeLoggerService,
		@inject(TYPES.IntegrationUseCase) private readonly integrationUseCase: IntegrationUseCase
	) {}

	public async showQRPanel(context: vscode.ExtensionContext): Promise<void> {

		await this.sessionService.clearSession(context);
		const sessionId = await this.sessionService.getOrCreateSessionId(context);

		const panel = vscode.window.createWebviewPanel(
			'qodeQR',
			'Qode: Integrate Gist',
			vscode.ViewColumn.One,
			{ enableScripts: true }
		);

		await this.firebase.createNewSession(sessionId);

		const qrImage = await QRCode.toDataURL(sessionId);
		panel.webview.html = this.getHtmlContent(qrImage, sessionId);

		this.firebase.subscribeToSession(sessionId, async (data: QodeSession) => {

			if (data?.status === 'GIST_RECEIVED' && data.gistIds?.length > 0) {
				this.logger.info(`Session ${sessionId}: gists received. Launching integration...`);
				panel.dispose();
				await this.integrationUseCase.execute({ ...data, id: sessionId });
			}

			if (data?.status === 'DONE') {
				await this.sessionService.clearSession(context);
			}

		});

	}

	private getHtmlContent(qrImage: string, sessionId: string): string {

		return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>QR Scanner</title>
			<style>
				body { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; }
				img { width: 300px; height: 300px; margin-bottom: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
				p { color: var(--vscode-descriptionForeground); font-size: 1.2rem; }
			</style>
		</head>
		<body>
			<h2>Scan to connect Qode App</h2>
			<img src="${qrImage}" alt="QR Code">
			<p>Session: ${sessionId}</p>
		</body>
		</html>`;

	}

}
