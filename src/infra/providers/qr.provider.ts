// src/infra/ui/QRProvider.ts
import { injectable, inject } from "inversify";
import * as vscode from 'vscode';
import * as QRCode from 'qrcode';
import { TYPES } from "@IoC/types";
import { FirebaseService } from "@infra/services/firebase.service";

@injectable()
export class QRProvider {
	public constructor(

		@inject(TYPES.FirebaseService) private firebase: FirebaseService,
		@inject(TYPES.SessionService) private sessionService: SessionService

	) {}

	public async showQRPanel(context: vscode.ExtensionContext) {
		const sessionId = await this.sessionService.getOrCreateSessionId(context);
		const panel = vscode.window.createWebviewPanel(
			'qodeQR', 'Qode: Integrate Gist',
			vscode.ViewColumn.One, { enableScripts: true }
		);

		await this.firebase.createNewSession(sessionId);

		const qrImage = await QRCode.toDataURL(sessionId);

		panel.webview.html = this.getHtmlContent(qrImage, sessionId);

		this.firebase.subscribeToSession(sessionId, (data) => {
			if (data.status === 'GIST_RECEIVED') {

				vscode.window.showInformationMessage('¡Analizing Gist!');

				

			}
		});
	}

	private getHtmlContent(qr: string, id: string): string {
		return `<html><body>
			<h1>Escanea con tu App Qode</h1>
			<img src="${qr}" />
			<p>Session ID: <code>${id}</code></p>
		</body></html>`;
	}
}