// ai-proposal.provider.ts
import { injectable } from "inversify";
import * as vscode from 'vscode';
import { marked } from 'marked';

@injectable()
export class AIProposalProvider {

	public async showProposal(
		markdownContent: string,
		onAccept: (rawMarkdown: string) => Promise<void>,
		onCancel: () => Promise<void>
	): Promise<void> {

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
			} else if (message.command === 'rejectIntegration') {
				panel.dispose();
				await onCancel();
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
					/* === GENERAL RESET & TYPEFACE === */
					body {
						margin: 0;
						padding: 0;
						font-family: var(--vscode-font-family);
						font-size: var(--vscode-font-size);
						line-height: 1.6;
						color: var(--vscode-editor-foreground);
						background-color: var(--vscode-editor-background);
					}

					.github-markdown-container {
						max-width: 860px;
						margin: 0 auto;
						padding: 2rem 2rem 1rem;
					}

					/* TYPOGRAPHY */
					h1, h2 {
						border-bottom: 1px solid var(--vscode-panel-border);
						padding-bottom: 0.3em;
						margin-top: 24px;
						margin-bottom: 16px;
					}
					h3, h4 { margin-top: 24px; margin-bottom: 16px; }
					h1 { font-size: 2em; }
					h2 { font-size: 1.5em; }
					h3 { font-size: 1.25em; }

					code:not(pre code) {
						background-color: var(--vscode-textCodeBlock-background);
						padding: 0.2em 0.4em;
						border-radius: 4px;
						font-family: var(--vscode-editor-font-family);
						font-size: 0.9em;
						color: var(--vscode-textPreformat-foreground);
					}

					pre {
						background-color: var(--vscode-textCodeBlock-background);
						border-radius: 8px;
						padding: 1.2rem;
						overflow-x: auto;
						margin-bottom: 1.5rem;
						border: 1px solid var(--vscode-widget-border);
						white-space: pre-wrap;
						word-break: break-word;
					}

					pre code {
						font-family: var(--vscode-editor-font-family);
						font-size: 0.9em;
					}

					/* TABLES */
					table {
						width: 100%;
						border-collapse: collapse;
						margin: 1.5rem 0;
						font-size: 0.9em;
						box-shadow: 0 1px 4px rgba(0,0,0,0.03);
					}
					th, td {
						padding: 0.75rem 1rem;
						border: 1px solid var(--vscode-widget-border);
						text-align: left;
					}
					th {
						background-color: var(--vscode-toolbar-hoverBackground);
						font-weight: 600;
					}

					/* === TOGGLE BUTTON === */
					.toggle-btn {
						display: inline-block;
						margin: 0.5rem 0 1rem;
						background: none;
						border: 1px solid var(--vscode-button-background);
						color: var(--vscode-button-background);
						cursor: pointer;
						padding: 6px 16px;
						border-radius: 4px;
						font-size: 13px;
						font-weight: 500;
						transition: background 0.15s, color 0.15s;
					}
					.toggle-btn:hover {
						background: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
					}

					/* === FORMATTED FILES TABLE === */
					.formatted-files {
						margin: 1rem 0 2rem;
						display: none;
						border: 1px solid var(--vscode-widget-border);
						border-radius: 6px;
						overflow: hidden;
					}
					.formatted-files table {
						margin: 0;
						box-shadow: none;
					}
					.formatted-files table td:last-child {
						font-family: var(--vscode-editor-font-family);
						font-size: 0.85em;
						color: var(--vscode-descriptionForeground);
						white-space: nowrap;
						overflow: hidden;
						text-overflow: ellipsis;
						max-width: 300px;
					}

					/* === ACTIONS BAR === */
					.actions-bar {
						position: sticky;
						bottom: 0;
						background: var(--vscode-editor-background);
						border-top: 1px solid var(--vscode-panel-border);
						padding: 16px 2rem;
						display: flex;
						justify-content: flex-end;
						align-items: center;
						gap: 12px;
						margin-top: 2rem;
					}

					button {
						padding: 10px 20px;
						border: none;
						border-radius: 4px;
						font-size: 13px;
						font-weight: 600;
						cursor: pointer;
						transition: opacity 0.15s, background 0.15s;
					}
					button:disabled {
						opacity: 0.5;
						cursor: not-allowed;
					}

					.btn-primary {
						background-color: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
					}
					.btn-primary:hover:not(:disabled) {
						background-color: var(--vscode-button-hoverBackground);
					}

					.btn-secondary {
						background-color: transparent;
						color: var(--vscode-foreground);
						border: 1px solid var(--vscode-button-border, var(--vscode-widget-border));
					}
					.btn-secondary:hover:not(:disabled) {
						background-color: var(--vscode-toolbar-hoverBackground);
					}

					.btn-danger {
						background-color: transparent;
						color: var(--vscode-editorError-foreground);
						border: 1px solid var(--vscode-editorError-foreground);
					}
					.btn-danger:hover:not(:disabled) {
						background-color: var(--vscode-inputValidation-errorBackground);
					}

					/* Reject button specific */
					#rejectBtn {
						margin-right: auto;
					}

