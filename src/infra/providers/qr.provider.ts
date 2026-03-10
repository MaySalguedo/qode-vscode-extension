// src/infra/ui/QRProvider.ts
import { injectable, inject } from "inversify";
import * as vscode from 'vscode';
import * as QRCode from 'qrcode';
import { TYPES } from "@IoC/types";
import { FirebaseService } from "@infra/services/firebase.service";
import { SessionService } from "@infra/services/session.service";
import { GithubService } from "@infra/services/github.service";
import { VSCodeScannerProvider } from "@infra/providers/vs-code-scanner.provider";
import { VSCodeLoggerService } from "@infra/services/vs-code-logger.service";
import { AIProposalProvider } from "@infra/providers/ai-proposal.provider";
import { GeminiService } from "@infra/services/gemini.service";
import { AxiosResponse } from "axios";
import { Gist } from '@entities/gist.entity';
import { GistFile } from '@models/gist-file.model';
import { QodeSession } from "@entities/qode-session.entity";

@injectable()
export class QRProvider {

	public constructor(

		@inject(TYPES.FirebaseService) private firebase: FirebaseService,
		@inject(TYPES.SessionService) private sessionService: SessionService,
		@inject(TYPES.GithubService) private githubService: GithubService,
		@inject(TYPES.VSCodeScannerProvider) private scannerProvider: VSCodeScannerProvider,
		@inject(TYPES.VSCodeLoggerService) private loggerService: VSCodeLoggerService,
		@inject(TYPES.AIProposalProvider) private aiProposalProvider: AIProposalProvider,
		@inject(TYPES.GeminiService) private geminiService: GeminiService

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

		this.firebase.subscribeToSession(sessionId, async (data) => {

			if (data && data.status === 'GIST_RECEIVED' && data.gistIds) {

				await this.handleRecived(data);

			}

		});

	}

	private async handleRecived(data: QodeSession): Promise<void> {

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Qode Integrator",
			cancellable: false
		}, async (progress) => {

			try {

				this.loggerService.info("Initializing paralel download and workspace scanning.");

				const [gists, localFiles] = await Promise.all([

					this.getGists(data.gistIds),
					this.scannerProvider.scanWorkspace()

				]);

				this.loggerService.info(`Download completed. ${localFiles.length} local files read.`);

				progress.report({ increment: 50, message: "Analizing code with Gemini..." });
				this.loggerService.info("Sending workspace context to Gemini");

				const aiResponse = await this.geminiService.generateIntegrationProposal(gists, localFiles);

				progress.report({ increment: 50, message: "Analisis completed!" });
				this.loggerService.info("AI response recieved succesfully. Waiting for user confirmation.");

				await this.aiProposalProvider.showProposal(aiResponse, async (rawMarkdown) => {
					await this.applyIntegration(rawMarkdown);
				});

			} catch (error) {
				this.loggerService.error("Failed during process.", error);
				vscode.window.showErrorMessage("Qode: An error has accured. Review Output panel to show details.");
				console.log(error);
			}

		});

	}

	private async getGists(ids: Array<string>): Promise<Array<Gist>> {

		const promises = ids.map(id => this.githubService.getGist(id));

		const responses = await Promise.all(promises);

		return responses.map(response => response.data);

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

	private async applyIntegration(markdownContext: string): Promise<void> {
		this.loggerService.info("Starting file writing process...");

		const jsonMatch = markdownContext.match(/```json\n([\s\S]*?)\n```/);

		if (!jsonMatch || !jsonMatch[1]) {
			throw new Error("No structured JSON block found in the AI response.");
		}

		const filesToModify: {path: string, content: string}[] = JSON.parse(jsonMatch[1]);
		const workspaceRoot = vscode.workspace.workspaceFolders![0].uri;

		const writePromises = filesToModify.map(file => {
			const fileUri = vscode.Uri.joinPath(workspaceRoot, file.path);
			const contentBuffer = Buffer.from(file.content, 'utf8');
			return vscode.workspace.fs.writeFile(fileUri, contentBuffer);
		});

		await Promise.all(writePromises);

		this.loggerService.info(`Integration successful! Modified ${filesToModify.length} files.`);
		vscode.window.showInformationMessage(`Qode: Integration successful! Modified ${filesToModify.length} files.`);
	}

}