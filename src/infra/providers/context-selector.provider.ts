import { injectable } from 'inversify';
import * as vscode from 'vscode';
import * as path from 'path';
import { ProjectFile } from '@models/project-file.model';

interface FileNode {
	relativePath: string;
	name:				 string;
	sizeBytes:		number;
	uri:					vscode.Uri;
}

interface TreeNode {
	name:		 string;
	fullPath: string;
	file?:		FileNode;
	children: Map<string, TreeNode>;
}

@injectable()
export class ContextSelectorProvider {

	public static readonly MAX_CONTEXT_BYTES = 512_000;

	private static readonly EXCLUDE_PATTERN = '**/{node_modules,.git,dist,out,build,bin,obj,venv,.venv,target,.idea,.next,.nuxt,coverage}/**';

	public async selectFiles(): Promise<Array<ProjectFile> | null> {

		const workspaceFolders = vscode.workspace.workspaceFolders;

		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showWarningMessage('Qode: No workspace is open.');
			return null;
		}

		const workspaceRoot = workspaceFolders[0].uri;
		const fileNodes		 = await this.scanWorkspace(workspaceRoot);

		if (fileNodes.length === 0) {
			vscode.window.showWarningMessage('Qode: No scannable files found in the workspace.');
			return null;
		}

		const tree		= this.buildTree(fileNodes);
		const treeJson = JSON.stringify(this.serializeTree(tree));

