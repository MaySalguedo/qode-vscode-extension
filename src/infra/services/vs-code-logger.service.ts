import { injectable } from "inversify";
import * as vscode from 'vscode';

@injectable()
export class VSCodeLoggerService {

	private outputChannel = vscode.window.createOutputChannel("Qode");

	public info(message: string): void {

		const time = new Date().toLocaleTimeString();
		this.outputChannel.appendLine(`[INFO ${time}] ${message}`);

	}

	public error(message: string, err?: any): void {

		const time = new Date().toLocaleTimeString();
		this.outputChannel.appendLine(`[ERROR ${time}] ${message}`);

		if (err) {

			this.outputChannel.appendLine(typeof err === 'object' ? JSON.stringify(err, null, 2) : String(err));

		}

		this.outputChannel.show(true); 

	}

}