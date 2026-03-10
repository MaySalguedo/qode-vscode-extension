import { injectable } from "inversify";
import * as vscode from 'vscode';
import { ProjectFile } from "@models/project-file.model";

@injectable() export class VSCodeScannerProvider {

	private readonly MAX_FILE_SIZE_BYTES = 15000;

	public async scanWorkspace(): Promise<Array<ProjectFile>> {
		
		if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {

			vscode.window.showWarningMessage('No workspace is open to scan.');
			return [];

		}

		const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;

		const includePattern = new vscode.RelativePattern(workspaceRoot, '**/*');

		const excludePattern = new vscode.RelativePattern(
			workspaceRoot, 
			'**/{node_modules,.git,dist,out,build,bin,obj,venv,.venv,target,.idea}/**'
		);

		const uris = await vscode.workspace.findFiles(includePattern, excludePattern, 20);

		if (uris.length === 0) {

			return [];

		}

		const filePromises = uris.map(async (uri) => {

			const stat = await vscode.workspace.fs.stat(uri);

			if (stat.size > this.MAX_FILE_SIZE_BYTES) {

				return null;

			}

			const uint8Array = await vscode.workspace.fs.readFile(uri);
			const content = Buffer.from(uint8Array).toString('utf8');
			const relativePath = vscode.workspace.asRelativePath(uri, false);

			return {

				relativePath,
				content

			};

		});

		return await Promise.all(filePromises);

	}

}