		return new Promise<ProjectFile[] | null>((resolve) => {

			const panel = vscode.window.createWebviewPanel(
				'qodeContextSelector',
				'Qode · Select Context Files',
				vscode.ViewColumn.One,
				{ enableScripts: true }
			);

			panel.webview.html = this.buildHtml(treeJson, ContextSelectorProvider.MAX_CONTEXT_BYTES);

			panel.webview.onDidReceiveMessage(async (message) => {

				if (message.command === 'confirm') {

					panel.dispose();
					const selectedPaths: string[] = message.paths;
					const projectFiles = await this.loadFiles(workspaceRoot, fileNodes, selectedPaths);
					resolve(projectFiles);

				} else if (message.command === 'cancel') {

					panel.dispose();
					resolve(null);

				}

			});

			//panel.onDidDispose(() => resolve(null));

		});

	}

	private async scanWorkspace(workspaceRoot: vscode.Uri): Promise<Array<FileNode>> {

		const include = new vscode.RelativePattern(workspaceRoot, '**/*');
		const exclude = new vscode.RelativePattern(workspaceRoot, ContextSelectorProvider.EXCLUDE_PATTERN);

		const uris = await vscode.workspace.findFiles(include, exclude, 2000);

		const nodes = await Promise.all(
			uris.map(async (uri): Promise<FileNode | null> => {

				try {
					const stat = await vscode.workspace.fs.stat(uri);

					if (stat.type !== vscode.FileType.File) return null;

					return {
						relativePath: vscode.workspace.asRelativePath(uri, false),
						name:				 path.basename(uri.fsPath),
						sizeBytes:		stat.size,
						uri,
					};

				} catch {
					return null;
				}

			})
		);

		return nodes.filter((n) => n !== null);

	}

	private async loadFiles(

		workspaceRoot: vscode.Uri,
		allNodes: Array<FileNode>,
		selectedPaths: Array<string>

	): Promise<Array<ProjectFile>> {

		const pathSet = new Set(selectedPaths);
		const chosen	= allNodes.filter(n => pathSet.has(n.relativePath));

		const results = await Promise.all(
			chosen.map(async (node): Promise<ProjectFile | null> => {
				try {
					const bytes	 = await vscode.workspace.fs.readFile(node.uri);
					const content = Buffer.from(bytes).toString('utf8');
					return { relativePath: node.relativePath, content };
				} catch {
					return null;
				}
			})
		);

		return results.filter((f) => f !== null);

	}

	private buildTree(files: Array<FileNode>): TreeNode {

		const root: TreeNode = { name: '', fullPath: '', children: new Map() };

		for (const file of files) {

			const parts = file.relativePath.split('/');
			let node		= root;

			for (let i = 0; i < parts.length; i++) {

				const part = parts[i];
				const isLeaf = i === parts.length - 1;

				if (!node.children.has(part)) {
					node.children.set(part, {
						name:part,
						fullPath: parts.slice(0, i + 1).join('/'),
						children: new Map(),
					});
				}

				node = node.children.get(part)!;

				if (isLeaf) {
					node.file = file;
				}

			}

		}

		return root;

	}

	private serializeTree(node: TreeNode): object {

		return {
			name: node.name,
			fullPath: node.fullPath,
			size: node.file?.sizeBytes ?? null,
			children: [...node.children.values()].map(c => this.serializeTree(c)),
		};

	}

	private buildHtml(treeJson: string, maxBytes: number): string {

		return /* html */ `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Select Context Files</title>
				<style>
					*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

					body {
						font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
						font-size: 13px;
						color: var(--vscode-editor-foreground);
						background: var(--vscode-editor-background);
						display: flex;
						flex-direction: column;
						height: 100vh;
						overflow: hidden;
					}

					/* ── Header ── */
					header {
						padding: 16px 20px 12px;
						border-bottom: 1px solid var(--vscode-panel-border);
						flex-shrink: 0;
					}
					header h1 {
						font-size: 15px;
						font-weight: 600;
						color: var(--vscode-textLink-foreground);
						margin-bottom: 4px;
					}
					header p {
						font-size: 12px;
						color: var(--vscode-descriptionForeground);
					}

					/* ── Toolbar ── */
					.toolbar {
						display: flex;
						align-items: center;
						gap: 8px;
						padding: 8px 20px;
						border-bottom: 1px solid var(--vscode-panel-border);
						flex-shrink: 0;
					}
					.toolbar input[type="text"] {
						flex: 1;
						background: var(--vscode-input-background);
						color: var(--vscode-input-foreground);
						border: 1px solid var(--vscode-input-border, transparent);
						border-radius: 4px;
						padding: 5px 10px;
						font-size: 12px;
						outline: none;
					}
					.toolbar input[type="text"]:focus {
						border-color: var(--vscode-focusBorder);
					}
					.btn-ghost {
						background: transparent;
						color: var(--vscode-textLink-foreground);
						border: 1px solid var(--vscode-textLink-foreground);
						border-radius: 4px;
						padding: 4px 10px;
						font-size: 12px;
						cursor: pointer;
						white-space: nowrap;
					}
					.btn-ghost:hover { opacity: 0.8; }

					/* ── File Tree ── */
					.tree-container {
						flex: 1;
						overflow-y: auto;
						padding: 8px 12px;
					}
					.tree-container::-webkit-scrollbar { width: 6px; }
					.tree-container::-webkit-scrollbar-thumb {
						background: var(--vscode-scrollbarSlider-background);
						border-radius: 3px;
					}

					ul.tree { list-style: none; padding-left: 0; }
					ul.tree ul { padding-left: 18px; }

					.tree-item {
						display: flex;
						align-items: center;
						gap: 6px;
						padding: 3px 6px;
						border-radius: 4px;
						cursor: pointer;
						user-select: none;
					}
					.tree-item:hover { background: var(--vscode-list-hoverBackground); }

					.tree-item input[type="checkbox"] {
						width: 14px; height: 14px;
						accent-color: var(--vscode-checkbox-background, #0078d4);
						cursor: pointer;
						flex-shrink: 0;
					}

					.tree-item .icon { font-size: 14px; flex-shrink: 0; }
					.tree-item .label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
					.tree-item .size-badge {
						font-size: 10px;
						color: var(--vscode-descriptionForeground);
						flex-shrink: 0;
						font-family: var(--vscode-editor-font-family, monospace);
					}

					.folder-toggle { cursor: pointer; flex-shrink: 0; }

					/* ── Footer ── */
					footer {
						flex-shrink: 0;
						border-top: 1px solid var(--vscode-panel-border);
						padding: 12px 20px;
						background: var(--vscode-editor-background);
					}

					.meter-row {
						display: flex;
						align-items: center;
						justify-content: space-between;
						margin-bottom: 6px;
					}
					.meter-label { font-size: 12px; color: var(--vscode-descriptionForeground); }
					.meter-count { font-size: 12px; font-weight: 600; }
					.meter-count.ok		 { color: var(--vscode-textLink-foreground); }
					.meter-count.warn	 { color: #f0ad4e; }
					.meter-count.over	 { color: var(--vscode-errorForeground, #f44); }

					.progress-bar-track {
						width: 100%;
						height: 6px;
						background: var(--vscode-progressBar-background, #333);
						border-radius: 3px;
						overflow: hidden;
						margin-bottom: 10px;
					}
					.progress-bar-fill {
						height: 100%;
						border-radius: 3px;
						transition: width 0.2s, background-color 0.2s;
					}

					.actions {
						display: flex;
						justify-content: flex-end;
						gap: 10px;
					}
					.btn-cancel {
						background: transparent;
						color: var(--vscode-button-secondaryForeground, #ccc);
						border: 1px solid var(--vscode-button-secondaryBackground, #555);
						border-radius: 4px;
						padding: 7px 18px;
						font-size: 13px;
						cursor: pointer;
					}
					.btn-confirm {
						background: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						border: none;
						border-radius: 4px;
						padding: 7px 18px;
						font-size: 13px;
						font-weight: 600;
						cursor: pointer;
					}
					.btn-confirm:disabled {
						opacity: 0.4;
						cursor: not-allowed;
					}
					.btn-confirm:not(:disabled):hover { background: var(--vscode-button-hoverBackground); }

					.warning-msg {
						font-size: 11px;
						color: var(--vscode-errorForeground, #f44);
						margin-bottom: 6px;
						min-height: 14px;
					}
				</style>
			</head>
			<body>

			<header>
				<h1>📁 Select Context Files</h1>
				<p>Choose the files Qode will send as context to the AI agent. Keep the total size under the limit.</p>
			</header>

			<div class="toolbar">
				<input type="text" id="search" placeholder="Filter files…" oninput="filterTree(this.value)">
				<button class="btn-ghost" onclick="selectAll(true)">Select All</button>
				<button class="btn-ghost" onclick="selectAll(false)">Clear</button>
			</div>

			<div class="tree-container">
				<ul class="tree" id="tree-root"></ul>
			</div>

			<footer>
				<div class="meter-row">
					<span class="meter-label">Context size</span>
					<span class="meter-count ok" id="size-label">0 B / ${formatBytes(maxBytes)}</span>
				</div>
				<div class="progress-bar-track">
					<div class="progress-bar-fill" id="progress-fill" style="width:0%;background:#4caf50"></div>
				</div>
				<div class="warning-msg" id="warning-msg"></div>
				<div class="actions">
					<button class="btn-cancel" onclick="cancel()">Cancel</button>
					<button class="btn-confirm" id="confirm-btn" disabled onclick="confirm()">
						Analyze with Qode →
					</button>
				</div>
			</footer>

			<script>
				const vscode	 = acquireVsCodeApi();
				const MAX			= ${maxBytes};
				const RAW_TREE = ${treeJson};

				// ── State ────────────────────────────────────────────────────────────────
				// Map<relativePath, sizeBytes> for all file nodes
				const FILE_SIZES = {};
				// Set of checked relativePaths
				const checked = new Set();

				// ── Tree Rendering ────────────────────────────────────────────────────────

				function collectFiles(node) {
					if (node.size !== null) FILE_SIZES[node.fullPath] = node.size;
					(node.children || []).forEach(collectFiles);
				}

				function renderTree(nodes, parent) {
					const ul = document.createElement('ul');
					ul.className = 'tree';

					for (const node of nodes) {
						const isFile	 = node.size !== null;
						const li			 = document.createElement('li');
						li.dataset.path = node.fullPath;

						const row = document.createElement('div');
						row.className = 'tree-item';

						const cb = document.createElement('input');
						cb.type = 'checkbox';
						cb.dataset.path = node.fullPath;
						cb.addEventListener('change', (e) => {
							e.stopPropagation();
							onCheck(node, cb.checked);
						});

						if (!isFile) {
							const toggle = document.createElement('span');
							toggle.className = 'folder-toggle';
							toggle.textContent = '▾';
							toggle.addEventListener('click', () => {
								const childUl = li.querySelector('ul.tree');
								if (childUl) {
									const collapsed = childUl.style.display === 'none';
									childUl.style.display = collapsed ? '' : 'none';
									toggle.textContent = collapsed ? '▾' : '▸';
								}
							});
							row.appendChild(toggle);
						} else {
							const spacer = document.createElement('span');
							spacer.style.width = '14px';
							spacer.style.display = 'inline-block';
							row.appendChild(spacer);
						}

						row.appendChild(cb);

						const icon = document.createElement('span');
						icon.className = 'icon';
						icon.textContent = isFile ? fileIcon(node.name) : '📂';
						row.appendChild(icon);

						const label = document.createElement('span');
						label.className = 'label';
						label.textContent = node.name;
						row.appendChild(label);

						if (isFile) {
							const badge = document.createElement('span');
							badge.className = 'size-badge';
							badge.textContent = formatBytes(node.size);
							row.appendChild(badge);
						}

						li.appendChild(row);

						if (!isFile && node.children.length > 0) {
							li.appendChild(renderTree(node.children, node.fullPath));
						}

						ul.appendChild(li);
					}

					return ul;
				}

				function fileIcon(name) {
					const ext = name.split('.').pop().toLowerCase();
					const map = {
						ts: '🟦', js: '🟨', tsx: '🟦', jsx: '🟨',
						json: '🟧', md: '📝', html: '🌐', css: '🎨',
						scss: '🎨', py: '🐍', java: '☕', go: '🐹',
						rs: '🦀', rb: '💎', php: '🐘', sh: '🐚',
						yml: '⚙️', yaml: '⚙️', env: '🔑', svg: '🖼️',
						png: '🖼️', jpg: '🖼️', gif: '🖼️',
					};
					return map[ext] || '📄';
				}

				// ── Check / Uncheck ───────────────────────────────────────────────────────

				function onCheck(node, isChecked) {
					const isFile = node.size !== null;

					if (isFile) {
						if (isChecked) checked.add(node.fullPath);
						else					 checked.delete(node.fullPath);
					} else {
						// Toggle all descendants
						forEachFile(node, (filePath) => {
							if (isChecked) checked.add(filePath);
							else					 checked.delete(filePath);
						});
						// Sync visual checkboxes
						syncCheckboxes();
					}

					updateMeter();
				}

				function forEachFile(node, fn) {
					if (node.size !== null) { fn(node.fullPath); return; }
					(node.children || []).forEach(c => forEachFile(c, fn));
				}

				function syncCheckboxes() {
					document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
						const p = cb.dataset.path;
						if (FILE_SIZES[p] !== undefined) {
							cb.checked = checked.has(p);
						} else {
							// folder: checked if all children checked
							const all = getAllFilesUnder(p);
							cb.checked			 = all.length > 0 && all.every(f => checked.has(f));
							cb.indeterminate = !cb.checked && all.some(f => checked.has(f));
						}
					});
				}

				function getAllFilesUnder(folderPath) {
					return Object.keys(FILE_SIZES).filter(p =>
						p === folderPath || p.startsWith(folderPath + '/')
					);
				}

				function selectAll(state) {
					if (state) Object.keys(FILE_SIZES).forEach(p => checked.add(p));
					else			 checked.clear();
					syncCheckboxes();
					updateMeter();
				}

				// ── Meter ─────────────────────────────────────────────────────────────────

				function updateMeter() {
					let total = 0;
					checked.forEach(p => { total += (FILE_SIZES[p] || 0); });

					const pct	 = Math.min((total / MAX) * 100, 100);
					const fill	= document.getElementById('progress-fill');
					const label = document.getElementById('size-label');
					const warn	= document.getElementById('warning-msg');
					const btn	 = document.getElementById('confirm-btn');

					fill.style.width = pct + '%';

					if (total === 0) {
						fill.style.background = '#4caf50';
						label.className = 'meter-count ok';
						label.textContent = '0 B / ' + formatBytes(MAX);
						warn.textContent = '';
						btn.disabled = true;
					} else if (total < MAX * 0.75) {
						fill.style.background = '#4caf50';
						label.className = 'meter-count ok';
						label.textContent = formatBytes(total) + ' / ' + formatBytes(MAX);
						warn.textContent = '';
						btn.disabled = false;
					} else if (total <= MAX) {
						fill.style.background = '#f0ad4e';
						label.className = 'meter-count warn';
						label.textContent = formatBytes(total) + ' / ' + formatBytes(MAX);
						warn.textContent = '⚠️ Approaching the context limit — consider deselecting large files.';
						btn.disabled = false;
					} else {
						fill.style.background = '#f44336';
						label.className = 'meter-count over';
						label.textContent = formatBytes(total) + ' / ' + formatBytes(MAX) + ' (OVER LIMIT)';
						warn.textContent = '🚫 Selection exceeds the context limit. Deselect files to continue.';
						btn.disabled = true;
					}
				}

				// ── Search / Filter ───────────────────────────────────────────────────────

				function filterTree(query) {
					const q = query.toLowerCase();
					document.querySelectorAll('#tree-root li').forEach(li => {
						const name = li.dataset.path.toLowerCase();
						li.style.display = name.includes(q) ? '' : 'none';
					});
				}

				// ── Actions ───────────────────────────────────────────────────────────────

				function confirm() {
					vscode.postMessage({ command: 'confirm', paths: [...checked] });
				}

				function cancel() {
					vscode.postMessage({ command: 'cancel' });
				}

				// ── Utilities ─────────────────────────────────────────────────────────────

				function formatBytes(bytes) {
					if (bytes === 0) return '0 B';
					if (bytes < 1024) return bytes + ' B';
					if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
					return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
				}

				// ── Bootstrap ─────────────────────────────────────────────────────────────

				collectFiles(RAW_TREE);

				const root = document.getElementById('tree-root');
				RAW_TREE.children.forEach(child => {
					root.appendChild(renderTree([child], ''));
				});

				updateMeter();
			</script>
			</body>
			</html>`;

	}

}

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}