// src/infra/providers/ai-proposal.provider.ts
import { injectable } from "inversify";
import * as vscode from 'vscode';
import { marked } from 'marked';

@injectable()
export class AIProposalProvider {

	public async showProposal(markdownContent: string, onAccept: (markdown: string) => Promise<void>): Promise<void> {

		const panel = vscode.window.createWebviewPanel(
			'qodeAIProposal',
			'Qode: AI Integration Proposal',
			vscode.ViewColumn.Two, 
			{ enableScripts: true }
		);

		const htmlContent = await marked.parse(markdownContent);

		panel.webview.html = this.getWebviewContent(htmlContent);

		panel.webview.onDidReceiveMessage(async (message) => {
			if (message.command === 'acceptIntegration') {
				panel.dispose();
				await onAccept(markdownContent);
			}
		});

	}

	private getWebviewContent(parsedHtml: string): string {

		return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>AI Proposal</title>
			<style>

				body {
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, var(--vscode-font-family);
					font-size: 16px;
					line-height: 1.5;
					word-wrap: break-word;
					color: var(--vscode-editor-foreground);
					background-color: var(--vscode-editor-background);
					padding: 20px;
					overflow-x: hidden;
				}

				p, h1, h2, h3, h4, h5, h6, ul, ol, pre, blockquote, table {
					text-align: left !important;
				}

				h1, h2 {
					padding-bottom: 0.3em;
					border-bottom: 1px solid var(--vscode-panel-border);
					margin-top: 24px;
					margin-bottom: 16px;
					font-weight: 600;
					color: var(--vscode-textLink-foreground);
				}

				h3, h4, h5, h6 {
					margin-top: 24px;
					margin-bottom: 16px;
					font-weight: 600;
					color: var(--vscode-textLink-foreground);
				}

				table {
					display: block; 
					width: 100%;
					overflow-x: auto;
					border-spacing: 0;
					border-collapse: collapse;
					margin-top: 0;
					margin-bottom: 16px;
				}

				table th, table td {
					padding: 6px 13px;
					border: 1px solid var(--vscode-widget-border);
				}

				table tr {
					background-color: var(--vscode-editor-background);
					border-top: 1px solid var(--vscode-widget-border);
				}

				table tr:nth-child(2n) {
					background-color: var(--vscode-textCodeBlock-background);
				}

				pre {
					background-color: var(--vscode-textCodeBlock-background);
					border-radius: 6px;
					padding: 16px;
					overflow-x: auto;
					font-size: 85%;
					line-height: 1.45;
					margin-bottom: 16px;
					word-wrap: normal;
					white-space: pre;
					border: 1px solid var(--vscode-widget-border);
				}

				pre code {
					background-color: transparent;
					padding: 0;
					border-radius: 0;
					word-break: normal;
					white-space: pre;
					font-family: var(--vscode-editor-font-family);
					color: var(--vscode-textPreformat-foreground);
				}

				code:not(pre code) {
					padding: 0.2em 0.4em;
					margin: 0;
					font-size: 85%;
					background-color: var(--vscode-textCodeBlock-background);
					border-radius: 6px;
					font-family: var(--vscode-editor-font-family);
					color: var(--vscode-textPreformat-foreground);
				}

				img {
					max-width: 100%;
					box-sizing: content-box;
					display: inline-block;
					height: auto;
				}

				ul, ol {
					padding-left: 2em;
					margin-bottom: 16px;
				}

				blockquote {
					padding: 0 1em;
					color: var(--vscode-descriptionForeground);
					border-left: 0.25em solid var(--vscode-textLink-foreground);
					margin: 0 0 16px 0;
				}

				/* Estilos para el botón de acciones */
				.actions-bar {
					position: sticky;
					bottom: 0;
					background: var(--vscode-editor-background);
					padding: 15px 0;
					border-top: 1px solid var(--vscode-panel-border);
					text-align: right;
					margin-top: 30px;
				}
				.btn-primary {
					background-color: var(--vscode-button-background);
					color: var(--vscode-button-foreground);
					border: none;
					padding: 10px 20px;
					font-size: 14px;
					border-radius: 4px;
					cursor: pointer;
					font-weight: 600;
				}
				.btn-primary:hover {
					background-color: var(--vscode-button-hoverBackground);
				}

			</style>
		</head>
		<body>
			
			<div class="github-markdown-container">
				${parsedHtml}
			</div>

			<div class="actions-bar">
				<button id="acceptBtn" class="btn-primary">Accept & Integrate Code</button>
			</div>

			<script>
				const vscode = acquireVsCodeApi();
				
				document.getElementById('acceptBtn').addEventListener('click', () => {
					const btn = document.getElementById('acceptBtn');
					btn.innerText = 'Integrating...';
					btn.disabled = true;
					
					// Enviar el evento de vuelta a la extensión
					vscode.postMessage({ command: 'acceptIntegration' });
				});
			</script>

		</body>
		</html>`;

	}

}