					/* SCROLLBAR */
					::-webkit-scrollbar {
						width: 8px;
						height: 8px;
					}
					::-webkit-scrollbar-thumb {
						background-color: var(--vscode-scrollbarSlider-background);
						border-radius: 4px;
					}

				</style>
		</head>
		<body>
				<div class="github-markdown-container">${parsedHtml}</div>

				<div class="actions-bar">
					<button id="rejectBtn" class="btn-danger">Reject</button>
					<button id="acceptBtn" class="btn-primary">Accept &amp; Integrate Code</button>
				</div>

				<script>
						const vscode = acquireVsCodeApi();

						// Enlace de botones
						document.getElementById('acceptBtn').addEventListener('click', () => {
								const btn = document.getElementById('acceptBtn');
								btn.innerText = 'Integrating...';
								btn.disabled = true;
								vscode.postMessage({ command: 'acceptIntegration' });
						});

						document.getElementById('rejectBtn').addEventListener('click', () => {
								vscode.postMessage({ command: 'rejectIntegration' });
						});

						// Toggle del último bloque JSON
						(function() {
								const codeBlocks = document.querySelectorAll('pre code.language-json');
								if (codeBlocks.length === 0) return;
								const lastBlock = codeBlocks[codeBlocks.length - 1];
								const preElement = lastBlock.parentElement;
								if (!preElement) return;

								// Crear botón de toggle
								const toggleBtn = document.createElement('button');
								toggleBtn.className = 'toggle-btn';
								toggleBtn.textContent = 'Show file list';

								// Crear contenedor formateado
								const formattedDiv = document.createElement('div');
								formattedDiv.className = 'formatted-files';
								// Intentar parsear el JSON para mostrarlo como lista de archivos
								try {
										const files = JSON.parse(lastBlock.textContent);
										if (Array.isArray(files)) {
												const table = document.createElement('table');
												table.innerHTML = '<thead><tr><th>File Path</th><th>Preview</th></tr></thead>';
												const tbody = document.createElement('tbody');
												files.forEach(file => {
														const row = document.createElement('tr');
														const pathCell = document.createElement('td');
														pathCell.textContent = file.path;
														const previewCell = document.createElement('td');
														// Mostrar una vista previa (primeras líneas o longitud)
														const content = file.content || '';
														const preview = content.substring(0, 100) + (content.length > 100 ? '...' : '');
														previewCell.textContent = preview;
														row.appendChild(pathCell);
														row.appendChild(previewCell);
														tbody.appendChild(row);
												});
												table.appendChild(tbody);
												formattedDiv.appendChild(table);
										} else {
												formattedDiv.textContent = 'Invalid integration JSON.';
										}
								} catch(e) {
										formattedDiv.textContent = 'Unable to parse JSON.';
								}

								// Insertar elementos después del pre
								preElement.insertAdjacentElement('afterend', toggleBtn);
								toggleBtn.insertAdjacentElement('afterend', formattedDiv);

								// Lógica de toggle
								let showingFormatted = true;
								toggleBtn.addEventListener('click', () => {
										showingFormatted = !showingFormatted;
										if (showingFormatted) {
												preElement.style.display = 'none';
												formattedDiv.style.display = 'block';
												toggleBtn.textContent = 'Show raw JSON';
										} else {
												preElement.style.display = 'block';
												formattedDiv.style.display = 'none';
												toggleBtn.textContent = 'Show file list';
										}
								});
						})();
				</script>
		</body>
		</html>`;
	}
}