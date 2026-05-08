import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import { TYPES } from '@IoC/types';
import { QodeSession } from '@entities/qode-session.entity';
import { FirebaseService } from '@infra/services/firebase.service';
import { GithubService } from '@infra/services/github.service';
import { GeminiService } from '@infra/services/gemini.service';
import { GetPracticesSkill } from '../skills/get-practices.skill';
import { ContextSelectorProvider } from '@infra/providers/context-selector.provider';
import { AIProposalProvider } from '@infra/providers/ai-proposal.provider';
import { VSCodeLoggerService } from '@infra/services/vs-code-logger.service';

@injectable()
export class IntegrationUseCase {

	public constructor(
		@inject(TYPES.FirebaseService) private readonly firebaseService: FirebaseService,
		@inject(TYPES.GithubService) private readonly githubService: GithubService,
		@inject(TYPES.GeminiService) private readonly geminiService: GeminiService,
		@inject(TYPES.GetPracticesSkill) private readonly practicesSkill: GetPracticesSkill,
		@inject(TYPES.ContextSelectorProvider) private readonly contextSelector: ContextSelectorProvider,
		@inject(TYPES.AIProposalProvider) private readonly aiProposal: AIProposalProvider,
		@inject(TYPES.VSCodeLoggerService) private readonly logger: VSCodeLoggerService
	) {}

	public async execute(session: QodeSession): Promise<void> {

		this.logger.info('Opening context file selector for the user.');

		const localFiles = await this.contextSelector.selectFiles();

		if (!localFiles) {
			this.logger.info('User cancelled the context selector. Integration aborted.');
			return;
		}

		this.logger.info(`User selected ${localFiles.length} file(s) as context.`);

		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Qode Integrator',
			cancellable: false
		}, async (progress) => {

			try {

				this.logger.info('Starting gist download in parallel with context already provided.');
				progress.report({ increment: 20, message: `Downloading gists for session ${session.id}…` });

				const gists = await this.githubService.getGists(session.gistIds);

				this.logger.info(`Download completed. Sending ${localFiles.length} local file(s) to Gemini.`);
				progress.report({ increment: 30, message: 'Analyzing with Gemini (agentic mode)…' });

				await this.firebaseService.updateSessionData(session.id, { status: 'ANALYZING' });

				const aiResponse = await this.geminiService.generateIntegrationProposal(
					gists,
					localFiles,
					session.practicesIds ?? [],
					async (toolName, args) => {

						this.logger.info(`Agent invoked tool: "${toolName}" | args: ${JSON.stringify(args)}`);

						if (toolName === GetPracticesSkill.TOOL_NAME) {
							const { ids } = args as { ids: string[] };
							const configs = await this.practicesSkill.execute(ids);
							this.logger.info(`Tool "${toolName}" returned ${configs.length} practice config(s).`);
							return configs;
						}

						throw new Error(`Unknown tool invoked by agent: "${toolName}"`);

					}
				);

				progress.report({ increment: 50, message: 'Analysis complete — awaiting your review…' });
				this.logger.info('AI response received. Showing proposal to user.');

				await this.aiProposal.showProposal(aiResponse, async (rawMarkdown) => {
					await this.applyIntegration(rawMarkdown);
					await this.firebaseService.updateSessionData(session.id, { status: 'DONE' });
				}, async () => {
					vscode.window.showInformationMessage('Integration rejected. No changes were made.');
					await this.firebaseService.updateSessionData(session.id, { status: 'REJECTED' });
				});

			} catch (error) {

				await this.firebaseService.updateSessionData(session.id, { status: 'FAILED' });
				const err = error instanceof Error ? error : new Error(String(error));
				this.logger.error(`Integration process failed: ${err.message}\n${err.stack}`);
				vscode.window.showErrorMessage('Qode: An error occurred. Check the Output panel for details.');

			}

		});

	}

	private async applyIntegration(markdownContext: string): Promise<void> {

		this.logger.info('Starting file writing process…');

		const lastBlock = this.extractLastJsonBlock(markdownContext);

		if (!lastBlock) {
			throw new Error('No structured JSON block found in the AI response.');
		}

		let filesToModify: { path: string; content: string }[];
		try {
			filesToModify = JSON.parse(lastBlock);
		} catch (parseError) {
			this.logger.error(`Failed to parse integration JSON. Content: ${lastBlock.substring(0, 200)}`);
			throw new Error('The integration JSON is malformed. Check the AI response.');
		}
		const workspaceRoot = vscode.workspace.workspaceFolders![0].uri;

		await Promise.all(
			filesToModify.map(file => {
				const fileUri = vscode.Uri.joinPath(workspaceRoot, file.path);
				return vscode.workspace.fs.writeFile(fileUri, Buffer.from(file.content, 'utf8'));
			})
		);

		this.logger.info(`Integration successful! Modified ${filesToModify.length} file(s).`);
		vscode.window.showInformationMessage(
			`Qode: Integration successful! Modified ${filesToModify.length} file(s).`
		);

	}

	private extractLastJsonBlock(markdown: string): string | null {
		const opening = '```json';
		const closing = '```';

		const startIndex = markdown.lastIndexOf(opening);
		if (startIndex === -1) return null;

		// Move past the opening delimiter and any newline/spaces
		let contentStart = startIndex + opening.length;
		while (contentStart < markdown.length && /[\s]/.test(markdown[contentStart])) {
			contentStart++;
		}

		// The closing backticks are the LAST triple backticks in the whole message
		const endIndex = markdown.lastIndexOf(closing);
		if (endIndex === -1 || endIndex <= contentStart) return null;

		const jsonContent = markdown.substring(contentStart, endIndex).trim();
		return jsonContent || null;
	}

}